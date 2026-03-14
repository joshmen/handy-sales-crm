'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Search, Download, Send, X as XIcon, FileText, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { SbBilling, SbSubscription } from '@/components/layout/DashboardIcons';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { BrandedLoadingScreen } from '@/components/ui/BrandedLoadingScreen';
import { useFormatters } from '@/hooks/useFormatters';
import { toast } from '@/hooks/useToast';
import {
  getFacturas,
  timbrarFactura,
  downloadFacturaPdf,
  downloadFacturaXml,
  type GetFacturasParams,
} from '@/services/api/billing';
import { extractBillingError } from '@/lib/billingApi';
import type { FacturaListItem, FacturaEstado } from '@/types/billing';

const ESTADO_STYLES: Record<FacturaEstado, string> = {
  PENDIENTE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  TIMBRADA: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  CANCELADA: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  ERROR: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const ESTADO_LABELS: Record<FacturaEstado, string> = {
  PENDIENTE: 'Pendiente',
  TIMBRADA: 'Timbrada',
  CANCELADA: 'Cancelada',
  ERROR: 'Error',
};

export default function InvoicesPage() {
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
      toast({ title: 'Error al cargar facturas', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, filterEstado, filterRfc]);

  useEffect(() => { loadFacturas(); }, [loadFacturas]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [filterEstado, filterRfc]);

  const handleTimbrar = async (id: number) => {
    setTimbrando(id);
    try {
      await timbrarFactura(id);
      toast({ title: 'Factura timbrada exitosamente' });
      loadFacturas();
    } catch (err) {
      const billingErr = extractBillingError(err);
      if (billingErr.isTimbresError) {
        setTimbresError(billingErr.message);
        setTimbresModalOpen(true);
      } else {
        toast({
          title: 'Error al timbrar factura',
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

  if (loading && facturas.length === 0) return <BrandedLoadingScreen />;

  return (<>
    <PageHeader
      breadcrumbs={[
        { label: 'Facturación', href: '/billing' },
        { label: 'Facturas' },
      ]}
      title="Facturas"
      subtitle={`${totalCount} facturas`}
      actions={
        <Link href="/billing/invoices/new">
          <Button className="bg-green-600 hover:bg-green-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Factura
          </Button>
        </Link>
      }
    >
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por RFC receptor..."
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
          <option value="">Todos los estados</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="TIMBRADA">Timbrada</option>
          <option value="CANCELADA">Cancelada</option>
        </select>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Folio</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Receptor</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Estado</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {facturas.map(f => (
              <tr key={f.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">
                  {f.serie ? `${f.serie}-` : ''}{f.folio}
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
                        {timbrando === f.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Timbrar'}
                      </Button>
                    )}
                    {f.estado === 'TIMBRADA' && (
                      <>
                        <button
                          onClick={() => downloadFacturaPdf(f.id, `${f.serie || ''}${f.folio}`)}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Descargar PDF"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => downloadFacturaXml(f.id, `${f.serie || ''}${f.folio}`)}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Descargar XML"
                        >
                          <Download className="w-4 h-4" />
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
                  No se encontraron facturas
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
              <span className="font-medium text-sm">
                {f.serie ? `${f.serie}-` : ''}{f.folio}
              </span>
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
                className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white text-xs"
              >
                {timbrando === f.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Timbrar
              </Button>
            )}
          </div>
        ))}
        {facturas.length === 0 && !loading && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No se encontraron facturas
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-muted-foreground">
            Página {page} de {totalPages}
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
    {/* Timbres modal — outside PageHeader so backdrop covers entire viewport including sidebar */}
    {timbresModalOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setTimbresModalOpen(false)}>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 max-w-md mx-4 shadow-2xl text-center animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 flex items-center justify-center">
              {timbresError.includes('no incluye')
                ? <SbSubscription size={56} />
                : <SbBilling size={56} />
              }
            </div>
          </div>
          {timbresError.includes('no incluye') ? (
            <>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Tu plan no incluye facturación
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                {timbresError}
              </p>
              <div className="flex flex-col gap-2.5">
                <Link href="/subscription">
                  <Button className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-medium text-sm rounded-xl">
                    Actualizar plan &rarr;
                  </Button>
                </Link>
                <Button variant="outline" className="w-full h-11 rounded-xl" onClick={() => setTimbresModalOpen(false)}>
                  Cerrar
                </Button>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Timbres agotados
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1.5 leading-relaxed">
                {timbresError}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
                Los timbres se renuevan cada mes. También puedes comprar paquetes adicionales.
              </p>
              <div className="flex flex-col gap-2.5">
                <Link href="/subscription?tab=addons">
                  <Button className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-medium text-sm rounded-xl">
                    Comprar timbres adicionales &rarr;
                  </Button>
                </Link>
                <Link href="/subscription">
                  <Button variant="outline" className="w-full h-11 rounded-xl">
                    Ver mi plan
                  </Button>
                </Link>
                <button className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 py-2" onClick={() => setTimbresModalOpen(false)}>
                  Cerrar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )}
  </>
  );
}
