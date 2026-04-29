'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useClientOnly } from '@/hooks/useClientOnly';
import { useCompany } from '@/contexts/CompanyContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Palette, Database, Building, Building2, Bell, Loader2, Receipt } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { SrLoadingText } from '@/components/common/SrLoadingText';

// Import tab components (admin-only settings)
import { CompanyTab } from './components/CompanyTab';
import { PerfilEmpresaTab } from './components/PerfilEmpresaTab';
import { AppearanceTab } from './components/AppearanceTab';
import { SystemTab } from './components/SystemTab';
import { NotificationsTab } from './components/NotificationsTab';
import { ImpuestosTab } from './components/ImpuestosTab';

function SettingsPageContent() {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const { data: session } = useSession();
  useClientOnly();
  const { settings, isUpdating, updateSettings, uploadLogo, deleteLogo } = useCompany();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Determinar rol del usuario
  const userRole = session?.user?.role || 'VENDEDOR';
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const isAdmin = userRole === 'ADMIN';

  // Non-admin users go to Profile (personal settings are there now)
  useEffect(() => {
    if (session && !isAdmin && !isSuperAdmin) {
      router.replace('/profile');
    }
  }, [session, isAdmin, isSuperAdmin, router]);

  const defaultTab = searchParams.get('tab') || 'perfil-empresa';
  const [activeTab, setActiveTab] = useState(defaultTab);

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

  // Don't render for non-admin (redirect in progress)
  if (!isAdmin && !isSuperAdmin) {
    return null;
  }

  return (
    <PageHeader
      breadcrumbs={[
        { label: tCommon('home'), href: '/dashboard' },
        { label: t('title') },
      ]}
      title={t('title')}
      subtitle={t('subtitle')}
    >
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
          <TabsTrigger value="perfil-empresa" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('tabs.companyProfile')}</span>
          </TabsTrigger>
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            <span className="hidden sm:inline">{t('tabs.brand')}</span>
          </TabsTrigger>
          <TabsTrigger value="impuestos" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Impuestos</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">{t('tabs.appearance')}</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">{t('tabs.notifications')}</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">{t('tabs.system')}</span>
          </TabsTrigger>
        </TabsList>

        {/* Perfil de Empresa - Datos fiscales y contacto */}
        <TabsContent value="perfil-empresa" className="space-y-6">
          <PerfilEmpresaTab />
        </TabsContent>

        {/* Company Tab - Apariencia: nombre, logo, colores */}
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

        {/* Impuestos Tab — catálogo de tasas de IVA/IEPS por tenant */}
        <TabsContent value="impuestos" className="space-y-6">
          <ImpuestosTab />
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <AppearanceTab />
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <NotificationsTab
            notifications={{ email: true, push: true, sms: false, desktop: true }}
            setNotifications={() => {}}
            isSuperAdmin={isSuperAdmin}
            isAdmin={isAdmin}
          />
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-6">
          <SystemTab
            companySettings={companySettings}
            isAdmin={isAdmin}
            isSuperAdmin={isSuperAdmin}
          />
        </TabsContent>

      </Tabs>
    </PageHeader>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div role="status" className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-green-600" aria-hidden="true" /><SrLoadingText /></div>}>
      <SettingsPageContent />
    </Suspense>
  );
}
