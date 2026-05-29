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
import Gasto from '@/db/models/Gasto';
import DevolucionPedido from '@/db/models/DevolucionPedido';
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
        // Resolve race: si la entidad parent (gasto/devolucion) ya esta en WDB,
        // stampar la URL localmente y marcarla dirty para que el proximo sync push
        // la lleve al server. Asi, si el upload corrio antes del sync push del gasto,
        // o si el server stamp fallo (bug intermitente), la URL eventualmente llega.
        // Bug reportado prod 29/5 (Rodrigo): foto subio OK pero gasto en DB sin URL.
        if (remoteUrl && (attachment.eventType === 'gasto' || attachment.eventType === 'devolucion')) {
          try {
            await stampParentEntityWithUrl(attachment.eventType, attachment.eventLocalId, remoteUrl);
          } catch (e) {
            if (__DEV__) console.warn('[Evidence] failed to stamp parent entity locally:', e);
          }
        }
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

/**
 * Sweep recovery: para cada attachment uploaded con remoteUrl, verifica que el
 * parent (gasto/devolucion) tiene la URL stampeada. Si no, la stampea localmente
 * y marca dirty. Recupera el caso del bug 29/5 donde el upload subio OK pero el
 * stamp server-side fallo silenciosamente — el gasto en server sigue sin URL,
 * pero el siguiente sync push (con la URL ahora en WDB) lo arregla.
 */
export async function recoverOrphanAttachmentStamps(): Promise<number> {
  const collection = database.get<Attachment>('attachments');
  const uploaded = await collection
    .query(
      Q.where('upload_status', 'uploaded'),
      Q.where('event_type', Q.oneOf(['gasto', 'devolucion'])),
    )
    .fetch();

  let recovered = 0;
  for (const att of uploaded) {
    const remote = (att as any).remoteUrl;
    if (!remote) continue;
    try {
      const stamped = await stampParentEntityWithUrl(att.eventType, att.eventLocalId, remote);
      if (stamped) recovered++;
    } catch {
      // best-effort
    }
  }
  return recovered;
}

export async function getPendingCount(): Promise<number> {
  const collection = database.get<Attachment>('attachments');
  // Usar Q.fetchCount para evitar materializar records solo para contar.
  return await collection
    .query(Q.where('upload_status', Q.oneOf(['pending', 'failed'])))
    .fetchCount();
}

/**
 * Stampea localmente comprobante_url / foto_evidencia_url en la entidad parent
 * (gasto / devolucion) tras un upload exitoso. Marca el record como dirty para
 * que el proximo sync push lleve la URL al server. Resuelve race con el stamp
 * server-side cuando el upload corre antes del UpsertGastoAsync.
 *
 * `eventLocalId` puede ser el WDB local id (string UUID) — buscamos por record.id.
 * Si la entidad aun no existe localmente (caso raro), no-op.
 */
async function stampParentEntityWithUrl(
  eventType: string,
  eventLocalId: string,
  remoteUrl: string,
): Promise<boolean> {
  if (eventType === 'gasto') {
    const collection = database.get<Gasto>('gastos');
    const records = await collection.query(Q.where('id', eventLocalId)).fetch();
    if (records.length === 0) return false;
    const gasto = records[0];
    if ((gasto as any).comprobanteUrl) return false; // ya stampeado, no-op
    await database.write(async () => {
      await gasto.update((g: any) => {
        g.comprobanteUrl = remoteUrl;
      });
    });
    return true;
  } else if (eventType === 'devolucion') {
    const collection = database.get<DevolucionPedido>('devoluciones_pedido');
    const records = await collection.query(Q.where('id', eventLocalId)).fetch();
    if (records.length === 0) return false;
    const dev = records[0];
    if ((dev as any).fotoEvidenciaUrl) return false;
    await database.write(async () => {
      await dev.update((d: any) => {
        d.fotoEvidenciaUrl = remoteUrl;
      });
    });
    return true;
  }
  return false;
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
