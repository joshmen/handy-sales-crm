'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Search, Download, X as XIcon, FileText, Loader2, ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import { TimbresModal } from '@/components/billing/TimbresModal';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { useFormatters } from '@/hooks/useFormatters';
import { toast } from '@/hooks/useToast';
import {
  getFacturas,
  timbrarFactura,
  downloadFacturaPdf,
  downloadFacturaXml,
  type GetFacturasParams,
} from '@/services/api/billing';
import billingAxios from '@/lib/billingApi';
import { extractBillingError } from '@/lib/billingApi';
import type { FacturaListItem, FacturaEstado } from '@/types/billing';

const ESTADO_STYLES: Record<FacturaEstado, string> = {
  PENDIENTE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  TIMBRADA: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  CANCELADA: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  ERROR: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
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
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `facturas_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
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

  const totalPages = Math.ceil(totalCount / pageSize);

  if (loading && facturas.length === 0) return (
    <div role="status" className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-green-600" aria-hidden="true" />
      <span className="sr-only">Loading...</span>
    </div>
  );

  return (<>
    <PageHeader
      breadcrumbs={[
        { label: t('title'), href: '/billing' },
        { label: tInv('title') },
      ]}
      title={tInv('title')}
      subtitle={tInv('subtitle', { count: totalCount })}
      actions={
        <Button variant="outline" onClick={handleExportAll} disabled={totalCount === 0}>
          <Download className="w-4 h-4 mr-2" />
          {tCommon('export')}
        </Button>
      }
    >
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={tInv('searchByRfc')}
            value={filterRfc}
            onChange={e => setFilterRfc(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
          />
          {filterRfc && (
            <button onClick={() => setFilterRfc('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <XIcon className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        <select
          value={filterEstado}
          onChange={e => setFilterEstado(e.target.value)}
          className="px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
        >
          <option value="">{tInv('allStatuses')}</option>
          <option value="PENDIENTE">{tInv('status.pending')}</option>
          <option value="TIMBRADA">{tInv('status.stamped')}</option>
          <option value="CANCELADA">{tInv('status.cancelled')}</option>
        </select>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-muted/40 border border-border border-l-2 border-l-green-600/50">
          <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {tInv.rich('invoicesFromOrders', {
              link: (chunks) => <Link href="/orders" className="text-foreground hover:underline font-medium">{chunks}</Link>,
            })}
          </p>
        </div>
        <div className="flex-1 flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-muted/40 border border-border border-l-2 border-l-green-600/50">
          <Shield className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {tInv('secureStorage')}
          </p>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
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
                  <a href={`/billing/invoices/${f.id}`} className="text-green-600 hover:underline">
                    {f.serie ? `${f.serie}-` : ''}{f.folio}
                  </a>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(f.fechaEmision).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  <div className="truncate max-w-[200px]">{f.receptorNombre}</div>
                  <div className="text-xs text-muted-foreground">{f.receptorRfc}</div>
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">
                  {formatCurrency(f.total)}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_STYLES[f.estado]}`}>
                    {ESTADO_LABELS[f.estado]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {f.estado === 'PENDIENTE' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTimbrar(f.id)}
                        disabled={timbrando === f.id}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 text-xs"
                      >
                        {timbrando === f.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : tInv('stamp')}
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
          <div key={f.id} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <a href={`/billing/invoices/${f.id}`} className="font-medium text-sm text-green-600 hover:underline">
                {f.serie ? `${f.serie}-` : ''}{f.folio}
              </a>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_STYLES[f.estado]}`}>
                {ESTADO_LABELS[f.estado]}
              </span>
            </div>
            <p className="text-sm truncate">{f.receptorNombre}</p>
            <p className="text-xs text-muted-foreground mb-2">{f.receptorRfc}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {new Date(f.fechaEmision).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
              <span className="font-semibold tabular-nums">{formatCurrency(f.total)}</span>
            </div>
            {f.estado === 'PENDIENTE' && (
              <Button
                size="sm"
                onClick={() => handleTimbrar(f.id)}
                disabled={timbrando === f.id}
                className="mt-3 w-full bg-success hover:bg-success/90 text-white text-xs"
              >
                {timbrando === f.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                {tInv('stamp')}
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
