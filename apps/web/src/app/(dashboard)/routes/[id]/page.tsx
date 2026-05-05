'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useApiErrorToast } from '@/hooks/useApiErrorToast';
import {
  routeService,
  RouteDetail,
  PedidoAsignado,
  RutaCargaItem,
  RouteUpdateRequest,
  ESTADO_RUTA,
  ESTADO_RUTA_KEYS,
  ESTADO_RUTA_COLORS,
} from '@/services/api/routes';
import { zoneService } from '@/services/api/zones';
import { api } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { FieldError } from '@/components/forms/FieldError';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import {
  AlertTriangle,
  ArrowLeft,
  Play,
  CheckCircle,
  XCircle,
  MapPinned,
  Map,
  User,
  Calendar,
  Clock,
  Loader2,
  Send,
  FileCheck,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { dateOnlyToUTC } from '@/lib/formatters';
import { useTranslations } from 'next-intl';
import { ResumenTab } from './components/ResumenTab';
import { ParadasTab } from './components/ParadasTab';
import { PedidosTab } from './components/PedidosTab';
import { CargaTab } from './components/CargaTab';
import type { ZoneOption, UsuarioOption } from './components/types';

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

type TabKey = 'resumen' | 'paradas' | 'pedidos' | 'carga';
const VALID_TABS: TabKey[] = ['resumen', 'paradas', 'pedidos', 'carga'];

export default function RouteDetailPage() {
  const t = useTranslations('routes');
  const ts = useTranslations('routes.status');
  const tt = useTranslations('routes.tabs');
  const tc = useTranslations('common');
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeId = Number(params.id);

  const showApiError = useApiErrorToast();
  const [route, setRoute] = useState<RouteDetail | null>(null);
  const [pedidos, setPedidos] = useState<PedidoAsignado[]>([]);
  const [carga, setCarga] = useState<RutaCargaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Tab activa con sync bidireccional al URL ?tab=. State local controlled
  // para que el cambio sea síncrono (useSearchParams hace re-render
  // asincrónico tras router.replace, lo que causa lag visible al cambiar tab).
  const initialTab: TabKey = (() => {
    const tp = searchParams.get('tab') as TabKey | null;
    return tp && VALID_TABS.includes(tp) ? tp : 'resumen';
  })();
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  const handleTabChange = (value: string) => {
    const tab = value as TabKey;
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams.toString());
    if (tab === 'resumen') newParams.delete('tab');
    else newParams.set('tab', tab);
    const qs = newParams.toString();
    router.replace(qs ? `/routes/${routeId}?${qs}` : `/routes/${routeId}`, { scroll: false });
  };

  // Sync state ← URL cuando cambia desde fuera (back button, bookmark, redirect).
  useEffect(() => {
    const tp = searchParams.get('tab') as TabKey | null;
    const next = tp && VALID_TABS.includes(tp) ? tp : 'resumen';
    if (next !== activeTab) setActiveTab(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Cancel modal
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelMotivo, setCancelMotivo] = useState('');
  // Typing-confirm para cancelar cuando vendedor activo (EnProgreso/CargaAceptada).
  // Antes solo bastaba el click; un admin canceló por error una ruta activa hoy.
  const [cancelTypingConfirm, setCancelTypingConfirm] = useState('');

  // Send to Load confirmation modal
  const [isSendOpen, setIsSendOpen] = useState(false);

  // Edit drawer
  const editDrawerRef = useRef<DrawerHandle>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioOption[]>([]);
  const {
    register: editRegister,
    handleSubmit: editRhfSubmit,
    reset: editReset,
    watch: editWatch,
    setValue: editSetValue,
    formState: { errors: editErrors, isDirty: editIsDirty },
  } = useForm<EditRouteFormData>({
    resolver: zodResolver(editRouteSchema),
    defaultValues: {
      nombre: '',
      usuarioId: 0,
      zonaId: null,
      fecha: '',
      horaInicioEstimada: '',
      horaFinEstimada: '',
      descripcion: '',
      notas: '',
    },
  });

  /**
   * Fetch consolidado: route + pedidos + carga en paralelo.
   * Los tabs llaman este callback (`onRefetch`) tras agregar/eliminar.
   */
  const fetchAll = useCallback(async () => {
    try {
      const [data, pedidosData, cargaData] = await Promise.all([
        routeService.getRuta(routeId),
        routeService.getPedidosAsignados(routeId),
        routeService.getCarga(routeId),
      ]);
      setRoute(data);
      setPedidos(pedidosData);
      setCarga(cargaData);
    } catch {
      toast.error(t('detail.errorLoading'));
    }
  }, [routeId]);

  useEffect(() => {
    setLoading(true);
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  const fetchEditDropdowns = async () => {
    try {
      const [zonesRes, usersRes] = await Promise.all([
        zoneService.getZones(),
        api.get<{ items: UsuarioOption[] } | UsuarioOption[]>('/api/usuarios?pagina=1&tamanoPagina=500'),
      ]);
      setZones(zonesRes.zones.map((z) => ({ id: parseInt(z.id), name: z.name })));
      const userData = usersRes.data;
      setUsuarios(Array.isArray(userData) ? userData : userData.items || []);
    } catch (err) {
      console.error('Error loading edit dropdowns:', err);
    }
  };

  const handleOpenEditDrawer = () => {
    if (!route) return;
    if (zones.length === 0 || usuarios.length === 0) fetchEditDropdowns();
    editReset({
      nombre: route.nombre,
      usuarioId: route.usuarioId,
      zonaId: route.zonaId ?? null,
      fecha:
        typeof route.fecha === 'string'
          ? route.fecha.split('T')[0]
          : new Date(route.fecha).toISOString().split('T')[0],
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
      const fmtTime = (t?: string | null) => (t ? (t.length === 5 ? `${t}:00` : t) : null);
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
      await fetchAll();
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
  const isCargaAceptada = route?.estado === 5;
  const isEditable = isPlanificada;
  // Vendedor activo = ya aceptó la carga o está visitando paradas. Cancelar
  // ahora aborta su jornada → modal con typing-confirm + motivo obligatorio.
  const vendedorActivo = isEnProgreso || isCargaAceptada;
  const cancelMotivoTrimmed = cancelMotivo.trim();
  // Normalizamos a uppercase en el state via onChange (W1 UI/UX validator).
  const cancelTypingMatches = cancelTypingConfirm.trim() === 'CANCELAR';
  const cancelMotivoTooShort = cancelMotivoTrimmed.length < 5;
  const cancelDisabled =
    actionLoading || (vendedorActivo && (cancelMotivoTooShort || !cancelTypingMatches));

  // Send to Load handler — reemplaza el confirm() nativo del /load page.
  // Usa un Modal. Se invoca desde el botón del header.
  const handleSendToLoadClick = () => {
    if (!route || carga.length === 0) {
      toast.error(t('detail.errorSendingToLoad') + ': ' + 'faltan productos de carga.');
      return;
    }
    setIsSendOpen(true);
  };

  const submitSendToLoad = async () => {
    if (!route) return;
    try {
      setSending(true);
      await routeService.enviarACarga(route.id);
      toast.success(t('detail.routeSentToLoad'));
      setIsSendOpen(false);
      await fetchAll();
    } catch (err) {
      showApiError(err, t('detail.errorSendingToLoad'));
    } finally {
      setSending(false);
    }
  };

  const handleCompletar = async () => {
    if (!route) return;
    try {
      setActionLoading(true);
      await routeService.completarRuta(route.id);
      toast.success(t('detail.routeCompleted'));
      await fetchAll();
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
      setCancelTypingConfirm('');
      await fetchAll();
    } catch (err) {
      showApiError(err, t('detail.errorCancelling'));
    } finally {
      setActionLoading(false);
    }
  };

  const getEstadoBadge = (estado: number) => ({
    label: ESTADO_RUTA_KEYS[estado] ? ts(ESTADO_RUTA_KEYS[estado]) : ts('unknown'),
    cls: ESTADO_RUTA_COLORS[estado] || 'bg-surface-3 text-foreground/70',
  });

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
        <Link href="/routes" className="text-green-600 hover:underline text-sm">
          {t('detail.backToRoutes')}
        </Link>
      </div>
    );
  }

  const badge = getEstadoBadge(route.estado);

  return (
    <div className="flex flex-col h-full">
      {/* Header — compartido entre todos los tabs (incluye Send to Load) */}
      <div className="bg-surface-2 px-8 py-6 border-b border-border-subtle">
        <Breadcrumb
          items={[
            { label: tc('home'), href: '/dashboard' },
            { label: t('title'), href: '/routes' },
            { label: route.nombre },
          ]}
        />

        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/routes')}
              className="p-1 text-muted-foreground hover:text-foreground/70 rounded"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-foreground">{route.nombre}</h1>
            <span
              className={`inline-flex px-2.5 py-0.5 text-[11px] font-medium rounded-full ${badge.cls}`}
            >
              {badge.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isPlanificada && (
              <>
                <button
                  onClick={handleSendToLoadClick}
                  disabled={actionLoading || sending || carga.length === 0}
                  title={carga.length === 0 ? 'Asigna al menos un producto de carga' : undefined}
                  className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              <button
                onClick={() => setIsCancelOpen(true)}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                {tc('cancel')}
              </button>
            )}
            {route.estado === ESTADO_RUTA.Completada && (
              <Link
                href={`/routes/manage/${route.id}/close`}
                className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
              >
                <FileCheck className="w-4 h-4" />
                {t('detail.closeRoute')}
              </Link>
            )}
            {route.estado === ESTADO_RUTA.Cerrada && (
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

      {/* Body con Tabs */}
      <div className="flex-1 px-8 py-6 overflow-auto">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="overflow-x-auto whitespace-nowrap">
            <TabsTrigger value="resumen">{tt('resumen')}</TabsTrigger>
            <TabsTrigger value="paradas">
              {tt('paradas')}
              {route.totalParadas > 0 && (
                <span className="ml-1.5 text-[10px] text-muted-foreground">({route.totalParadas})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="pedidos">
              {tt('pedidos')}
              {pedidos.length > 0 && (
                <span className="ml-1.5 text-[10px] text-muted-foreground">({pedidos.length})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="carga">
              {tt('carga')}
              {carga.length > 0 && (
                <span className="ml-1.5 text-[10px] text-muted-foreground">({carga.length})</span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="resumen" className="mt-6">
            <ResumenTab
              route={route}
              isEditable={isEditable}
              onRefetch={fetchAll}
              pedidos={pedidos}
              setPedidos={setPedidos}
              carga={carga}
              onEditClick={handleOpenEditDrawer}
            />
          </TabsContent>

          <TabsContent value="paradas" className="mt-6">
            <ParadasTab route={route} isEditable={isEditable} onRefetch={fetchAll} />
          </TabsContent>

          <TabsContent value="pedidos" className="mt-6">
            <PedidosTab
              route={route}
              isEditable={isEditable}
              onRefetch={fetchAll}
              pedidos={pedidos}
              setPedidos={setPedidos}
            />
          </TabsContent>

          <TabsContent value="carga" className="mt-6">
            <CargaTab
              route={route}
              isEditable={isEditable}
              onRefetch={fetchAll}
              carga={carga}
              setCarga={setCarga}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Cancel Route Modal — Modo reforzado cuando vendedor activo */}
      <Modal
        isOpen={isCancelOpen}
        onClose={() => {
          if (actionLoading) return;
          setIsCancelOpen(false);
          setCancelMotivo('');
          setCancelTypingConfirm('');
        }}
        title={vendedorActivo ? t('detail.cancelActiveTitle') : t('detail.cancelRoute')}
      >
        <div className="space-y-4">
          {vendedorActivo ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              <p className="font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                {t('detail.cancelActiveHeading')}
              </p>
              <ul className="mt-2 list-disc list-inside space-y-1 text-red-800">
                <li className="font-semibold">{t('detail.cancelActiveIrreversible')}</li>
                <li>{t('detail.cancelActiveAbortJornada')}</li>
                <li>
                  {t('detail.cancelActiveReversaPedidos', { count: pedidos.length })}
                </li>
                <li>
                  {t('detail.cancelActiveOmitirParadas', {
                    count: route.paradasPendientes ?? 0,
                  })}
                </li>
                <li>{t('detail.cancelActiveAvisoMobile')}</li>
              </ul>
            </div>
          ) : (
            <p className="text-sm text-foreground/70">{t('detail.cancelConfirm')}</p>
          )}

          <div>
            <label
              htmlFor="cancel-motivo"
              className="block text-sm font-medium text-foreground/80 mb-1"
            >
              {vendedorActivo ? t('detail.reasonRequired') : t('detail.reasonOptional')}
            </label>
            <textarea
              id="cancel-motivo"
              value={cancelMotivo}
              onChange={(e) => setCancelMotivo(e.target.value)}
              rows={2}
              placeholder={t('detail.reasonPlaceholder')}
              {...(vendedorActivo ? { 'aria-required': true } : {})}
              className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
            />
            {vendedorActivo && cancelMotivo.length > 0 && cancelMotivoTooShort && (
              <p className="mt-1 text-xs text-red-600">
                {t('detail.cancelReasonMinLength')}
              </p>
            )}
          </div>

          {vendedorActivo && (
            <div>
              <label
                htmlFor="cancel-typing-confirm"
                className="block text-sm font-medium text-foreground/80 mb-1"
              >
                {t('detail.cancelTypingConfirm')}
              </label>
              <input
                id="cancel-typing-confirm"
                type="text"
                value={cancelTypingConfirm}
                onChange={(e) => setCancelTypingConfirm(e.target.value.toUpperCase())}
                placeholder="CANCELAR"
                autoComplete="off"
                spellCheck={false}
                className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Feedback de por qué el botón está disabled (W2 UI/UX validator). */}
          {vendedorActivo && cancelDisabled && !actionLoading && (
            <p className="text-xs text-red-600 text-right">
              {t('detail.cancelRequirementsNotMet')}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => {
                setIsCancelOpen(false);
                setCancelMotivo('');
                setCancelTypingConfirm('');
              }}
              disabled={actionLoading}
              className="px-4 py-2 text-sm font-medium text-foreground/80 border border-border-default rounded-md hover:bg-surface-1 disabled:opacity-50"
            >
              {tc('back')}
            </button>
            <button
              onClick={handleCancelar}
              disabled={cancelDisabled}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {vendedorActivo
                ? t('detail.cancelActiveButton')
                : t('detail.cancelRoute')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Send to Load Confirmation Modal */}
      <Modal
        isOpen={isSendOpen}
        onClose={() => !sending && setIsSendOpen(false)}
        title={t('detail.sendToLoad')}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground/80">
            {t('detail.sendToLoadConfirm', {
              defaultValue:
                '¿Confirmas enviar esta ruta al vendedor? El vendedor recibirá una notificación push y podrá aceptar la ruta. Una vez enviada no podrás editar paradas, pedidos ni carga.',
            })}
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsSendOpen(false)}
              disabled={sending}
              className="px-4 py-2 text-sm font-medium text-foreground/80 bg-surface-2 border border-border-default rounded-lg hover:bg-surface-1 disabled:opacity-50"
            >
              {tc('cancel')}
            </button>
            <button
              type="button"
              onClick={submitSendToLoad}
              disabled={sending}
              className="px-4 py-2 text-sm font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 disabled:opacity-50 flex items-center gap-2"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {t('detail.sendToLoad')}
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
            <button
              onClick={() => editDrawerRef.current?.requestClose()}
              disabled={editSaving}
              className="px-4 py-2 text-sm font-medium text-foreground/80 border border-border-default rounded-md hover:bg-surface-1 disabled:opacity-50"
            >
              {tc('cancel')}
            </button>
            <button
              onClick={editRhfSubmit(handleSaveEdit)}
              disabled={editSaving}
              className="px-4 py-2 text-sm font-medium text-success-foreground bg-success rounded-md hover:bg-success/90 disabled:opacity-50 flex items-center gap-2"
            >
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
              <input
                type="text"
                {...editRegister('nombre')}
                maxLength={100}
                placeholder={t('drawer.namePlaceholder')}
                className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              {editErrors.nombre && <FieldError message={editErrors.nombre?.message} />}
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-foreground/80 mb-1.5">
                <User className="w-3.5 h-3.5 text-blue-500" />
                {t('drawer.vendor')} <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={usuarios.map((u) => ({ value: u.id.toString(), label: u.nombre }))}
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
                options={[
                  { value: '', label: t('drawer.noZone') },
                  ...zones.map((z) => ({ value: z.id.toString(), label: z.name })),
                ]}
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
              <DateTimePicker
                mode="date"
                value={editWatch('fecha')}
                onChange={(val) => editSetValue('fecha', val, { shouldValidate: true, shouldDirty: true })}
              />
              {editErrors.fecha && <FieldError message={editErrors.fecha?.message} />}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-foreground/80 mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-500" />
                  {t('drawer.startTime')}
                </label>
                <input
                  type="time"
                  {...editRegister('horaInicioEstimada')}
                  className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-foreground/80 mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-500" />
                  {t('drawer.endTime')}
                </label>
                <input
                  type="time"
                  {...editRegister('horaFinEstimada')}
                  className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
          <hr className="border-border-subtle" />
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-muted-foreground">{t('drawer.additionalDetails')}</h4>
            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-1.5">{tc('description')}</label>
              <textarea
                {...editRegister('descripcion')}
                rows={2}
                placeholder={t('drawer.descriptionPlaceholder')}
                className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-1.5">{tc('notes')}</label>
              <textarea
                {...editRegister('notas')}
                rows={2}
                placeholder={t('drawer.notesPlaceholder')}
                className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
              />
            </div>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
