'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useGlobalSettings } from '@/contexts/GlobalSettingsContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
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
  Camera,
  Trash2,
  Upload,
} from 'lucide-react';

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
  const { data: session } = useSession();
  const router = useRouter();
  const {
    globalSettings,
    isLoading,
    isUpdating,
    updateGlobalSettings,
    uploadPlatformLogo,
    deletePlatformLogo,
  } = useGlobalSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);

  // Redirect if not SUPER_ADMIN
  useEffect(() => {
    if (session && session.user?.role !== 'SUPER_ADMIN') {
      toast({
        title: 'Acceso denegado',
        description: 'Solo los Super Administradores pueden acceder a esta página',
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
        description: 'No se pudieron guardar las configuraciones',
        variant: 'destructive',
      });
    }
  };

  const handleLogoUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Error',
          description: 'Por favor selecciona una imagen válida',
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'La imagen no puede ser mayor a 5MB',
          variant: 'destructive',
        });
        return;
      }

      await uploadPlatformLogo(file);
    }
  };

  const handleDeleteLogo = async () => {
    if (!settings?.platformLogo) return;
    await deletePlatformLogo();
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
        <p className="text-gray-500">No se pudieron cargar las configuraciones</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Settings className="h-6 w-6 text-purple-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Configuración Global</h1>
            </div>
            <p className="text-gray-600">
              Configuraciones que afectan a toda la plataforma HandyCRM
            </p>
            <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-800 text-sm font-medium">
              <Shield className="h-4 w-4 mr-1" />
              Solo Super Administrador
            </div>
          </div>

          <div className="space-y-6">
            {/* Platform Branding */}
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <Palette className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Marca de la Plataforma</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div data-tour="settings-platform">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de la plataforma
                  </label>
                  <Input
                    value={settings.platformName}
                    onChange={e => setSettings({ ...settings, platformName: e.target.value })}
                    placeholder="HandyCRM"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Logo de la plataforma
                  </label>
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Avatar className="h-16 w-16">
                        <AvatarImage
                          src={settings.platformLogo || ''}
                          alt="Logo de la plataforma"
                        />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg font-bold">
                          {settings.platformName
                            ? settings.platformName.charAt(0).toUpperCase()
                            : 'H'}
                        </AvatarFallback>
                      </Avatar>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                      />
                      <button
                        onClick={handleLogoUpload}
                        disabled={isUpdating}
                        className="absolute bottom-0 right-0 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-lg"
                        title={settings.platformLogo ? 'Cambiar logo' : 'Subir logo'}
                      >
                        {settings.platformLogo ? (
                          <Camera className="h-3.5 w-3.5" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                      </button>
                      {settings.platformLogo && (
                        <button
                          onClick={handleDeleteLogo}
                          disabled={isUpdating}
                          className="absolute -bottom-1 -left-1 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50"
                          title="Eliminar logo"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Máx. 5MB. Se mostrará en la parte superior izquierda.
                    </p>
                  </div>
                </div>

                <div data-tour="settings-colors">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color primario
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color secundario
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
                <h2 className="text-xl font-semibold text-gray-900">Configuración Regional</h2>
              </div>

              <div data-tour="settings-regional" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Idioma por defecto
                  </label>
                  <SearchableSelect
                    value={settings.defaultLanguage}
                    onValueChange={(value) => setSettings({ ...settings, defaultLanguage: value })}
                    options={[
                      { value: 'es', label: 'Español' },
                      { value: 'en', label: 'English' }
                    ]}
                    placeholder="Selecciona un idioma"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Zona horaria por defecto
                  </label>
                  <SearchableSelect
                    value={settings.defaultTimezone}
                    onValueChange={(value) => setSettings({ ...settings, defaultTimezone: value })}
                    options={[
                      { value: 'America/Mexico_City', label: 'México (GMT-6)' },
                      { value: 'America/New_York', label: 'Nueva York (GMT-5)' },
                      { value: 'America/Los_Angeles', label: 'Los Ángeles (GMT-8)' },
                      { value: 'Europe/Madrid', label: 'Madrid (GMT+1)' }
                    ]}
                    placeholder="Selecciona una zona horaria"
                  />
                </div>
              </div>
            </Card>

            {/* Security & Access */}
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <Shield className="h-5 w-5 text-orange-600" />
                <h2 className="text-xl font-semibold text-gray-900">Seguridad y Acceso</h2>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Permitir auto-registro</h3>
                    <p className="text-sm text-gray-500">
                      Los usuarios pueden registrarse sin invitación
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
                    <h3 className="text-sm font-medium text-gray-900">
                      Verificación de email requerida
                    </h3>
                    <p className="text-sm text-gray-500">Los usuarios deben verificar su email</p>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Máximo usuarios por empresa
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
                      placeholder="Sin límite"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Máximo almacenamiento por empresa (MB)
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
                      placeholder="Sin límite"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Maintenance Mode */}
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h2 className="text-xl font-semibold text-gray-900">Modo de Mantenimiento</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      Activar modo de mantenimiento
                    </h3>
                    <p className="text-sm text-gray-500">
                      Bloquea el acceso a la plataforma para todos los usuarios excepto Super Admin
                    </p>
                  </div>
                  <Switch
                    checked={settings.maintenanceMode}
                    onCheckedChange={checked =>
                      setSettings({ ...settings, maintenanceMode: checked })
                    }
                  />
                </div>

                {settings.maintenanceMode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mensaje de mantenimiento
                    </label>
                    <textarea
                      value={settings.maintenanceMessage || ''}
                      onChange={e =>
                        setSettings({ ...settings, maintenanceMessage: e.target.value || null })
                      }
                      placeholder="La plataforma está en mantenimiento. Volveremos pronto."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
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
                Recargar
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
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Configuración
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Footer Info */}
          <div className="mt-8 text-center text-sm text-gray-500">
            Última actualización: {new Date(settings.updatedAt).toLocaleString('es-MX')}
          </div>
        </div>
      </div>
  );
}
