'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Megaphone,
  Plus,
  Trash2,
  Loader2,
  Wrench,
  Info,
  Radio,
  AlertTriangle,
  Power,
  PowerOff,
  Clock,
  Eye,
  Bell,
  Monitor,
  Layers,
  Users,
  Building2,
  Globe,
  Search,
} from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { toast } from '@/hooks/useToast';
import {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  activateMaintenance,
  deactivateMaintenance,
  AnnouncementListItem,
  CreateAnnouncementRequest,
} from '@/services/api/announcements';
import { tenantService } from '@/services/api/tenants';
import type { Tenant } from '@/types/tenant';
import { useFormatters } from '@/hooks/useFormatters';
import { useTranslations } from 'next-intl';

const tipoIcons: Record<string, { icon: React.ReactNode; color: string }> = {
  Broadcast: { icon: <Radio className="h-4 w-4" />, color: 'bg-purple-100 text-purple-700' },
  Maintenance: { icon: <Wrench className="h-4 w-4" />, color: 'bg-red-100 text-red-700' },
  Banner: { icon: <Info className="h-4 w-4" />, color: 'bg-blue-100 text-blue-700' },
};

const prioridadColors: Record<string, string> = {
  Low: 'bg-surface-3 text-foreground/70',
  Normal: 'bg-blue-100 text-blue-600',
  High: 'bg-amber-100 text-amber-700',
  Critical: 'bg-red-100 text-red-700',
};

const displayModeIcons: Record<string, { icon: React.ReactNode; color: string }> = {
  Banner: { icon: <Monitor className="h-4 w-4" />, color: 'bg-blue-100 text-blue-700' },
  Notification: { icon: <Bell className="h-4 w-4" />, color: 'bg-teal-100 text-teal-700' },
  Both: { icon: <Layers className="h-4 w-4" />, color: 'bg-purple-100 text-purple-700' },
};

export default function AnnouncementsPage() {
  const t = useTranslations('admin.announcements');
  const { formatDate } = useFormatters();
  const { data: session } = useSession();
  const router = useRouter();

  const [announcements, setAnnouncements] = useState<AnnouncementListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [form, setForm] = useState<CreateAnnouncementRequest>({
    titulo: '',
    mensaje: '',
    tipo: 'Banner',
    prioridad: 'Normal',
    displayMode: 'Banner',
    isDismissible: true,
  });

  // Targeting state
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [targetMode, setTargetMode] = useState<'all' | 'tenants' | 'roles'>('all');
  const [selectedTenantIds, setSelectedTenantIds] = useState<number[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [tenantSearch, setTenantSearch] = useState('');

  // Maintenance mode state
  const [maintenanceActive, setMaintenanceActive] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState('');
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);

  // Translation maps (inside component to use t())
  const tipoLabelMap: Record<string, string> = { Broadcast: t('typeBroadcast'), Maintenance: t('typeMaintenance'), Banner: t('typeBanner') };
  const prioridadLabelMap: Record<string, string> = { Low: t('priorityLow'), Normal: t('priorityNormal'), High: t('priorityHigh'), Critical: t('priorityCritical') };
  const displayModeLabelMap: Record<string, string> = { Banner: t('destinationBanner'), Notification: t('destinationNotification'), Both: t('destinationBoth') };
  const displayModeDescMap: Record<string, string> = { Banner: t('destinationBannerDesc'), Notification: t('destinationNotificationDesc'), Both: t('destinationBothDesc') };

  // Check access
  const userRole = (session?.user as { role?: string })?.role;
  useEffect(() => {
    if (session && userRole !== 'SUPER_ADMIN') {
      router.push('/admin/access-denied');
    }
  }, [session, userRole, router]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAnnouncements(page);
      setAnnouncements(data.items);
      setTotal(data.total);

      // Check if any maintenance announcement is active
      const hasMaintenance = data.items.some(
        (a) => a.tipo === 'Maintenance' && a.activo
      );
      setMaintenanceActive(hasMaintenance);
    } catch {
      toast.error(t('errorLoading'));
    } finally {
      setLoading(false);
    }
  }, [page, t]);

  useEffect(() => {
    if (userRole === 'SUPER_ADMIN') {
      fetchData();
      tenantService.getAll().then(setTenants).catch(() => {});
    }
  }, [userRole, fetchData]);

  const handleCreate = async () => {
    if (!form.titulo.trim() || !form.mensaje.trim()) {
      toast.error(t('titleRequired'));
      return;
    }
    if (targetMode === 'tenants' && selectedTenantIds.length === 0) {
      toast.error(t('selectAtLeastOneTenant'));
      return;
    }
    if (targetMode === 'roles' && selectedRoles.length === 0) {
      toast.error(t('selectAtLeastOneRole'));
      return;
    }
    setCreating(true);
    try {
      const payload: CreateAnnouncementRequest = {
        ...form,
        targetTenantIds: targetMode === 'tenants' ? selectedTenantIds : undefined,
        targetRoles: targetMode === 'roles' ? selectedRoles : undefined,
      };
      await createAnnouncement(payload);
      toast.success(t('announcementCreated'));
      setDrawerOpen(false);
      setForm({ titulo: '', mensaje: '', tipo: 'Banner', prioridad: 'Normal', displayMode: 'Banner', isDismissible: true });
      setTargetMode('all');
      setSelectedTenantIds([]);
      setSelectedRoles([]);
      fetchData();
    } catch {
      toast.error(t('errorCreating'));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteAnnouncement(id);
      toast.success(t('announcementExpired'));
      fetchData();
    } catch {
      toast.error(t('errorExpiring'));
    }
  };

  const handleToggleMaintenance = async () => {
    setTogglingMaintenance(true);
    try {
      if (maintenanceActive) {
        await deactivateMaintenance();
        toast.success(t('maintenanceDeactivated'));
        setMaintenanceActive(false);
      } else {
        await activateMaintenance(maintenanceMsg || undefined);
        toast.success(t('maintenanceActivated'));
        setMaintenanceActive(true);
      }
      fetchData();
    } catch {
      toast.error(t('maintenanceError'));
    } finally {
      setTogglingMaintenance(false);
    }
  };

  if (userRole !== 'SUPER_ADMIN') return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-purple-600" />
            {t('title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('subtitle')}
          </p>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t('newAnnouncement')}
        </button>
      </div>

      {/* Maintenance Quick Toggle */}
      <div className={`rounded-xl border p-4 ${maintenanceActive ? 'bg-red-50 border-red-200' : 'bg-surface-1 border-border-subtle'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${maintenanceActive ? 'bg-red-100' : 'bg-surface-3'}`}>
              <Wrench className={`h-5 w-5 ${maintenanceActive ? 'text-red-600' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">
                {t('maintenanceMode')}
                <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${maintenanceActive ? 'bg-red-100 text-red-700' : 'bg-surface-3 text-foreground/70'}`}>
                  {maintenanceActive ? t('maintenanceActive') : t('maintenanceInactive')}
                </span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('maintenanceDesc')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!maintenanceActive && (
              <input
                type="text"
                placeholder={t('maintenanceMessagePlaceholder')}
                value={maintenanceMsg}
                onChange={(e) => setMaintenanceMsg(e.target.value)}
                className="h-9 px-3 border border-border-default rounded-lg text-sm w-64 hidden sm:block"
              />
            )}
            <button
              onClick={handleToggleMaintenance}
              disabled={togglingMaintenance}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                maintenanceActive
                  ? 'bg-success hover:bg-success/90 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              } disabled:opacity-50`}
            >
              {togglingMaintenance ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : maintenanceActive ? (
                <PowerOff className="h-4 w-4" />
              ) : (
                <Power className="h-4 w-4" />
              )}
              {maintenanceActive ? t('deactivate') : t('activate')}
            </button>
          </div>
        </div>
      </div>

      {/* Announcements List */}
      <div className="bg-surface-2 rounded-xl border border-border-subtle overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-medium text-gray-900">
            {t('historyTitle', { count: total })}
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Megaphone className="h-12 w-12 mb-3" />
            <p className="text-sm">{t('noAnnouncements')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {announcements.map((ann) => {
              const tipo = tipoIcons[ann.tipo] || tipoIcons.Banner;
              const prioridadColor = prioridadColors[ann.prioridad] || prioridadColors.Normal;

              return (
                <div key={ann.id} className="px-4 py-3 hover:bg-surface-1 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 p-1.5 rounded-md ${tipo.color}`}>
                      {tipo.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 text-sm">{ann.titulo}</span>
                        <span className={`px-1.5 py-0.5 rounded-md text-xs font-medium ${tipo.color}`}>
                          {tipoLabelMap[ann.tipo] || ann.tipo}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded-md text-xs font-medium ${prioridadColor}`}>
                          {prioridadLabelMap[ann.prioridad] || ann.prioridad}
                        </span>
                        {ann.displayMode && displayModeIcons[ann.displayMode] && (
                          <span className={`px-1.5 py-0.5 rounded-md text-xs font-medium ${displayModeIcons[ann.displayMode].color}`}>
                            {displayModeLabelMap[ann.displayMode] || ann.displayMode}
                          </span>
                        )}
                        {!ann.activo && (
                          <span className="px-1.5 py-0.5 rounded-md text-xs font-medium bg-surface-3 text-muted-foreground">
                            {t('expired')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground/70 mt-0.5 truncate">{ann.mensaje}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(ann.creadoEn, { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                        {ann.sentCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Bell className="h-3 w-3" />
                            {ann.sentCount} {t('sent')}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {ann.readCount} {t('read')}
                        </span>
                      </div>
                    </div>
                    {ann.activo && (
                      <button
                        onClick={() => handleDelete(ann.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                        title={t('expireAnnouncement')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {total > 20 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {t('showingRange', { start: (page - 1) * 20 + 1, end: Math.min(page * 20, total), total })}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-surface-1"
              >
                {t('previous')}
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * 20 >= total}
                className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-surface-1"
              >
                {t('next')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={t('drawerTitle')}
        description={t('drawerDescription')}
      >
        <div className="space-y-4 p-6">
          {/* Tipo */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">{t('typeLabel')}</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Banner', 'Broadcast', 'Maintenance'] as const).map((tipo) => {
                const tipoMeta = tipoIcons[tipo];
                return (
                  <button
                    key={tipo}
                    onClick={() => setForm(f => ({
                      ...f,
                      tipo,
                      // Maintenance always forces Banner mode
                      displayMode: tipo === 'Maintenance' ? 'Banner' : f.displayMode,
                    }))}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-colors ${
                      form.tipo === tipo
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-border-subtle text-foreground/70 hover:bg-surface-1'
                    }`}
                  >
                    {tipoMeta.icon}
                    {tipoLabelMap[tipo]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* DisplayMode — hidden for Maintenance (forced to Banner) */}
          {form.tipo !== 'Maintenance' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">{t('destinationLabel')}</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Banner', 'Notification', 'Both'] as const).map((mode) => {
                  const m = displayModeIcons[mode];
                  return (
                    <button
                      key={mode}
                      onClick={() => setForm(f => ({ ...f, displayMode: mode }))}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-xs transition-colors ${
                        form.displayMode === mode
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-border-subtle text-foreground/70 hover:bg-surface-1'
                      }`}
                    >
                      {m.icon}
                      <span className="font-medium">{displayModeLabelMap[mode]}</span>
                      <span className="text-[10px] opacity-60">{displayModeDescMap[mode]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Destinatarios */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">{t('recipientsLabel')}</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => { setTargetMode('all'); setSelectedTenantIds([]); setSelectedRoles([]); setTenantSearch(''); }}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-xs transition-colors ${
                  targetMode === 'all'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-border-subtle text-foreground/70 hover:bg-surface-1'
                }`}
              >
                <Globe className="h-4 w-4" />
                <span className="font-medium">{t('recipientsAll')}</span>
                <span className="text-[10px] opacity-60">{t('recipientsAllDesc')}</span>
              </button>
              <button
                onClick={() => { setTargetMode('tenants'); setSelectedRoles([]); }}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-xs transition-colors ${
                  targetMode === 'tenants'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-border-subtle text-foreground/70 hover:bg-surface-1'
                }`}
              >
                <Building2 className="h-4 w-4" />
                <span className="font-medium">{t('recipientsTenants')}</span>
                <span className="text-[10px] opacity-60">{t('recipientsTenantsDesc')}</span>
              </button>
              <button
                onClick={() => { setTargetMode('roles'); setSelectedTenantIds([]); setTenantSearch(''); }}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-xs transition-colors ${
                  targetMode === 'roles'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-border-subtle text-foreground/70 hover:bg-surface-1'
                }`}
              >
                <Users className="h-4 w-4" />
                <span className="font-medium">{t('recipientsByRole')}</span>
                <span className="text-[10px] opacity-60">{t('recipientsByRoleDesc')}</span>
              </button>
            </div>

            {/* Tenant multi-select with search */}
            {targetMode === 'tenants' && (
              <div className="mt-2 border border-border-subtle rounded-lg overflow-hidden">
                <div className="p-2 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder={t('searchTenant')}
                      value={tenantSearch}
                      onChange={(e) => setTenantSearch(e.target.value)}
                      className="w-full h-8 pl-8 pr-3 text-sm border border-border-subtle rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                    />
                  </div>
                </div>
                <div className="max-h-40 overflow-y-auto p-2 space-y-0.5">
                  {(() => {
                    const activeTenants = tenants.filter(t => t.activo);
                    const filtered = tenantSearch.trim()
                      ? activeTenants.filter(t => t.nombreEmpresa.toLowerCase().includes(tenantSearch.toLowerCase()))
                      : activeTenants;
                    if (activeTenants.length === 0) return <p className="text-xs text-muted-foreground text-center py-2">{t('noActiveTenants')}</p>;
                    if (filtered.length === 0) return <p className="text-xs text-muted-foreground text-center py-2">{t('noSearchResults', { query: tenantSearch })}</p>;
                    const allFilteredSelected = filtered.every(t => selectedTenantIds.includes(t.id));
                    return (
                      <>
                        <label className="flex items-center gap-2 p-1.5 rounded-md hover:bg-purple-50 cursor-pointer border-b border-gray-100 mb-1 pb-1.5">
                          <input
                            type="checkbox"
                            checked={allFilteredSelected && filtered.length > 0}
                            onChange={() => {
                              if (allFilteredSelected) {
                                const filteredIds = new Set(filtered.map(t => t.id));
                                setSelectedTenantIds(prev => prev.filter(id => !filteredIds.has(id)));
                              } else {
                                const filteredIds = filtered.map(t => t.id);
                                setSelectedTenantIds(prev => Array.from(new Set([...prev, ...filteredIds])));
                              }
                            }}
                            className="w-4 h-4 rounded border-border-default text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-sm text-purple-700 font-medium">{t('selectAll')}</span>
                          <span className="text-xs text-muted-foreground ml-auto">{filtered.length}</span>
                        </label>
                        {filtered.map(t => (
                          <label key={t.id} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-surface-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedTenantIds.includes(t.id)}
                              onChange={() => setSelectedTenantIds(prev =>
                                prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]
                              )}
                              className="w-4 h-4 rounded border-border-default text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-sm text-gray-700 flex-1 truncate">{t.nombreEmpresa}</span>
                            <span className="text-xs text-muted-foreground">{t.usuarioCount} usr</span>
                          </label>
                        ))}
                      </>
                    );
                  })()}
                </div>
                {selectedTenantIds.length > 0 && (
                  <div className="px-2 py-1.5 border-t border-gray-100 bg-purple-50 flex items-center justify-between">
                    <p className="text-xs text-purple-700 font-medium">
                      {t('tenantsSelected', { count: selectedTenantIds.length })}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedTenantIds([])}
                      className="text-xs text-purple-600 hover:text-purple-800 underline"
                    >
                      {t('clearSelection')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Role multi-select */}
            {targetMode === 'roles' && (
              <div className="mt-2 space-y-1 border border-border-subtle rounded-lg p-2">
                {['Admin', 'Vendedor'].map(role => (
                  <label key={role} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-surface-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(role)}
                      onChange={() => setSelectedRoles(prev =>
                        prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
                      )}
                      className="w-4 h-4 rounded border-border-default text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">{role === 'Admin' ? t('roleAdmins') : t('roleSellers')}</span>
                  </label>
                ))}
                {selectedRoles.length > 0 && (
                  <p className="text-xs text-purple-600 font-medium pt-1 border-t">
                    {t('onlyUsersWithRole', { roles: selectedRoles.join(', ') })}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Titulo */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">{t('titleLabel')}</label>
              <span className={`text-xs ${form.titulo.length > 140 ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                {form.titulo.length}/150
              </span>
            </div>
            <input
              type="text"
              value={form.titulo}
              onChange={(e) => {
                if (e.target.value.length <= 150) setForm(f => ({ ...f, titulo: e.target.value }));
              }}
              maxLength={150}
              placeholder={t('titlePlaceholder')}
              className="w-full h-10 px-3 border border-border-default rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            />
          </div>

          {/* Mensaje */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">{t('messageLabel')}</label>
              <span className={`text-xs ${form.mensaje.length > 450 ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                {form.mensaje.length}/500
              </span>
            </div>
            <textarea
              value={form.mensaje}
              onChange={(e) => {
                if (e.target.value.length <= 500) setForm(f => ({ ...f, mensaje: e.target.value }));
              }}
              maxLength={500}
              placeholder={t('messagePlaceholder')}
              rows={3}
              className="w-full px-3 py-2 border border-border-default rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
            />
          </div>

          {/* Prioridad */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">{t('priorityLabel')}</label>
            <select
              value={form.prioridad}
              onChange={(e) => setForm(f => ({ ...f, prioridad: e.target.value }))}
              className="w-full h-10 px-3 border border-border-default rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-surface-2"
            >
              <option value="Low">{t('priorityLow')}</option>
              <option value="Normal">{t('priorityNormal')}</option>
              <option value="High">{t('priorityHigh')}</option>
              <option value="Critical">{t('priorityCritical')}</option>
            </select>
          </div>

          {/* Dismissible */}
          {form.tipo !== 'Maintenance' && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="dismissible"
                checked={form.isDismissible}
                onChange={(e) => setForm(f => ({ ...f, isDismissible: e.target.checked }))}
                className="w-4 h-4 rounded border-border-default text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="dismissible" className="text-sm text-gray-700">
                {t('dismissibleLabel')}
              </label>
            </div>
          )}

          {/* Expiration */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">{t('expirationLabel')}</label>
            <DateTimePicker
              mode="datetime"
              value={form.expiresAt || ''}
              onChange={(val) => setForm(f => ({ ...f, expiresAt: val || undefined }))}
            />
          </div>

          {/* Warning for Maintenance */}
          {form.tipo === 'Maintenance' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                <p className="text-sm text-amber-800">
                  {t('maintenanceWarning')}
                </p>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="pt-2">
            <button
              onClick={handleCreate}
              disabled={creating || !form.titulo.trim() || !form.mensaje.trim()}
              className="w-full h-10 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Megaphone className="h-4 w-4" />
              )}
              {creating ? t('creating') : t('createAnnouncement')}
            </button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
