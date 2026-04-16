'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { CompanySettings, UpdateCompanyRequest, companyService } from '@/services/api/companyService';
import { toast } from '@/hooks/useToast';
import { useUIStore } from '@/stores/useUIStore';
import { useTranslations } from 'next-intl';
// Convert hex color to HSL string for CSS variables (e.g. "142 71% 45%")
function hexToHsl(hex: string): string | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

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
  const { data: session, status } = useSession();
  const t = useTranslations('settings.company.toast');
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadSettings = useCallback(async () => {
    // Solo cargar si hay una sesión autenticada confirmada
    if (status !== 'authenticated' || !session) {
      setIsLoading(false);
      return;
    }
    try {
      const response = await companyService.getCompanySettings();
      if (response.success && response.data) {
        setSettings(response.data);
        
        // Aplicar configuración visual inmediatamente
        // Solo aplica si el color fue explícitamente configurado (no el default del sistema #007bff)
        const SYSTEM_DEFAULT_PRIMARY = '#007bff';
        const SYSTEM_DEFAULT_SECONDARY = '#6c757d';
        if (response.data.companyPrimaryColor && response.data.companyPrimaryColor !== SYSTEM_DEFAULT_PRIMARY) {
          document.documentElement.style.setProperty('--company-primary-color', response.data.companyPrimaryColor);
          // Update CSS design-system tokens so <Button>, focus rings, etc. use company color
          const hsl = hexToHsl(response.data.companyPrimaryColor);
          if (hsl) {
            document.documentElement.style.setProperty('--primary', hsl);
            document.documentElement.style.setProperty('--success', hsl);
            document.documentElement.style.setProperty('--ring', hsl);
          }
        }
        if (response.data.companySecondaryColor && response.data.companySecondaryColor !== SYSTEM_DEFAULT_SECONDARY) {
          document.documentElement.style.setProperty('--company-secondary-color', response.data.companySecondaryColor);
        }

        // Guardar en localStorage como respaldo
        localStorage.setItem('company_settings', JSON.stringify(response.data));

        // Sync theme from DB to Zustand store (DB wins over localStorage)
        if (response.data.theme === 'dark' || response.data.theme === 'light') {
          useUIStore.getState().setTheme(response.data.theme);
        }
      } else {
        // Fallback a configuración por defecto usando el tenant del usuario
        const defaultSettings: CompanySettings = {
          id: '1',
          tenantId: session?.user?.tenantId || 1,
          companyName: 'Mi Empresa',
          timezone: 'America/Mexico_City',
          currency: 'MXN',
          language: 'es',
          theme: 'light',
          country: 'MX',
          subscriptionStatus: 'TRIAL',
          subscriptionPlan: 'Trial',
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
          timezone: 'America/Mexico_City',
          currency: 'MXN',
          language: 'es',
          theme: 'light',
          country: 'MX',
          subscriptionStatus: 'TRIAL',
          subscriptionPlan: 'Trial',
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
  }, [session, status]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSettings = useCallback(async (data: UpdateCompanyRequest): Promise<boolean> => {
    if (!settings) return false;

    setIsUpdating(true);
    try {
      const response = await companyService.updateCompanySettings(data);
      if (response.success && response.data) {
        setSettings(response.data);
        
        // Aplicar cambios visuales inmediatamente
        const SYS_DEFAULT_PRIMARY = '#007bff';
        const SYS_DEFAULT_SECONDARY = '#6c757d';
        if (response.data.companyPrimaryColor && response.data.companyPrimaryColor !== SYS_DEFAULT_PRIMARY) {
          document.documentElement.style.setProperty('--company-primary-color', response.data.companyPrimaryColor);
          const hsl = hexToHsl(response.data.companyPrimaryColor);
          if (hsl) {
            document.documentElement.style.setProperty('--primary', hsl);
            document.documentElement.style.setProperty('--success', hsl);
            document.documentElement.style.setProperty('--ring', hsl);
          }
        }
        if (response.data.companySecondaryColor && response.data.companySecondaryColor !== SYS_DEFAULT_SECONDARY) {
          document.documentElement.style.setProperty('--company-secondary-color', response.data.companySecondaryColor);
        }

        // Actualizar localStorage
        localStorage.setItem('company_settings', JSON.stringify(response.data));
        
        toast({
          title: t('settingsUpdatedTitle'),
          description: t('settingsUpdatedDesc'),
        });
        return true;
      } else {
        // Fallback: actualizar localmente si la API falla
        const updatedSettings = { ...settings, ...data, updatedAt: new Date() };
        setSettings(updatedSettings);
        localStorage.setItem('company_settings', JSON.stringify(updatedSettings));
        
        toast({
          title: t('settingsSavedLocalTitle'),
          description: t('settingsSavedLocalDesc'),
        });
        return false;
      }
    } catch (_error) {
      toast({
        title: t('errorTitle'),
        description: t('settingsUpdateError'),
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [settings]);

  const uploadLogo = useCallback(async (file: File): Promise<boolean> => {
    if (!settings) return false;

    setIsUpdating(true);
    try {
      const response = await companyService.uploadLogo(file);
      if (response.success && response.data) {
        const updatedSettings = { ...settings, companyLogo: response.data.logoUrl, updatedAt: new Date() };
        setSettings(updatedSettings);
        localStorage.setItem('company_settings', JSON.stringify(updatedSettings));
        
        toast({
          title: t('logoUpdatedTitle'),
          description: t('logoUpdatedDesc'),
        });
        return true;
      } else {
        const errorMsg = response.error || t('logoUploadError');
        toast({
          title: t('logoUploadErrorTitle'),
          description: errorMsg,
          variant: 'destructive',
        });
        return false;
      }
    } catch {
      toast({
        title: t('errorTitle'),
        description: t('logoUploadUnexpected'),
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [settings]);

  const deleteLogo = useCallback(async (): Promise<boolean> => {
    if (!settings) return false;

    setIsUpdating(true);
    try {
      const response = await companyService.deleteLogo();
      if (response.success && response.data) {
        setSettings(response.data);
        localStorage.setItem('company_settings', JSON.stringify(response.data));
        
        toast({
          title: t('logoDeletedTitle'),
          description: t('logoDeletedDesc'),
        });
        return true;
      } else {
        const errorMsg = response.error || t('logoDeleteError');
        toast({
          title: t('logoDeleteErrorTitle'),
          description: errorMsg,
          variant: 'destructive',
        });
        return false;
      }
    } catch {
      toast({
        title: t('errorTitle'),
        description: t('logoDeleteUnexpected'),
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [settings]);

  const refreshSettings = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    await loadSettings();
  }, [loadSettings]);

  const value = useMemo<CompanyContextType>(() => ({
    settings,
    isLoading,
    isUpdating,
    updateSettings,
    uploadLogo,
    deleteLogo,
    refreshSettings,
  }), [settings, isLoading, isUpdating, updateSettings, uploadLogo, deleteLogo, refreshSettings]);

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
};