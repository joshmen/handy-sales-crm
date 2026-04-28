import * as ImagePicker from 'expo-image-picker';
import {
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  copyAsync,
  deleteAsync,
  uploadAsync,
  FileSystemUploadType,
} from 'expo-file-system/legacy';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/db/database';
import Attachment from '@/db/models/Attachment';
import { API_CONFIG } from '@/utils/constants';
import { getAccessToken } from '@/api/client';

const EVIDENCE_DIR = `${documentDirectory}evidence/`;

async function ensureDir() {
  const info = await getInfoAsync(EVIDENCE_DIR);
  if (!info.exists) {
    await makeDirectoryAsync(EVIDENCE_DIR, { intermediates: true });
  }
}

export async function capturePhoto(): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    allowsEditing: false,
    exif: false,
  });

  if (result.canceled || !result.assets[0]) return null;

  await ensureDir();
  const filename = `photo_${Date.now()}.jpg`;
  const dest = `${EVIDENCE_DIR}${filename}`;
  await copyAsync({ from: result.assets[0].uri, to: dest });

  return dest;
}

export async function pickFromGallery(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    allowsMultipleSelection: false,
  });

  if (result.canceled || !result.assets[0]) return null;

  await ensureDir();
  const filename = `gallery_${Date.now()}.jpg`;
  const dest = `${EVIDENCE_DIR}${filename}`;
  await copyAsync({ from: result.assets[0].uri, to: dest });

  return dest;
}

export async function saveAttachmentRecord(params: {
  eventType: string;
  eventLocalId: string;
  tipo: string;
  localUri: string;
}): Promise<Attachment> {
  return database.write(async () => {
    const collection = database.get<Attachment>('attachments');
    return collection.create((record) => {
      record.eventType = params.eventType;
      record.eventLocalId = params.eventLocalId;
      record.tipo = params.tipo;
      record.localUri = params.localUri;
      record.uploadStatus = 'pending';
      record.retryCount = 0;
    });
  });
}

export async function uploadPendingAttachments(): Promise<number> {
  const collection = database.get<Attachment>('attachments');
  // Filtrar en SQL en vez de cargar todos los attachments y filtrar en JS.
  // Antes con 500+ uploaded files cada flush iteraba sobre todos.
  const toUpload = await collection
    .query(Q.where('upload_status', Q.oneOf(['pending', 'failed'])))
    .fetch();

  let uploaded = 0;

  for (const attachment of toUpload) {
    if (attachment.retryCount >= 3) continue;

    try {
      await attachment.markUploading();

      const token = getAccessToken();
      const response = await uploadAsync(
        `${API_CONFIG.BASE_URL}/api/mobile/attachments/upload`,
        attachment.localUri,
        {
          httpMethod: 'POST',
          uploadType: FileSystemUploadType.MULTIPART,
          fieldName: 'file',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          parameters: {
            eventType: attachment.eventType,
            eventLocalId: attachment.eventLocalId,
            tipo: attachment.tipo,
          },
        }
      );

      if (response.status >= 200 && response.status < 300) {
        const body = JSON.parse(response.body);
        const remoteUrl = body.url || body.data?.url || '';
        await attachment.markUploaded(remoteUrl);
        uploaded++;
      } else if (response.status === 401) {
        // Token expirado/inválido: NO contar como retry porque el problema no es
        // el attachment, es el access token. uploadAsync usa fetch directo y bypassa
        // el axios interceptor que refrescaría — la próxima axios request normal
        // gatillará el refresh, y el siguiente flushPending leerá el token nuevo
        // desde getAccessToken(). Marcar pending de nuevo (sin incrementar retryCount).
        await attachment.markPending();
        if (__DEV__) console.warn('[Evidence] upload 401 — esperando refresh axios');
      } else {
        await attachment.markFailed();
      }
    } catch {
      await attachment.markFailed();
    }
  }

  return uploaded;
}

export async function getPendingCount(): Promise<number> {
  const collection = database.get<Attachment>('attachments');
  // Usar Q.fetchCount para evitar materializar records solo para contar.
  return await collection
    .query(Q.where('upload_status', Q.oneOf(['pending', 'failed'])))
    .fetchCount();
}

export async function cleanUploadedFiles(): Promise<void> {
  const collection = database.get<Attachment>('attachments');
  // Filtrar en SQL — antes traía todos y filtraba en JS.
  const toClean = await collection
    .query(Q.where('upload_status', 'uploaded'))
    .fetch();

  for (const attachment of toClean) {
    try {
      const info = await getInfoAsync(attachment.localUri);
      if (info.exists) {
        await deleteAsync(attachment.localUri, { idempotent: true });
      }
    } catch {
      // File already gone
    }
  }
}
