import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import Toast from 'react-native-toast-message';
import {
  pickAndUploadAvatar,
  deleteAvatar,
  AvatarPermissionDeniedError,
  AvatarUploadError,
  openAppSettings,
  type AvatarSource,
} from '@/services/profileImageService';
import { useAuthStore } from '@/stores';
import { ME_QUERY_KEY } from './useMe';

/**
 * Mutation para subir foto de perfil. Al éxito:
 * 1. Actualiza el `useAuthStore.user.avatarUrl` (el header avatar refresca al instante).
 * 2. Invalida `['auth', 'me']` para que el `useMe` refetch cierre cualquier
 *    drift entre client y backend.
 * 3. Toast de éxito.
 *
 * Si el user niega permisos de cámara/galería, mostramos Alert con shortcut a
 * Settings (el ImagePicker SDK no re-promptea tras "denied").
 */
export function useUploadAvatar() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore(s => s.setUser);

  return useMutation({
    mutationFn: (source: AvatarSource) => pickAndUploadAvatar(source),
    onSuccess: (result) => {
      // result === null cuando el user canceló el picker — no error, no toast.
      if (!result) return;

      // setQueryData directo en lugar de invalidate: el server response es la
      // fuente de verdad, así evitamos el round-trip extra de refetch + el
      // doble render que generaba "useMe → setUser efecto" sobre el setUser
      // que hicimos aquí. Patrón "Updates from Mutation Responses" de
      // TanStack Query (validado por context7 review).
      queryClient.setQueryData<{ user: any } | undefined>(
        ME_QUERY_KEY as any,
        (old) => (old?.user ? { ...old, user: { ...old.user, avatarUrl: result.avatarUrl } } : old)
      );
      setUser({ avatarUrl: result.avatarUrl });

      Toast.show({
        type: 'success',
        text1: 'Foto actualizada',
        text2: 'Tu nueva foto de perfil ya está visible.',
      });
    },
    onError: (error) => {
      if (error instanceof AvatarPermissionDeniedError) {
        Alert.alert(
          error.source === 'camera' ? 'Permiso de cámara' : 'Permiso de galería',
          error.source === 'camera'
            ? 'Activa el permiso de cámara en Ajustes para tomar una foto.'
            : 'Activa el permiso de galería en Ajustes para elegir una foto.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Abrir Ajustes', onPress: () => openAppSettings() },
          ]
        );
        return;
      }
      const message =
        error instanceof AvatarUploadError ? error.message : 'No se pudo subir la foto';
      Toast.show({ type: 'error', text1: 'Error', text2: message });
    },
  });
}

/**
 * Mutation para borrar la foto de perfil.
 */
export function useDeleteAvatar() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore(s => s.setUser);

  return useMutation({
    mutationFn: () => deleteAvatar(),
    onSuccess: () => {
      // setQueryData directo (mismo razonamiento que useUploadAvatar).
      queryClient.setQueryData<{ user: any } | undefined>(
        ME_QUERY_KEY as any,
        (old) => (old?.user ? { ...old, user: { ...old.user, avatarUrl: null } } : old)
      );
      setUser({ avatarUrl: null });
      Toast.show({ type: 'success', text1: 'Foto eliminada' });
    },
    onError: () => {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo eliminar la foto' });
    },
  });
}
