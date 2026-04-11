'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useGlobalSettings } from '@/contexts/GlobalSettingsContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { toast } from '@/hooks/useToast';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  Settings,
  Palette,
  Globe,
  Shield,
  AlertTriangle,
  Save,
  RotateCcw,
} from 'lucide-react';
import { useFormatters } from '@/hooks/useFormatters';

interface GlobalSettings {
  id: string;
  platformName: string;
  platformLogo?: string | null | undefined;
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

export default function GlobalSettingsPage() {
  const { formatDate, formatNumber } = useFormatters();
  const { data: session } = useSession();
  const router = useRouter();
  const t = useTranslations('globalSettings');
  const {
    globalSettings,
    isLoading,
    isUpdating,
    updateGlobalSettings,
    uploadPlatformLogo,
    deletePlatformLogo,
  } = useGlobalSettings();
  const [settings, setSettings] = useState<GlobalSettings | null>(null);

  // Redirect if not SUPER_ADMIN
  useEffect(() => {
    if (session && session.user?.role !== 'SUPER_ADMIN') {
      toast({
        title: t('accessDenied'),
        description: t('accessDeniedDesc'),
        variant: 'destructive',
      });
      router.push('/dashboard');
    }
  }, [session, router]);

  // Sync local state with context
  useEffect(() => {
    if (globalSettings) {
      setSettings({
        ...globalSettings,
        maxUsersPerCompany: globalSettings.maxUsersPerCompany ?? null,
        maxStoragePerCompany: globalSettings.maxStoragePerCompany ?? null,
        maintenanceMessage: globalSettings.maintenanceMessage ?? null,
        updatedAt:
          globalSettings.updatedAt instanceof Date
            ? globalSettings.updatedAt.toISOString()
            : globalSettings.updatedAt,
        updatedBy: globalSettings.updatedBy ?? null,
      });
    }
  }, [globalSettings]);

  const handleSave = async () => {
    if (!settings) return;

    const success = await updateGlobalSettings({
      platformName: settings.platformName,
      platformLogo: settings.platformLogo || undefined,
      platformPrimaryColor: settings.platformPrimaryColor,
      platformSecondaryColor: settings.platformSecondaryColor,
      defaultLanguage: settings.defaultLanguage,
      defaultTimezone: settings.defaultTimezone,
      allowSelfRegistration: settings.allowSelfRegistration,
      requireEmailVerification: settings.requireEmailVerification,
      maxUsersPerCompany: settings.maxUsersPerCompany || undefined,
      maxStoragePerCompany: settings.maxStoragePerCompany || undefined,
      maintenanceMode: settings.maintenanceMode,
      maintenanceMessage: settings.maintenanceMessage || undefined,
    });

    if (!success) {
      toast({
        title: 'Error',
        description: t('errorSaving'),
        variant: 'destructive',
      });
    }
  };


  if (session?.user?.role !== 'SUPER_ADMIN') {
    return null; // Will redirect
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">{t('errorLoading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Settings className="h-6 w-6 text-purple-600" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
            </div>
            <p className="text-foreground/70">
              {t('subtitle')}
            </p>
            <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-800 text-sm font-medium">
              <Shield className="h-4 w-4 mr-1" />
              {t('superAdminOnly')}
            </div>
          </div>

          <div className="space-y-6">
            {/* Platform Branding */}
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <Palette className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-foreground">{t('branding.title')}</h2>
                <span className="text-xs bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full">{t('branding.activeHint')}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div data-tour="settings-platform">
                  <label className="block text-sm font-medium text-foreground/80 mb-2">
                    {t('branding.platformName')}
                  </label>
                  <Input
                    value={settings.platformName}
                    onChange={e => setSettings({ ...settings, platformName: e.target.value })}
                    placeholder="Handy Suites"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-2">
                    {t('branding.platformLogo')}
                  </label>
                  <div className="flex items-center space-x-4">
                    <ImageUpload
                      variant="avatar"
                      src={settings.platformLogo}
                      alt={t('branding.logoAlt')}
                      fallback={settings.platformName ? settings.platformName.charAt(0).toUpperCase() : 'H'}
                      fallbackClassName="bg-primary/15 text-primary"
                      size="md"
                      maxSizeMB={2}
                      hint={t('branding.logoHint')}
                      disabled={isUpdating}
                      onUpload={uploadPlatformLogo}
                      onDelete={deletePlatformLogo}
                    />
                  </div>
                </div>

                <div data-tour="settings-colors">
                  <label className="block text-sm font-medium text-foreground/80 mb-2">
                    {t('branding.primaryColor')}
                  </label>
                  <div className="flex space-x-2">
                    <Input
                      type="color"
                      value={settings.platformPrimaryColor}
                      onChange={e =>
                        setSettings({ ...settings, platformPrimaryColor: e.target.value })
                      }
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={settings.platformPrimaryColor}
                      onChange={e =>
                        setSettings({ ...settings, platformPrimaryColor: e.target.value })
                      }
                      placeholder="#3B82F6"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-2">
                    {t('branding.secondaryColor')}
                  </label>
                  <div className="flex space-x-2">
                    <Input
                      type="color"
                      value={settings.platformSecondaryColor}
                      onChange={e =>
                        setSettings({ ...settings, platformSecondaryColor: e.target.value })
                      }
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={settings.platformSecondaryColor}
                      onChange={e =>
                        setSettings({ ...settings, platformSecondaryColor: e.target.value })
                      }
                      placeholder="#8B5CF6"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Regional Settings */}
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <Globe className="h-5 w-5 text-green-600" />
                <h2 className="text-xl font-semibold text-foreground">{t('regional.title')}</h2>
                <span className="text-xs bg-surface-3 text-muted-foreground px-2 py-0.5 rounded-full">{t('regional.comingSoon')}</span>
              </div>

              <div data-tour="settings-regional" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-2">
                    {t('regional.defaultLanguage')}
                  </label>
                  <SearchableSelect
                    value={settings.defaultLanguage}
                    onChange={(value) => setSettings({ ...settings, defaultLanguage: String(value) })}
                    options={[
                      { value: 'es', label: t('regional.langEs') },
                      { value: 'en', label: t('regional.langEn') }
                    ]}
                    placeholder={t('regional.selectLanguage')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-2">
                    {t('regional.defaultTimezone')}
                  </label>
                  <SearchableSelect
                    value={settings.defaultTimezone}
                    onChange={(value) => setSettings({ ...settings, defaultTimezone: String(value) })}
                    options={[
                      { value: 'America/Mexico_City', label: t('regional.tzMexico') },
                      { value: 'America/New_York', label: t('regional.tzNewYork') },
                      { value: 'America/Los_Angeles', label: t('regional.tzLosAngeles') },
                      { value: 'Europe/Madrid', label: t('regional.tzMadrid') }
                    ]}
                    placeholder={t('regional.selectTimezone')}
                  />
                </div>
              </div>
            </Card>

            {/* Security & Access */}
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <Shield className="h-5 w-5 text-orange-600" />
                <h2 className="text-xl font-semibold text-foreground">{t('security.title')}</h2>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-foreground">{t('security.selfRegistration')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('security.selfRegistrationDesc')}
                    </p>
                  </div>
                  <Switch
                    checked={settings.allowSelfRegistration}
                    onCheckedChange={checked =>
                      setSettings({ ...settings, allowSelfRegistration: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-foreground">
                      {t('security.emailVerification')}
                    </h3>
                    <p className="text-sm text-muted-foreground">{t('security.emailVerificationDesc')}</p>
                  </div>
                  <Switch
                    checked={settings.requireEmailVerification}
                    onCheckedChange={checked =>
                      setSettings({ ...settings, requireEmailVerification: checked })
                    }
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-2">
                      {t('security.maxUsers')}
                      <span className="ml-2 text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded">{t('security.maxUsersNotEnforced')}</span>
                    </label>
                    <Input
                      type="number"
                      value={settings.maxUsersPerCompany || ''}
                      onChange={e =>
                        setSettings({
                          ...settings,
                          maxUsersPerCompany: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                      placeholder={t('security.noLimit')}
                    />
                    <p className="text-xs text-muted-foreground mt-1">{t('security.maxUsersHint')}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-2">
                      {t('security.maxStorage')}
                      <span className="ml-2 text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded">{t('security.maxStorageNotEnforced')}</span>
                    </label>
                    <Input
                      type="number"
                      value={settings.maxStoragePerCompany || ''}
                      onChange={e =>
                        setSettings({
                          ...settings,
                          maxStoragePerCompany: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                      placeholder={t('security.noLimit')}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* H9: Maintenance Mode — redirected to Announcements */}
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h2 className="text-xl font-semibold text-foreground">{t('maintenance.title')}</h2>
              </div>

              <div className="flex items-center justify-between p-4 bg-surface-1 rounded-lg">
                <div>
                  <p className="text-sm text-foreground/80">
                    {t('maintenance.description')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('maintenance.currentStatus')} {settings.maintenanceMode ? (
                      <span className="text-red-600 font-medium">{t('maintenance.statusActive')}</span>
                    ) : (
                      <span className="text-green-600 font-medium">{t('maintenance.statusInactive')}</span>
                    )}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => router.push('/admin/announcements')}
                  className="flex-shrink-0 ml-4"
                >
                  {t('maintenance.goToAnnouncements')}
                </Button>
              </div>
            </Card>

            {/* Save Actions */}
            <div className="flex justify-end space-x-4">
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                disabled={isUpdating}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {t('reload')}
              </Button>

              <Button
                data-tour="settings-save"
                onClick={handleSave}
                disabled={isUpdating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isUpdating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t('savingLabel')}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {t('saveConfig')}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Footer Info */}
          <div className="text-center text-sm text-muted-foreground">
            {t('lastUpdated', { date: formatDate(settings.updatedAt) })}
          </div>
      </div>
  );
}
