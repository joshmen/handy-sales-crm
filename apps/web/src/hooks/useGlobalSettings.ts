import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/hooks/useToast';

export interface GlobalSettings {
  id: number;
  platformName: string;
  platformLogo: string | null;
  platformPrimaryColor: string;
  platformSecondaryColor: string;
  defaultLanguage: string;
  defaultTimezone: string;
  allowSelfRegistration: boolean;
  requireEmailVerification: boolean;
  maxUsersPerCompany: number | null;
  maxStoragePerCompany: number | null;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

export interface UpdateGlobalSettingsRequest {
  platformName: string;
  platformLogo?: string | null;
  platformPrimaryColor: string;
  platformSecondaryColor: string;
  defaultLanguage: string;
  defaultTimezone: string;
  allowSelfRegistration: boolean;
  requireEmailVerification: boolean;
  maxUsersPerCompany?: number | null;
  maxStoragePerCompany?: number | null;
  maintenanceMode: boolean;
  maintenanceMessage?: string | null;
}

export const useGlobalSettings = () => {
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Load global settings
  const loadGlobalSettings = async () => {
    setIsLoading(true);
    try {
      const response = await api.get<GlobalSettings>('/api/global-settings');
      if (response.data) {
        // El backend ahora maneja automáticamente el nivel de acceso según el rol del usuario
        // SUPER_ADMIN recibe información completa, otros usuarios reciben info básica
        const data = response.data;
        setGlobalSettings({
          ...data,
          // Asegurar que siempre tengamos valores por defecto para campos que podrían faltar
          allowSelfRegistration: data.allowSelfRegistration ?? false,
          requireEmailVerification: data.requireEmailVerification ?? true,
          maxUsersPerCompany: data.maxUsersPerCompany ?? null,
          maxStoragePerCompany: data.maxStoragePerCompany ?? null,
          maintenanceMode: data.maintenanceMode ?? false,
          maintenanceMessage: data.maintenanceMessage ?? null,
          updatedBy: data.updatedBy ?? null,
        });
      }
    } catch (error) {
      console.error('Error loading global settings:', error);
      // Set default values si falla completamente
      setGlobalSettings({
        id: 1,
        platformName: 'Handy Suites',
        platformLogo: null,
        platformPrimaryColor: '#3B82F6',
        platformSecondaryColor: '#8B5CF6',
        defaultLanguage: 'es',
        defaultTimezone: 'America/Mexico_City',
        allowSelfRegistration: false,
        requireEmailVerification: true,
        maxUsersPerCompany: null,
        maxStoragePerCompany: null,
        maintenanceMode: false,
        maintenanceMessage: null,
        updatedAt: new Date().toISOString(),
        updatedBy: null,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update global settings (SuperAdmin only)
  const updateGlobalSettings = async (request: UpdateGlobalSettingsRequest): Promise<boolean> => {
    setIsUpdating(true);
    try {
      const response = await api.put<GlobalSettings>('/api/global-settings', request);
      if (response.data) {
        setGlobalSettings(response.data);
        toast({
          title: 'Configuración global actualizada',
          description: 'Los cambios se han aplicado correctamente',
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating global settings:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la configuración global',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  // Refresh settings
  const refreshGlobalSettings = () => {
    loadGlobalSettings();
  };

  useEffect(() => {
    loadGlobalSettings();
  }, []);

  return {
    globalSettings,
    isLoading,
    isUpdating,
    updateGlobalSettings,
    refreshGlobalSettings,
  };
};
