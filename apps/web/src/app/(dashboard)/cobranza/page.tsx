'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  AlertCircle,
  Users,
  Plus,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Trash2,
  Eye,
  Loader2,
  Calendar,
  FileText,
  DollarSign,
} from 'lucide-react';
import { CurrencyDollar, CreditCard, Wallet } from '@phosphor-icons/react';
import {
  getCobros,
  getResumenCartera,
  getSaldos,
  getEstadoCuenta,
  createCobro,
  deleteCobro,
  Cobro,
  CobroCreateDto,
  ResumenCartera,
  SaldoCliente,
  EstadoCuenta,
  EstadoCuentaPedido,
  METODO_PAGO_OPTIONS,
} from '@/services/api/cobranza';
import { clientService } from '@/services/api/clients';
import { toast } from '@/hooks/useToast';

// ─── Zod Schema ───────────────────────────────────────

const cobroSchema = z.object({
  clienteId: z.number().min(1, 'Selecciona un cliente'),
  pedidoId: z.number().min(1, 'Selecciona un pedido'),
  monto: z.number().min(0.01, 'El monto debe ser mayor a 0'),
  metodoPago: z.number().min(0, 'Selecciona un método de pago'),
  fechaCobro: z.string().optional(),
  referencia: z.string().optional(),
  notas: z.string().optional(),
});

type CobroFormData = z.infer<typeof cobroSchema>;

// ─── Helpers ──────────────────────────────────────────

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

function defaultDates() {
  const h = new Date();
  const d = new Date(h);
  d.setMonth(d.getMonth() - 1);
  return { desde: d.toISOString().slice(0, 10), hasta: h.toISOString().slice(0, 10) };
}

const metodoPagoColors: Record<number, string> = {
  0: 'bg-green-100 text-green-700',
  1: 'bg-blue-100 text-blue-700',
  2: 'bg-amber-100 text-amber-700',
  3: 'bg-purple-100 text-purple-700',
  4: 'bg-indigo-100 text-indigo-700',
  5: 'bg-gray-100 text-gray-700',
};

type Tab = 'cobros' | 'saldos';

// ─── Page ─────────────────────────────────────────────

export default function CobranzaPage() {
  const drawerEstadoCuentaRef = useRef<DrawerHandle>(null);
  const drawerNewCobroRef = useRef<DrawerHandle>(null);

  const [tab, setTab] = useState<Tab>('cobros');
  const [dates, setDates] = useState(defaultDates);
  const [resumen, setResumen] = useState<ResumenCartera | null>(null);

  // Cobros
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [cobrosLoading, setCobrosLoading] = useState(false);
  const [sortKey, setSortKey] = useState<string>('fechaCobro');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Saldos
  const [saldos, setSaldos] = useState<SaldoCliente[]>([]);
  const [saldosLoading, setSaldosLoading] = useState(false);

  // Detail modal (estado de cuenta)
  const [detailClienteId, setDetailClienteId] = useState<number | null>(null);
  const [estadoCuenta, setEstadoCuenta] = useState<EstadoCuenta | null>(null);
  const [estadoCuentaLoading, setEstadoCuentaLoading] = useState(false);

  // New cobro modal
  const [showNewCobro, setShowNewCobro] = useState(false);
  const [creating, setCreating] = useState(false);

  // Clients list (for new cobro dropdown)
  const [clientOptions, setClientOptions] = useState<{ value: number; label: string }[]>([]);
  // Pedidos for selected client in new cobro form
  const [formPedidos, setFormPedidos] = useState<EstadoCuentaPedido[]>([]);
  const [formPedidosLoading, setFormPedidosLoading] = useState(false);

  // React Hook Form
  const { register, handleSubmit: rhfSubmit, reset: resetForm, watch, setValue, formState: { errors, isDirty } } = useForm<CobroFormData>({
    resolver: zodResolver(cobroSchema),
    defaultValues: {
      clienteId: 0,
      pedidoId: 0,
      monto: 0,
      metodoPago: 0,
      fechaCobro: '',
      referencia: '',
      notas: '',
    },
  });

  // Delete confirm
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ─── Data fetching ──────────────────────────────────

  const fetchResumen = useCallback(async () => {
    try { setResumen(await getResumenCartera()); } catch { /* */ }
  }, []);

  const fetchCobros = useCallback(async () => {
    try {
      setCobrosLoading(true);
      setCobros(await getCobros({ desde: dates.desde, hasta: dates.hasta }));
    } catch { toast.error('Error al cargar cobros'); }
    finally { setCobrosLoading(false); }
  }, [dates]);

  const fetchSaldos = useCallback(async () => {
    try {
      setSaldosLoading(true);
      setSaldos(await getSaldos());
    } catch { toast.error('Error al cargar saldos'); }
    finally { setSaldosLoading(false); }
  }, []);

  useEffect(() => { fetchResumen(); }, [fetchResumen]);
  useEffect(() => {
    if (tab === 'cobros') fetchCobros(); else fetchSaldos();
  }, [tab, fetchCobros, fetchSaldos]);

  // Load clients for the new cobro dropdown
  useEffect(() => {
    clientService.getClients({ limit: 500 }).then((res) => {
      setClientOptions(res.clients.map((c) => ({ value: Number(c.id), label: c.name })));
    }).catch(() => {});
  }, []);

  // When client changes in form, load their pending pedidos
  const watchedClienteId = watch('clienteId');

  useEffect(() => {
    const loadPedidos = async () => {
      if (!watchedClienteId || watchedClienteId === 0) {
        setFormPedidos([]);
        return;
      }
      setFormPedidosLoading(true);
      try {
        const ec = await getEstadoCuenta(watchedClienteId);
        setFormPedidos(ec.pedidos.filter(p => p.saldo > 0));
      } catch { /* */ }
      finally { setFormPedidosLoading(false); }
    };
    loadPedidos();
  }, [watchedClienteId]);

  // ─── Detail modal ───────────────────────────────────

  const openDetail = async (clienteId: number) => {
    setDetailClienteId(clienteId);
    setEstadoCuentaLoading(true);
    try { setEstadoCuenta(await getEstadoCuenta(clienteId)); }
    catch { toast.error('Error al cargar estado de cuenta'); }
    finally { setEstadoCuentaLoading(false); }
  };

  const closeDetail = () => {
    setDetailClienteId(null);
    setEstadoCuenta(null);
  };

  // ─── Create cobro ──────────────────────────────────

  const handleCreateCobro = async (data: CobroFormData) => {
    try {
      setCreating(true);
      await createCobro({
        pedidoId: data.pedidoId,
        clienteId: data.clienteId,
        monto: data.monto,
        metodoPago: data.metodoPago,
        fechaCobro: data.fechaCobro,
        referencia: data.referencia,
        notas: data.notas,
      });
      toast.success('Cobro registrado correctamente');
      setShowNewCobro(false);
      setFormPedidos([]);
      fetchCobros();
      fetchResumen();
    } catch { toast.error('Error al registrar cobro'); }
    finally { setCreating(false); }
  };

  // ─── Delete cobro ──────────────────────────────────

  const handleDeleteCobro = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      await deleteCobro(deleteId);
      toast.success('Cobro anulado');
      setDeleteId(null);
      fetchCobros();
      fetchResumen();
    } catch { toast.error('Error al anular cobro'); }
    finally { setDeleting(false); }
  };

  // ─── Sorting ───────────────────────────────────────

  const sortedCobros = [...cobros].sort((a, b) => {
    const aVal = a[sortKey as keyof Cobro];
    const bVal = b[sortKey as keyof Cobro];
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    if (typeof aVal === 'number' && typeof bVal === 'number')
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    return sortDir === 'asc'
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortIcon = ({ col }: { col: string }) =>
    sortKey === col ? (
      sortDir === 'asc' ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />
    ) : null;

  // Totals
  const totalCobros = cobros.reduce((s, c) => s + c.monto, 0);

  // ─── Render ────────────────────────────────────────

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="bg-white px-4 py-4 sm:px-8 sm:py-6 border-b border-gray-200">
          {/* Breadcrumb */}
          <Breadcrumb items={[
            { label: 'Inicio', href: '/dashboard' },
            { label: 'Cobranza' },
          ]} />

          {/* Title Row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Cobranza
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNewCobro(true)}
                className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo cobro</span>
              </button>
              <button
                onClick={() => { fetchCobros(); fetchSaldos(); fetchResumen(); }}
                className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4 text-blue-500" />
                <span>Actualizar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 px-4 py-4 sm:px-8 sm:py-6 space-y-4 overflow-auto">
          {/* KPI Row */}
          {resumen && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white">
                <div className="p-2 rounded-lg bg-blue-50">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-500">Facturado</p>
                  <p className="text-sm font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {fmtMoney(resumen.totalFacturado)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white">
                <div className="p-2 rounded-lg bg-green-50">
                  <CreditCard className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-500">Cobrado</p>
                  <p className="text-sm font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {fmtMoney(resumen.totalCobrado)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white">
                <div className="p-2 rounded-lg bg-amber-50">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-500">Pendiente</p>
                  <p className="text-sm font-bold text-amber-600" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {fmtMoney(resumen.totalPendiente)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white">
                <div className="p-2 rounded-lg bg-red-50">
                  <Users className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-500">Clientes con saldo</p>
                  <p className="text-sm font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {resumen.clientesConSaldo}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Filter Row */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-500" />
              <input
                type="date"
                value={dates.desde}
                onChange={(e) => setDates(d => ({ ...d, desde: e.target.value }))}
                className="pl-9 pr-3 py-2 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <span className="text-xs text-gray-400">—</span>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-500" />
              <input
                type="date"
                value={dates.hasta}
                onChange={(e) => setDates(d => ({ ...d, hasta: e.target.value }))}
                className="pl-9 pr-3 py-2 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={fetchCobros}
              disabled={cobrosLoading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Consultar</span>
            </button>

            {/* Tabs inline */}
            <div className="flex items-center ml-auto">
              <button
                onClick={() => setTab('cobros')}
                className={`px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${
                  tab === 'cobros'
                    ? 'text-green-600 border-green-600'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                Cobros Registrados
              </button>
              <button
                onClick={() => setTab('saldos')}
                className={`px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${
                  tab === 'saldos'
                    ? 'text-green-600 border-green-600'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                Saldos Pendientes
              </button>
            </div>
          </div>

            {/* ═══ COBROS TAB ═══ */}
            {tab === 'cobros' && (
              <>
                {/* Mobile Cards - Cobros */}
                <div className="sm:hidden space-y-3">
                  {cobrosLoading && (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                    </div>
                  )}
                  {!cobrosLoading && cobros.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <CreditCard className="w-12 h-12 text-emerald-300 mb-3" />
                      <p className="text-sm text-gray-500">No hay cobros</p>
                    </div>
                  ) : (
                    sortedCobros.map((c) => (
                      <div key={c.id} className="border border-gray-200 rounded-lg p-3 bg-white" onClick={() => openDetail(c.clienteId)}>
                        {/* Row 1: Icon + Name/Subtitle + Amount */}
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            <CurrencyDollar className="w-5 h-5 text-green-600" weight="duotone" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                              {c.clienteNombre}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {fmtDate(c.fechaCobro)}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                              {fmtMoney(c.monto)}
                            </div>
                          </div>
                        </div>
                        {/* Row 2: Badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="bg-gray-100 text-gray-600 px-2 py-0.5 text-[10px] rounded font-mono">
                            {c.numeroPedido}
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] rounded-full font-medium ${metodoPagoColors[c.metodoPago] || metodoPagoColors[5]}`}>
                            {c.metodoPagoNombre}
                          </span>
                          {c.referencia && (
                            <span className="text-xs text-gray-500 truncate">
                              Ref: {c.referencia}
                            </span>
                          )}
                        </div>
                        {/* Row 3: Actions */}
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); openDetail(c.clienteId); }}
                            className="px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                            title="Ver estado de cuenta"
                          >
                            Ver detalles
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); }}
                            className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-300 rounded hover:bg-red-50 transition-colors"
                            title="Anular cobro"
                          >
                            Anular
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Table - Cobros */}
                <div className="hidden sm:block bg-white border border-gray-200 rounded-lg overflow-x-auto">
                {/* Table Header */}
                <div className="flex items-center bg-gray-50 px-4 h-10 border-b border-gray-200 min-w-[800px]">
                  <div
                    className="w-[100px] text-xs font-semibold text-gray-700 cursor-pointer hover:text-gray-900 select-none"
                    onClick={() => handleSort('fechaCobro')}
                  >
                    Fecha <SortIcon col="fechaCobro" />
                  </div>
                  <div className="flex-1 text-xs font-semibold text-gray-700">Cliente</div>
                  <div className="w-[100px] text-xs font-semibold text-gray-700">Pedido</div>
                  <div
                    className="w-[110px] text-xs font-semibold text-gray-700 text-right cursor-pointer hover:text-gray-900 select-none"
                    onClick={() => handleSort('monto')}
                  >
                    Monto <SortIcon col="monto" />
                  </div>
                  <div className="w-[120px] text-xs font-semibold text-gray-700 pl-4">Método</div>
                  <div className="w-[100px] text-xs font-semibold text-gray-700">Vendedor</div>
                  <div className="w-[100px] text-xs font-semibold text-gray-700">Referencia</div>
                  <div className="w-[80px] text-xs font-semibold text-gray-700 text-center">Acciones</div>
                </div>

                {/* Table Body */}
                <div className="relative min-h-[200px]">
                  {/* Loading Overlay */}
                  {cobrosLoading && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex items-center justify-center transition-opacity duration-200">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                        <span className="text-sm text-gray-500">Cargando cobros...</span>
                      </div>
                    </div>
                  )}

                  {/* Empty State */}
                  {!cobrosLoading && cobros.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <CreditCard className="w-16 h-16 text-emerald-300 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay cobros en este período</h3>
                      <p className="text-sm text-gray-500 text-center">
                        Registra un{' '}
                        <span className="text-green-600 cursor-pointer" onClick={() => setShowNewCobro(true)}>nuevo cobro</span>
                        {' '}para empezar
                      </p>
                    </div>
                  ) : (
                    /* Table Rows */
                    <div className={`transition-opacity duration-200 ${cobrosLoading ? 'opacity-50' : 'opacity-100'}`}>
                      {sortedCobros.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer min-w-[800px]"
                          onClick={() => openDetail(c.clienteId)}
                        >
                          <div className="w-[100px] text-[13px] text-gray-600">
                            {fmtDate(c.fechaCobro)}
                          </div>
                          <div className="flex-1">
                            <div className="text-[13px] font-medium text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                              {c.clienteNombre}
                            </div>
                          </div>
                          <div className="w-[100px]">
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                              {c.numeroPedido}
                            </span>
                          </div>
                          <div className="w-[110px] text-[13px] font-medium text-gray-900 text-right" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            {fmtMoney(c.monto)}
                          </div>
                          <div className="w-[120px] pl-4">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${metodoPagoColors[c.metodoPago] || metodoPagoColors[5]}`}>
                              {c.metodoPagoNombre}
                            </span>
                          </div>
                          <div className="w-[100px] text-[13px] text-gray-600 truncate">
                            {c.usuarioNombre}
                          </div>
                          <div className="w-[100px] text-[13px] text-gray-500 truncate">
                            {c.referencia || '—'}
                          </div>
                          <div className="w-[80px] flex items-center justify-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); openDetail(c.clienteId); }}
                              className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Ver estado de cuenta"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); }}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Anular cobro"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Footer total */}
                      {cobros.length > 0 && (
                        <div className="flex items-center px-4 py-3 bg-gray-50 border-t border-gray-300 min-w-[800px]">
                          <div className="w-[100px] text-xs font-semibold text-gray-700">
                            Total
                          </div>
                          <div className="flex-1 text-xs text-gray-500">
                            {cobros.length} cobro{cobros.length !== 1 ? 's' : ''}
                          </div>
                          <div className="w-[100px]" />
                          <div className="w-[110px] text-[13px] font-bold text-gray-900 text-right" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            {fmtMoney(totalCobros)}
                          </div>
                          <div className="w-[120px]" />
                          <div className="w-[100px]" />
                          <div className="w-[100px]" />
                          <div className="w-[80px]" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              </>
            )}

            {/* ═══ SALDOS TAB ═══ */}
            {tab === 'saldos' && (
              <>
                {/* Mobile Cards - Saldos */}
                <div className="sm:hidden space-y-3">
                  {saldosLoading && (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                    </div>
                  )}
                  {!saldosLoading && saldos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <DollarSign className="w-12 h-12 text-emerald-300 mb-3" />
                      <p className="text-sm text-gray-500">No hay saldos pendientes</p>
                    </div>
                  ) : (
                    saldos.map((s) => {
                      const pct = s.totalFacturado > 0 ? Math.round((s.totalCobrado / s.totalFacturado) * 100) : 0;
                      return (
                        <div key={s.clienteId} className="border border-gray-200 rounded-lg p-3 bg-white" onClick={() => openDetail(s.clienteId)}>
                          {/* Row 1: Icon + Name/Subtitle + Amount */}
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <Wallet className="w-5 h-5 text-blue-600" weight="duotone" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                {s.clienteNombre}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {s.pedidosPendientes} pedido{s.pedidosPendientes !== 1 ? 's' : ''} pendiente{s.pedidosPendientes !== 1 ? 's' : ''}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-sm font-bold text-amber-600" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                {fmtMoney(s.saldoPendiente)}
                              </div>
                            </div>
                          </div>
                          {/* Row 2: Badges */}
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="text-xs text-gray-600">
                              Facturado: {fmtMoney(s.totalFacturado)}
                            </span>
                            <span className="text-xs text-green-600">
                              Cobrado: {fmtMoney(s.totalCobrado)}
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div className="mb-2">
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full transition-all"
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-gray-400 text-center mt-0.5">{pct}%</p>
                          </div>
                          {/* Row 3: Actions */}
                          <div className="flex justify-end">
                            <button
                              onClick={(e) => { e.stopPropagation(); openDetail(s.clienteId); }}
                              className="px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                              title="Ver estado de cuenta"
                            >
                              Ver detalles
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Table - Saldos */}
                <div className="hidden sm:block bg-white border border-gray-200 rounded-lg overflow-x-auto">
                {/* Table Header */}
                <div className="flex items-center bg-gray-50 px-4 h-10 border-b border-gray-200 min-w-[700px]">
                  <div className="flex-1 text-xs font-semibold text-gray-700">Cliente</div>
                  <div className="w-[100px] text-xs font-semibold text-gray-700 text-center">Pedidos</div>
                  <div className="w-[130px] text-xs font-semibold text-gray-700 text-right">Facturado</div>
                  <div className="w-[130px] text-xs font-semibold text-gray-700 text-right">Cobrado</div>
                  <div className="w-[130px] text-xs font-semibold text-gray-700 text-right">Pendiente</div>
                  <div className="w-[100px] text-xs font-semibold text-gray-700 text-center">Avance</div>
                  <div className="w-[60px] text-xs font-semibold text-gray-700 text-center">Ver</div>
                </div>

                {/* Table Body */}
                <div className="relative min-h-[200px]">
                  {saldosLoading && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex items-center justify-center transition-opacity duration-200">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                        <span className="text-sm text-gray-500">Cargando saldos...</span>
                      </div>
                    </div>
                  )}

                  {!saldosLoading && saldos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <DollarSign className="w-16 h-16 text-emerald-300 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay saldos pendientes</h3>
                      <p className="text-sm text-gray-500">Todos los clientes están al corriente</p>
                    </div>
                  ) : (
                    <div className={`transition-opacity duration-200 ${saldosLoading ? 'opacity-50' : 'opacity-100'}`}>
                      {saldos.map((s) => {
                        const pct = s.totalFacturado > 0 ? Math.round((s.totalCobrado / s.totalFacturado) * 100) : 0;
                        return (
                          <div
                            key={s.clienteId}
                            className="flex items-center px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer min-w-[700px]"
                            onClick={() => openDetail(s.clienteId)}
                          >
                            <div className="flex-1">
                              <div className="text-[13px] font-medium text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                {s.clienteNombre}
                              </div>
                            </div>
                            <div className="w-[100px] text-[13px] text-gray-600 text-center">
                              {s.pedidosPendientes}
                            </div>
                            <div className="w-[130px] text-[13px] text-gray-900 text-right" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                              {fmtMoney(s.totalFacturado)}
                            </div>
                            <div className="w-[130px] text-[13px] text-green-600 text-right" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                              {fmtMoney(s.totalCobrado)}
                            </div>
                            <div className="w-[130px] text-[13px] font-bold text-amber-600 text-right" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                              {fmtMoney(s.saldoPendiente)}
                            </div>
                            <div className="w-[100px] px-3">
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500 rounded-full transition-all"
                                  style={{ width: `${Math.min(100, pct)}%` }}
                                />
                              </div>
                              <p className="text-[10px] text-gray-400 text-center mt-0.5">{pct}%</p>
                            </div>
                            <div className="w-[60px] flex justify-center">
                              <button
                                onClick={(e) => { e.stopPropagation(); openDetail(s.clienteId); }}
                                className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Ver estado de cuenta"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Footer total */}
                      {saldos.length > 0 && (
                        <div className="flex items-center px-4 py-3 bg-gray-50 border-t border-gray-300 min-w-[700px]">
                          <div className="flex-1 text-xs font-semibold text-gray-700">
                            Total ({saldos.length} cliente{saldos.length !== 1 ? 's' : ''})
                          </div>
                          <div className="w-[100px]" />
                          <div className="w-[130px] text-[13px] font-bold text-gray-900 text-right" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            {fmtMoney(saldos.reduce((s, x) => s + x.totalFacturado, 0))}
                          </div>
                          <div className="w-[130px] text-[13px] font-bold text-green-600 text-right" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            {fmtMoney(saldos.reduce((s, x) => s + x.totalCobrado, 0))}
                          </div>
                          <div className="w-[130px] text-[13px] font-bold text-amber-600 text-right" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            {fmtMoney(saldos.reduce((s, x) => s + x.saldoPendiente, 0))}
                          </div>
                          <div className="w-[100px]" />
                          <div className="w-[60px]" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              </>
            )}

        </div>
      </div>

      {/* ═══ ESTADO DE CUENTA DRAWER ═══ */}
      <Drawer
        ref={drawerEstadoCuentaRef}
        isOpen={detailClienteId !== null}
        onClose={closeDetail}
        title={estadoCuenta ? `Estado de Cuenta - ${estadoCuenta.clienteNombre}` : 'Estado de Cuenta'}
        icon={<FileText className="w-5 h-5 text-violet-500" />}
        width="lg"
        footer={
          <div className="flex justify-end">
            <button
              onClick={() => drawerEstadoCuentaRef.current?.requestClose()}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cerrar
            </button>
          </div>
        }
      >
        <div className="p-6">
          {estadoCuentaLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
          ) : estadoCuenta ? (
            <div className="space-y-4">
              {/* Summary row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                  <p className="text-[11px] text-gray-500">Facturado</p>
                  <p className="text-sm font-bold text-gray-900">{fmtMoney(estadoCuenta.totalFacturado)}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg text-center">
                  <p className="text-[11px] text-gray-500">Cobrado</p>
                  <p className="text-sm font-bold text-green-600">{fmtMoney(estadoCuenta.totalCobrado)}</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg text-center">
                  <p className="text-[11px] text-gray-500">Pendiente</p>
                  <p className="text-sm font-bold text-amber-600">{fmtMoney(estadoCuenta.saldoPendiente)}</p>
                </div>
              </div>

              {/* Pedidos list */}
              <div className="space-y-3">
                {estadoCuenta.pedidos.map((p) => (
                  <div key={p.pedidoId} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {p.numeroPedido}
                        </span>
                        <span className="text-xs text-gray-400">{fmtDate(p.fechaPedido)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-gray-500">Total: <strong>{fmtMoney(p.total)}</strong></span>
                        <span className={`font-bold ${p.saldo > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                          Saldo: {fmtMoney(p.saldo)}
                        </span>
                      </div>
                    </div>
                    {p.cobros.length > 0 ? (
                      <div className="mt-2 space-y-1">
                        {p.cobros.map((c) => (
                          <div key={c.id} className="flex items-center justify-between text-xs text-gray-500 pl-3 border-l-2 border-green-300 py-0.5">
                            <span>
                              {fmtDate(c.fechaCobro)} · {c.metodoPagoNombre}
                              {c.referencia ? ` · Ref: ${c.referencia}` : ''}
                            </span>
                            <span className="font-medium text-green-600">{fmtMoney(c.monto)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 mt-1">Sin cobros registrados</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Drawer>

      {/* ═══ NEW COBRO DRAWER ═══ */}
      <Drawer
        ref={drawerNewCobroRef}
        isOpen={showNewCobro}
        onClose={() => {
          setShowNewCobro(false);
          resetForm({ clienteId: 0, pedidoId: 0, monto: 0, metodoPago: 0, fechaCobro: '', referencia: '', notas: '' });
          setFormPedidos([]);
        }}
        title="Nuevo Cobro"
        icon={<DollarSign className="w-5 h-5 text-emerald-500" />}
        width="md"
        isDirty={isDirty}
        onSave={rhfSubmit(handleCreateCobro)}
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => drawerNewCobroRef.current?.requestClose()}
              disabled={creating}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={rhfSubmit(handleCreateCobro)}
              disabled={creating}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {creating && <Loader2 className="w-4 h-4 animate-spin" />}
              {creating ? 'Guardando...' : 'Registrar Cobro'}
            </button>
          </div>
        }
      >
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cliente *</label>
            <SearchableSelect
              options={clientOptions}
              value={watch('clienteId') || null}
              onChange={(val) => {
                setValue('clienteId', val ? Number(val) : 0, { shouldDirty: true });
                setValue('pedidoId', 0, { shouldDirty: true });
              }}
              placeholder="Seleccionar cliente..."
              searchPlaceholder="Buscar por nombre..."
              emptyMessage="No se encontraron clientes"
            />
            {errors.clienteId && <p className="text-xs text-red-500 mt-1">{errors.clienteId.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Pedido *</label>
            {formPedidosLoading ? (
              <div className="flex items-center gap-2 py-2 text-sm text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Cargando pedidos...
              </div>
            ) : watch('clienteId') ? (
              formPedidos.length > 0 ? (
                <SearchableSelect
                  options={formPedidos.map(p => ({
                    value: p.pedidoId,
                    label: p.numeroPedido,
                    description: `Total: ${fmtMoney(p.total)} · Saldo: ${fmtMoney(p.saldo)}`,
                  }))}
                  value={watch('pedidoId') || null}
                  onChange={(val) => {
                    const pedidoId = val ? Number(val) : 0;
                    setValue('pedidoId', pedidoId, { shouldDirty: true });
                    const pedido = formPedidos.find(p => p.pedidoId === pedidoId);
                    if (pedido) {
                      setValue('monto', pedido.saldo, { shouldDirty: true });
                    }
                  }}
                  placeholder="Seleccionar pedido..."
                  searchPlaceholder="Buscar por número..."
                  emptyMessage="No se encontraron pedidos"
                />
              ) : (
                <div className="py-2 px-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700 font-medium">Este cliente no tiene pedidos con saldo pendiente</p>
                  <p className="text-xs text-amber-600 mt-1">
                    Para registrar un cobro, primero debe existir un pedido.{' '}
                    <a href="/orders" className="underline font-medium hover:text-amber-800">
                      Ir a crear pedido
                    </a>
                  </p>
                </div>
              )
            ) : (
              <p className="text-sm text-gray-400 py-2">Selecciona un cliente primero</p>
            )}
            {errors.pedidoId && <p className="text-xs text-red-500 mt-1">{errors.pedidoId.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Monto *</label>
            <input
              type="number"
              step="0.01"
              {...register('monto', { valueAsNumber: true })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-green-500 focus:border-green-500"
              placeholder="0.00"
            />
            {errors.monto && <p className="text-xs text-red-500 mt-1">{errors.monto.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Metodo de Pago</label>
            <select
              {...register('metodoPago', { valueAsNumber: true })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-green-500 focus:border-green-500"
            >
              {METODO_PAGO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha del Cobro</label>
            <input
              type="date"
              {...register('fechaCobro')}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Referencia</label>
            <input
              type="text"
              {...register('referencia')}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-green-500 focus:border-green-500"
              placeholder="Num. transferencia, cheque, etc."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
            <textarea
              {...register('notas')}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-green-500 focus:border-green-500"
              rows={2}
              placeholder="Notas opcionales..."
            />
          </div>
        </div>
      </Drawer>

      {/* ═══ DELETE CONFIRM MODAL ═══ */}
      <Modal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Anular cobro"
        size="sm"
      >
        <div className="py-2">
          <p className="text-sm text-gray-600">
            ¿Estás seguro de anular este cobro? El saldo del cliente se actualizará.
          </p>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={() => setDeleteId(null)}
            disabled={deleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleDeleteCobro}
            disabled={deleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
          >
            {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
            {deleting ? 'Anulando...' : 'Anular'}
          </button>
        </div>
      </Modal>
    </>
  );
}
