'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Download, FileText, Loader2, ChevronLeft, ChevronRight, Plus, CheckCircle2, Clock, XCircle, Eye } from 'lucide-react';
import { TimbresModal } from '@/components/billing/TimbresModal';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchBar } from '@/components/common/SearchBar';
import { Button } from '@/components/ui/Button';
import { TabBar } from '@/components/ui/TabBar';
import { SoftBadge, type SoftBadgeTone } from '@/components/ui/SoftBadge';
import { StatCard, type StatTone } from '@/components/dashboard/StatCard';
import { useFormatters } from '@/hooks/useFormatters';
import { toast } from '@/hooks/useToast';
import {
  getFacturas,
  timbrarFactura,
  recuperarTimbrado,
  downloadFacturaPdf,
  downloadFacturaXml,
  type GetFacturasParams,
} from '@/services/api/billing';
import billingAxios from '@/lib/billingApi';
import { extractBillingError } from '@/lib/billingApi';
import { downloadBlob } from '@/lib/download';
import type { FacturaListItem, FacturaEstado } from '@/types/billing';

// Tono del SoftBadge por estado (fiel al mock: Timbrada verde, Pendiente ámbar,
// Error rojo, Cancelada gris/neutra).
const ESTADO_TONE: Record<FacturaEstado, SoftBadgeTone> = {
  PENDIENTE: 'warning',
  TIMBRADA: 'success',
  CANCELADA: 'default',
  ERROR: 'danger',
};

export default function InvoicesPage() {
  const t = useTranslations('billing');
  const tInv = useTranslations('billing.invoices');
  const tCommon = useTranslations('common');

  const ESTADO_LABELS: Record<FacturaEstado, string> = {
    PENDIENTE: tInv('status.pending'),
    TIMBRADA: tInv('status.stamped'),
    CANCELADA: tInv('status.cancelled'),
    ERROR: tInv('status.error'),
  };

  const [facturas, setFacturas] = useState<FacturaListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timbrando, setTimbrando] = useState<number | null>(null);
  const [recuperando, setRecuperando] = useState<number | null>(null);
  const [timbresModalOpen, setTimbresModalOpen] = useState(false);
  const [timbresError, setTimbresError] = useState('');
  const [page, setPage] = useState(1);
  const [filterEstado, setFilterEstado] = useState<string>('');
  const [filterRfc, setFilterRfc] = useState('');
  const pageSize = 20;
  const { formatCurrency } = useFormatters();

  const loadFacturas = useCallback(async () => {
    setLoading(true);
    try {
      const params: GetFacturasParams = { page, pageSize };
      if (filterEstado) params.estado = filterEstado;
      if (filterRfc.trim()) params.receptorRfc = filterRfc.trim();
      const data = await getFacturas(params);
      setFacturas(data.items ?? []);
      setTotalCount(data.totalCount ?? 0);
    } catch (err) {
      const { message } = extractBillingError(err);
      toast({ title: tInv('errorLoading'), description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, filterEstado, filterRfc]);

  useEffect(() => { loadFacturas(); }, [loadFacturas]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [filterEstado, filterRfc]);

  const handleExportAll = async () => {
    try {
      toast.info(tInv('preparingDownload'));
      const response = await billingAxios.get('/api/facturas/export-zip', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/zip' });
      downloadBlob(blob, `facturas_${new Date().toISOString().slice(0, 10)}.zip`);
    } catch {
      toast.error(tInv('exportError'));
    }
  };

  const handleTimbrar = async (id: number) => {
    setTimbrando(id);
    try {
      await timbrarFactura(id);
      toast({ title: tInv('stampSuccess') });
      loadFacturas();
    } catch (err) {
      const billingErr = extractBillingError(err);
      if (billingErr.isTimbresError) {
        setTimbresError(billingErr.message);
        setTimbresModalOpen(true);
      } else {
        toast({
          title: tInv('stampError'),
          description: billingErr.details
            ? `${billingErr.message} — ${billingErr.details}`
            : billingErr.message,
          variant: 'destructive',
        });
      }
    } finally {
      setTimbrando(null);
    }
  };

  const handleRecuperar = async (id: number) => {
    setRecuperando(id);
    try {
      const r = await recuperarTimbrado(id);
      if (r.recuperado) {
        toast({ title: tInv('recoverSuccess', { uuid: r.uuid ?? '' }) });
        loadFacturas();
      } else {
        toast({ title: tInv('recoverNotFound'), description: r.message });
      }
    } catch (err) {
      const billingErr = extractBillingError(err);
      toast({ title: tInv('recoverError'), description: billingErr.message, variant: 'destructive' });
    } finally {
      setRecuperando(null);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  // KPIs derivados de la página cargada (data REAL del response actual).
  // No hay endpoint de agregados por estado en esta lista; las tarjetas
  // resumen lo visible en la página vigente. Hint "En esta página" explícito.
  const stampedOnPage = facturas.filter(f => f.estado === 'TIMBRADA').length;
  const pendingOnPage = facturas.filter(f => f.estado === 'PENDIENTE').length;
  const cancelledOnPage = facturas.filter(f => f.estado === 'CANCELADA').length;

  // Tabs de estado (TabBar subrayado, ámbar empresa) — reusa filterEstado real.
  // Mapea a los estados reales: '' Todas · PENDIENTE En cola · ERROR Con error · CANCELADA.
  const estadoTabs = [
    { id: '', label: tInv('tabAll') },
    { id: 'PENDIENTE', label: tInv('tabQueue') },
    { id: 'ERROR', label: tInv('tabError') },
    { id: 'CANCELADA', label: tInv('tabCancelled') },
  ];

  if (loading && facturas.length === 0) return (
    <div role="status" className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      <span className="sr-only">{tCommon('loading')}</span>
    </div>
  );

  return (<>
    <PageHeader
      section="empresa"
      breadcrumbs={[
        { label: tCommon('home'), href: '/dashboard' },
        { label: t('title'), href: '/billing' },
        { label: tInv('title') },
      ]}
      title={tInv('title')}
      subtitle={tInv('subtitle', { count: totalCount })}
      actions={
        <>
          <Button variant="wbOutline" onClick={handleExportAll} disabled={totalCount === 0}>
            <Download className="w-4 h-4 mr-2" />
            {tCommon('export')}
          </Button>
          <Link href="/billing/invoices/global">
            <Button variant="wbOutline">{t('global.title')}</Button>
          </Link>
          <Link href="/billing/invoices/select-order">
            <Button variant="wbPrimary">
              <Plus className="w-4 h-4 mr-2" />
              {t('selectOrder.title')}
            </Button>
          </Link>
        </>
      }
    >
      {/* Tabs de estado (TabBar subrayado, ámbar empresa) + búsqueda por RFC — reusa filtros reales */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-5">
        <TabBar
          items={estadoTabs}
          value={filterEstado}
          onChange={setFilterEstado}
          className="flex-1"
        />
        <SearchBar
          value={filterRfc}
          onChange={(v) => setFilterRfc(v)}
          placeholder={tInv('searchByRfc')}
          className="w-full sm:w-72 lg:w-80"
        />
      </div>

      {/* KPI Row — tarjetas (data real de la página cargada) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {([
          { title: tInv('kpis.totalInvoices'), value: String(totalCount), hint: tInv('kpis.allInvoices'), icon: FileText, tone: 'primary' as StatTone },
          { title: tInv('status.stamped'), value: String(stampedOnPage), hint: tInv('kpis.thisPage'), icon: CheckCircle2, tone: 'default' as StatTone },
          { title: tInv('status.pending'), value: String(pendingOnPage), hint: tInv('kpis.thisPage'), icon: Clock, tone: 'warning' as StatTone },
          { title: tInv('status.cancelled'), value: String(cancelledOnPage), hint: tInv('kpis.thisPage'), icon: XCircle, tone: 'danger' as StatTone },
        ]).map(card => (
          <StatCard
            key={card.title}
            label={card.title}
            value={card.value}
            sub={card.hint}
            icon={card.icon}
            tone={card.tone}
            loading={loading}
          />
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">{tInv('columns.folio')}</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">{tInv('columns.date')}</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">{tInv('columns.receiver')}</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">{tInv('columns.total')}</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">{tInv('columns.status')}</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">{tInv('columns.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {facturas.map(f => (
              <tr key={f.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">
                  <a href={`/billing/invoices/${f.id}`} className="text-primary hover:underline font-bold">
                    {f.serie ? `${f.serie}-` : ''}{f.folio}
                  </a>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(f.fechaEmision).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  <div className="truncate max-w-[200px]">{f.receptorNombre}</div>
                  <div className="text-xs text-muted-foreground">{f.receptorRfc}</div>
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">
                  {formatCurrency(f.total)}
                </td>
                <td className="px-4 py-3 text-center">
                  <SoftBadge tone={ESTADO_TONE[f.estado]} dot>{ESTADO_LABELS[f.estado]}</SoftBadge>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/billing/invoices/${f.id}`}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={`${tInv('view')} ${f.serie || ''}${f.folio}`}
                      title={tInv('view')}
                    >
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    </Link>
                    {f.estado === 'PENDIENTE' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTimbrar(f.id)}
                        disabled={timbrando === f.id}
                        className="text-primary hover:text-primary hover:bg-primary/10 text-xs"
                      >
                        {timbrando === f.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : tInv('stamp')}
                      </Button>
                    )}
                    {f.estado === 'ERROR' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRecuperar(f.id)}
                        disabled={recuperando === f.id}
                        title={tInv('recoverHint')}
                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-xs"
                      >
                        {recuperando === f.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : tInv('recover')}
                      </Button>
                    )}
                    {f.estado === 'TIMBRADA' && (
                      <>
                        <button
                          onClick={() => downloadFacturaPdf(f.id, `${f.serie || ''}${f.folio}`, f.emisorRfc)}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={`${tInv('downloadPdf')} ${f.serie || ''}${f.folio}`}
                          title={tInv('downloadPdf')}
                        >
                          <FileText className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => downloadFacturaXml(f.id, `${f.serie || ''}${f.folio}`, f.emisorRfc)}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={`${tInv('downloadXml')} ${f.serie || ''}${f.folio}`}
                          title={tInv('downloadXml')}
                        >
                          <Download className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {facturas.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  {tInv('noInvoicesFound')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {facturas.map(f => (
          <div key={f.id} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <a href={`/billing/invoices/${f.id}`} className="font-medium text-sm text-primary hover:underline">
                {f.serie ? `${f.serie}-` : ''}{f.folio}
              </a>
              <SoftBadge tone={ESTADO_TONE[f.estado]} dot>{ESTADO_LABELS[f.estado]}</SoftBadge>
            </div>
            <p className="text-sm truncate">{f.receptorNombre}</p>
            <p className="text-xs text-muted-foreground mb-2">{f.receptorRfc}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {new Date(f.fechaEmision).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
              <span className="font-semibold tabular-nums">{formatCurrency(f.total)}</span>
            </div>
            {f.estado === 'PENDIENTE' && (
              <Button
                size="sm"
                onClick={() => handleTimbrar(f.id)}
                disabled={timbrando === f.id}
                className="mt-3 w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
              >
                {timbrando === f.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                {tInv('stamp')}
              </Button>
            )}
            {f.estado === 'ERROR' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRecuperar(f.id)}
                disabled={recuperando === f.id}
                className="mt-3 w-full border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 text-xs"
              >
                {recuperando === f.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                {tInv('recover')}
              </Button>
            )}
          </div>
        ))}
        {facturas.length === 0 && !loading && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {tInv('noInvoicesFound')}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-muted-foreground">
            {tInv('pageOf', { page, total: totalPages })}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </PageHeader>
    <TimbresModal open={timbresModalOpen} onClose={() => setTimbresModalOpen(false)} errorMessage={timbresError} />
  </>
  );
}
