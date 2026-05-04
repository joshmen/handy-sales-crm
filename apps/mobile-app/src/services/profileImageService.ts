import * as ImagePicker from 'expo-image-picker';
import { uploadAsync, FileSystemUploadType } from 'expo-file-system/legacy';
import { Linking } from 'react-native';
import { api, getAccessToken } from '@/api/client';
import { API_CONFIG } from '@/utils/constants';

/**
 * Upload + delete de la foto de perfil del usuario logueado.
 *
 * Reusa el patrón del `evidenceManager` (expo-file-system uploadAsync
 * multipart con Authorization header). Comparte el mismo Cloudinary
 * configurado en backend.
 */

export type AvatarSource = 'camera' | 'gallery';

export class AvatarPermissionDeniedError extends Error {
  source: AvatarSource;
  constructor(source: AvatarSource) {
    super(
      source === 'camera'
        ? 'Permiso de cámara denegado'
        : 'Permiso de galería denegado'
    );
    this.source = source;
    this.name = 'AvatarPermissionDeniedError';
  }
}

export class AvatarUploadError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
    this.name = 'AvatarUploadError';
  }
}

/**
 * Helper para abrir la pantalla de Settings del SO. UI puede llamarla
 * cuando el user previamente negó el permiso (ImagePicker NO re-prompts
 * tras `denied`, hay que mandarlo manual).
 */
export function openAppSettings(): Promise<void> {
  return Linking.openSettings().catch(() => {});
}

/**
 * Lanza el picker (cámara o galería) y sube la foto al backend mobile.
 * Retorna la URL Cloudinary actualizada o null si el user canceló.
 *
 * Errores:
 * - `AvatarPermissionDeniedError` si el user niega el permiso.
 * - `AvatarUploadError` si el upload falla (red / servidor).
 */
export async function pickAndUploadAvatar(
  source: AvatarSource
): Promise<{ avatarUrl: string } | null> {
  // 1. Permisos
  if (source === 'camera') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') throw new AvatarPermissionDeniedError('camera');
  } else {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') throw new AvatarPermissionDeniedError('gallery');
  }

  // 2. Picker
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.7,
          // Cuadrado: el avatar siempre se renderiza en círculo.
          allowsEditing: true,
          aspect: [1, 1],
          exif: false,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.7,
          allowsEditing: true,
          aspect: [1, 1],
          allowsMultipleSelection: false,
        });

  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];

  // 3. Upload multipart al backend mobile
  const token = getAccessToken();
  const response = await uploadAsync(
    `${API_CONFIG.BASE_URL}/api/mobile/profile/avatar`,
    asset.uri,
    {
      httpMethod: 'POST',
      uploadType: FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }
  );

  if (response.status < 200 || response.status >= 300) {
    let message = 'No se pudo subir la foto';
    try {
      const body = JSON.parse(response.body);
      message = body.error || body.message || message;
    } catch {
      // body no es JSON, mantener message default
    }
    throw new AvatarUploadError(message, response.status);
  }

  // Backend retorna { success, data: { avatarUrl } }
  const body = JSON.parse(response.body);
  const avatarUrl: string | undefined = body?.data?.avatarUrl ?? body?.avatarUrl;
  if (!avatarUrl) {
    throw new AvatarUploadError('Respuesta del servidor inválida');
  }
  return { avatarUrl };
}

/**
 * Borra la foto de perfil. El backend la quita de Cloudinary y setea
 * `Usuario.AvatarUrl = null`. El cliente debe invalidar la query `me`
 * para que el avatar se vuelva iniciales.
 */
export async function deleteAvatar(): Promise<void> {
  await api.delete('/api/mobile/profile/avatar');
}
