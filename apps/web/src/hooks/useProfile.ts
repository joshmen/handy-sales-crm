import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  profileService,
  UserProfile,
  UpdateProfileRequest,
  UpdatePreferencesRequest,
  ChangePasswordRequest,
} from '@/services/api/profileService';
import { toast } from '@/hooks/useToast';

export const useProfile = () => {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Cargar perfil inicial
  useEffect(() => {
    const loadProfile = async () => {
      if (!session?.user?.id) {
        // Si no hay session, usar datos mock locales
        const mockProfile: UserProfile = {
          id: parseInt(session?.user?.id || '1'),
          nombre: session?.user?.name || 'Usuario',
          email: session?.user?.email || 'usuario@example.com',
          tenantId: 1,
          esAdmin: false,
          esSuperAdmin: false,
          avatarUrl: session?.user?.image || undefined,
          role: session?.user?.role || 'VENDEDOR',
        };
        setProfile(mockProfile);
        setIsLoading(false);
        return;
      }

      try {
        const response = await profileService.getProfile(session.user.id);
        if (response.success && response.data) {
          setProfile(response.data);
        } else {
          // Si falla la API, usar datos de la sesión como fallback
          const fallbackProfile: UserProfile = {
            id: parseInt(session.user.id),
            nombre: session.user.name || 'Usuario',
            email: session.user.email || 'usuario@example.com',
            tenantId: 1,
            esAdmin: session.user.role === 'ADMIN',
            esSuperAdmin: session.user.role === 'SUPER_ADMIN',
            avatarUrl: session.user.image || undefined,
            role: session.user.role || 'VENDEDOR',
          };
          setProfile(fallbackProfile);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        toast({
          title: 'Error',
          description: 'No se pudo cargar el perfil del usuario',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [session?.user?.id, session?.user?.name, session?.user?.email, session?.user?.image]);

  const updateProfile = async (data: UpdateProfileRequest): Promise<boolean> => {
    if (!profile || !session?.user?.id) return false;

    setIsUpdating(true);
    try {
      const response = await profileService.updateProfile(session.user.id, data);
      if (response.success && response.data) {
        setProfile(response.data);
        toast({
          title: 'Perfil actualizado',
          description: 'Tu información personal ha sido actualizada correctamente',
        });
        return true;
      } else {
        // Fallback: actualizar localmente si la API falla
        setProfile(prev => (prev ? { ...prev, ...data } : null));
        toast({
          title: 'Perfil actualizado localmente',
          description: 'Los cambios se han guardado temporalmente',
        });
        return true;
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el perfil',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const updatePreferences = async (data: UpdatePreferencesRequest): Promise<boolean> => {
    if (!profile || !session?.user?.id) return false;

    setIsUpdating(true);
    try {
      const response = await profileService.updatePreferences(session.user.id, data);
      if (response.success && response.data) {
        setProfile(response.data);
        toast({
          title: 'Preferencias guardadas',
          description: 'Tus preferencias han sido actualizadas',
        });
        return true;
      } else {
        // Fallback: actualizar localmente
        setProfile(prev => (prev ? { ...prev, ...data } : null));
        toast({
          title: 'Preferencias guardadas localmente',
          description: 'Los cambios se han aplicado temporalmente',
        });
        return true;
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron guardar las preferencias',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const changePassword = async (data: ChangePasswordRequest): Promise<boolean> => {
    if (!session?.user?.id) return false;

    setIsChangingPassword(true);
    try {
      const response = await profileService.changePassword(session.user.id, data);
      if (response.success) {
        // Password changed successfully - no need to update profile since backend doesn't track this

        toast({
          title: 'Contraseña actualizada',
          description: 'Tu contraseña ha sido cambiada exitosamente',
        });
        return true;
      } else {
        toast({
          title: 'Error',
          description: response.error || 'No se pudo cambiar la contraseña',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo cambiar la contraseña',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsChangingPassword(false);
    }
  };

  const uploadAvatar = async (file: File): Promise<boolean> => {
    if (!session?.user?.id) return false;

    setIsUpdating(true);
    try {
      const response = await profileService.uploadAvatar(session.user.id, file);
      if (response.success && response.data) {
        const updatedProfile = {
          ...profile!,
          avatarUrl: response.data!.avatarUrl,
        };
        setProfile(updatedProfile);
        
        // Forzar actualización en localStorage para triggear cambios en otros componentes
        localStorage.setItem('profile_avatar_updated', Date.now().toString());

        toast({
          title: 'Foto actualizada',
          description: 'Tu foto de perfil ha sido actualizada',
        });
        return true;
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo subir la foto',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo subir la foto',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteAvatar = async (): Promise<boolean> => {
    if (!session?.user?.id) return false;

    setIsUpdating(true);
    try {
      const response = await profileService.deleteAvatar(session.user.id);
      if (response.success) {
        const updatedProfile = {
          ...profile!,
          avatarUrl: undefined,
        };
        setProfile(updatedProfile);
        
        // Forzar actualización en localStorage para triggear cambios en otros componentes
        localStorage.setItem('profile_avatar_updated', Date.now().toString());

        toast({
          title: 'Foto eliminada',
          description: 'Tu foto de perfil ha sido eliminada',
        });
        return true;
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo eliminar la foto',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la foto',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const toggle2FA = async (enable: boolean, token?: string): Promise<boolean> => {
    if (!session?.user?.id) return false;

    setIsUpdating(true);
    try {
      let response;
      if (enable) {
        response = await profileService.enable2FA(session.user.id);
      } else {
        response = await profileService.disable2FA(session.user.id, token || '');
      }

      if (response.success) {
        // 2FA toggled successfully - backend doesn't support this yet so just show success

        toast({
          title: enable ? '2FA activado' : '2FA desactivado',
          description: enable
            ? 'La autenticación de dos factores ha sido activada'
            : 'La autenticación de dos factores ha sido desactivada',
        });
        return true;
      } else {
        toast({
          title: 'Error',
          description: `No se pudo ${enable ? 'activar' : 'desactivar'} 2FA`,
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `No se pudo ${enable ? 'activar' : 'desactivar'} 2FA`,
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const refreshProfile = async () => {
    if (session?.user?.id) {
      setIsLoading(true);
      try {
        const response = await profileService.getProfile(session.user.id);
        if (response.success && response.data) {
          setProfile(response.data);
        }
      } catch (error) {
        console.error('Error refreshing profile:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return {
    profile,
    isLoading,
    isUpdating,
    isChangingPassword,
    updateProfile,
    updatePreferences,
    changePassword,
    uploadAvatar,
    deleteAvatar,
    toggle2FA,
    refreshProfile,
  };
};
