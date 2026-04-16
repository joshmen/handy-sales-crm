'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useSignalR } from '@/contexts/SignalRContext';
import { GlobalSettings, companyService } from '@/services/api/companyService';
import { toast } from '@/hooks/useToast';
import { useTranslations } from 'next-intl';

interface GlobalSettingsContextType {
  globalSettings: GlobalSettings | null;
  isLoading: boolean;
  isUpdating: boolean;
  updateGlobalSettings: (data: Partial<GlobalSettings>) => Promise<boolean>;
  uploadPlatformLogo: (file: File) => Promise<boolean>;
  deletePlatformLogo: () => Promise<boolean>;
  refreshSettings: () => Promise<void>;
}

const GlobalSettingsContext = createContext<GlobalSettingsContextType | null>(null);

export const useGlobalSettings = () => {
  const context = useContext(GlobalSettingsContext);
  if (!context) {
    throw new Error('useGlobalSettings debe ser usado dentro de GlobalSettingsProvider');
  }
  return context;
};

interface GlobalSettingsProviderProps {
  children: React.ReactNode;
}

export const GlobalSettingsProvider: React.FC<GlobalSettingsProviderProps> = ({ children }) => {
  const { status } = useSession();
  const t = useTranslations('globalSettings.toast');
  const { isConnected, on, off } = useSignalR();
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadGlobalSettings = useCallback(async () => {
    try {
      const response = await companyService.getGlobalSettings();
      if (response.success && response.data) {
        setGlobalSettings(response.data);
        
        // Apply global platform configuration immediately
        if (response.data.platformPrimaryColor) {
          document.documentElement.style.setProperty('--platform-primary-color', response.data.platformPrimaryColor);
        }
        if (response.data.platformSecondaryColor) {
          document.documentElement.style.setProperty('--platform-secondary-color', response.data.platformSecondaryColor);
        }
        
        // Save to localStorage as backup
        localStorage.setItem('global_settings', JSON.stringify(response.data));
      } else {
        // Fallback to default global settings
        const defaultSettings: GlobalSettings = {
          id: '1',
          platformName: 'Handy Suites',
          platformPrimaryColor: '#3B82F6',
          platformSecondaryColor: '#8B5CF6',
          defaultLanguage: 'es',
          defaultTimezone: 'America/Mexico_City',
          allowSelfRegistration: false,
          requireEmailVerification: true,
          maintenanceMode: false,
          updatedAt: new Date(),
        };
        setGlobalSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Error loading global settings:', error);
      
      // Try loading from localStorage as last resort
      try {
        const saved = localStorage.getItem('global_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          setGlobalSettings({
            ...parsed,
            updatedAt: new Date(parsed.updatedAt),
          });
        }
      } catch {
        // If everything fails, use default settings
        const defaultSettings: GlobalSettings = {
          id: '1',
          platformName: 'Handy Suites',
          platformPrimaryColor: '#3B82F6',
          platformSecondaryColor: '#8B5CF6',
          defaultLanguage: 'es',
          defaultTimezone: 'America/Mexico_City',
          allowSelfRegistration: false,
          requireEmailVerification: true,
          maintenanceMode: false,
          updatedAt: new Date(),
        };
        setGlobalSettings(defaultSettings);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      loadGlobalSettings();
    } else if (status === 'unauthenticated') {
      setIsLoading(false);
    }
  }, [loadGlobalSettings, status]);

  // --- SignalR push: maintenance mode changes ---
  useEffect(() => {
    if (!isConnected) return;

    const handleMaintenance = (...args: unknown[]) => {
      const payload = args[0] as { active?: boolean; message?: string } | undefined;
      if (!payload || typeof payload.active !== 'boolean') return;

      setGlobalSettings(prev => {
        if (!prev) return prev;
        const updated = { ...prev, maintenanceMode: payload.active!, updatedAt: new Date() };
        localStorage.setItem('global_settings', JSON.stringify(updated));
        return updated;
      });
    };

    on('MaintenanceModeChanged', handleMaintenance);
    return () => off('MaintenanceModeChanged', handleMaintenance);
  }, [isConnected, on, off]);

  const updateGlobalSettings = async (data: Partial<GlobalSettings>): Promise<boolean> => {
    if (!globalSettings) return false;

    setIsUpdating(true);
    try {
      const response = await companyService.updateGlobalSettings(data);
      if (response.success && response.data) {
        setGlobalSettings(response.data);
        
        // Apply visual changes immediately
        if (response.data.platformPrimaryColor) {
          document.documentElement.style.setProperty('--platform-primary-color', response.data.platformPrimaryColor);
        }
        if (response.data.platformSecondaryColor) {
          document.documentElement.style.setProperty('--platform-secondary-color', response.data.platformSecondaryColor);
        }
        
        // Update localStorage
        localStorage.setItem('global_settings', JSON.stringify(response.data));
        
        toast({
          title: t('updatedTitle'),
          description: t('updatedDesc'),
        });
        return true;
      } else {
        toast({
          title: t('errorTitle'),
          description: t('updateError'),
          variant: 'destructive',
        });
        return false;
      }
    } catch (_error) {
      toast({
        title: t('errorTitle'),
        description: t('updateErrorSuperAdmin'),
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const uploadPlatformLogo = async (file: File): Promise<boolean> => {
    if (!globalSettings) return false;

    setIsUpdating(true);
    try {
      const response = await companyService.uploadPlatformLogo(file);
      if (response.success && response.data) {
        const updatedSettings = { ...globalSettings, platformLogo: response.data.logoUrl, updatedAt: new Date() };
        setGlobalSettings(updatedSettings);
        localStorage.setItem('global_settings', JSON.stringify(updatedSettings));
        
        toast({
          title: t('logoUpdatedTitle'),
          description: t('logoUpdatedDesc'),
        });
        return true;
      } else {
        toast({
          title: t('logoUploadErrorTitle'),
          description: response.error || t('logoUploadErrorDefault'),
          variant: 'destructive',
        });
        return false;
      }
    } catch (_error) {
      console.error('Upload platform logo exception:', _error);
      toast({
        title: t('errorTitle'),
        description: t('logoUploadUnexpected'),
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const deletePlatformLogo = async (): Promise<boolean> => {
    if (!globalSettings) return false;

    setIsUpdating(true);
    try {
      const response = await companyService.deletePlatformLogo();
      if (response.success) {
        const updatedSettings = { ...globalSettings, platformLogo: undefined, updatedAt: new Date() };
        setGlobalSettings(updatedSettings);
        localStorage.setItem('global_settings', JSON.stringify(updatedSettings));
        
        toast({
          title: t('logoDeletedTitle'),
          description: t('logoDeletedDesc'),
        });
        return true;
      } else {
        toast({
          title: t('errorTitle'),
          description: t('logoDeleteError'),
          variant: 'destructive',
        });
        return false;
      }
    } catch (_error) {
      toast({
        title: t('errorTitle'),
        description: t('logoDeleteError'),
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const refreshSettings = async (): Promise<void> => {
    setIsLoading(true);
    await loadGlobalSettings();
  };

  const value: GlobalSettingsContextType = {
    globalSettings,
    isLoading,
    isUpdating,
    updateGlobalSettings,
    uploadPlatformLogo,
    deletePlatformLogo,
    refreshSettings,
  };

  return <GlobalSettingsContext.Provider value={value}>{children}</GlobalSettingsContext.Provider>;
};