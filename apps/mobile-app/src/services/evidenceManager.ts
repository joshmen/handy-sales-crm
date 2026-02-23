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
import { database } from '@/db/database';
import Attachment from '@/db/models/Attachment';
import { API_CONFIG } from '@/utils/constants';

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
  const pending = await collection.query().fetch();

  const toUpload = pending.filter(
    (a) => a.uploadStatus === 'pending' || a.uploadStatus === 'failed'
  );

  let uploaded = 0;

  for (const attachment of toUpload) {
    if (attachment.retryCount >= 3) continue;

    try {
      await attachment.markUploading();

      const response = await uploadAsync(
        `${API_CONFIG.BASE_URL}/api/mobile/attachments/upload`,
        attachment.localUri,
        {
          httpMethod: 'POST',
          uploadType: FileSystemUploadType.MULTIPART,
          fieldName: 'file',
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
  const pending = await collection.query().fetch();
  return pending.filter(
    (a) => a.uploadStatus === 'pending' || a.uploadStatus === 'failed'
  ).length;
}

export async function cleanUploadedFiles(): Promise<void> {
  const collection = database.get<Attachment>('attachments');
  const uploaded = await collection.query().fetch();
  const toClean = uploaded.filter((a) => a.uploadStatus === 'uploaded');

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
