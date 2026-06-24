'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Plus,
  Minus,
  Trash2,
  Loader2,
  Search,
  Package,
  Send,
} from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { useApiErrorToast } from '@/hooks/useApiErrorToast';
import { useFormatters } from '@/hooks/useFormatters';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { api } from '@/lib/api';
import {
  routeService,
  RouteDetail,
  PedidoAsignado,
  RutaCargaItem,
  ESTADO_RUTA,
} from '@/services/api/routes';
import { vehiclesService, type Vehiculo } from '@/services/api/vehicles';
import type { PedidoOption, ProductoOption } from '../../components/types';

/**
 * Fila unificada de pedido seleccionable: combina pedidos disponibles (sin asignar)
 * + pedidos ya asignados a la ruta. Los asignados quedan pre-marcados. El folio,
 * cliente, unidades y monto se normalizan para que el datagrid y el resumen no
 * dependan de qué fuente venga (asignado vs disponible).
 */
interface PedidoRow {
  id: number;
  folio: string;
  clienteNombre: string;
  unidades: number;
  monto: number;
  zona?: string;
}

export default function ArmarCargaPage() {
  const t = useTranslations('routes.armarCarga');
  const tc = useTranslations('common');
  const tn = useTranslations('nav');
  const router = useRouter();
  const params = useParams();
  const routeId = Number(params.id);

  const showApiError = useApiErrorToast();
  const { formatCurrency, formatDateOnly } = useFormatters();

  const [route, setRoute] = useState<RouteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fondo de caja (efectivo inicial)
  const [efectivo, setEfectivo] = useState<string>('');

  // Vehículo asignado (flotilla) — su capacidad alimenta la barra de capacidad.
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [selectedVehiculoId, setSelectedVehiculoId] = useState<number | null>(null);

  // Sub-tab activa
  const [activeTab, setActiveTab] = useState<'pedidos' | 'directo'>('pedidos');

  // === Pedidos ===
  const [pedidoRows, setPedidoRows] = useState<PedidoRow[]>([]);
  const [originalAssignedIds, setOriginalAssignedIds] = useState<Set<number>>(new Set());
  const [selectedPedidoIds, setSelectedPedidoIds] = useState<Set<number>>(new Set());
  const [pedidoSearch, setPedidoSearch] = useState('');
  const [zonaFilter, setZonaFilter] = useState('');

  // === Producto directo ===
  const [carga, setCarga] = useState<RutaCargaItem[]>([]);
  const [productos, setProductos] = useState<ProductoOption[]>([]);
  const [selectedProducto, setSelectedProducto] = useState<string>('');
  const [cantidad, setCantidad] = useState<number>(1);
  const [precio, setPrecio] = useState<string>('');
  const [addingProducto, setAddingProducto] = useState(false);

  // editing = ruta ya enviada al vendedor (PendienteAceptar). Modo create = Planificada.
  const isEditing = route?.estado === ESTADO_RUTA.PendienteAceptar;

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ruta, asignados, cargaData, confirmedRes, enProcesoRes, productosRes, vehiculosData] =
        await Promise.all([
          routeService.getRuta(routeId),
          routeService.getPedidosAsignados(routeId),
          routeService.getCarga(routeId),
          api.get<{ items: PedidoOption[] } | PedidoOption[]>(
            '/pedidos?pagina=1&tamanoPagina=100&estado=Confirmado&excluirAsignadosARutas=true',
          ),
          api.get<{ items: PedidoOption[] } | PedidoOption[]>(
            '/pedidos?pagina=1&tamanoPagina=100&estado=EnProceso&excluirAsignadosARutas=true',
          ),
          api.get<{ items: ProductoOption[] } | ProductoOption[]>(
            '/productos?pagina=1&tamanoPagina=500',
          ),
          vehiclesService.getVehiculos(),
        ]);

      setRoute(ruta);
      setEfectivo(ruta.efectivoInicial != null ? String(ruta.efectivoInicial) : '');
      setSelectedVehiculoId(ruta.vehiculoId ?? null);
      setVehiculos(vehiculosData.filter((v) => v.activo && v.estado !== 3));
      setCarga(cargaData);
      setProductos(
        Array.isArray(productosRes.data) ? productosRes.data : productosRes.data.items || [],
      );

      const confirmed = Array.isArray(confirmedRes.data)
        ? confirmedRes.data
        : confirmedRes.data.items || [];
      const enProceso = Array.isArray(enProcesoRes.data)
        ? enProcesoRes.data
        : enProcesoRes.data.items || [];

      const assignedIds = new Set(asignados.map((p) => p.pedidoId));

      // Filas asignadas (pre-marcadas) — provienen de PedidoAsignado.
      const assignedRows: PedidoRow[] = asignados.map((p: PedidoAsignado) => ({
        id: p.pedidoId,
        folio: `#${p.pedidoId}`,
        clienteNombre: p.clienteNombre,
        unidades: p.totalProductos,
        monto: p.montoTotal,
      }));

      // Filas disponibles (sin asignar) — provienen de PedidoOption. Excluimos los
      // que ya están asignados para no duplicar.
      const availableRows: PedidoRow[] = [...confirmed, ...enProceso]
        .filter((p) => !assignedIds.has(p.id))
        .map((p: PedidoOption) => ({
          id: p.id,
          folio: p.numeroPedido ? `#${p.numeroPedido}` : `#${p.id}`,
          clienteNombre: p.clienteNombre || '',
          unidades: 0,
          monto: p.total || 0,
        }));

      setPedidoRows([...assignedRows, ...availableRows]);
      setOriginalAssignedIds(new Set(assignedIds));
      setSelectedPedidoIds(new Set(assignedIds));
    } catch {
      toast.error(tc('errorOccurred'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId]);

  useEffect(() => {
    if (Number.isFinite(routeId)) loadAll();
  }, [routeId, loadAll]);

  // === Pedidos: selección ===
  const togglePedido = (id: number) => {
    setSelectedPedidoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Zonas derivadas de los pedidos (solo si el dato existe en alguna fila).
  const zonas = useMemo(() => {
    const set = new Set<string>();
    pedidoRows.forEach((p) => {
      if (p.zona) set.add(p.zona);
    });
    return Array.from(set).sort();
  }, [pedidoRows]);

  const filteredPedidos = useMemo(() => {
    return pedidoRows.filter((p) => {
      if (zonaFilter && p.zona !== zonaFilter) return false;
      if (!pedidoSearch) return true;
      const s = pedidoSearch.toLowerCase();
      return (
        p.folio.toLowerCase().includes(s) ||
        p.clienteNombre.toLowerCase().includes(s) ||
        String(p.id).includes(s)
      );
    });
  }, [pedidoRows, pedidoSearch, zonaFilter]);

  const allFilteredSelected =
    filteredPedidos.length > 0 && filteredPedidos.every((p) => selectedPedidoIds.has(p.id));

  const toggleSelectAllFiltered = () => {
    setSelectedPedidoIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) filteredPedidos.forEach((p) => next.delete(p.id));
      else filteredPedidos.forEach((p) => next.add(p.id));
      return next;
    });
  };

  // === Producto directo (acciones inmediatas, como CargaTab) ===
  const handleAddProducto = async () => {
    if (!selectedProducto || cantidad < 1) return;
    setAddingProducto(true);
    try {
      const prod = productos.find((p) => p.id.toString() === selectedProducto);
      await routeService.addProductoVenta(routeId, {
        productoId: parseInt(selectedProducto),
        cantidad,
        precioUnitario: parseFloat(precio) || prod?.precioBase || 0,
      });
      const updated = await routeService.getCarga(routeId);
      setCarga(updated);
      setSelectedProducto('');
      setCantidad(1);
      setPrecio('');
    } catch (err) {
      showApiError(err, t('errorGuardar'));
    } finally {
      setAddingProducto(false);
    }
  };

  const handleRemoveProducto = async (productoId: number) => {
    try {
      await routeService.removeProductoCarga(routeId, productoId);
      const updated = await routeService.getCarga(routeId);
      setCarga(updated);
    } catch (err) {
      showApiError(err, t('errorGuardar'));
    }
  };

  // === Resumen ===
  const selectedRows = useMemo(
    () => pedidoRows.filter((p) => selectedPedidoIds.has(p.id)),
    [pedidoRows, selectedPedidoIds],
  );
  const directUnits = useMemo(() => carga.reduce((s, c) => s + c.cantidadVenta, 0), [carga]);
  const directValue = useMemo(
    () => carga.reduce((s, c) => s + c.cantidadVenta * c.precioUnitario, 0),
    [carga],
  );
  const pedidosUnits = useMemo(() => selectedRows.reduce((s, p) => s + p.unidades, 0), [selectedRows]);
  const pedidosValue = useMemo(() => selectedRows.reduce((s, p) => s + p.monto, 0), [selectedRows]);

  const totalUnits = pedidosUnits + directUnits;
  const totalValue = pedidosValue + directValue;

  // Capacidad del vehículo seleccionado (barra de capacidad del resumen).
  const selectedVehiculo = useMemo(
    () => vehiculos.find((v) => v.id === selectedVehiculoId) ?? null,
    [vehiculos, selectedVehiculoId],
  );
  const capPct = selectedVehiculo
    ? Math.min(100, Math.round((totalUnits / Math.max(1, selectedVehiculo.capacidadUnidades)) * 100))
    : 0;
  const overCap = selectedVehiculo ? totalUnits > selectedVehiculo.capacidadUnidades : false;

  const nothingSelected = selectedPedidoIds.size === 0 && carga.length === 0;

  // === Guardar (primary action) ===
  const persistChanges = async () => {
    // 0. Vehículo asignado (si cambió). Backend: 0 = quitar, >0 = asignar.
    if ((selectedVehiculoId ?? null) !== (route?.vehiculoId ?? null)) {
      await routeService.updateRuta(routeId, { vehiculoId: selectedVehiculoId ?? 0 });
    }
    // 1. Efectivo inicial
    const monto = parseFloat(efectivo);
    if (!Number.isNaN(monto) && monto !== (route?.efectivoInicial ?? 0)) {
      await routeService.updateEfectivoInicial(routeId, monto);
    }

    // 2. Diff pedidos: agregar nuevos, quitar deseleccionados.
    const toAdd = Array.from(selectedPedidoIds).filter((id) => !originalAssignedIds.has(id));
    const toRemove = Array.from(originalAssignedIds).filter((id) => !selectedPedidoIds.has(id));

    if (toAdd.length > 0) await routeService.addPedidosBatch(routeId, toAdd);
    if (toRemove.length > 0) await routeService.removePedidosBatch(routeId, toRemove);
  };

  const handlePrimary = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await persistChanges();

      if (isEditing) {
        toast.success(t('actualizadoOk'));
      } else {
        // Create mode: Planificada → PendienteAceptar
        await routeService.enviarACarga(routeId);
        toast.success(t('enviadoOk'));
      }
      router.push(`/routes/${routeId}?tab=carga`);
    } catch (err) {
      showApiError(err, t('errorGuardar'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/routes/${routeId}?tab=carga`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!route) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">{tc('errorOccurred')}</p>
      </div>
    );
  }

  const zonaChip = route.zonaNombre || route.zonas?.[0]?.nombre;

  const breadcrumbs = [
    { label: tc('home'), href: '/dashboard' },
    { label: tn('sectionOperations') },
    { label: tn('routes'), href: '/routes' },
    { label: route.nombre, href: `/routes/${routeId}` },
    { label: t('breadcrumb') },
  ];

  const actions = (
    <>
      <button
        type="button"
        onClick={handleCancel}
        disabled={saving}
        className="px-4 py-2 text-sm font-medium text-foreground/80 border border-border-default rounded-lg hover:bg-surface-1 disabled:opacity-50"
      >
        {t('cancelar')}
      </button>
      <button
        type="button"
        onClick={handlePrimary}
        disabled={saving || nothingSelected}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
        {isEditing ? t('guardarCambios') : t('confirmarEnviar')}
      </button>
    </>
  );

  return (
    <PageHeader
      breadcrumbs={breadcrumbs}
      title={isEditing ? t('editTitle') : t('title')}
      actions={actions}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_330px] gap-4 items-start">
        {/* === Left column === */}
        <div className="space-y-4">
          {/* Asignación card */}
          <div className="bg-card border border-border-subtle rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{t('vendedor')}</span>
              <span className="text-sm font-medium text-foreground">{route.usuarioNombre}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{t('ruta')}</span>
              <span className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{route.nombre}</span>
                {zonaChip && (
                  <span className="inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full bg-primary/10 text-primary">
                    {zonaChip}
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{t('almacenOrigen')}</span>
              <span className="text-sm font-medium text-foreground">Almacén Central</span>
            </div>

            {/* Fecha heredada (highlighted) */}
            <div className="rounded-md bg-surface-1 border border-border-subtle px-3 py-2">
              <p className="text-[13px] font-medium text-foreground">
                {t('fechaHeredada', {
                  date: formatDateOnly(route.fecha),
                  start: route.horaInicioEstimada || '--:--',
                  end: route.horaFinEstimada || '--:--',
                })}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">({t('fechaHeredadaHint')})</p>
            </div>

            {/* Fondo de caja */}
            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-1">
                {t('fondoCaja')}
              </label>
              <input
                type="number"
                value={efectivo}
                onChange={(e) => setEfectivo(e.target.value)}
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Vehículo (flotilla) — su capacidad alimenta la barra de capacidad del resumen. */}
            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-1">
                {t('vehiculo')}
              </label>
              <SearchableSelect
                options={[
                  { value: '', label: t('sinVehiculo') },
                  ...vehiculos.map((v) => ({
                    value: v.id.toString(),
                    label: `${v.placa} · ${v.capacidadUnidades} u${v.vendedorNombre ? ' · ' + v.vendedorNombre : ''}`,
                  })),
                ]}
                value={selectedVehiculoId ? selectedVehiculoId.toString() : ''}
                onChange={(val) => setSelectedVehiculoId(val ? parseInt(String(val)) : null)}
                placeholder={t('seleccionarVehiculo')}
              />
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="bg-card border border-border-subtle rounded-lg overflow-hidden">
            <div className="flex items-center gap-1 p-1 bg-surface-1 border-b border-border-subtle">
              <button
                type="button"
                onClick={() => setActiveTab('pedidos')}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'pedidos'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('tabPedidos')}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('directo')}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'directo'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('tabProductoDirecto')}
              </button>
            </div>

            {/* === Pedidos tab === */}
            {activeTab === 'pedidos' && (
              <div className="p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={pedidoSearch}
                      onChange={(e) => setPedidoSearch(e.target.value)}
                      placeholder={t('buscarPedido')}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-border-subtle rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  {zonas.length > 0 && (
                    <select
                      value={zonaFilter}
                      onChange={(e) => setZonaFilter(e.target.value)}
                      aria-label={t('filtroZona')}
                      className="px-3 py-2 text-xs border border-border-subtle rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card text-foreground"
                    >
                      <option value="">{t('todasZonas')}</option>
                      {zonas.map((z) => (
                        <option key={z} value={z}>
                          {z}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={toggleSelectAllFiltered}
                    disabled={filteredPedidos.length === 0}
                    className="text-xs font-medium text-success hover:text-success/80 hover:underline disabled:opacity-40 disabled:no-underline"
                  >
                    {allFilteredSelected ? t('quitarTodos') : t('seleccionarTodos')}
                  </button>
                  <span className="text-xs text-muted-foreground">
                    {t('contador', { sel: selectedPedidoIds.size, total: pedidoRows.length })}
                  </span>
                </div>

                <div className="space-y-2 max-h-[420px] overflow-y-auto">
                  {filteredPedidos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10">
                      <Package className="w-10 h-10 text-muted-foreground/60 mb-2" />
                      <p className="text-xs text-muted-foreground">{t('sinPedidos')}</p>
                    </div>
                  ) : (
                    filteredPedidos.map((p) => {
                      const isSelected = selectedPedidoIds.has(p.id);
                      return (
                        <label
                          key={p.id}
                          className={`flex items-center gap-3 px-3 py-2 border rounded-lg transition-colors cursor-pointer ${
                            isSelected
                              ? 'border-primary bg-primary/5 dark:bg-primary/10'
                              : 'border-border-subtle hover:bg-surface-1'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => togglePedido(p.id)}
                            className="w-4 h-4 rounded border-border-subtle text-primary focus:ring-primary"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-[13px] font-medium text-foreground">{p.folio}</span>
                            <span className="text-xs text-muted-foreground ml-2 truncate">
                              {p.clienteNombre}
                            </span>
                          </div>
                          <span className="text-[13px] text-foreground/70 whitespace-nowrap">
                            {formatCurrency(p.monto)}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* === Producto directo tab === */}
            {activeTab === 'directo' && (
              <div className="p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-foreground/80 mb-1">
                      {t('producto')}
                    </label>
                    <SearchableSelect
                      options={productos.map((p) => ({
                        value: p.id.toString(),
                        label: `${p.nombre} (${p.codigoBarra})`,
                      }))}
                      value={selectedProducto}
                      onChange={(val) => {
                        setSelectedProducto(val ? String(val) : '');
                        const prod = productos.find((p) => p.id.toString() === String(val));
                        if (prod) setPrecio(prod.precioBase.toString());
                      }}
                      placeholder={t('producto')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground/80 mb-1">
                      {t('cantidad')}
                    </label>
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                        className="px-2 py-2 border border-border-default rounded-l-md text-foreground/70 hover:bg-surface-1"
                        aria-label="-"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        value={cantidad}
                        onChange={(e) =>
                          setCantidad(Math.max(1, parseInt(e.target.value) || 1))
                        }
                        min="1"
                        className="w-14 px-2 py-2 text-center border-y border-border-default text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setCantidad((c) => c + 1)}
                        className="px-2 py-2 border border-border-default rounded-r-md text-foreground/70 hover:bg-surface-1"
                        aria-label="+"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="w-28">
                    <label className="block text-xs font-medium text-foreground/80 mb-1">
                      {t('precio')}
                    </label>
                    <input
                      type="number"
                      value={precio}
                      onChange={(e) => setPrecio(e.target.value)}
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddProducto}
                    disabled={addingProducto || !selectedProducto}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors disabled:opacity-50"
                  >
                    {addingProducto ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    {t('agregar')}
                  </button>
                </div>

                {/* Lista carga directa */}
                {carga.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    {t('sinProductos')}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {carga.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 px-3 py-2 border border-border-subtle rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-[13px] font-medium text-foreground">
                            {item.productoNombre}
                          </span>
                          {item.productoSku && (
                            <span className="text-[10px] text-muted-foreground ml-2">
                              {item.productoSku}
                            </span>
                          )}
                        </div>
                        <span className="text-[13px] text-foreground/70 whitespace-nowrap">
                          {item.cantidadVenta} × {formatCurrency(item.precioUnitario)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveProducto(item.productoId)}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          aria-label={tc('delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* === Right aside: Resumen === */}
        <aside className="bg-card border border-border-subtle rounded-lg p-5 lg:sticky lg:top-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">{t('resumen')}</h2>
          <dl className="space-y-3">
            <div className="flex items-center justify-between">
              <dt className="text-xs text-muted-foreground">{t('pedidosSeleccionados')}</dt>
              <dd className="text-sm font-semibold text-foreground">{selectedPedidoIds.size}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-xs text-muted-foreground">{t('unidades')}</dt>
              <dd className="text-sm font-semibold text-foreground">{totalUnits}</dd>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
              <dt className="text-xs text-muted-foreground">{t('valor')}</dt>
              <dd className="text-base font-bold text-primary">{formatCurrency(totalValue)}</dd>
            </div>
            {selectedVehiculo && (
              <div className="pt-3 border-t border-border-subtle">
                <div className="flex items-center justify-between mb-1.5">
                  <dt className="text-xs text-muted-foreground">{t('capacidad')}</dt>
                  <dd
                    className={`text-xs font-semibold tabular-nums ${overCap ? 'text-red-600' : 'text-foreground'}`}
                  >
                    {totalUnits} / {selectedVehiculo.capacidadUnidades} u
                  </dd>
                </div>
                <div className="h-2 w-full rounded-full bg-surface-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${overCap ? 'bg-red-500' : capPct > 85 ? 'bg-amber-500' : 'bg-success'}`}
                    style={{ width: `${capPct}%` }}
                  />
                </div>
                {overCap && <p className="mt-1.5 text-[11px] text-red-600">{t('excedeCapacidad')}</p>}
              </div>
            )}
          </dl>
        </aside>
      </div>
    </PageHeader>
  );
}
