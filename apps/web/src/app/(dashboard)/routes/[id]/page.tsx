'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useApiErrorToast } from '@/hooks/useApiErrorToast';
import { routeService, RouteDetail, RouteStop, AddStopRequest, PedidoAsignado, RouteUpdateRequest, ESTADO_RUTA, ESTADO_RUTA_KEYS, ESTADO_RUTA_COLORS } from '@/services/api/routes';
import { zoneService } from '@/services/api/zones';
import { api } from '@/lib/api';
import { clientService } from '@/services/api/clients';
import { toast } from '@/hooks/useToast';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { FieldError } from '@/components/forms/FieldError';
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Play,
  CheckCircle,
  XCircle,
  MapPin,
  MapPinned,
  Map,
  User,
  Calendar,
  Clock,
  Loader2,
  Pencil,
  Package,
  Search,
  ExternalLink,
  Truck,
  FileCheck,
} from 'lucide-react';
import Link from 'next/link';
import { useFormatters } from '@/hooks/useFormatters';
import { dateOnlyToUTC } from '@/lib/formatters';
import { useTranslations } from 'next-intl';

interface PedidoOption {
  id: number;
  numeroPedido?: string;
  clienteNombre?: string;
  total?: number;
  estado?: string;
}

interface ZoneOption { id: number; name: string; }
interface UsuarioOption { id: number; nombre: string; }

const editRouteSchema = z.object({
  nombre: z.string().min(1, 'nameRequired').max(100),
  usuarioId: z.number(),
  zonaId: z.number().nullable(),
  fecha: z.string().min(1, 'dateRequired'),
  horaInicioEstimada: z.string(),
  horaFinEstimada: z.string(),
  descripcion: z.string(),
  notas: z.string(),
});
type EditRouteFormData = z.infer<typeof editRouteSchema>;

export default function RouteDetailPage() {
  const t = useTranslations('routes');
  const ts = useTranslations('routes.status');
  const tc = useTranslations('common');
  const { formatDateOnly, formatCurrency } = useFormatters();
  const params = useParams();
  const router = useRouter();
  const routeId = Number(params.id);

  const showApiError = useApiErrorToast();
  const [route, setRoute] = useState<RouteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Add stop modal
  const [isAddStopOpen, setIsAddStopOpen] = useState(false);
  const [clients, setClients] = useState<{ value: string; label: string }[]>([]);
  const [stopForm, setStopForm] = useState({ clienteId: 0, duracion: 30, notas: '' });

  // Cancel modal
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelMotivo, setCancelMotivo] = useState('');

  // Pedidos
  const [pedidos, setPedidos] = useState<PedidoAsignado[]>([]);
  const [isPedidoModalOpen, setIsPedidoModalOpen] = useState(false);
  const [availablePedidos, setAvailablePedidos] = useState<PedidoOption[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [pedidoSearch, setPedidoSearch] = useState('');

  // Edit drawer
  const editDrawerRef = useRef<DrawerHandle>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioOption[]>([]);
  const { register: editRegister, handleSubmit: editRhfSubmit, reset: editReset, watch: editWatch, setValue: editSetValue, formState: { errors: editErrors, isDirty: editIsDirty } } = useForm<EditRouteFormData>({
    resolver: zodResolver(editRouteSchema),
    defaultValues: { nombre: '', usuarioId: 0, zonaId: null, fecha: '', horaInicioEstimada: '', horaFinEstimada: '', descripcion: '', notas: '' },
  });

  const fetchRoute = useCallback(async () => {
    try {
      setLoading(true);
      const [data, pedidosData] = await Promise.all([
        routeService.getRuta(routeId),
        routeService.getPedidosAsignados(routeId),
      ]);
      setRoute(data);
      setPedidos(pedidosData);
    } catch {
      toast.error(t('detail.errorLoading'));
    } finally {
      setLoading(false);
    }
  }, [routeId]);

  // Lista plana de clientes con metadata de zona — usada para agrupar el dropdown
  // de "Add stop" en sugeridos (zonas de la ruta) vs otros. Antes el filtro era
  // estricto por zona única (commit fde28ee) y mostraba 1 cliente cuando la zona
  // tenía pocos. Reportado 2026-04-27 — ahora alineado con SFA/CPG industria
  // (Handy.la, Salesforce, SAP) donde el admin ve todos los clientes y la zona
  // es solo sugerencia visual.
  const [clientsRaw, setClientsRaw] = useState<{ value: string; label: string; zoneId?: number; zoneName?: string }[]>([]);

  const fetchClients = useCallback(async (search?: string) => {
    try {
      const response = await clientService.getClients({
        search,
        limit: 500,
        isActive: true,
        // SIN zoneId filter — traemos todos. El agrupamiento es del lado UI.
      });
      const items = response.clients.map(c => ({
        value: c.id,
        label: c.zoneName ? `${c.name} · ${c.zoneName}` : c.name,
        zoneId: c.zoneId,
        zoneName: c.zoneName,
      }));
      setClientsRaw(items);
      setClients(items.map(({ value, label }) => ({ value, label })));
    } catch {
      console.error('Error al cargar clientes');
    }
  }, []);

  useEffect(() => {
    fetchRoute();
  }, [fetchRoute]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Edit drawer: fetch dropdown data
  const fetchEditDropdowns = async () => {
    try {
      const [zonesRes, usersRes] = await Promise.all([
        zoneService.getZones(),
        api.get<{ items: UsuarioOption[] } | UsuarioOption[]>('/api/usuarios?pagina=1&tamanoPagina=500'),
      ]);
      setZones(zonesRes.zones.map(z => ({ id: parseInt(z.id), name: z.name })));
      const userData = usersRes.data;
      setUsuarios(Array.isArray(userData) ? userData : userData.items || []);
    } catch (err) {
      console.error('Error loading edit dropdowns:', err);
    }
  };

  const handleOpenEditDrawer = () => {
    if (!route) return;
    // Fetch dropdown data on first open
    if (zones.length === 0 || usuarios.length === 0) fetchEditDropdowns();
    // Pre-populate ALL fields from route data (fix the bug — no more empty strings)
    editReset({
      nombre: route.nombre,
      usuarioId: route.usuarioId,
      zonaId: route.zonaId ?? null,
      fecha: typeof route.fecha === 'string' ? route.fecha.split('T')[0] : new Date(route.fecha).toISOString().split('T')[0],
      horaInicioEstimada: route.horaInicioEstimada || '',
      horaFinEstimada: route.horaFinEstimada || '',
      descripcion: route.descripcion || '',
      notas: route.notas || '',
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (data: EditRouteFormData) => {
    try {
      setEditSaving(true);
      const fmtTime = (t?: string | null) => t ? (t.length === 5 ? `${t}:00` : t) : null;
      const updateData: RouteUpdateRequest = {
        nombre: data.nombre,
        usuarioId: data.usuarioId || undefined,
        zonaId: data.zonaId,
        fecha: dateOnlyToUTC(data.fecha),
        horaInicioEstimada: fmtTime(data.horaInicioEstimada),
        horaFinEstimada: fmtTime(data.horaFinEstimada),
        descripcion: data.descripcion || undefined,
        notas: data.notas || undefined,
      };
      await routeService.updateRuta(routeId, updateData);
      toast.success(t('routeUpdated'));
      setIsEditOpen(false);
      fetchRoute();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e?.response?.data?.message || e?.message || t('errorSaving'));
    } finally {
      setEditSaving(false);
    }
  };

  const isPlanificada = route?.estado === 0;
  const isEnProgreso = route?.estado === 1;
  const isPendienteAceptar = route?.estado === 4;
  const isEditable = isPlanificada || isPendienteAceptar;

  // Actions — uso showApiError para mostrar el message real del backend
  // (p.ej. "No se puede enviar la ruta a carga: faltan paradas, pedidos asignados.")
  // en vez del fallback genérico. Reportado 2026-04-27.
  //
  // El admin desde web NO inicia la ruta — solo la envía a carga (PendienteAceptar).
  // Después el vendedor recibe push, abre mobile, presiona "Aceptar" y eso dispara
  // aceptar+iniciar consecutivos del lado del vendedor (flujo natural). Antes este
  // botón llamaba IniciarRutaAsync directo y saltaba el paso de aceptación, dejando
  // AceptadaEn null y rompiendo el banner "Aceptar ruta" del mobile.
  const handleSendToLoad = async () => {
    if (!route) return;
    try {
      setActionLoading(true);
      await routeService.enviarACarga(route.id);
      toast.success(t('detail.routeSentToLoad'));
      fetchRoute();
    } catch (err) {
      showApiError(err, t('detail.errorSendingToLoad'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompletar = async () => {
    if (!route) return;
    try {
      setActionLoading(true);
      await routeService.completarRuta(route.id);
      toast.success(t('detail.routeCompleted'));
      fetchRoute();
    } catch (err) {
      showApiError(err, t('detail.errorCompleting'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelar = async () => {
    if (!route) return;
    try {
      setActionLoading(true);
      await routeService.cancelarRuta(route.id, cancelMotivo || undefined);
      toast.success(t('detail.routeCancelled'));
      setIsCancelOpen(false);
      setCancelMotivo('');
      fetchRoute();
    } catch (err) {
      showApiError(err, t('detail.errorCancelling'));
    } finally {
      setActionLoading(false);
    }
  };

  // Stops
  const handleAddStop = async () => {
    if (!route || !stopForm.clienteId) {
      toast.error(t('detail.selectClient'));
      return;
    }
    try {
      setActionLoading(true);
      const nextOrder = route.detalles.length > 0
        ? Math.max(...route.detalles.map(d => d.ordenVisita)) + 1
        : 1;
      const data: AddStopRequest = {
        clienteId: stopForm.clienteId,
        ordenVisita: nextOrder,
        duracionEstimadaMinutos: stopForm.duracion || 30,
        notas: stopForm.notas || undefined,
      };
      await routeService.addParada(route.id, data);
      toast.success(t('detail.stopAdded'));
      setIsAddStopOpen(false);
      setStopForm({ clienteId: 0, duracion: 30, notas: '' });
      fetchRoute();
    } catch (err) {
      showApiError(err, t('detail.errorAddingStop'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteStop = async (detalleId: number) => {
    if (!route) return;
    try {
      await routeService.deleteParada(route.id, detalleId);
      toast.success(t('detail.stopDeleted'));
      fetchRoute();
    } catch (err) {
      showApiError(err, t('detail.errorDeletingStop'));
    }
  };

  const handleMoveStop = async (stop: RouteStop, direction: 'up' | 'down') => {
    if (!route) return;
    const sorted = [...route.detalles].sort((a, b) => a.ordenVisita - b.ordenVisita);
    const idx = sorted.findIndex(s => s.id === stop.id);
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === sorted.length - 1)) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const newOrder = sorted.map(s => s.id);
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];

    try {
      await routeService.reorderParadas(route.id, newOrder);
      fetchRoute();
    } catch (err) {
      showApiError(err, t('detail.errorReordering'));
    }
  };

  // Pedidos
  const handleOpenAddPedido = async () => {
    setIsPedidoModalOpen(true);
    setPedidoSearch('');
    setLoadingPedidos(true);
    try {
      const [confirmedRes, enProcesoRes] = await Promise.all([
        api.get<{ items: PedidoOption[] }>('/pedidos?pagina=1&tamanoPagina=100&estado=Confirmado'),
        api.get<{ items: PedidoOption[] }>('/pedidos?pagina=1&tamanoPagina=100&estado=EnProceso'),
      ]);
      const confirmed = Array.isArray(confirmedRes.data) ? confirmedRes.data : confirmedRes.data.items || [];
      const enProceso = Array.isArray(enProcesoRes.data) ? enProcesoRes.data : enProcesoRes.data.items || [];
      const all = [...confirmed, ...enProceso];
      // Filter out already-assigned pedidos
      const assignedIds = new Set(pedidos.map(p => p.pedidoId));
      setAvailablePedidos(all.filter(p => !assignedIds.has(p.id)));
    } catch {
      toast.error(t('detail.errorLoadingOrders'));
    } finally {
      setLoadingPedidos(false);
    }
  };

  const handleAddPedido = async (pedidoId: number) => {
    if (!route) return;
    try {
      await routeService.addPedido(route.id, pedidoId);
      toast.success(t('detail.orderAssigned'));
      setIsPedidoModalOpen(false);
      const pedidosData = await routeService.getPedidosAsignados(route.id);
      setPedidos(pedidosData);
    } catch (err) {
      showApiError(err, t('detail.errorAssigningOrder'));
    }
  };

  const handleRemovePedido = async (pedidoId: number) => {
    if (!route) return;
    try {
      await routeService.removePedido(route.id, pedidoId);
      toast.success(t('detail.orderRemoved'));
      const pedidosData = await routeService.getPedidosAsignados(route.id);
      setPedidos(pedidosData);
    } catch (err) {
      showApiError(err, t('detail.errorRemovingOrder'));
    }
  };

  // Badges — use shared constants for all 7 states
  const getEstadoBadge = (estado: number) => ({
    label: ESTADO_RUTA_KEYS[estado] ? ts(ESTADO_RUTA_KEYS[estado]) : ts('unknown'),
    cls: ESTADO_RUTA_COLORS[estado] || 'bg-surface-3 text-foreground/70',
  });

  const getParadaBadge = (estado: number) => {
    switch (estado) {
      case 0: return { label: t('detail.stopPending'), cls: 'bg-surface-3 text-foreground/70' };
      case 1: return { label: t('detail.stopEnRoute'), cls: 'bg-blue-100 text-blue-600' };
      case 2: return { label: t('detail.stopVisited'), cls: 'bg-green-100 text-green-600' };
      case 3: return { label: t('detail.stopSkipped'), cls: 'bg-red-100 text-red-600' };
      default: return { label: t('status.unknown'), cls: 'bg-surface-3 text-foreground/70' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!route) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">{t('detail.notFound')}</p>
        <Link href="/routes" className="text-green-600 hover:underline text-sm">{t('detail.backToRoutes')}</Link>
      </div>
    );
  }

  const badge = getEstadoBadge(route.estado);
  const sortedStops = [...route.detalles].sort((a, b) => a.ordenVisita - b.ordenVisita);

  // Excluir del dropdown del modal "Add Stop" los clientes que YA tienen una parada
  // activa en esta ruta. Cuando se elimina una parada (sortedStops cambia), el cliente
  // vuelve a aparecer automáticamente. Reportado 2026-04-27.
  const assignedClientIds = new Set(sortedStops.map(s => String(s.clienteId)));

  // IDs de las zonas que cubre la ruta (multi-zona). Si solo hay zonaId legacy y
  // el backend aún no migró Zonas, fallback al field viejo.
  const routeZonaIds = new Set<number>(
    (route.zonas?.length ? route.zonas.map(z => z.id) : route.zonaId ? [route.zonaId] : [])
  );
  const routeZonaNombres = (route.zonas?.length
    ? route.zonas.map(z => z.nombre)
    : route.zonaNombre ? [route.zonaNombre] : []
  ).join(', ');

  // Agrupar clientes en 2 secciones: sugeridos (de las zonas de la ruta) + otros.
  // Antes el filtro estricto por zona única (commit fde28ee) mostraba solo 1 cliente
  // cuando la zona tenía pocos. Ahora todos visibles, agrupados visualmente.
  const availableClientsAll = clientsRaw.filter(c => !assignedClientIds.has(c.value));
  const suggestedClients = routeZonaIds.size > 0
    ? availableClientsAll.filter(c => c.zoneId != null && routeZonaIds.has(c.zoneId))
    : [];
  const otherClients = routeZonaIds.size > 0
    ? availableClientsAll.filter(c => c.zoneId == null || !routeZonaIds.has(c.zoneId))
    : availableClientsAll;
  // Lista final con separadores virtuales (compatibles con SearchableSelect que
  // solo acepta { value, label }). Los separadores son entradas con value="" deshabilitables.
  const groupedClientOptions: { value: string; label: string; isDivider?: boolean }[] = [];
  if (suggestedClients.length > 0) {
    groupedClientOptions.push({
      value: '__divider_suggested',
      label: `── ${t('detail.suggestedFromZones', { defaultValue: 'Sugeridos de las zonas de la ruta' })} ──`,
      isDivider: true,
    });
    groupedClientOptions.push(...suggestedClients.map(({ value, label }) => ({ value, label })));
  }
  if (otherClients.length > 0) {
    if (suggestedClients.length > 0) {
      groupedClientOptions.push({
        value: '__divider_other',
        label: `── ${t('detail.otherZones', { defaultValue: 'Otras zonas' })} ──`,
        isDivider: true,
      });
    }
    groupedClientOptions.push(...otherClients.map(({ value, label }) => ({ value, label })));
  }
  // Fallback: si el SearchableSelect no soporta dividers (selecciona "" como valor),
  // mantenemos la versión sin separadores como opción simple. Aquí preferimos UX
  // con dividers — el handler onChange ignora valores que empiecen con "__divider".
  const availableClients = groupedClientOptions;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-surface-2 px-8 py-6 border-b border-border-subtle">
        <Breadcrumb items={[
          { label: tc('home'), href: '/dashboard' },
          { label: t('title'), href: '/routes' },
          { label: route.nombre },
        ]} />

        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/routes')} className="p-1 text-muted-foreground hover:text-foreground/70 rounded">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-foreground">
              {route.nombre}
            </h1>
            <span className={`inline-flex px-2.5 py-0.5 text-[11px] font-medium rounded-full ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isPlanificada && (
              <>
                <button
                  onClick={handleSendToLoad}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  {t('detail.sendToLoad')}
                </button>
                <button
                  onClick={() => setIsCancelOpen(true)}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  {tc('cancel')}
                </button>
              </>
            )}
            {isEnProgreso && (
              <>
                <button
                  onClick={handleCompletar}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  {t('detail.completeRoute')}
                </button>
                <button
                  onClick={() => setIsCancelOpen(true)}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  {tc('cancel')}
                </button>
              </>
            )}
            {isPendienteAceptar && (
              <>
                <Link
                  href={`/routes/manage/${route.id}/load`}
                  className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <Truck className="w-4 h-4" />
                  {t('actions.viewLoad')}
                </Link>
                <button
                  onClick={() => setIsCancelOpen(true)}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  {tc('cancel')}
                </button>
              </>
            )}
            {route?.estado === ESTADO_RUTA.CargaAceptada && (
              <Link
                href={`/routes/manage/${route.id}/load`}
                className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <Truck className="w-4 h-4" />
                {t('actions.viewLoad')}
              </Link>
            )}
            {route?.estado === ESTADO_RUTA.Completada && (
              <Link
                href={`/routes/manage/${route.id}/close`}
                className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
              >
                <FileCheck className="w-4 h-4" />
                {t('detail.closeRoute')}
              </Link>
            )}
            {route?.estado === ESTADO_RUTA.Cerrada && (
              <Link
                href={`/routes/manage/${route.id}/close`}
                className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-foreground/70 border border-border-subtle rounded-lg hover:bg-surface-1 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                {t('detail.viewClosure')}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-8 py-6 space-y-6 overflow-auto">
        {/* Info Card */}
        <div className="bg-surface-2 border border-border-subtle rounded-lg p-5">
          {isEditable && (
            <div className="flex justify-end mb-3">
              <button
                onClick={handleOpenEditDrawer}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground/70 border border-border-subtle rounded-md hover:bg-surface-1 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5 text-amber-500" />
                {tc('edit')}
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-[11px] text-muted-foreground">{t('columns.user')}</p>
                <p className="text-[13px] font-medium text-foreground">{route.usuarioNombre}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-[11px] text-muted-foreground">{t('columns.zone')}</p>
                <p className="text-[13px] font-medium text-foreground">{route.zonaNombre || t('noZone')}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-[11px] text-muted-foreground">{t('columns.date')}</p>
                <p className="text-[13px] font-medium text-foreground">
                  {formatDateOnly(route.fecha)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-[11px] text-muted-foreground">{t('columns.schedule')}</p>
                <p className="text-[13px] font-medium text-foreground">
                  {route.horaInicioEstimada || '--:--'} - {route.horaFinEstimada || '--:--'}
                </p>
              </div>
            </div>
          </div>
          {route.notas && (
            <div className="mt-3 pt-3 border-t border-border-subtle">
              <p className="text-[11px] text-muted-foreground mb-1">{tc('notes')}</p>
              <p className="text-[13px] text-foreground/80">{route.notas}</p>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-border-subtle flex items-center gap-6">
            <div>
              <span className="text-[11px] text-muted-foreground">{t('columns.stops')}: </span>
              <span className="text-[13px] font-medium">
                <span className={route.paradasCompletadas === route.totalParadas && route.totalParadas > 0 ? 'text-green-600' : ''}>
                  {route.paradasCompletadas}
                </span>
                /{route.totalParadas}
              </span>
            </div>
            {route.kilometrosEstimados && (
              <div>
                <span className="text-[11px] text-muted-foreground">{t('detail.estimatedKm')}: </span>
                <span className="text-[13px] font-medium">
                  {route.kilometrosEstimados}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Pedidos Asignados Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">
                {t('detail.assignedOrders')}
              </h2>
              <span className="inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-100 text-blue-700">
                {pedidos.length}
              </span>
            </div>
            {isEditable && pedidos.length > 0 && (
              <button
                onClick={handleOpenAddPedido}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('detail.assignOrder')}
              </button>
            )}
          </div>

          <div className="bg-surface-2 border border-border-subtle rounded-lg overflow-hidden">
            {/* Table Header */}
            <div className="flex items-center gap-3 bg-surface-1 px-4 h-10 border-b border-border-subtle">
              <div className="w-[100px] text-xs font-semibold text-foreground/70">{t('detail.orderNumber')}</div>
              <div className="flex-1 min-w-[160px] text-xs font-semibold text-foreground/70">{t('detail.client')}</div>
              <div className="w-[120px] text-xs font-semibold text-foreground/70 text-right">{t('detail.amount')}</div>
              <div className="w-[60px] text-xs font-semibold text-foreground/70 text-center">{t('detail.products')}</div>
              <div className="w-[110px] text-xs font-semibold text-foreground/70 text-center">{t('columns.status')}</div>
              {isEditable && (
                <div className="w-[70px] text-xs font-semibold text-foreground/70 text-center">{tc('actions')}</div>
              )}
            </div>

            {/* Table Body */}
            {pedidos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Package className="w-12 h-12 text-muted-foreground/60 mb-3" />
                <p className="text-sm font-medium text-foreground/80 mb-1">{t('detail.noOrders')}</p>
                <p className="text-xs text-muted-foreground mb-3">{t('detail.assignConfirmedOrders')}</p>
                {isEditable && (
                  <button
                    onClick={handleOpenAddPedido}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t('detail.assignOrder')}
                  </button>
                )}
              </div>
            ) : (
              pedidos.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle hover:bg-surface-1 transition-colors"
                >
                  <div className="w-[100px]">
                    <span className="text-[13px] font-medium text-foreground">#{p.pedidoId}</span>
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <p className="text-[13px] font-medium text-foreground truncate">{p.clienteNombre}</p>
                  </div>
                  <div className="w-[120px] text-right">
                    <span className="text-[13px] text-foreground/70">{formatCurrency(p.montoTotal)}</span>
                  </div>
                  <div className="w-[60px] text-center">
                    <span className="text-[13px] text-foreground/70">{p.totalProductos}</span>
                  </div>
                  <div className="w-[110px] text-center">
                    <span className="inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full bg-green-100 text-green-600">
                      {p.estadoNombre}
                    </span>
                  </div>
                  {isEditable && (
                    <div className="w-[70px] flex items-center justify-center">
                      <button
                        onClick={() => handleRemovePedido(p.pedidoId)}
                        className="p-1 text-muted-foreground hover:text-red-600 rounded"
                        title={t('detail.removeOrder')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Stops Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">
              {t('columns.stops')} ({route.totalParadas})
            </h2>
            {isEditable && sortedStops.length > 0 && (
              <button
                onClick={() => setIsAddStopOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('detail.addStop')}
              </button>
            )}
          </div>

          <div className="bg-surface-2 border border-border-subtle rounded-lg overflow-hidden">
            {/* Table Header */}
            <div className="flex items-center gap-3 bg-surface-1 px-4 h-10 border-b border-border-subtle">
              <div className="w-[50px] text-xs font-semibold text-foreground/70 text-center">#</div>
              <div className="flex-1 min-w-[160px] text-xs font-semibold text-foreground/70">{t('detail.client')}</div>
              <div className="w-[200px] text-xs font-semibold text-foreground/70">{tc('address')}</div>
              <div className="w-[60px] text-xs font-semibold text-foreground/70 text-center">{t('detail.minutes')}</div>
              <div className="w-[90px] text-xs font-semibold text-foreground/70 text-center">{t('columns.status')}</div>
              {isEditable && (
                <div className="w-[90px] text-xs font-semibold text-foreground/70 text-center">{tc('actions')}</div>
              )}
            </div>

            {/* Table Body */}
            {sortedStops.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <MapPin className="w-12 h-12 text-muted-foreground/60 mb-3" />
                <p className="text-sm font-medium text-foreground/80 mb-1">{t('detail.noStops')}</p>
                <p className="text-xs text-muted-foreground mb-3">{t('detail.addClientsHint')}</p>
                {isEditable && (
                  <button
                    onClick={() => setIsAddStopOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t('detail.addStop')}
                  </button>
                )}
              </div>
            ) : (
              sortedStops.map((stop, idx) => {
                const paradaBadge = getParadaBadge(stop.estado);
                return (
                  <div
                    key={stop.id}
                    className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle hover:bg-surface-1 transition-colors"
                  >
                    <div className="w-[50px] text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-surface-3 text-[11px] font-medium text-foreground/70">
                        {stop.ordenVisita}
                      </span>
                    </div>
                    <div className="flex-1 min-w-[160px]">
                      <p className="text-[13px] font-medium text-foreground truncate">{stop.clienteNombre}</p>
                      {stop.notas && <p className="text-[11px] text-muted-foreground truncate">{stop.notas}</p>}
                    </div>
                    <div className="w-[200px]">
                      <p className="text-[13px] text-foreground/70 truncate">{stop.clienteDireccion || '-'}</p>
                    </div>
                    <div className="w-[60px] text-center">
                      <span className="text-[13px] text-foreground/70">
                        {stop.duracionEstimadaMinutos || 30}
                      </span>
                    </div>
                    <div className="w-[90px] text-center">
                      <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full ${paradaBadge.cls}`}>
                        {paradaBadge.label}
                      </span>
                    </div>
                    {isEditable && (
                      <div className="w-[90px] flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleMoveStop(stop, 'up')}
                          disabled={idx === 0}
                          className="p-1 text-muted-foreground hover:text-foreground/70 disabled:opacity-30 rounded"
                          title={t('detail.moveUp')}
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveStop(stop, 'down')}
                          disabled={idx === sortedStops.length - 1}
                          className="p-1 text-muted-foreground hover:text-foreground/70 disabled:opacity-30 rounded"
                          title={t('detail.moveDown')}
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStop(stop.id)}
                          className="p-1 text-muted-foreground hover:text-red-600 rounded"
                          title={tc('delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Add Stop Modal */}
      <Modal
        isOpen={isAddStopOpen}
        onClose={() => !actionLoading && setIsAddStopOpen(false)}
        title={t('detail.addStop')}
      >
        <div className="space-y-4">
          {/* Nota informativa: explica que los clientes están agrupados por zona */}
          {routeZonaIds.size > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-900 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200">
              <span className="mr-1">📍</span>
              {t('detail.zoneInfoNote', {
                zones: routeZonaNombres,
                defaultValue: `Esta ruta cubre las zonas: ${routeZonaNombres}. Te sugerimos clientes de esas zonas arriba, pero puedes agregar clientes de cualquier zona.`,
              })}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              {t('detail.client')} <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={availableClients}
              value={stopForm.clienteId ? stopForm.clienteId.toString() : ''}
              onChange={(val) => {
                const v = String(val ?? '');
                // Ignorar selección de dividers virtuales (__divider_suggested, __divider_other).
                if (v.startsWith('__divider')) return;
                setStopForm({ ...stopForm, clienteId: v ? parseInt(v) : 0 });
              }}
              placeholder={t('detail.searchClient')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              {t('detail.estimatedDuration')}
            </label>
            <input
              type="number"
              value={stopForm.duracion}
              onChange={(e) => setStopForm({ ...stopForm, duracion: parseInt(e.target.value) || 30 })}
              className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">{tc('notes')}</label>
            <textarea
              value={stopForm.notas}
              onChange={(e) => setStopForm({ ...stopForm, notas: e.target.value })}
              rows={2}
              placeholder={t('detail.stopNotesPlaceholder')}
              className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => setIsAddStopOpen(false)}
              disabled={actionLoading}
              className="px-4 py-2 text-sm font-medium text-foreground/80 border border-border-default rounded-md hover:bg-surface-1 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddStop}
              disabled={actionLoading || !stopForm.clienteId}
              className="px-4 py-2 text-sm font-medium text-success-foreground bg-success rounded-md hover:bg-success/90 disabled:opacity-50 flex items-center gap-2"
            >
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('detail.add')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Cancel Route Modal */}
      <Modal
        isOpen={isCancelOpen}
        onClose={() => !actionLoading && setIsCancelOpen(false)}
        title={t('detail.cancelRoute')}
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground/70">
            {t('detail.cancelConfirm')}
          </p>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">{t('detail.reasonOptional')}</label>
            <textarea
              value={cancelMotivo}
              onChange={(e) => setCancelMotivo(e.target.value)}
              rows={2}
              placeholder={t('detail.reasonPlaceholder')}
              className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => setIsCancelOpen(false)}
              disabled={actionLoading}
              className="px-4 py-2 text-sm font-medium text-foreground/80 border border-border-default rounded-md hover:bg-surface-1 disabled:opacity-50"
            >
              {tc('back')}
            </button>
            <button
              onClick={handleCancelar}
              disabled={actionLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('detail.cancelRoute')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Route Drawer */}
      <Drawer
        ref={editDrawerRef}
        isOpen={isEditOpen}
        onClose={() => !editSaving && setIsEditOpen(false)}
        title={t('drawer.editTitle')}
        icon={<Map className="w-5 h-5 text-teal-500" />}
        width="lg"
        isDirty={editIsDirty}
        onSave={editRhfSubmit(handleSaveEdit)}
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => editDrawerRef.current?.requestClose()} disabled={editSaving} className="px-4 py-2 text-sm font-medium text-foreground/80 border border-border-default rounded-md hover:bg-surface-1 disabled:opacity-50">
              {tc('cancel')}
            </button>
            <button onClick={editRhfSubmit(handleSaveEdit)} disabled={editSaving} className="px-4 py-2 text-sm font-medium text-success-foreground bg-success rounded-md hover:bg-success/90 disabled:opacity-50 flex items-center gap-2">
              {editSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('drawer.saveChanges')}
            </button>
          </div>
        }
      >
        <form onSubmit={editRhfSubmit(handleSaveEdit)} className="p-6 space-y-5">
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-muted-foreground">{t('drawer.generalInfo')}</h4>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-foreground/80 mb-1.5">
                <Map className="w-3.5 h-3.5 text-teal-500" />
                {t('columns.name')} <span className="text-red-500">*</span>
              </label>
              <input type="text" {...editRegister('nombre')} maxLength={100} placeholder={t('drawer.namePlaceholder')} className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
              {editErrors.nombre && <FieldError message={editErrors.nombre?.message} />}
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-foreground/80 mb-1.5">
                <User className="w-3.5 h-3.5 text-blue-500" />
                {t('drawer.vendor')} <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={usuarios.map(u => ({ value: u.id.toString(), label: u.nombre }))}
                value={editWatch('usuarioId') ? editWatch('usuarioId').toString() : ''}
                onChange={(val) => editSetValue('usuarioId', val ? parseInt(String(val)) : 0, { shouldDirty: true })}
                placeholder={t('drawer.selectVendor')}
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-foreground/80 mb-1.5">
                <MapPinned className="w-3.5 h-3.5 text-violet-500" />
                {t('columns.zone')}
              </label>
              <SearchableSelect
                options={[{ value: '', label: t('drawer.noZone') }, ...zones.map(z => ({ value: z.id.toString(), label: z.name }))]}
                value={editWatch('zonaId') ? editWatch('zonaId')!.toString() : ''}
                onChange={(val) => editSetValue('zonaId', val ? parseInt(String(val)) : null, { shouldDirty: true })}
                placeholder={t('drawer.selectZone')}
              />
            </div>
          </div>
          <hr className="border-border-subtle" />
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-muted-foreground">{t('drawer.scheduling')}</h4>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-foreground/80 mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                {t('columns.date')} <span className="text-red-500">*</span>
              </label>
              <DateTimePicker mode="date" value={editWatch('fecha')} onChange={(val) => editSetValue('fecha', val, { shouldValidate: true, shouldDirty: true })} />
              {editErrors.fecha && <FieldError message={editErrors.fecha?.message} />}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-foreground/80 mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-500" />
                  {t('drawer.startTime')}
                </label>
                <input type="time" {...editRegister('horaInicioEstimada')} className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-foreground/80 mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-500" />
                  {t('drawer.endTime')}
                </label>
                <input type="time" {...editRegister('horaFinEstimada')} className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
              </div>
            </div>
          </div>
          <hr className="border-border-subtle" />
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-muted-foreground">{t('drawer.additionalDetails')}</h4>
            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-1.5">{tc('description')}</label>
              <textarea {...editRegister('descripcion')} rows={2} placeholder={t('drawer.descriptionPlaceholder')} className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-1.5">{tc('notes')}</label>
              <textarea {...editRegister('notas')} rows={2} placeholder={t('drawer.notesPlaceholder')} className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none" />
            </div>
          </div>
        </form>
      </Drawer>

      {/* Add Pedido Modal */}
      <Modal
        isOpen={isPedidoModalOpen}
        onClose={() => setIsPedidoModalOpen(false)}
        title={t('detail.assignOrderToRoute')}
        size="lg"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={pedidoSearch}
              onChange={(e) => setPedidoSearch(e.target.value)}
              placeholder={t('detail.searchOrderPlaceholder')}
              className="w-full pl-9 pr-3 py-2 text-xs border border-border-subtle rounded focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {loadingPedidos ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-green-600" />
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {availablePedidos
                .filter((p) => {
                  if (!pedidoSearch) return true;
                  const search = pedidoSearch.toLowerCase();
                  return (
                    p.numeroPedido?.toLowerCase().includes(search) ||
                    p.clienteNombre?.toLowerCase().includes(search) ||
                    p.id.toString().includes(search)
                  );
                })
                .map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-3 py-2 border border-border-subtle rounded-lg hover:bg-surface-1"
                  >
                    <div>
                      <span className="text-[13px] font-medium text-foreground">
                        #{p.numeroPedido || p.id}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {p.clienteNombre || t('detail.noClient')}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {formatCurrency(p.total || 0)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleAddPedido(p.id)}
                      className="px-3 py-1 text-xs font-medium rounded bg-success text-success-foreground hover:bg-success/90 transition-colors"
                    >
                      {t('detail.assign')}
                    </button>
                  </div>
                ))}
              {availablePedidos.length === 0 && !loadingPedidos && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {t('detail.noConfirmedOrders')}
                </p>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
