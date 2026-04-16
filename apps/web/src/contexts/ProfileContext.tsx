'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { UserProfile, UpdateProfileRequest, ChangePasswordRequest, profileService } from '@/services/api/profileService';
import { useSession } from 'next-auth/react';
import { toast } from '@/hooks/useToast';
import { useTranslations } from 'next-intl';

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
  const { data: session, status } = useSession();
  const t = useTranslations('profile.toast');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!session?.user?.id) return;

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
      // Fallback a datos de sesión si la API falla
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
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, session?.user?.name, session?.user?.email, session?.user?.image, session?.user?.role]);

  useEffect(() => {
    if (status === 'authenticated') {
      loadProfile();
    } else if (status === 'unauthenticated') {
      setIsLoading(false);
    }
  }, [loadProfile, status]);

  const updateProfile = useCallback(async (data: UpdateProfileRequest): Promise<boolean> => {
    if (!profile || !session?.user?.id) return false;

    setIsUpdating(true);
    try {
      const response = await profileService.updateProfile(session.user.id, data);
      if (response.success && response.data) {
        setProfile(response.data);
        toast({
          title: t('profileUpdatedTitle'),
          description: t('profileUpdatedDesc'),
        });
        return true;
      } else {
        // Fallback: actualizar localmente si la API falla
        setProfile(prev => (prev ? { ...prev, ...data } : null));
        toast({
          title: t('profileUpdatedLocalTitle'),
          description: t('profileUpdatedLocalDesc'),
        });
        return true;
      }
    } catch (_error) {
      toast({
        title: t('errorTitle'),
        description: t('profileUpdateError'),
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [profile, session?.user?.id]);

  const changePassword = useCallback(async (data: ChangePasswordRequest): Promise<boolean> => {
    if (!session?.user?.id) return false;

    setIsChangingPassword(true);
    try {
      const response = await profileService.changePassword(data);
      if (response.success) {
        toast({
          title: t('passwordUpdatedTitle'),
          description: t('passwordUpdatedDesc'),
        });
        return true;
      } else {
        toast({
          title: t('errorTitle'),
          description: response.error || t('passwordChangeError'),
          variant: 'destructive',
        });
        return false;
      }
    } catch (_error) {
      toast({
        title: t('errorTitle'),
        description: t('passwordChangeError'),
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsChangingPassword(false);
    }
  }, [session?.user?.id]);

  const uploadAvatar = useCallback(async (file: File): Promise<boolean> => {
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
          title: t('avatarUpdatedTitle'),
          description: t('avatarUpdatedDesc'),
        });
        return true;
      } else {
        toast({
          title: t('errorTitle'),
          description: t('avatarUploadError'),
          variant: 'destructive',
        });
        return false;
      }
    } catch (_error) {
      toast({
        title: t('errorTitle'),
        description: t('avatarUploadError'),
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [profile, session?.user?.id]);

  const deleteAvatar = useCallback(async (): Promise<boolean> => {
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
          title: t('avatarDeletedTitle'),
          description: t('avatarDeletedDesc'),
        });
        return true;
      } else {
        toast({
          title: t('errorTitle'),
          description: t('avatarDeleteError'),
          variant: 'destructive',
        });
        return false;
      }
    } catch (_error) {
      toast({
        title: t('errorTitle'),
        description: t('avatarDeleteError'),
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [profile, session?.user?.id]);

  const refreshProfile = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    await loadProfile();
  }, [loadProfile]);

  const value = useMemo<ProfileContextType>(() => ({
    profile,
    isLoading,
    isUpdating,
    isChangingPassword,
    updateProfile,
    changePassword,
    uploadAvatar,
    deleteAvatar,
    refreshProfile,
  }), [profile, isLoading, isUpdating, isChangingPassword, updateProfile, changePassword, uploadAvatar, deleteAvatar, refreshProfile]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
};