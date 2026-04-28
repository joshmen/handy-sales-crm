'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { PageHeader } from '@/components/layout/PageHeader';
import { ExportButton } from '@/components/shared/ExportButton';
import { Button } from '@/components/ui/Button';
import { HelpTooltip } from '@/components/help/HelpTooltip';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { TableLoadingOverlay } from '@/components/ui/TableLoadingOverlay';
import { SearchBar } from '@/components/common/SearchBar';
import {
  AlertCircle,
  Users,
  Plus,
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
import { CurrencyDollar, CreditCard, Wallet, CheckCircle, Clock, Receipt } from '@phosphor-icons/react';
import {
  getCobros,
  getResumenCartera,
  getSaldos,
  getEstadoCuenta,
  createCobro,
  deleteCobro,
  Cobro,
  ResumenCartera,
  SaldoCliente,
  EstadoCuenta,
  EstadoCuentaPedido,
  METODO_PAGO_OPTIONS,
} from '@/services/api/cobranza';
import { clientService } from '@/services/api/clients';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/hooks/useToast';
import { useFormatters } from '@/hooks/useFormatters';
import { formatDate } from '@/lib/formatters';
import { useTranslations } from 'next-intl';

// ─── Zod Schema ───────────────────────────────────────

const cobroSchema = z.object({
  clienteId: z.number().min(1, 'required'),
  pedidoId: z.number().optional(),
  monto: z.number().min(0.01, 'required'),
  metodoPago: z.number().min(0, 'required'),
  fechaCobro: z.string().min(1, 'required'),
  referencia: z.string().optional(),
  notas: z.string().optional(),
});

type CobroFormData = z.infer<typeof cobroSchema>;

// ─── Helpers ──────────────────────────────────────────

// fmtDate moved inside component to use locale-aware useFormatters hook

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
  5: 'bg-surface-3 text-foreground/80',
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

const DATE_PRESETS: { label: string; calc: () => { desde: string; hasta: string } }[] = [
  { label: 'today', calc: () => { const t = iso(new Date()); return { desde: t, hasta: t }; } },
  { label: 'thisWeek', calc: () => {
    const now = new Date();
    const day = now.getDay();
    const mon = new Date(now);
    mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    return { desde: iso(mon), hasta: iso(now) };
  }},
  { label: 'thisMonth', calc: () => {
    const now = new Date();
    return { desde: iso(new Date(now.getFullYear(), now.getMonth(), 1)), hasta: iso(now) };
  }},
  { label: 'last90Days', calc: () => {
    const now = new Date();
    const past = new Date(now);
    past.setDate(past.getDate() - 90);
    return { desde: iso(past), hasta: iso(now) };
  }},
];

type Tab = 'cobros' | 'saldos';

// ─── Page ─────────────────────────────────────────────

export default function CobranzaPage() {
  const t = useTranslations('collections');
  const tc = useTranslations('common');
  const { formatCurrency, formatDate } = useFormatters();
  const fmtDate = (d: string) => formatDate(d, { day: '2-digit', month: 'short', year: 'numeric' });
  const drawerEstadoCuentaRef = useRef<DrawerHandle>(null);
  const drawerNewCobroRef = useRef<DrawerHandle>(null);

  const [tab, setTab] = useState<Tab>('saldos');
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
  const [estadoCuentaHistorico, setEstadoCuentaHistorico] = useState(false);

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

  // Date presets & search
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [searchCobros, setSearchCobros] = useState('');

  // Inline cobro (inside estado de cuenta drawer)
  const [inlineCobroPedidoId, setInlineCobroPedidoId] = useState<number | null>(null);
  const [inlineCobroData, setInlineCobroData] = useState({ monto: 0, metodoPago: 0, referencia: '' });
  const [inlineCobroSaving, setInlineCobroSaving] = useState(false);

  // ─── Data fetching ──────────────────────────────────

  const fetchResumen = useCallback(async () => {
    try { setResumen(await getResumenCartera()); } catch { toast.error(t('errorLoadingSummary')); }
  }, []);

  const fetchCobros = useCallback(async () => {
    try {
      setCobrosLoading(true);
      setCobros(await getCobros({ desde: dates.desde, hasta: dates.hasta }));
    } catch { toast.error(t('errorLoadingPayments')); }
    finally { setCobrosLoading(false); }
  }, [dates]);

  const fetchSaldos = useCallback(async () => {
    try {
      setSaldosLoading(true);
      setSaldos(await getSaldos());
    } catch { toast.error(t('errorLoadingBalances')); }
    finally { setSaldosLoading(false); }
  }, []);

  // Initial load: resumen + active tab data
  useEffect(() => {
    fetchResumen();
    if (tab === 'cobros') fetchCobros(); else fetchSaldos();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Tab change: fetch the active tab's data
  const initialMount = useRef(true);
  useEffect(() => {
    if (initialMount.current) { initialMount.current = false; return; }
    if (tab === 'cobros') fetchCobros(); else fetchSaldos();
  }, [tab, fetchCobros, fetchSaldos]);

  // Date change: refresh cobros + resumen (debounced, skip initial mount)
  const datesInitialized = useRef(false);
  useEffect(() => {
    if (!datesInitialized.current) { datesInitialized.current = true; return; }
    const timeout = setTimeout(() => {
      fetchCobros();
      fetchResumen();
    }, 500);
    return () => clearTimeout(timeout);
  }, [dates.desde, dates.hasta, fetchCobros, fetchResumen]);

  // Load clients for the new cobro dropdown
  useEffect(() => {
    clientService.getClients({ limit: 500 }).then((res) => {
      setClientOptions(res.clients.map((c) => ({ value: Number(c.id), label: c.name })));
    }).catch((err) => console.error('[Cobranza] failed to load clients for dropdown:', err));
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

  const openDetail = async (clienteId: number, historico = false) => {
    setDetailClienteId(clienteId);
    setEstadoCuentaHistorico(historico);
    setEstadoCuentaLoading(true);
    try { setEstadoCuenta(await getEstadoCuenta(clienteId, historico)); }
    catch { toast.error(t('errorLoadingStatement')); }
    finally { setEstadoCuentaLoading(false); }
  };

  const toggleEstadoCuentaPeriodo = async () => {
    if (!detailClienteId) return;
    const nuevoHistorico = !estadoCuentaHistorico;
    setEstadoCuentaHistorico(nuevoHistorico);
    setEstadoCuentaLoading(true);
    try { setEstadoCuenta(await getEstadoCuenta(detailClienteId, nuevoHistorico)); }
    catch { toast.error(t('errorLoadingStatement')); }
    finally { setEstadoCuentaLoading(false); }
  };

  const closeDetail = useCallback(() => {
    setDetailClienteId(null);
    setEstadoCuenta(null);
    setInlineCobroPedidoId(null);
    setEstadoCuentaHistorico(false);
  }, []);

  // ─── Create cobro ──────────────────────────────────

  const handleCreateCobro = async (data: CobroFormData) => {
    // Validación client-side de saldo disponible — el backend también la hace
    // (CobroRepository línea 136-138) pero así evitamos el round-trip y damos
    // feedback instantáneo con el saldo exacto del pedido seleccionado.
    if (data.pedidoId && data.pedidoId > 0) {
      const pedidoSeleccionado = formPedidos.find(p => p.pedidoId === data.pedidoId);
      if (pedidoSeleccionado && data.monto > pedidoSeleccionado.saldo + 0.001) {
        toast.error(t('validation.amountExceedsBalance', { balance: formatCurrency(pedidoSeleccionado.saldo) }));
        return;
      }
    }

    try {
      setCreating(true);
      await createCobro({
        pedidoId: data.pedidoId && data.pedidoId > 0 ? data.pedidoId : null,
        clienteId: data.clienteId,
        monto: data.monto,
        metodoPago: data.metodoPago,
        fechaCobro: data.fechaCobro || undefined,
        referencia: data.referencia || undefined,
        notas: data.notas || undefined,
      });
      toast.success(t('paymentCreated'));
      setShowNewCobro(false);
      setFormPedidos([]);
      fetchCobros();
      fetchResumen();
    } catch { toast.error(t('errorCreatingPayment')); }
    finally { setCreating(false); }
  };

  // ─── Delete cobro ──────────────────────────────────

  const handleDeleteCobro = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      await deleteCobro(deleteId);
      toast.success(t('paymentVoided'));
      setDeleteId(null);
      fetchCobros();
      fetchResumen();
    } catch { toast.error(t('errorDeletingPayment')); }
    finally { setDeleting(false); }
  };

  // ─── Inline cobro (inside estado de cuenta drawer) ──

  const handleInlineCobro = async (pedidoId: number, clienteId: number, saldoPedido: number) => {
    if (inlineCobroData.monto <= 0) { toast.error(t('validation.amountGreaterThanZero')); return; }
    if (inlineCobroData.monto > saldoPedido) { toast.error(t('validation.amountExceedsBalance', { balance: formatCurrency(saldoPedido) })); return; }
    setInlineCobroSaving(true);
    try {
      await createCobro({
        pedidoId,
        clienteId,
        monto: inlineCobroData.monto,
        metodoPago: inlineCobroData.metodoPago,
        referencia: inlineCobroData.referencia || undefined,
      });
      toast.success(t('paymentCreated'));
      setInlineCobroPedidoId(null);
      setInlineCobroData({ monto: 0, metodoPago: 0, referencia: '' });
      // Re-fetch estado de cuenta IN PLACE → user sees progress bar animate
      const updated = await getEstadoCuenta(clienteId, estadoCuentaHistorico);
      setEstadoCuenta(updated);
      // Background refresh for other views
      fetchSaldos();
      fetchResumen();
      fetchCobros();
    } catch { toast.error(t('errorCreatingPayment')); }
    finally { setInlineCobroSaving(false); }
  };

  // ─── Quick cobro (pre-fill from saldos grid) ──

  const openQuickCobro = useCallback((clienteId: number, pedidoId?: number, monto?: number) => {
    // Close estado de cuenta drawer if open
    if (detailClienteId !== null) closeDetail();
    resetForm({
      clienteId,
      pedidoId: pedidoId || 0,
      monto: monto || 0,
      metodoPago: 0,
      fechaCobro: '',
      referencia: '',
      notas: '',
    });
    // Small delay to let drawer close animation finish
    setTimeout(() => setShowNewCobro(true), detailClienteId !== null ? 300 : 0);
  }, [detailClienteId, closeDetail, resetForm]);

  // ─── Sorting ───────────────────────────────────────

  const sortedCobros = useMemo(() => [...cobros].sort((a, b) => {
    const aVal = a[sortKey as keyof Cobro];
    const bVal = b[sortKey as keyof Cobro];
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    if (typeof aVal === 'number' && typeof bVal === 'number')
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    return sortDir === 'asc'
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  }), [cobros, sortKey, sortDir]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortIcon = ({ col }: { col: string }) =>
    sortKey === col ? (
      sortDir === 'asc' ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />
    ) : null;

  // Search + filtered cobros
  const filteredCobros = useMemo(() => sortedCobros.filter(c => {
    if (!searchCobros) return true;
    const q = searchCobros.toLowerCase();
    return c.clienteNombre.toLowerCase().includes(q)
      || c.numeroPedido?.toLowerCase().includes(q)
      || c.referencia?.toLowerCase().includes(q);
  }), [sortedCobros, searchCobros]);

  // Totals
  const totalCobros = useMemo(() => cobros.reduce((s, c) => s + c.monto, 0), [cobros]);

  // ─── Render ────────────────────────────────────────

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: tc('home'), href: '/dashboard' },
          { label: t('title') },
        ]}
        title={t('title')}
        actions={
          <>
            <ExportButton entity="cobros" label={tc('export')} params={{ desde: dates.desde, hasta: dates.hasta }} />
            <button
              data-tour="cobranza-new-btn"
              onClick={() => setShowNewCobro(true)}
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{t('newPayment')}</span>
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* KPI Row */}
          <div data-tour="cobranza-kpis" className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {resumen ? (
              <>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border-subtle bg-surface-2">
                  <div className="p-2 rounded-lg bg-blue-50">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">{t('kpis.totalSold')} <HelpTooltip tooltipKey="cobranza-total-vendido" /></p>
                    <p className="text-sm font-bold text-foreground">
                      {formatCurrency(resumen.totalFacturado)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border-subtle bg-surface-2">
                  <div className="p-2 rounded-lg bg-green-50">
                    <CreditCard className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">{t('kpis.collected')} <HelpTooltip tooltipKey="cobranza-cobrado" /></p>
                    <p className="text-sm font-bold text-foreground">
                      {formatCurrency(resumen.totalCobrado)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border-subtle bg-surface-2">
                  <div className="p-2 rounded-lg bg-amber-50">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">{t('kpis.outstanding')} <HelpTooltip tooltipKey="cobranza-por-cobrar" /></p>
                    <p className="text-sm font-bold text-amber-600">
                      {formatCurrency(resumen.totalPendiente)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border-subtle bg-surface-2">
                  <div className="p-2 rounded-lg bg-red-50">
                    <Users className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">{t('kpis.clientsOwing')} <HelpTooltip tooltipKey="cobranza-clientes-deben" /></p>
                    <p className="text-sm font-bold text-foreground">
                      {resumen.clientesConSaldo}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border-subtle bg-surface-2 animate-pulse">
                    <div className="p-2 rounded-lg bg-surface-3">
                      <div className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="h-3 w-20 bg-surface-3 rounded mb-1.5" />
                      <div className="h-4 w-24 bg-surface-3 rounded" />
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Search */}
          {tab === 'cobros' && (
            <div className="w-full sm:w-1/2 lg:w-1/3" data-tour="cobranza-search">
              <SearchBar
                value={searchCobros}
                onChange={setSearchCobros}
                placeholder={t('searchPlaceholder')}
                className="w-full"
              />
            </div>
          )}

          {/* Filter Row */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div data-tour="cobranza-date-filter">
              <DateTimePicker
                compact
                mode="date"
                value={dates.desde}
                onChange={(val) => { setDates(d => ({ ...d, desde: val })); setActivePreset(null); }}
                placeholder={tc('from')}
              />
            </div>
            <span className="text-xs text-muted-foreground">—</span>
            <div>
              <DateTimePicker
                compact
                mode="date"
                value={dates.hasta}
                onChange={(val) => { setDates(d => ({ ...d, hasta: val })); setActivePreset(null); }}
                placeholder={tc('to')}
                min={dates.desde}
              />
            </div>
            <button
              data-tour="cobranza-refresh"
              onClick={() => { fetchCobros(); fetchSaldos(); fetchResumen(); }}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tc('refresh')}</span>
            </button>

            {/* Date presets */}
            <div className="hidden sm:flex items-center gap-1">
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => { setDates(p.calc()); setActivePreset(p.label); }}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors ${
                    activePreset === p.label
                      ? 'bg-green-100 text-green-700 ring-1 ring-green-300'
                      : 'bg-surface-3 text-foreground/70 hover:bg-surface-3'
                  }`}
                >
                  {tc(p.label)}
                </button>
              ))}
            </div>

            {/* Tabs inline — always right-aligned */}
            <div data-tour="cobranza-tabs" className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => { setTab('cobros'); setSearchCobros(''); }}
                className={`px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${
                  tab === 'cobros'
                    ? 'text-green-600 border-green-600'
                    : 'text-muted-foreground border-transparent hover:text-foreground/80'
                }`}
              >
                {t('tabs.payments')}
              </button>
              <button
                onClick={() => setTab('saldos')}
                className={`px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${
                  tab === 'saldos'
                    ? 'text-green-600 border-green-600'
                    : 'text-muted-foreground border-transparent hover:text-foreground/80'
                }`}
              >
                {t('tabs.balances')}
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
                  {!cobrosLoading && filteredCobros.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <CreditCard className="w-8 h-8 text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">{searchCobros ? tc('noResults') : t('noPayments')}</p>
                    </div>
                  ) : (
                    filteredCobros.map((c) => (
                      <div key={c.id} className="border border-border-subtle rounded-lg p-3 bg-surface-2" onClick={() => openDetail(c.clienteId)}>
                        {/* Row 1: Icon + Name/Subtitle + Amount */}
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            <CurrencyDollar className="w-5 h-5 text-green-600" weight="duotone" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">
                              {c.clienteNombre}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {fmtDate(c.fechaCobro)}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-medium text-foreground">
                              {formatCurrency(c.monto)}
                            </div>
                          </div>
                        </div>
                        {/* Row 2: Badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="bg-surface-3 text-foreground/70 px-2 py-0.5 text-[10px] rounded font-mono">
                            {c.numeroPedido}
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] rounded-full font-medium ${metodoPagoColors[c.metodoPago] || metodoPagoColors[5]}`}>
                            {c.metodoPagoNombre}
                          </span>
                          {c.referencia && (
                            <span className="text-xs text-muted-foreground truncate">
                              {t('drawer.reference')}: {c.referencia}
                            </span>
                          )}
                        </div>
                        {/* Row 3: Actions */}
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); openDetail(c.clienteId); }}
                            className="px-3 py-1.5 text-xs font-medium text-foreground/80 border border-border-default rounded hover:bg-surface-1 transition-colors"
                            title={t('viewAccountStatement')}
                          >
                            {tc('details')}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); }}
                            className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-300 rounded hover:bg-red-50 transition-colors"
                            title={t('voidPayment')}
                          >
                            {t('void')}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Table - Cobros */}
                <div data-tour="cobranza-cobros-table" className="hidden sm:block bg-surface-2 border border-border-subtle rounded-lg overflow-x-auto">
                {/* Table Header */}
                <div className="flex items-center bg-surface-1 px-4 h-10 border-b border-border-subtle min-w-[800px]">
                  <div
                    className="w-[100px] text-xs font-semibold text-foreground/80 cursor-pointer hover:text-foreground select-none"
                    onClick={() => handleSort('fechaCobro')}
                  >
                    {t('columns.date')} <SortIcon col="fechaCobro" />
                  </div>
                  <div className="flex-1 text-xs font-semibold text-foreground/80">{t('columns.client')}</div>
                  <div className="w-[100px] text-xs font-semibold text-foreground/80">{t('columns.order')}</div>
                  <div
                    className="w-[110px] text-xs font-semibold text-foreground/80 text-right cursor-pointer hover:text-foreground select-none"
                    onClick={() => handleSort('monto')}
                  >
                    {t('columns.amount')} <SortIcon col="monto" />
                  </div>
                  <div className="w-[120px] text-xs font-semibold text-foreground/80 pl-4">{t('columns.method')}</div>
                  <div className="w-[100px] text-xs font-semibold text-foreground/80">{t('columns.vendor')}</div>
                  <div className="w-[100px] text-xs font-semibold text-foreground/80">{t('columns.reference')}</div>
                  <div className="w-[80px] text-xs font-semibold text-foreground/80 text-center">{tc('actions')}</div>
                </div>

                {/* Table Body */}
                <div className="relative min-h-[200px]">
                  <TableLoadingOverlay loading={cobrosLoading} />

                  {/* Empty State */}
                  {!cobrosLoading && filteredCobros.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <CreditCard className="w-10 h-10 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold text-foreground/80 mb-2">
                        {searchCobros ? t('noResults') : t('emptyPayments')}
                      </h3>
                      <p className="text-sm text-muted-foreground text-center">
                        {searchCobros
                          ? t('emptyPaymentsSearch', { search: searchCobros })
                          : t('emptyPaymentsHint')}
                      </p>
                    </div>
                  ) : (
                    /* Table Rows */
                    <div className={`transition-opacity duration-200 ${cobrosLoading ? 'opacity-50' : 'opacity-100'}`}>
                      {filteredCobros.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center px-4 py-3 border-b border-border-subtle hover:bg-surface-1 transition-colors cursor-pointer min-w-[800px]"
                          onClick={() => openDetail(c.clienteId)}
                        >
                          <div className="w-[100px] text-[13px] text-foreground/70">
                            {fmtDate(c.fechaCobro)}
                          </div>
                          <div className="flex-1">
                            <div className="text-[13px] font-medium text-foreground">
                              {c.clienteNombre}
                            </div>
                          </div>
                          <div className="w-[100px]">
                            <span className="text-xs bg-surface-3 text-foreground/70 px-2 py-0.5 rounded font-mono">
                              {c.numeroPedido}
                            </span>
                          </div>
                          <div className="w-[110px] text-[13px] font-medium text-foreground text-right">
                            {formatCurrency(c.monto)}
                          </div>
                          <div className="w-[120px] pl-4">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${metodoPagoColors[c.metodoPago] || metodoPagoColors[5]}`}>
                              {c.metodoPagoNombre}
                            </span>
                          </div>
                          <div className="w-[100px] text-[13px] text-foreground/70 truncate">
                            {c.usuarioNombre}
                          </div>
                          <div className="w-[100px] text-[13px] text-muted-foreground truncate">
                            {c.referencia || '—'}
                          </div>
                          <div className="w-[80px] flex items-center justify-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); openDetail(c.clienteId); }}
                              className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title={t('viewAccountStatement')}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); }}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title={t('voidPayment')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Footer total */}
                      {cobros.length > 0 && (
                        <div className="flex items-center px-4 py-3 bg-surface-1 border-t border-border-default min-w-[800px]">
                          <div className="w-[100px] text-xs font-semibold text-foreground/80">
                            {tc('total')}
                          </div>
                          <div className="flex-1 text-xs text-muted-foreground">
                            {t('paymentCount', { count: cobros.length })}
                          </div>
                          <div className="w-[100px]" />
                          <div className="w-[110px] text-[13px] font-bold text-foreground text-right">
                            {formatCurrency(totalCobros)}
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
                      <p className="text-sm text-muted-foreground">{t('emptyBalances')}</p>
                    </div>
                  ) : (
                    saldos.map((s) => {
                      const pct = s.totalFacturado > 0 ? Math.round((s.totalCobrado / s.totalFacturado) * 100) : 0;
                      return (
                        <div key={s.clienteId} className="border border-border-subtle rounded-lg p-3 bg-surface-2" onClick={() => openDetail(s.clienteId)}>
                          {/* Row 1: Icon + Name/Subtitle + Amount */}
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <Wallet className="w-5 h-5 text-blue-600" weight="duotone" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-foreground truncate">
                                {s.clienteNombre}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {t('pendingOrders', { count: s.pedidosPendientes })}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-sm font-bold text-amber-600">
                                {formatCurrency(s.saldoPendiente)}
                              </div>
                            </div>
                          </div>
                          {/* Row 2: Badges */}
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="text-xs text-foreground/70">
                              {t('statement.invoiced')}: {formatCurrency(s.totalFacturado)}
                            </span>
                            <span className="text-xs text-green-600">
                              {t('statement.collected')}: {formatCurrency(s.totalCobrado)}
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div className="mb-2">
                            <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full transition-all"
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-muted-foreground text-center mt-0.5">{pct}%</p>
                          </div>
                          {/* Row 3: Actions */}
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); openQuickCobro(s.clienteId); }}
                              className="px-3 py-1.5 text-xs font-medium text-success-foreground bg-success rounded hover:bg-success/90 transition-colors"
                            >
                              {t('collect')}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); openDetail(s.clienteId); }}
                              className="px-3 py-1.5 text-xs font-medium text-foreground/80 border border-border-default rounded hover:bg-surface-1 transition-colors"
                              title={t('viewAccountStatement')}
                            >
                              {t('viewDetails')}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Table - Saldos */}
                <div data-tour="cobranza-saldos-table" className="hidden sm:block bg-surface-2 border border-border-subtle rounded-lg overflow-x-auto">
                {/* Table Header */}
                <div className="flex items-center bg-surface-1 px-4 h-10 border-b border-border-subtle min-w-[740px]">
                  <div className="flex-1 text-xs font-semibold text-foreground/80">{t('columns.client')}</div>
                  <div className="w-[100px] text-xs font-semibold text-foreground/80 text-center">{t('columns.orders')}</div>
                  <div className="w-[130px] text-xs font-semibold text-foreground/80 text-right">{t('columns.sold')}</div>
                  <div className="w-[130px] text-xs font-semibold text-foreground/80 text-right">{t('columns.collected')}</div>
                  <div className="w-[130px] text-xs font-semibold text-foreground/80 text-right">{t('columns.owes')}</div>
                  <div className="w-[100px] text-xs font-semibold text-foreground/80 text-center">{t('columns.progress')}</div>
                  <div className="w-[100px] text-xs font-semibold text-foreground/80 text-center">{tc('actions')}</div>
                </div>

                {/* Table Body */}
                <div className="relative min-h-[200px]">
                  <TableLoadingOverlay loading={saldosLoading} />

                  {!saldosLoading && saldos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <DollarSign className="w-16 h-16 text-emerald-300 mb-4" />
                      <h3 className="text-lg font-semibold text-foreground/80 mb-2">{t('emptyBalances')}</h3>
                      <p className="text-sm text-muted-foreground">{t('emptyBalancesHint')}</p>
                    </div>
                  ) : (
                    <div className={`transition-opacity duration-200 ${saldosLoading ? 'opacity-50' : 'opacity-100'}`}>
                      {saldos.map((s) => {
                        const pct = s.totalFacturado > 0 ? Math.round((s.totalCobrado / s.totalFacturado) * 100) : 0;
                        return (
                          <div
                            key={s.clienteId}
                            className="flex items-center px-4 py-3 border-b border-border-subtle hover:bg-surface-1 transition-colors cursor-pointer min-w-[740px]"
                            onClick={() => openDetail(s.clienteId)}
                          >
                            <div className="flex-1">
                              <div className="text-[13px] font-medium text-foreground">
                                {s.clienteNombre}
                              </div>
                            </div>
                            <div className="w-[100px] text-[13px] text-foreground/70 text-center">
                              {s.pedidosPendientes}
                            </div>
                            <div className="w-[130px] text-[13px] text-foreground text-right">
                              {formatCurrency(s.totalFacturado)}
                            </div>
                            <div className="w-[130px] text-[13px] text-green-600 text-right">
                              {formatCurrency(s.totalCobrado)}
                            </div>
                            <div className="w-[130px] text-[13px] font-bold text-amber-600 text-right">
                              {formatCurrency(s.saldoPendiente)}
                            </div>
                            <div className="w-[100px] px-3">
                              <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500 rounded-full transition-all"
                                  style={{ width: `${Math.min(100, pct)}%` }}
                                />
                              </div>
                              <p className="text-[10px] text-muted-foreground text-center mt-0.5">{pct}%</p>
                            </div>
                            <div className="w-[100px] flex items-center justify-center gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); openQuickCobro(s.clienteId); }}
                                className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                                title={t('collect')}
                              >
                                <CurrencyDollar className="w-4 h-4" weight="bold" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); openDetail(s.clienteId); }}
                                className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title={t('viewAccountStatement')}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Footer total */}
                      {saldos.length > 0 && (
                        <div className="flex items-center px-4 py-3 bg-surface-1 border-t border-border-default min-w-[740px]">
                          <div className="flex-1 text-xs font-semibold text-foreground/80">
                            {tc('total')} ({t('clientCount', { count: saldos.length })})
                          </div>
                          <div className="w-[100px]" />
                          <div className="w-[130px] text-[13px] font-bold text-foreground text-right">
                            {formatCurrency(saldos.reduce((s, x) => s + x.totalFacturado, 0))}
                          </div>
                          <div className="w-[130px] text-[13px] font-bold text-green-600 text-right">
                            {formatCurrency(saldos.reduce((s, x) => s + x.totalCobrado, 0))}
                          </div>
                          <div className="w-[130px] text-[13px] font-bold text-amber-600 text-right">
                            {formatCurrency(saldos.reduce((s, x) => s + x.saldoPendiente, 0))}
                          </div>
                          <div className="w-[100px]" />
                          <div className="w-[100px]" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              </>
            )}

        </div>
      </PageHeader>

      {/* ═══ ESTADO DE CUENTA DRAWER ═══ */}
      <Drawer
        ref={drawerEstadoCuentaRef}
        isOpen={detailClienteId !== null}
        onClose={closeDetail}
        title={estadoCuenta ? estadoCuenta.clienteNombre : t('accountStatement')}
        icon={<FileText className="w-5 h-5 text-violet-500" />}
        width="lg"
        footer={
          estadoCuenta ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground">{t('statement.pending')}</p>
                  <p className={`text-sm font-bold tabular-nums ${estadoCuenta.saldoPendiente > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {formatCurrency(estadoCuenta.saldoPendiente)}
                  </p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground">{t('statement.collected')}</p>
                  <p className="text-sm font-bold tabular-nums text-emerald-500">{formatCurrency(estadoCuenta.totalCobrado)}</p>
                </div>
              </div>
              <button
                onClick={() => drawerEstadoCuentaRef.current?.requestClose()}
                className="px-4 py-2 text-sm font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors"
              >
                {tc('close')}
              </button>
            </div>
          ) : (
            <div className="flex justify-end">
              <button
                onClick={() => drawerEstadoCuentaRef.current?.requestClose()}
                className="px-4 py-2 text-sm font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors"
              >
                {tc('close')}
              </button>
            </div>
          )
        }
      >
        <div className="p-0">
          {estadoCuentaLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-green-600" />
              </div>
              <p className="text-sm text-muted-foreground">{t('loadingStatement')}</p>
            </div>
          ) : estadoCuenta ? (
            <>
              {/* ── Collection progress ── */}
              {(() => {
                const pct = estadoCuenta.totalFacturado > 0
                  ? Math.round((estadoCuenta.totalCobrado / estadoCuenta.totalFacturado) * 100)
                  : 0;
                return (
                  <div className="mx-6 mt-6 rounded-xl border border-border bg-card p-5">
                    {/* Top row: label + percentage */}
                    <div className="flex items-baseline justify-between mb-3">
                      <p className="text-xs text-muted-foreground">{t('statement.collectionProgress')}</p>
                      <p className="text-2xl font-bold tabular-nums text-foreground leading-none">{pct}<span className="text-sm font-medium text-muted-foreground ml-0.5">%</span></p>
                    </div>
                    {/* Stacked bar — cobrado fills green, remainder stays as track */}
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-green-500' : 'bg-amber-500'}`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    {/* KPI row */}
                    <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
                      <div>
                        <p className="text-[11px] text-muted-foreground mb-0.5">{t('statement.invoiced')}</p>
                        <p className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(estadoCuenta.totalFacturado)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground mb-0.5">{t('statement.collected')}</p>
                        <p className="text-sm font-semibold tabular-nums text-green-600 dark:text-green-400">{formatCurrency(estadoCuenta.totalCobrado)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground mb-0.5">{t('statement.pending')}</p>
                        <p className={`text-sm font-semibold tabular-nums ${estadoCuenta.saldoPendiente > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>{formatCurrency(estadoCuenta.saldoPendiente)}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ── Period toggle ── */}
              <div className="mx-6 mt-4 flex items-center justify-between">
                <div className="flex items-center gap-1 bg-accent rounded-lg p-0.5">
                  <button
                    onClick={!estadoCuentaHistorico ? undefined : toggleEstadoCuentaPeriodo}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      !estadoCuentaHistorico
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t('statement.lastYear')}
                  </button>
                  <button
                    onClick={estadoCuentaHistorico ? undefined : toggleEstadoCuentaPeriodo}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      estadoCuentaHistorico
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t('statement.fullHistory')}
                  </button>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {estadoCuentaHistorico ? t('statement.fullHistoryLabel') : t('statement.last12Months')}
                </span>
              </div>

              {/* ── Pedidos list ── */}
              <div className="px-6 pt-4 pb-6">
                <h3 className="text-xs font-semibold text-muted-foreground mb-3">{t('columns.orders')}</h3>
                {estadoCuenta.pedidos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Receipt className="w-10 h-10 text-muted-foreground/60 mb-3" />
                    <p className="text-sm text-muted-foreground font-medium">{t('statement.noOrdersInPeriod')}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {estadoCuentaHistorico
                        ? t('statement.noOrdersEver')
                        : t('statement.tryFullHistory')}
                    </p>
                  </div>
                ) : (
                <div className="space-y-3">
                  {estadoCuenta.pedidos.map((p) => {
                    const paidPct = p.total > 0 ? Math.round((p.cobrado / p.total) * 100) : 0;
                    const isPaid = p.saldo <= 0;
                    return (
                      <div
                        key={p.pedidoId}
                        className={`rounded-xl border transition-all duration-200 ${
                          isPaid
                            ? 'border-green-200 bg-green-50/40'
                            : 'border-border-subtle bg-surface-2 hover:border-border-default hover:shadow-sm'
                        }`}
                      >
                        {/* Card header */}
                        <div className="p-4 pb-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                isPaid ? 'bg-green-100' : 'bg-amber-100'
                              }`}>
                                {isPaid
                                  ? <CheckCircle className="w-4 h-4 text-green-600" weight="fill" />
                                  : <Clock className="w-4 h-4 text-amber-600" weight="fill" />
                                }
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-foreground">{p.numeroPedido}</span>
                                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                                    isPaid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {isPaid ? t('statement.paid') : t('statement.pending')}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(p.fechaPedido)}</p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-bold text-foreground tabular-nums">{formatCurrency(p.total)}</p>
                              {!isPaid && (
                                <p className="text-xs text-amber-600 font-medium tabular-nums mt-0.5">
                                  {t('statement.owes')} {formatCurrency(p.saldo)}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Mini progress bar */}
                          {!isPaid && (
                            <div className="mt-3 flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                                  style={{ width: `${paidPct}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-medium text-muted-foreground tabular-nums w-8 text-right">{paidPct}%</span>
                            </div>
                          )}
                        </div>

                        {/* Cobros timeline */}
                        {p.cobros.length > 0 && (
                          <div className="border-t border-border-subtle px-4 py-2.5 bg-surface-1/50 rounded-b-xl">
                            <div className="space-y-1.5">
                              {p.cobros.map((c) => (
                                <div key={c.id} className="flex items-center gap-2 text-xs group">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                                  <span className="text-muted-foreground flex-1 min-w-0 truncate">
                                    {fmtDate(c.fechaCobro)}
                                    <span className="mx-1.5 text-muted-foreground/60">&middot;</span>
                                    {c.metodoPagoNombre}
                                    {c.referencia && (
                                      <span className="text-muted-foreground/60 ml-1.5">{t('drawer.reference')}: {c.referencia}</span>
                                    )}
                                  </span>
                                  <span className="font-semibold text-green-600 tabular-nums flex-shrink-0">{formatCurrency(c.monto)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* No cobros */}
                        {p.cobros.length === 0 && !isPaid && (
                          <div className="border-t border-border-subtle px-4 py-2.5 bg-surface-1/30 rounded-b-xl">
                            <p className="text-xs text-muted-foreground italic">{t('statement.noPaymentsRecorded')}</p>
                          </div>
                        )}

                        {/* Inline cobro */}
                        {p.saldo > 0 && detailClienteId && (
                          <div className="px-4 pb-3 pt-1">
                            {inlineCobroPedidoId === p.pedidoId ? (
                              /* ── Expanded inline form ── */
                              <div className="rounded-lg border border-green-200 bg-green-50/50 p-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                                    <CurrencyDollar className="w-3 h-3 text-green-600" weight="bold" />
                                  </div>
                                  <span className="text-xs font-semibold text-green-800">{t('registerPayment')}</span>
                                </div>
                                {/* Row 1: Monto + Método */}
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">{t('drawer.amountLabel')} *</label>
                                    <div className="relative">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        max={p.saldo}
                                        value={inlineCobroData.monto || ''}
                                        onChange={(e) => setInlineCobroData(prev => ({ ...prev, monto: parseFloat(e.target.value) || 0 }))}
                                        className="w-full pl-6 pr-2 py-1.5 text-xs border border-border-subtle rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-surface-2 tabular-nums"
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">{t('drawer.paymentMethod')} *</label>
                                    <select
                                      value={inlineCobroData.metodoPago}
                                      onChange={(e) => setInlineCobroData(prev => ({ ...prev, metodoPago: Number(e.target.value) }))}
                                      className="w-full px-2 py-1.5 text-xs border border-border-subtle rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-surface-2"
                                    >
                                      {METODO_PAGO_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{t(`paymentMethods.${opt.labelKey}`)}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                                {/* Row 2: Referencia */}
                                <div>
                                  <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">{t('drawer.reference')} <span className="text-muted-foreground/60">({tc('optional')})</span></label>
                                  <input
                                    type="text"
                                    value={inlineCobroData.referencia}
                                    onChange={(e) => setInlineCobroData(prev => ({ ...prev, referencia: e.target.value }))}
                                    placeholder={t('drawer.referencePlaceholder')}
                                    className="w-full px-2 py-1.5 text-xs border border-border-subtle rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-surface-2"
                                  />
                                </div>
                                {/* Row 3: Actions */}
                                <div className="flex items-center gap-2 pt-0.5">
                                  <button
                                    onClick={() => handleInlineCobro(p.pedidoId, detailClienteId, p.saldo)}
                                    disabled={inlineCobroSaving || inlineCobroData.monto <= 0}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-success-foreground bg-success rounded-md hover:bg-success/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {inlineCobroSaving ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <CheckCircle className="w-3.5 h-3.5" weight="bold" />
                                    )}
                                    {inlineCobroSaving ? tc('saving') : t('register')}
                                  </button>
                                  <button
                                    onClick={() => setInlineCobroPedidoId(null)}
                                    disabled={inlineCobroSaving}
                                    className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground/80 transition-colors disabled:opacity-50"
                                  >
                                    {tc('cancel')}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* ── Collapsed: show cobrar button ── */
                              <button
                                onClick={() => {
                                  setInlineCobroPedidoId(p.pedidoId);
                                  setInlineCobroData({ monto: p.saldo, metodoPago: 0, referencia: '' });
                                }}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-success-foreground bg-success rounded-lg hover:bg-success/90 active:scale-[0.98] transition-all duration-150 shadow-sm"
                              >
                                <CurrencyDollar className="w-4 h-4" weight="bold" />
                                {t('collect')} {formatCurrency(p.saldo)}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            </>
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
        title={t('drawer.title')}
        icon={<DollarSign className="w-5 h-5 text-emerald-500" />}
        width="md"
        isDirty={isDirty}
        onSave={rhfSubmit(handleCreateCobro)}
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => drawerNewCobroRef.current?.requestClose()} disabled={creating}>
              {tc('cancel')}
            </Button>
            <Button type="button" variant="success" onClick={rhfSubmit(handleCreateCobro)} disabled={creating} className="flex items-center gap-2">
              {creating && <Loader2 className="w-4 h-4 animate-spin" />}
              {creating ? t('drawer.creating') : t('drawer.create')}
            </Button>
          </div>
        }
      >
        <div className="p-6 space-y-4">
          <div data-tour="cobro-client-selector">
            <label className="block text-xs font-medium text-foreground/70 mb-1">{t('drawer.clientLabel')} *</label>
            <SearchableSelect
              options={clientOptions}
              value={watch('clienteId') || null}
              onChange={(val) => {
                setValue('clienteId', val ? Number(val) : 0, { shouldDirty: true });
                setValue('pedidoId', 0, { shouldDirty: true });
              }}
              placeholder={t('drawer.selectClient')}
              searchPlaceholder={t('drawer.searchClientPlaceholder')}
              emptyMessage={t('drawer.noClients')}
            />
            {errors.clienteId && <p className="text-xs text-red-500 mt-1">{t('drawer.selectClient')}</p>}
          </div>
          <div data-tour="cobro-pedido-selector">
            <label className="block text-xs font-medium text-foreground/70 mb-1">{t('drawer.orderLabel')} *</label>
            {formPedidosLoading ? (
              <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('drawer.loadingOrders')}
              </div>
            ) : watch('clienteId') ? (
              formPedidos.length > 0 ? (
                <SearchableSelect
                  options={formPedidos.map(p => ({
                    value: p.pedidoId,
                    label: p.numeroPedido,
                    description: `Total: ${formatCurrency(p.total)} · Saldo: ${formatCurrency(p.saldo)}`,
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
                  placeholder={t('drawer.selectOrder')}
                  searchPlaceholder={t('drawer.searchOrderPlaceholder')}
                  emptyMessage={t('drawer.noOrders')}
                />
              ) : (
                <div className="py-2 px-3 bg-muted/40 border-l-2 border-l-amber-500 border border-border rounded-lg">
                  <p className="text-sm text-foreground font-medium">{t('drawer.noPendingOrders')}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('drawer.noPendingOrdersHint')}{' '}
                    <Link href="/orders" className="underline font-medium text-primary hover:text-primary/80">
                      {t('drawer.goToCreateOrder')}
                    </Link>
                  </p>
                </div>
              )
            ) : (
              <p className="text-sm text-muted-foreground py-2">{t('drawer.selectClientFirst')}</p>
            )}
            {errors.pedidoId && <p className="text-xs text-red-500 mt-1">{t('drawer.selectOrder')}</p>}
          </div>
          <div data-tour="cobro-amount-method" className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground/70 mb-1">{t('drawer.amountLabel')} *</label>
              <input
                type="number"
                step="0.01"
                {...register('monto', { valueAsNumber: true })}
                className="w-full px-3 py-2 text-sm border border-border-default rounded-md focus:ring-1 focus:ring-green-500 focus:border-green-500"
                placeholder="0.00"
              />
              {errors.monto && <p className="text-xs text-red-500 mt-1">{t('validation.amountGreaterThanZero')}</p>}
              {/* Saldo máximo del pedido seleccionado (si aplica) — regla backend:
                  monto no puede exceder saldo pendiente (CobroRepository antioverpayment). */}
              {(() => {
                const selectedPedidoId = watch('pedidoId');
                const pedido = selectedPedidoId ? formPedidos.find(p => p.pedidoId === selectedPedidoId) : null;
                const currentMonto = watch('monto') || 0;
                if (!pedido) return null;
                const exceeds = currentMonto > pedido.saldo + 0.001;
                return (
                  <p className={`text-xs mt-1 ${exceeds ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                    {exceeds
                      ? t('validation.amountExceedsBalance', { balance: formatCurrency(pedido.saldo) })
                      : `${t('drawer.maxBalance', { defaultValue: 'Saldo máximo' })}: ${formatCurrency(pedido.saldo)}`}
                  </p>
                );
              })()}
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/70 mb-1">{t('drawer.paymentMethod')}</label>
              <select
                {...register('metodoPago', { valueAsNumber: true })}
                className="w-full px-3 py-2 text-sm border border-border-default rounded-md focus:ring-1 focus:ring-green-500 focus:border-green-500"
              >
                {METODO_PAGO_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{t(`paymentMethods.${o.labelKey}`)}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground/70 mb-1">{t('drawer.paymentDate')} *</label>
            <DateTimePicker
              mode="date"
              value={watch('fechaCobro')}
              onChange={(val) => setValue('fechaCobro', val, { shouldValidate: true, shouldDirty: true })}
            />
            {errors.fechaCobro && <p className="text-xs text-red-500 mt-1">{t('drawer.selectDate')}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground/70 mb-1">{t('drawer.reference')}</label>
            <input
              type="text"
              {...register('referencia')}
              className="w-full px-3 py-2 text-sm border border-border-default rounded-md focus:ring-1 focus:ring-green-500 focus:border-green-500"
              placeholder={t('drawer.referencePlaceholder')}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground/70 mb-1">{t('drawer.notes')}</label>
            <textarea
              {...register('notas')}
              className="w-full px-3 py-2 text-sm border border-border-default rounded-md focus:ring-1 focus:ring-green-500 focus:border-green-500"
              rows={2}
              placeholder={t('drawer.notesPlaceholder')}
            />
          </div>
        </div>
      </Drawer>

      {/* ═══ DELETE CONFIRM MODAL ═══ */}
      <Modal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title={t('voidPayment')}
        size="sm"
      >
        <div className="py-2 space-y-2">
          <p className="text-sm text-foreground/70">
            {t('voidConfirm')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('voidConsequence')}
          </p>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={() => setDeleteId(null)}
            disabled={deleting}
            className="px-4 py-2 text-sm font-medium text-foreground/80 bg-surface-2 border border-border-default rounded-lg hover:bg-surface-1 disabled:opacity-50"
          >
            {tc('cancel')}
          </button>
          <button
            onClick={handleDeleteCobro}
            disabled={deleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
          >
            {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
            {deleting ? t('voiding') : t('void')}
          </button>
        </div>
      </Modal>
    </>
  );
}
