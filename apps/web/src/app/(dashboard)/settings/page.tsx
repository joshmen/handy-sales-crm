'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useClientOnly } from '@/hooks/useClientOnly';
import { useCompany } from '@/contexts/CompanyContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Bell, Shield, Palette, Database, Building } from 'lucide-react';
import { useSession } from 'next-auth/react';

// Import tab components
import { CompanyTab } from './components/CompanyTab';
import { NotificationsTab } from './components/NotificationsTab';
import { SecurityTab } from './components/SecurityTab';
import { AppearanceTab } from './components/AppearanceTab';
import { SystemTab } from './components/SystemTab';
import { BillingTab } from './components/BillingTab';

export default function SettingsPage() {
  const { data: session } = useSession();
  const isClient = useClientOnly();
  const { settings, isUpdating, updateSettings, uploadLogo, deleteLogo } = useCompany();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Determinar rol del usuario
  const userRole = session?.user?.role || 'VENDEDOR';
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const isAdmin = userRole === 'ADMIN';
  const isVendedor = userRole === 'VENDEDOR';

  // Get tab from URL params, default to "company" for admins only, "notifications" for others
  // Note: Only ADMIN (not SUPER_ADMIN) can access company settings as they are tenant-specific
  const defaultTab = searchParams.get('tab') || (isAdmin ? 'company' : 'notifications');
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    desktop: true,
  });
  const [originalNotifications, setOriginalNotifications] = useState(notifications);

  const [profile, setProfile] = useState({
    name: session?.user?.name || 'Carlos Mendoza',
    email: session?.user?.email || 'carlos.mendoza@handy.com',
    phone: '+52 644 123 4567',
    territory: 'Zona Norte',
    role: userRole,
    avatar: session?.user?.image || '',
    bio: 'Vendedor especializado en zona norte con 5 años de experiencia.',
  });

  const [companySettings, setCompanySettings] = useState({
    name: settings?.companyName || 'Mi Empresa',
    logo: settings?.companyLogo || '',
    primaryColor: settings?.companyPrimaryColor || '#3B82F6',
    secondaryColor: settings?.companySecondaryColor || '#8B5CF6',
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState({
    name: settings?.companyName || 'Mi Empresa',
    logo: settings?.companyLogo || '',
    primaryColor: settings?.companyPrimaryColor || '#3B82F6',
    secondaryColor: settings?.companySecondaryColor || '#8B5CF6',
  });

  // Sincronizar con el contexto cuando cambie
  useEffect(() => {
    if (settings) {
      const newSettings = {
        name: settings.companyName || 'Mi Empresa',
        logo: settings.companyLogo || '',
        primaryColor: settings.companyPrimaryColor || '#3B82F6',
        secondaryColor: settings.companySecondaryColor || '#8B5CF6',
      };
      setCompanySettings(newSettings);
      setOriginalSettings(newSettings);
    }
  }, [settings]);

  // Detectar cambios en la configuración
  useEffect(() => {
    const changed = JSON.stringify(companySettings) !== JSON.stringify(originalSettings);
    setHasChanges(changed);
  }, [companySettings, originalSettings]);

  const handleSaveProfile = () => {
    // Aquí iría la lógica para guardar el perfil
    console.log('Guardando perfil:', profile);
  };

  return (
    <div className="flex-1 space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
            <p className="text-muted-foreground">
              Gestiona tu perfil y configuraciones del sistema
            </p>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={value => {
            setActiveTab(value);
            const params = new URLSearchParams(searchParams);
            params.set('tab', value);
            router.push(`/settings?${params.toString()}`, { scroll: false });
          }}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-6">
            {isAdmin && (
              <TabsTrigger value="company" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Mi Empresa
              </TabsTrigger>
            )}
            {(isAdmin || isSuperAdmin) && (
              <TabsTrigger value="billing" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Facturación
              </TabsTrigger>
            )}
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notificaciones
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Seguridad
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Apariencia
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Sistema
            </TabsTrigger>
          </TabsList>

          {/* Company Tab - Solo para Administradores (no Super Admin) */}
          {isAdmin && (
            <TabsContent value="company" className="space-y-6">
              <CompanyTab
                companySettings={companySettings}
                setCompanySettings={setCompanySettings}
                originalSettings={originalSettings}
                setOriginalSettings={setOriginalSettings}
                hasChanges={hasChanges}
                setHasChanges={setHasChanges}
                isUpdating={isUpdating}
                updateSettings={updateSettings}
                uploadLogo={uploadLogo}
                deleteLogo={deleteLogo}
                settings={settings}
              />
            </TabsContent>
          )}

          {/* Billing Tab */}
          {(isAdmin || isSuperAdmin) && (
            <TabsContent value="billing" className="space-y-6">
              <BillingTab isSuperAdmin={isSuperAdmin} isAdmin={isAdmin} />
            </TabsContent>
          )}

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <NotificationsTab
              notifications={notifications}
              setNotifications={setNotifications}
              isSuperAdmin={isSuperAdmin}
              isAdmin={isAdmin}
            />
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <SecurityTab />
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6">
            <AppearanceTab isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="space-y-6">
            <SystemTab
              profile={profile}
              notifications={notifications}
              isDarkMode={isDarkMode}
              companySettings={companySettings}
              isAdmin={isAdmin}
              isSuperAdmin={isSuperAdmin}
            />
          </TabsContent>
        </Tabs>
      </div>
  );
}
