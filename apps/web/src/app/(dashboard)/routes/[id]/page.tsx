'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { routeService, RouteDetail, RouteStop, AddStopRequest, PedidoAsignado, ESTADO_RUTA, ESTADO_RUTA_LABELS, ESTADO_RUTA_COLORS } from '@/services/api/routes';
import { api } from '@/lib/api';
import { clientService } from '@/services/api/clients';
import { toast } from '@/hooks/useToast';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Modal } from '@/components/ui/Modal';
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
  User,
  Calendar,
  Clock,
  Loader2,
  Package,
  Search,
  ExternalLink,
  Truck,
  FileCheck,
} from 'lucide-react';
import Link from 'next/link';
import { useFormatters } from '@/hooks/useFormatters';
import { useTranslations } from 'next-intl';

interface PedidoOption {
  id: number;
  numeroPedido?: string;
  clienteNombre?: string;
  total?: number;
  estado?: string;
}

export default function RouteDetailPage() {
  const t = useTranslations('routes');
  const tc = useTranslations('common');
  const { formatDateOnly, formatCurrency } = useFormatters();
  const params = useParams();
  const router = useRouter();
  const routeId = Number(params.id);

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

  const fetchClients = async (search?: string) => {
    try {
      const response = await clientService.getClients({ search, limit: 50, isActive: true });
      setClients(response.clients.map(c => ({ value: c.id, label: c.name })));
    } catch {
      console.error('Error al cargar clientes');
    }
  };

  useEffect(() => {
    fetchRoute();
  }, [fetchRoute]);

  useEffect(() => {
    fetchClients();
  }, []);

  const isPlanificada = route?.estado === 0;
  const isEnProgreso = route?.estado === 1;
  const isPendienteAceptar = route?.estado === 4;
  const isEditable = isPlanificada || isPendienteAceptar;

  // Actions
  const handleIniciar = async () => {
    if (!route) return;
    try {
      setActionLoading(true);
      await routeService.iniciarRuta(route.id);
      toast.success(t('detail.routeStarted'));
      fetchRoute();
    } catch {
      toast.error(t('detail.errorStarting'));
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
    } catch {
      toast.error(t('detail.errorCompleting'));
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
    } catch {
      toast.error(t('detail.errorCancelling'));
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
    } catch {
      toast.error(t('detail.errorAddingStop'));
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
    } catch {
      toast.error(t('detail.errorDeletingStop'));
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
    } catch {
      toast.error(t('detail.errorReordering'));
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
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : null) || t('detail.errorAssigningOrder'));
    }
  };

  const handleRemovePedido = async (pedidoId: number) => {
    if (!route) return;
    try {
      await routeService.removePedido(route.id, pedidoId);
      toast.success(t('detail.orderRemoved'));
      const pedidosData = await routeService.getPedidosAsignados(route.id);
      setPedidos(pedidosData);
    } catch {
      toast.error(t('detail.errorRemovingOrder'));
    }
  };

  // Badges — use shared constants for all 7 states
  const getEstadoBadge = (estado: number) => ({
    label: ESTADO_RUTA_LABELS[estado] || 'Desconocido',
    cls: ESTADO_RUTA_COLORS[estado] || 'bg-gray-100 text-gray-600',
  });

  const getParadaBadge = (estado: number) => {
    switch (estado) {
      case 0: return { label: t('detail.stopPending'), cls: 'bg-gray-100 text-gray-600' };
      case 1: return { label: t('detail.stopEnRoute'), cls: 'bg-blue-100 text-blue-600' };
      case 2: return { label: t('detail.stopVisited'), cls: 'bg-green-100 text-green-600' };
      case 3: return { label: t('detail.stopSkipped'), cls: 'bg-red-100 text-red-600' };
      default: return { label: t('status.unknown'), cls: 'bg-gray-100 text-gray-600' };
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
        <p className="text-gray-500">{t('detail.notFound')}</p>
        <Link href="/routes" className="text-green-600 hover:underline text-sm">{t('detail.backToRoutes')}</Link>
      </div>
    );
  }

  const badge = getEstadoBadge(route.estado);
  const sortedStops = [...route.detalles].sort((a, b) => a.ordenVisita - b.ordenVisita);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white px-8 py-6 border-b border-gray-200">
        <Breadcrumb items={[
          { label: tc('home'), href: '/dashboard' },
          { label: t('title'), href: '/routes' },
          { label: route.nombre },
        ]} />

        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/routes')} className="p-1 text-gray-400 hover:text-gray-600 rounded">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
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
                  onClick={handleIniciar}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  {t('detail.startRoute')}
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
                  className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
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
                className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
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
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-[11px] text-gray-500">{t('columns.user')}</p>
                <p className="text-[13px] font-medium text-gray-900">{route.usuarioNombre}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-[11px] text-gray-500">{t('columns.zone')}</p>
                <p className="text-[13px] font-medium text-gray-900">{route.zonaNombre || t('noZone')}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-[11px] text-gray-500">{t('columns.date')}</p>
                <p className="text-[13px] font-medium text-gray-900">
                  {formatDateOnly(route.fecha)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-[11px] text-gray-500">{t('columns.schedule')}</p>
                <p className="text-[13px] font-medium text-gray-900">
                  {route.horaInicioEstimada || '--:--'} - {route.horaFinEstimada || '--:--'}
                </p>
              </div>
            </div>
          </div>
          {route.notas && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-[11px] text-gray-500 mb-1">{tc('notes')}</p>
              <p className="text-[13px] text-gray-700">{route.notas}</p>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-6">
            <div>
              <span className="text-[11px] text-gray-500">{t('columns.stops')}: </span>
              <span className="text-[13px] font-medium">
                <span className={route.paradasCompletadas === route.totalParadas && route.totalParadas > 0 ? 'text-green-600' : ''}>
                  {route.paradasCompletadas}
                </span>
                /{route.totalParadas}
              </span>
            </div>
            {route.kilometrosEstimados && (
              <div>
                <span className="text-[11px] text-gray-500">{t('detail.estimatedKm')}: </span>
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
              <h2 className="text-lg font-semibold text-gray-900">
                {t('detail.assignedOrders')}
              </h2>
              <span className="inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-100 text-blue-700">
                {pedidos.length}
              </span>
            </div>
            {isEditable && (
              <button
                onClick={handleOpenAddPedido}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('detail.assignOrder')}
              </button>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* Table Header */}
            <div className="flex items-center gap-3 bg-gray-50 px-4 h-10 border-b border-gray-200">
              <div className="w-[100px] text-xs font-semibold text-gray-600">{t('detail.orderNumber')}</div>
              <div className="flex-1 min-w-[160px] text-xs font-semibold text-gray-600">{t('detail.client')}</div>
              <div className="w-[120px] text-xs font-semibold text-gray-600 text-right">{t('detail.amount')}</div>
              <div className="w-[60px] text-xs font-semibold text-gray-600 text-center">{t('detail.products')}</div>
              <div className="w-[110px] text-xs font-semibold text-gray-600 text-center">{t('columns.status')}</div>
              {isEditable && (
                <div className="w-[70px] text-xs font-semibold text-gray-600 text-center">{tc('actions')}</div>
              )}
            </div>

            {/* Table Body */}
            {pedidos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Package className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-700 mb-1">{t('detail.noOrders')}</p>
                <p className="text-xs text-gray-500 mb-3">{t('detail.assignConfirmedOrders')}</p>
                {isEditable && (
                  <button
                    onClick={handleOpenAddPedido}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
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
                  className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-[100px]">
                    <span className="text-[13px] font-medium text-gray-900">#{p.pedidoId}</span>
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <p className="text-[13px] font-medium text-gray-900 truncate">{p.clienteNombre}</p>
                  </div>
                  <div className="w-[120px] text-right">
                    <span className="text-[13px] text-gray-600">{formatCurrency(p.montoTotal)}</span>
                  </div>
                  <div className="w-[60px] text-center">
                    <span className="text-[13px] text-gray-600">{p.totalProductos}</span>
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
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
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
            <h2 className="text-lg font-semibold text-gray-900">
              {t('columns.stops')} ({route.totalParadas})
            </h2>
            {isEditable && (
              <button
                onClick={() => setIsAddStopOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('detail.addStop')}
              </button>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* Table Header */}
            <div className="flex items-center gap-3 bg-gray-50 px-4 h-10 border-b border-gray-200">
              <div className="w-[50px] text-xs font-semibold text-gray-600 text-center">#</div>
              <div className="flex-1 min-w-[160px] text-xs font-semibold text-gray-600">{t('detail.client')}</div>
              <div className="w-[200px] text-xs font-semibold text-gray-600">{tc('address')}</div>
              <div className="w-[60px] text-xs font-semibold text-gray-600 text-center">{t('detail.minutes')}</div>
              <div className="w-[90px] text-xs font-semibold text-gray-600 text-center">{t('columns.status')}</div>
              {isEditable && (
                <div className="w-[90px] text-xs font-semibold text-gray-600 text-center">{tc('actions')}</div>
              )}
            </div>

            {/* Table Body */}
            {sortedStops.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <MapPin className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-700 mb-1">{t('detail.noStops')}</p>
                <p className="text-xs text-gray-500 mb-3">{t('detail.addClientsHint')}</p>
                {isEditable && (
                  <button
                    onClick={() => setIsAddStopOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
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
                    className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-[50px] text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-[11px] font-medium text-gray-600">
                        {stop.ordenVisita}
                      </span>
                    </div>
                    <div className="flex-1 min-w-[160px]">
                      <p className="text-[13px] font-medium text-gray-900 truncate">{stop.clienteNombre}</p>
                      {stop.notas && <p className="text-[11px] text-gray-500 truncate">{stop.notas}</p>}
                    </div>
                    <div className="w-[200px]">
                      <p className="text-[13px] text-gray-600 truncate">{stop.clienteDireccion || '-'}</p>
                    </div>
                    <div className="w-[60px] text-center">
                      <span className="text-[13px] text-gray-600">
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
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 rounded"
                          title={t('detail.moveUp')}
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveStop(stop, 'down')}
                          disabled={idx === sortedStops.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 rounded"
                          title={t('detail.moveDown')}
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStop(stop.id)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('detail.client')} <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={clients}
              value={stopForm.clienteId ? stopForm.clienteId.toString() : ''}
              onChange={(val) => setStopForm({ ...stopForm, clienteId: val ? parseInt(String(val)) : 0 })}
              placeholder={t('detail.searchClient')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('detail.estimatedDuration')}
            </label>
            <input
              type="number"
              value={stopForm.duracion}
              onChange={(e) => setStopForm({ ...stopForm, duracion: parseInt(e.target.value) || 30 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{tc('notes')}</label>
            <textarea
              value={stopForm.notas}
              onChange={(e) => setStopForm({ ...stopForm, notas: e.target.value })}
              rows={2}
              placeholder={t('detail.stopNotesPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => setIsAddStopOpen(false)}
              disabled={actionLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddStop}
              disabled={actionLoading || !stopForm.clienteId}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
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
          <p className="text-sm text-gray-600">
            {t('detail.cancelConfirm')}
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('detail.reasonOptional')}</label>
            <textarea
              value={cancelMotivo}
              onChange={(e) => setCancelMotivo(e.target.value)}
              rows={2}
              placeholder={t('detail.reasonPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => setIsCancelOpen(false)}
              disabled={actionLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
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

      {/* Add Pedido Modal */}
      <Modal
        isOpen={isPedidoModalOpen}
        onClose={() => setIsPedidoModalOpen(false)}
        title={t('detail.assignOrderToRoute')}
        size="lg"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={pedidoSearch}
              onChange={(e) => setPedidoSearch(e.target.value)}
              placeholder={t('detail.searchOrderPlaceholder')}
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
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
                    className="flex items-center justify-between px-3 py-2 border border-gray-100 rounded-lg hover:bg-gray-50"
                  >
                    <div>
                      <span className="text-[13px] font-medium text-gray-900">
                        #{p.numeroPedido || p.id}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        {p.clienteNombre || t('detail.noClient')}
                      </span>
                      <span className="text-xs text-gray-400 ml-2">
                        {formatCurrency(p.total || 0)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleAddPedido(p.id)}
                      className="px-3 py-1 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
                    >
                      {t('detail.assign')}
                    </button>
                  </div>
                ))}
              {availablePedidos.length === 0 && !loadingPedidos && (
                <p className="text-xs text-gray-400 text-center py-4">
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
