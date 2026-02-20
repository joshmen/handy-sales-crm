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
  ChevronDown,
  Bell,
  Monitor,
  Layers,
  Users,
  Building2,
  Globe,
  Check,
  Search,
} from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
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

const tipoLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  Broadcast: { label: 'Broadcast', icon: <Radio className="h-4 w-4" />, color: 'bg-purple-100 text-purple-700' },
  Maintenance: { label: 'Mantenimiento', icon: <Wrench className="h-4 w-4" />, color: 'bg-red-100 text-red-700' },
  Banner: { label: 'Banner', icon: <Info className="h-4 w-4" />, color: 'bg-blue-100 text-blue-700' },
};

const prioridadLabels: Record<string, { label: string; color: string }> = {
  Low: { label: 'Baja', color: 'bg-gray-100 text-gray-600' },
  Normal: { label: 'Normal', color: 'bg-blue-100 text-blue-600' },
  High: { label: 'Alta', color: 'bg-amber-100 text-amber-700' },
  Critical: { label: 'Critica', color: 'bg-red-100 text-red-700' },
};

const displayModeLabels: Record<string, { label: string; icon: React.ReactNode; color: string; desc: string }> = {
  Banner: { label: 'Banner', icon: <Monitor className="h-4 w-4" />, color: 'bg-blue-100 text-blue-700', desc: 'Barra superior' },
  Notification: { label: 'Notificación', icon: <Bell className="h-4 w-4" />, color: 'bg-teal-100 text-teal-700', desc: 'Campana' },
  Both: { label: 'Ambos', icon: <Layers className="h-4 w-4" />, color: 'bg-purple-100 text-purple-700', desc: 'Banner + Campana' },
};

export default function AnnouncementsPage() {
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
      toast.error('Error al cargar anuncios');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (userRole === 'SUPER_ADMIN') {
      fetchData();
      tenantService.getAll().then(setTenants).catch(() => {});
    }
  }, [userRole, fetchData]);

  const handleCreate = async () => {
    if (!form.titulo.trim() || !form.mensaje.trim()) {
      toast.error('Titulo y mensaje son requeridos');
      return;
    }
    if (targetMode === 'tenants' && selectedTenantIds.length === 0) {
      toast.error('Selecciona al menos una empresa');
      return;
    }
    if (targetMode === 'roles' && selectedRoles.length === 0) {
      toast.error('Selecciona al menos un rol');
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
      toast.success('Anuncio creado exitosamente');
      setDrawerOpen(false);
      setForm({ titulo: '', mensaje: '', tipo: 'Banner', prioridad: 'Normal', displayMode: 'Banner', isDismissible: true });
      setTargetMode('all');
      setSelectedTenantIds([]);
      setSelectedRoles([]);
      fetchData();
    } catch {
      toast.error('Error al crear anuncio');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteAnnouncement(id);
      toast.success('Anuncio expirado');
      fetchData();
    } catch {
      toast.error('Error al expirar anuncio');
    }
  };

  const handleToggleMaintenance = async () => {
    setTogglingMaintenance(true);
    try {
      if (maintenanceActive) {
        await deactivateMaintenance();
        toast.success('Modo mantenimiento desactivado');
        setMaintenanceActive(false);
      } else {
        await activateMaintenance(maintenanceMsg || undefined);
        toast.success('Modo mantenimiento activado');
        setMaintenanceActive(true);
      }
      fetchData();
    } catch {
      toast.error('Error al cambiar modo mantenimiento');
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
            Anuncios
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Envía comunicaciones a tenants y gestiona el modo mantenimiento
          </p>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo anuncio
        </button>
      </div>

      {/* Maintenance Quick Toggle */}
      <div className={`rounded-xl border p-4 ${maintenanceActive ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${maintenanceActive ? 'bg-red-100' : 'bg-gray-200'}`}>
              <Wrench className={`h-5 w-5 ${maintenanceActive ? 'text-red-600' : 'text-gray-500'}`} />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">
                Modo Mantenimiento
                <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${maintenanceActive ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                  {maintenanceActive ? 'ACTIVO' : 'Inactivo'}
                </span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Bloquea operaciones de escritura para usuarios no-SuperAdmin
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!maintenanceActive && (
              <input
                type="text"
                placeholder="Mensaje (opcional)"
                value={maintenanceMsg}
                onChange={(e) => setMaintenanceMsg(e.target.value)}
                className="h-9 px-3 border border-gray-300 rounded-lg text-sm w-64 hidden sm:block"
              />
            )}
            <button
              onClick={handleToggleMaintenance}
              disabled={togglingMaintenance}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                maintenanceActive
                  ? 'bg-green-600 hover:bg-green-700 text-white'
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
              {maintenanceActive ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        </div>
      </div>

      {/* Announcements List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-medium text-gray-900">
            Historial de anuncios ({total})
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Megaphone className="h-12 w-12 mb-3" />
            <p className="text-sm">No hay anuncios</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {announcements.map((ann) => {
              const tipo = tipoLabels[ann.tipo] || tipoLabels.Banner;
              const prioridad = prioridadLabels[ann.prioridad] || prioridadLabels.Normal;

              return (
                <div key={ann.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 p-1.5 rounded-md ${tipo.color}`}>
                      {tipo.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 text-sm">{ann.titulo}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${tipo.color}`}>
                          {tipo.label}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${prioridad.color}`}>
                          {prioridad.label}
                        </span>
                        {ann.displayMode && displayModeLabels[ann.displayMode] && (
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${displayModeLabels[ann.displayMode].color}`}>
                            {displayModeLabels[ann.displayMode].label}
                          </span>
                        )}
                        {!ann.activo && (
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                            Expirado
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5 truncate">{ann.mensaje}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(ann.creadoEn).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                        {ann.sentCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Bell className="h-3 w-3" />
                            {ann.sentCount} enviados
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {ann.readCount} leídos
                        </span>
                      </div>
                    </div>
                    {ann.activo && (
                      <button
                        onClick={() => handleDelete(ann.id)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Expirar anuncio"
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
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>
              Mostrando {(page - 1) * 20 + 1}-{Math.min(page * 20, total)} de {total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * 20 >= total}
                className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Nuevo anuncio"
        description="Crea un anuncio para los usuarios de la plataforma"
      >
        <div className="space-y-4 p-6">
          {/* Tipo */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Tipo</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Banner', 'Broadcast', 'Maintenance'] as const).map((tipo) => {
                const t = tipoLabels[tipo];
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
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* DisplayMode — hidden for Maintenance (forced to Banner) */}
          {form.tipo !== 'Maintenance' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Destino</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Banner', 'Notification', 'Both'] as const).map((mode) => {
                  const m = displayModeLabels[mode];
                  return (
                    <button
                      key={mode}
                      onClick={() => setForm(f => ({ ...f, displayMode: mode }))}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-xs transition-colors ${
                        form.displayMode === mode
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {m.icon}
                      <span className="font-medium">{m.label}</span>
                      <span className="text-[10px] opacity-60">{m.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Destinatarios */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Destinatarios</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => { setTargetMode('all'); setSelectedTenantIds([]); setSelectedRoles([]); setTenantSearch(''); }}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-xs transition-colors ${
                  targetMode === 'all'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Globe className="h-4 w-4" />
                <span className="font-medium">Todos</span>
                <span className="text-[10px] opacity-60">Todas las empresas</span>
              </button>
              <button
                onClick={() => { setTargetMode('tenants'); setSelectedRoles([]); }}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-xs transition-colors ${
                  targetMode === 'tenants'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Building2 className="h-4 w-4" />
                <span className="font-medium">Empresas</span>
                <span className="text-[10px] opacity-60">Seleccionar</span>
              </button>
              <button
                onClick={() => { setTargetMode('roles'); setSelectedTenantIds([]); setTenantSearch(''); }}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-xs transition-colors ${
                  targetMode === 'roles'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Users className="h-4 w-4" />
                <span className="font-medium">Por rol</span>
                <span className="text-[10px] opacity-60">Admin, Vendedor</span>
              </button>
            </div>

            {/* Tenant multi-select with search */}
            {targetMode === 'tenants' && (
              <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-2 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar empresa..."
                      value={tenantSearch}
                      onChange={(e) => setTenantSearch(e.target.value)}
                      className="w-full h-8 pl-8 pr-3 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                    />
                  </div>
                </div>
                <div className="max-h-40 overflow-y-auto p-2 space-y-0.5">
                  {(() => {
                    const activeTenants = tenants.filter(t => t.activo);
                    const filtered = tenantSearch.trim()
                      ? activeTenants.filter(t => t.nombreEmpresa.toLowerCase().includes(tenantSearch.toLowerCase()))
                      : activeTenants;
                    if (activeTenants.length === 0) return <p className="text-xs text-gray-400 text-center py-2">No hay empresas activas</p>;
                    if (filtered.length === 0) return <p className="text-xs text-gray-400 text-center py-2">Sin resultados para &quot;{tenantSearch}&quot;</p>;
                    const allFilteredSelected = filtered.every(t => selectedTenantIds.includes(t.id));
                    return (
                      <>
                        <label className="flex items-center gap-2 p-1.5 rounded hover:bg-purple-50 cursor-pointer border-b border-gray-100 mb-1 pb-1.5">
                          <input
                            type="checkbox"
                            checked={allFilteredSelected && filtered.length > 0}
                            onChange={() => {
                              if (allFilteredSelected) {
                                const filteredIds = new Set(filtered.map(t => t.id));
                                setSelectedTenantIds(prev => prev.filter(id => !filteredIds.has(id)));
                              } else {
                                const filteredIds = filtered.map(t => t.id);
                                setSelectedTenantIds(prev => [...new Set([...prev, ...filteredIds])]);
                              }
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-sm text-purple-700 font-medium">Seleccionar todos</span>
                          <span className="text-xs text-gray-400 ml-auto">{filtered.length}</span>
                        </label>
                        {filtered.map(t => (
                          <label key={t.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedTenantIds.includes(t.id)}
                              onChange={() => setSelectedTenantIds(prev =>
                                prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]
                              )}
                              className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-sm text-gray-700 flex-1 truncate">{t.nombreEmpresa}</span>
                            <span className="text-xs text-gray-400">{t.usuarioCount} usr</span>
                          </label>
                        ))}
                      </>
                    );
                  })()}
                </div>
                {selectedTenantIds.length > 0 && (
                  <div className="px-2 py-1.5 border-t border-gray-100 bg-purple-50 flex items-center justify-between">
                    <p className="text-xs text-purple-700 font-medium">
                      {selectedTenantIds.length} empresa{selectedTenantIds.length > 1 ? 's' : ''} seleccionada{selectedTenantIds.length > 1 ? 's' : ''}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedTenantIds([])}
                      className="text-xs text-purple-600 hover:text-purple-800 underline"
                    >
                      Limpiar
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Role multi-select */}
            {targetMode === 'roles' && (
              <div className="mt-2 space-y-1 border border-gray-200 rounded-lg p-2">
                {['Admin', 'Vendedor'].map(role => (
                  <label key={role} className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(role)}
                      onChange={() => setSelectedRoles(prev =>
                        prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
                      )}
                      className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">{role === 'Admin' ? 'Administradores' : 'Vendedores'}</span>
                  </label>
                ))}
                {selectedRoles.length > 0 && (
                  <p className="text-xs text-purple-600 font-medium pt-1 border-t">
                    Solo usuarios con rol: {selectedRoles.join(', ')}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Titulo */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Titulo</label>
              <span className={`text-xs ${form.titulo.length > 140 ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
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
              placeholder="Titulo del anuncio"
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            />
          </div>

          {/* Mensaje */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Mensaje</label>
              <span className={`text-xs ${form.mensaje.length > 450 ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
                {form.mensaje.length}/500
              </span>
            </div>
            <textarea
              value={form.mensaje}
              onChange={(e) => {
                if (e.target.value.length <= 500) setForm(f => ({ ...f, mensaje: e.target.value }));
              }}
              maxLength={500}
              placeholder="Contenido del anuncio..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
            />
          </div>

          {/* Prioridad */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Prioridad</label>
            <select
              value={form.prioridad}
              onChange={(e) => setForm(f => ({ ...f, prioridad: e.target.value }))}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white"
            >
              <option value="Low">Baja</option>
              <option value="Normal">Normal</option>
              <option value="High">Alta</option>
              <option value="Critical">Critica</option>
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
                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="dismissible" className="text-sm text-gray-700">
                Permitir que los usuarios cierren este anuncio
              </label>
            </div>
          )}

          {/* Expiration */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Expiración (opcional)</label>
            <input
              type="datetime-local"
              value={form.expiresAt || ''}
              onChange={(e) => setForm(f => ({ ...f, expiresAt: e.target.value || undefined }))}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            />
          </div>

          {/* Warning for Maintenance */}
          {form.tipo === 'Maintenance' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Este tipo activará el modo mantenimiento. Las operaciones de escritura serán
                  bloqueadas para todos los usuarios excepto SuperAdmin.
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
              {creating ? 'Creando...' : 'Crear anuncio'}
            </button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
