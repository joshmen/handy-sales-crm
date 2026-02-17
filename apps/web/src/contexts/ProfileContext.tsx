'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, UpdateProfileRequest, ChangePasswordRequest, profileService } from '@/services/api/profileService';
import { useSession } from 'next-auth/react';
import { toast } from '@/hooks/useToast';

interface ProfileContextType {
  profile: UserProfile | null;
  isLoading: boolean;
  isUpdating: boolean;
  isChangingPassword: boolean;
  updateProfile: (data: UpdateProfileRequest) => Promise<boolean>;
  changePassword: (data: ChangePasswordRequest) => Promise<boolean>;
  uploadAvatar: (file: File) => Promise<boolean>;
  deleteAvatar: () => Promise<boolean>;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | null>(null);

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile debe ser usado dentro de ProfileProvider');
  }
  return context;
};

interface ProfileProviderProps {
  children: React.ReactNode;
}

export const ProfileProvider: React.FC<ProfileProviderProps> = ({ children }) => {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const loadProfile = useCallback(async () => {
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
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, session?.user?.name, session?.user?.email, session?.user?.image, session?.user?.role]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

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

  const changePassword = async (data: ChangePasswordRequest): Promise<boolean> => {
    if (!session?.user?.id) return false;

    setIsChangingPassword(true);
    try {
      const response = await profileService.changePassword(session.user.id, data);
      if (response.success) {
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

  const refreshProfile = async (): Promise<void> => {
    setIsLoading(true);
    await loadProfile();
  };

  const value: ProfileContextType = {
    profile,
    isLoading,
    isUpdating,
    isChangingPassword,
    updateProfile,
    changePassword,
    uploadAvatar,
    deleteAvatar,
    refreshProfile,
  };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
};