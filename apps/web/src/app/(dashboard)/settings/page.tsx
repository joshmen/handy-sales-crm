'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useClientOnly } from '@/hooks/useClientOnly';
import { useCompany } from '@/contexts/CompanyContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchBar } from '@/components/common/SearchBar';
import {
  Settings,
  Palette,
  Database,
  Building2,
  Bell,
  Sun,
  ShieldCheck,
  Receipt,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { SrLoadingText } from '@/components/common/SrLoadingText';

// Import tab components (admin-only settings)
import { CompanyTab } from './components/CompanyTab';
import { PerfilEmpresaTab } from './components/PerfilEmpresaTab';
import { AppearanceTab } from './components/AppearanceTab';
import { SystemTab } from './components/SystemTab';
import { NotificationsTab } from './components/NotificationsTab';
import { RolesPermisosPanel } from './components/RolesPermisosPanel';

type RailItem = {
  value: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  /** Si está presente, el ítem navega a otra sección (no abre un panel). */
  href?: string;
};
type RailGroup = { label: string; items: RailItem[] };

const GROUPS: RailGroup[] = [
  {
    label: 'General',
    items: [
      { value: 'perfil-empresa', label: 'Perfil de empresa', icon: Building2 },
      { value: 'company', label: 'Marca', icon: Palette },
      { value: 'appearance', label: 'Apariencia', icon: Sun },
    ],
  },
  {
    label: 'Operación',
    items: [
      { value: 'system', label: 'Sistema', icon: Database },
      { value: 'notifications', label: 'Notificaciones', icon: Bell },
    ],
  },
  {
    label: 'Seguridad',
    items: [{ value: 'roles', label: 'Roles y permisos', icon: ShieldCheck }],
  },
  {
    label: 'Facturación',
    items: [{ value: 'fiscal', label: 'Configuración fiscal', icon: Receipt, href: '/billing/settings' }],
  },
];

const PANEL_VALUES = ['perfil-empresa', 'company', 'appearance', 'system', 'notifications', 'roles'];

function SettingsPageContent() {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const { data: session } = useSession();
  useClientOnly();
  const { settings, isUpdating, updateSettings, uploadLogo, deleteLogo } = useCompany();
  const router = useRouter();
  const searchParams = useSearchParams();

  const userRole = session?.user?.role || 'VENDEDOR';
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const isAdmin = userRole === 'ADMIN';

  useEffect(() => {
    if (session && !isAdmin && !isSuperAdmin) {
      router.replace('/profile');
    }
  }, [session, isAdmin, isSuperAdmin, router]);

  const urlTab = searchParams.get('tab') || 'perfil-empresa';
  const [activeTab, setActiveTab] = useState(PANEL_VALUES.includes(urlTab) ? urlTab : 'perfil-empresa');
  const [railSearch, setRailSearch] = useState('');

  const [companySettings, setCompanySettings] = useState({
    name: settings?.companyName || 'Mi Empresa',
    logo: settings?.companyLogo || '',
    primaryColor: settings?.companyPrimaryColor || '#0176D3',
    secondaryColor: settings?.companySecondaryColor || '#0B5CAB',
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState({
    name: settings?.companyName || 'Mi Empresa',
    logo: settings?.companyLogo || '',
    primaryColor: settings?.companyPrimaryColor || '#0176D3',
    secondaryColor: settings?.companySecondaryColor || '#0B5CAB',
  });

  useEffect(() => {
    if (settings) {
      const newSettings = {
        name: settings.companyName || 'Mi Empresa',
        logo: settings.companyLogo || '',
        primaryColor: settings.companyPrimaryColor || '#0176D3',
        secondaryColor: settings.companySecondaryColor || '#0B5CAB',
      };
      setCompanySettings(newSettings);
      setOriginalSettings(newSettings);
    }
  }, [settings]);

  useEffect(() => {
    setHasChanges(JSON.stringify(companySettings) !== JSON.stringify(originalSettings));
  }, [companySettings, originalSettings]);

  const activeItem = useMemo(
    () => GROUPS.flatMap((g) => g.items.map((it) => ({ ...it, group: g.label }))).find((it) => it.value === activeTab),
    [activeTab],
  );

  const filteredGroups = useMemo(() => {
    const q = railSearch.trim().toLowerCase();
    if (!q) return GROUPS;
    return GROUPS.map((g) => ({ ...g, items: g.items.filter((it) => it.label.toLowerCase().includes(q)) })).filter(
      (g) => g.items.length > 0,
    );
  }, [railSearch]);

  const selectTab = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(searchParams);
    params.set('tab', value);
    router.push(`/settings?${params.toString()}`, { scroll: false });
  };

  if (!isAdmin && !isSuperAdmin) {
    return null;
  }

  return (
    <PageHeader
      section="empresa"
      icon={Settings}
      breadcrumbs={[
        { label: tCommon('home'), href: '/dashboard' },
        { label: t('title') },
      ]}
      title={t('title')}
      subtitle={t('subtitle')}
    >
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Rail tipo Setup */}
        <aside className="lg:w-[230px] lg:flex-shrink-0 lg:sticky lg:top-4 lg:self-start">
          <SearchBar value={railSearch} onChange={setRailSearch} placeholder="Buscar configuración" className="mb-3 w-full" />
          <nav className="space-y-4">
            {filteredGroups.map((group) => (
              <div key={group.label}>
                <div className="mb-1 px-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70">
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    if (item.href) {
                      return (
                        <a
                          key={item.value}
                          href={item.href}
                          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <Icon size={16} />
                          <span className="flex-1">{item.label}</span>
                          <ExternalLink size={13} className="text-muted-foreground/60" />
                        </a>
                      );
                    }
                    const active = activeTab === item.value;
                    return (
                      <button
                        key={item.value}
                        onClick={() => selectTab(item.value)}
                        aria-current={active ? 'page' : undefined}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          active ? 'bg-primary/10 text-primary' : 'text-foreground/70 hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        <Icon size={16} />
                        <span className="flex-1 text-left">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {filteredGroups.length === 0 && (
              <p className="px-2 text-xs text-muted-foreground">Sin resultados.</p>
            )}
          </nav>
        </aside>

        {/* Panel derecho */}
        <div className="min-w-0 flex-1">
          {activeItem && (
            <div className="mb-4">
              <div className="text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">{activeItem.group}</div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">{activeItem.label}</h2>
            </div>
          )}

          {activeTab === 'perfil-empresa' && <PerfilEmpresaTab />}

          {activeTab === 'company' && (
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
          )}

          {activeTab === 'appearance' && <AppearanceTab />}

          {activeTab === 'notifications' && (
            <NotificationsTab
              notifications={{ email: true, push: true, sms: false, desktop: true }}
              setNotifications={() => {}}
              isSuperAdmin={isSuperAdmin}
              isAdmin={isAdmin}
            />
          )}

          {activeTab === 'system' && (
            <SystemTab companySettings={companySettings} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} />
          )}

          {activeTab === 'roles' && <RolesPermisosPanel />}
        </div>
      </div>
    </PageHeader>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div role="status" className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
          <SrLoadingText />
        </div>
      }
    >
      <SettingsPageContent />
    </Suspense>
  );
}
