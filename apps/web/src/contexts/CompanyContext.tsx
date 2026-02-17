'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { CompanySettings, UpdateCompanyRequest, companyService } from '@/services/api/companyService';
import { toast } from '@/hooks/useToast';

interface CompanyContextType {
  settings: CompanySettings | null;
  isLoading: boolean;
  isUpdating: boolean;
  updateSettings: (data: UpdateCompanyRequest) => Promise<boolean>;
  uploadLogo: (file: File) => Promise<boolean>;
  deleteLogo: () => Promise<boolean>;
  refreshSettings: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | null>(null);

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany debe ser usado dentro de CompanyProvider');
  }
  return context;
};

interface CompanyProviderProps {
  children: React.ReactNode;
}

export const CompanyProvider: React.FC<CompanyProviderProps> = ({ children }) => {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadSettings = useCallback(async () => {
    // Solo cargar si hay una sesión activa
    if (!session) {
      setIsLoading(false);
      return;
    }
    try {
      const response = await companyService.getCompanySettings();
      if (response.success && response.data) {
        setSettings(response.data);
        
        // Aplicar configuración visual inmediatamente
        if (response.data.companyPrimaryColor) {
          document.documentElement.style.setProperty('--company-primary-color', response.data.companyPrimaryColor);
        }
        if (response.data.companySecondaryColor) {
          document.documentElement.style.setProperty('--company-secondary-color', response.data.companySecondaryColor);
        }
        
        // Guardar en localStorage como respaldo
        localStorage.setItem('company_settings', JSON.stringify(response.data));
      } else {
        // Fallback a configuración por defecto usando el tenant del usuario
        const defaultSettings: CompanySettings = {
          id: '1',
          tenantId: session?.user?.tenantId || 1,
          companyName: 'Mi Empresa',
          country: 'México',
          timezone: 'America/Mexico_City',
          currency: 'MXN',
          subscriptionStatus: 'TRIAL',
          subscriptionPlan: 'BASIC',
          currentUsers: 0,
          isActive: true,
          updatedAt: new Date(),
          updatedBy: 'system',
        };
        setSettings(defaultSettings);
      }
    } catch {
      // Silently handle errors - try localStorage fallback
      try {
        const saved = localStorage.getItem('company_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          setSettings({
            ...parsed,
            updatedAt: new Date(parsed.updatedAt),
          });
        }
      } catch {
        // Si todo falla, usar configuración por defecto usando el tenant del usuario
        const defaultSettings: CompanySettings = {
          id: '1',
          tenantId: session?.user?.tenantId || 1,
          companyName: 'Mi Empresa',
          country: 'México',
          timezone: 'America/Mexico_City',
          currency: 'MXN',
          subscriptionStatus: 'TRIAL',
          subscriptionPlan: 'BASIC',
          currentUsers: 0,
          isActive: true,
          updatedAt: new Date(),
          updatedBy: 'system',
        };
        setSettings(defaultSettings);
      }
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSettings = async (data: UpdateCompanyRequest): Promise<boolean> => {
    if (!settings) return false;

    setIsUpdating(true);
    try {
      const response = await companyService.updateCompanySettings(data);
      if (response.success && response.data) {
        setSettings(response.data);
        
        // Aplicar cambios visuales inmediatamente
        if (response.data.companyPrimaryColor) {
          document.documentElement.style.setProperty('--company-primary-color', response.data.companyPrimaryColor);
        }
        if (response.data.companySecondaryColor) {
          document.documentElement.style.setProperty('--company-secondary-color', response.data.companySecondaryColor);
        }
        
        // Actualizar localStorage
        localStorage.setItem('company_settings', JSON.stringify(response.data));
        
        toast({
          title: 'Configuración actualizada',
          description: 'Los cambios se han aplicado correctamente',
        });
        return true;
      } else {
        // Fallback: actualizar localmente si la API falla
        const updatedSettings = { ...settings, ...data, updatedAt: new Date() };
        setSettings(updatedSettings);
        localStorage.setItem('company_settings', JSON.stringify(updatedSettings));
        
        toast({
          title: 'Configuración guardada localmente',
          description: 'Los cambios se han aplicado temporalmente',
        });
        return true;
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la configuración',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const uploadLogo = async (file: File): Promise<boolean> => {
    if (!settings) return false;

    setIsUpdating(true);
    try {
      const response = await companyService.uploadLogo(file);
      if (response.success && response.data) {
        const updatedSettings = { ...settings, companyLogo: response.data.logoUrl, updatedAt: new Date() };
        setSettings(updatedSettings);
        localStorage.setItem('company_settings', JSON.stringify(updatedSettings));
        
        toast({
          title: 'Logo actualizado',
          description: 'El logo de la empresa ha sido actualizado',
        });
        return true;
      } else {
        const errorMsg = response.error || 'No se pudo subir el logo';
        toast({
          title: 'Error al subir logo',
          description: errorMsg,
          variant: 'destructive',
        });
        return false;
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Error inesperado al subir el logo',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteLogo = async (): Promise<boolean> => {
    if (!settings) return false;

    setIsUpdating(true);
    try {
      const response = await companyService.deleteLogo();
      if (response.success && response.data) {
        setSettings(response.data);
        localStorage.setItem('company_settings', JSON.stringify(response.data));
        
        toast({
          title: 'Logo eliminado',
          description: 'El logo de la empresa ha sido eliminado',
        });
        return true;
      } else {
        const errorMsg = response.error || 'No se pudo eliminar el logo';
        toast({
          title: 'Error al eliminar logo',
          description: errorMsg,
          variant: 'destructive',
        });
        return false;
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Error inesperado al eliminar el logo',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const refreshSettings = async (): Promise<void> => {
    setIsLoading(true);
    await loadSettings();
  };

  const value: CompanyContextType = {
    settings,
    isLoading,
    isUpdating,
    updateSettings,
    uploadLogo,
    deleteLogo,
    refreshSettings,
  };

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
};