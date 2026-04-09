'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, AlertTriangle, ArrowLeft, Check, Stamp } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { toast } from '@/hooks/useToast';
import { extractBillingError } from '@/lib/billingApi';
import { useTranslations } from 'next-intl';
import { TimbresModal } from '@/components/billing/TimbresModal';
import { SrLoadingText } from '@/components/common/SrLoadingText';
import {
  previewFacturaFromOrder,
  createFacturaFromOrder,
  searchCatalogoProdServ,
  searchCatalogoUnidad,
} from '@/services/api/billing';
import type {
  PreFacturaDto,
  PreFacturaLineDto,
  FiscalCodeOverride,
  CatalogoProdServItem,
  CatalogoUnidadItem,
} from '@/types/billing';

const formatMXN = (value: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);

const SOURCE_STYLES: Record<PreFacturaLineDto['mappingSource'], { bg: string; key: string }> = {
  mapping: { bg: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', key: 'sourceMapping' },
  producto: { bg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', key: 'sourceProduct' },
  default: { bg: 'bg-gray-100 text-gray-700 dark:bg-zinc-700 dark:text-zinc-300', key: 'sourceDefault' },
  fallback: { bg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', key: 'sourceFallback' },
};

// ─── Autocomplete Hook ───

function useAutocomplete<T>(
  searchFn: (q: string, limit?: number) => Promise<T[]>,
  getLabel: (item: T) => string,
  getKey: (item: T) => string,
) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<T[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    (q: string) => {
      setQuery(q);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (q.length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }
      setLoading(true);
      timerRef.current = setTimeout(async () => {
        try {
          const data = await searchFn(q, 10);
          setResults(data);
          setIsOpen(data.length > 0);
        } catch {
          setResults([]);
        } finally {
          setLoading(false);
        }
      }, 300);
    },
    [searchFn],
  );

  const close = useCallback(() => {
    setIsOpen(false);
    setResults([]);
    setQuery('');
  }, []);

  return { query, search, results, isOpen, loading, close, getLabel, getKey, setIsOpen };
}

// ─── Autocomplete Dropdown Component ───

function AutocompleteDropdown<T>({
  ac,
  value,
  onSelect,
  placeholder,
}: {
  ac: ReturnType<typeof useAutocomplete<T>>;
  value: string;
  onSelect: (key: string, label: string) => void;
  placeholder: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        ac.close();
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ac]);

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={isFocused ? ac.query : value}
          onChange={(e) => ac.search(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            ac.search(value);
          }}
          placeholder={placeholder}
          className="w-full px-2 py-1 text-xs border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-green-500/50 focus:border-green-500"
        />
        {ac.loading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2" />}
      </div>
      {ac.isOpen && (
        <div className="absolute z-50 mt-1 w-72 max-h-48 overflow-y-auto bg-card border border-border rounded-lg shadow-lg">
          {ac.results.map((item) => (
            <button
              key={ac.getKey(item)}
              type="button"
              className="w-full text-left px-3 py-2 text-xs hover:bg-muted/50 transition-colors border-b border-border last:border-0"
              onClick={() => {
                onSelect(ac.getKey(item), ac.getLabel(item));
                ac.close();
                setIsFocused(false);
              }}
            >
              <span className="font-medium">{ac.getKey(item)}</span>
              <span className="text-muted-foreground ml-2">{ac.getLabel(item)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───

export default function PreFacturaPage() {
  return (
    <Suspense fallback={<div role="status" className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-green-600" aria-hidden="true" /><SrLoadingText /></div>}>
      <PreFacturaContent />
    </Suspense>
  );
}

function PreFacturaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('billing.preInvoice');
  const tc = useTranslations('common');
  const pedidoId = Number(searchParams.get('pedidoId') || 0);

  const [preview, setPreview] = useState<PreFacturaDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorClienteId, setErrorClienteId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [timbresModalOpen, setTimbresModalOpen] = useState(false);
  const [timbresError, setTimbresError] = useState('');

  // Overrides state: keyed by productoId
  const [overrides, setOverrides] = useState<Record<number, FiscalCodeOverride>>({});

  const loadPreview = useCallback(async () => {
    if (!pedidoId) {
      setError('No se proporcionó un ID de pedido válido.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await previewFacturaFromOrder(pedidoId);
      setPreview(data);
    } catch (err: unknown) {
      const apiError = extractBillingError(err);
      setError(apiError.message);
      // Extract clienteId from error response if available
      const axiosErr = err as { response?: { data?: { clienteId?: number } } };
      if (axiosErr?.response?.data?.clienteId) {
        setErrorClienteId(axiosErr.response.data.clienteId);
      }
    } finally {
      setLoading(false);
    }
  }, [pedidoId]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  const updateOverride = (productoId: number, field: 'claveProdServ' | 'claveUnidad', value: string) => {
    setOverrides((prev) => ({
      ...prev,
      [productoId]: {
        ...prev[productoId],
        productoId,
        [field]: value,
      },
    }));
  };

  const getEffectiveValue = (line: PreFacturaLineDto, field: 'claveProdServ' | 'claveUnidad') => {
    const override = overrides[line.productoId];
    if (override && override[field]) return override[field]!;
    return field === 'claveProdServ' ? line.claveProdServ : (line.claveUnidad ?? '');
  };

  const handleSubmit = async (timbrar: boolean) => {
    if (!preview) return;
    setSubmitting(true);
    try {
      const overridesList = Object.values(overrides).filter(
        (o) => o.claveProdServ || o.claveUnidad,
      );

      const factura = await createFacturaFromOrder({
        pedidoId: preview.pedidoId,
        metodoPago: preview.metodoPago ?? undefined,
        formaPago: preview.formaPago ?? undefined,
        usoCfdi: preview.receptorUsoCfdi ?? undefined,
        timbrarInmediatamente: timbrar,
        overrides: overridesList.length > 0 ? overridesList : undefined,
      });

      toast({
        title: timbrar
          ? `Factura #${factura.folio} creada y enviada a timbrar`
          : `Factura #${factura.folio} creada como PENDIENTE`,
      });
      router.push('/billing/invoices');
    } catch (err: unknown) {
      const apiError = extractBillingError(err);
      if (apiError.isTimbresError) {
        setTimbresError(apiError.message);
        setTimbresModalOpen(true);
      } else {
        toast({
          title: 'Error al crear factura',
          description: apiError.details ? `${apiError.message} — ${apiError.details}` : apiError.message,
          variant: 'destructive',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Loading State ───

  if (loading) return (
    <div role="status" className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-green-600" aria-hidden="true" />
      <span className="sr-only">{tc('loading')}</span>
    </div>
  );

  // ─── Error State ───

  if (error || !preview) {
    return (
      <PageHeader
        breadcrumbs={[
          { label: 'Facturación', href: '/billing' },
          { label: 'Pre-Factura' },
        ]}
        title="Pre-Factura"
      >
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
          <h2 className="text-lg font-semibold mb-2">No se pudo cargar la pre-factura</h2>
          <p className="text-muted-foreground text-sm max-w-md mb-4">{error ?? 'Pedido no encontrado.'}</p>
          {errorClienteId && (
            <a
              href={`/clients/${errorClienteId}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 mb-4 text-sm font-medium text-white bg-success hover:bg-success/90 rounded-lg transition-colors"
            >
              Editar cliente
            </a>
          )}
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Regresar
          </Button>
        </div>
      </PageHeader>
    );
  }

  // ─── Preview Loaded ───

  return (<>
    <PageHeader
      breadcrumbs={[
        { label: 'Facturación', href: '/billing' },
        { label: 'Facturas', href: '/billing/invoices' },
        { label: `Pre-Factura — Pedido ${preview.numeroPedido}` },
      ]}
      title={`Pre-Factura — Pedido #${preview.numeroPedido}`}
      subtitle="Revisa los datos fiscales antes de crear la factura"
    >
      {/* Unmapped Products Warning */}
      {preview.hasUnmappedProducts && (
        <div className="mb-6 flex items-start gap-3 p-4 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {t('unmappedWarning', { count: preview.unmappedCount, plural: preview.unmappedCount > 1 ? 's' : '' })}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              {t('unmappedHint')}{' '}
              <button
                type="button"
                onClick={() => router.push('/billing/fiscal-mapping')}
                className="underline hover:no-underline font-medium"
              >
                {t('fiscalConfig')}
              </button>
              .
            </p>
          </div>
        </div>
      )}

      {/* Header: Emisor + Receptor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Emisor */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Emisor</h3>
          <p className="font-medium text-sm">{preview.emisorNombre}</p>
          <p className="text-sm text-muted-foreground">RFC: {preview.emisorRfc}</p>
          {preview.emisorRegimenFiscal && (
            <p className="text-xs text-muted-foreground mt-1">Régimen: {preview.emisorRegimenFiscal}</p>
          )}
        </div>

        {/* Receptor */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t('receptor')}</h3>
          <p className="font-medium text-sm">{preview.receptorNombre}</p>
          <p className="text-sm text-muted-foreground">RFC: {preview.receptorRfc}</p>
          {preview.receptorRegimenFiscal && (
            <p className="text-xs text-muted-foreground mt-1">Régimen: {preview.receptorRegimenFiscal}</p>
          )}
          {preview.receptorDomicilioFiscal && (
            <p className="text-xs text-muted-foreground">C.P.: {preview.receptorDomicilioFiscal}</p>
          )}
        </div>
      </div>

      {/* Payment Method / Uso CFDI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <span className="text-xs text-muted-foreground">Método de Pago</span>
          <p className="text-sm font-medium mt-0.5">{preview.metodoPago ?? '—'}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <span className="text-xs text-muted-foreground">Forma de Pago</span>
          <p className="text-sm font-medium mt-0.5">{preview.formaPago ?? '—'}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <span className="text-xs text-muted-foreground">Uso CFDI</span>
          <p className="text-sm font-medium mt-0.5">{preview.receptorUsoCfdi ?? '—'}</p>
        </div>
      </div>

      {/* Amounts Summary */}
      <div className="bg-card border border-border rounded-xl p-5 mb-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Resumen de Montos</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <span className="text-xs text-muted-foreground">{t('subtotal')}</span>
            <p className="text-sm font-medium tabular-nums">{formatMXN(preview.subtotal)}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">{t('discountLabel')}</span>
            <p className="text-sm font-medium tabular-nums text-red-600 dark:text-red-400">
              {preview.descuento > 0 ? `- ${formatMXN(preview.descuento)}` : formatMXN(0)}
            </p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">{t('ivaLabel')}</span>
            <p className="text-sm font-medium tabular-nums">{formatMXN(preview.impuestos)}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">{t('totalLabel')}</span>
            <p className="text-lg font-bold tabular-nums text-green-700 dark:text-green-400">
              {formatMXN(preview.total)}
            </p>
          </div>
        </div>
      </div>

      {/* Lines Table — Desktop */}
      <div className="hidden lg:block bg-card border border-border rounded-xl overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-3 py-3 font-medium text-muted-foreground text-xs">#</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground text-xs">{t('product')}</th>
                <th className="text-right px-3 py-3 font-medium text-muted-foreground text-xs">{t('quantity')}</th>
                <th className="text-right px-3 py-3 font-medium text-muted-foreground text-xs">{t('price')}</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground text-xs w-44">{t('claveProdServ')}</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground text-xs w-36">{t('claveUnidad')}</th>
                <th className="text-center px-3 py-3 font-medium text-muted-foreground text-xs">{t('source')}</th>
              </tr>
            </thead>
            <tbody>
              {preview.detalles.map((line) => (
                <LineRow
                  key={line.numeroLinea}
                  line={line}
                  claveProdServValue={getEffectiveValue(line, 'claveProdServ')}
                  claveUnidadValue={getEffectiveValue(line, 'claveUnidad')}
                  onUpdateOverride={updateOverride}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lines — Mobile Cards */}
      <div className="lg:hidden space-y-3 mb-6">
        {preview.detalles.map((line) => (
          <MobileLineCard
            key={line.numeroLinea}
            line={line}
            claveProdServValue={getEffectiveValue(line, 'claveProdServ')}
            claveUnidadValue={getEffectiveValue(line, 'claveUnidad')}
            onUpdateOverride={updateOverride}
          />
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t border-border">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={submitting}
          className="order-3 sm:order-1"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Cancelar
        </Button>

        <div className="flex-1" />

        <Button
          onClick={() => handleSubmit(false)}
          disabled={submitting}
          className="order-1 sm:order-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-foreground"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
          Crear Factura
        </Button>

        <Button
          onClick={() => handleSubmit(true)}
          disabled={submitting}
          className="order-2 sm:order-3 bg-success hover:bg-success/90 text-white"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Stamp className="w-4 h-4 mr-2" />}
          Crear y Timbrar
        </Button>
      </div>
    </PageHeader>
    <TimbresModal open={timbresModalOpen} onClose={() => setTimbresModalOpen(false)} errorMessage={timbresError} />
  </>);
}

// ─── Desktop Line Row ───

function LineRow({
  line,
  claveProdServValue,
  claveUnidadValue,
  onUpdateOverride,
}: {
  line: PreFacturaLineDto;
  claveProdServValue: string;
  claveUnidadValue: string;
  onUpdateOverride: (productoId: number, field: 'claveProdServ' | 'claveUnidad', value: string) => void;
}) {
  const t = useTranslations('billing.preInvoice');
  const prodServAc = useAutocomplete(
    searchCatalogoProdServ,
    (item: CatalogoProdServItem) => item.descripcion,
    (item: CatalogoProdServItem) => item.clave,
  );

  const unidadAc = useAutocomplete(
    searchCatalogoUnidad,
    (item: CatalogoUnidadItem) => item.nombre,
    (item: CatalogoUnidadItem) => item.clave,
  );

  const source = SOURCE_STYLES[line.mappingSource];

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      <td className="px-3 py-2.5 text-muted-foreground tabular-nums">{line.numeroLinea}</td>
      <td className="px-3 py-2.5">
        <div className="font-medium text-sm truncate max-w-[220px]">{line.productoNombre}</div>
        {line.codigoBarra && (
          <div className="text-xs text-muted-foreground">{line.codigoBarra}</div>
        )}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums">{line.cantidad}</td>
      <td className="px-3 py-2.5 text-right tabular-nums">{formatMXN(line.precioUnitario)}</td>
      <td className="px-3 py-2.5">
        <AutocompleteDropdown
          ac={prodServAc}
          value={claveProdServValue}
          onSelect={(key) => onUpdateOverride(line.productoId, 'claveProdServ', key)}
          placeholder={t('searchSatKey')}
        />
      </td>
      <td className="px-3 py-2.5">
        <AutocompleteDropdown
          ac={unidadAc}
          value={claveUnidadValue}
          onSelect={(key) => onUpdateOverride(line.productoId, 'claveUnidad', key)}
          placeholder={t('searchUnit')}
        />
      </td>
      <td className="px-3 py-2.5 text-center">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${source.bg}`}>
          {t(source.key)}
        </span>
      </td>
    </tr>
  );
}

// ─── Mobile Line Card ───

function MobileLineCard({
  line,
  claveProdServValue,
  claveUnidadValue,
  onUpdateOverride,
}: {
  line: PreFacturaLineDto;
  claveProdServValue: string;
  claveUnidadValue: string;
  onUpdateOverride: (productoId: number, field: 'claveProdServ' | 'claveUnidad', value: string) => void;
}) {
  const t = useTranslations('billing.preInvoice');
  const prodServAc = useAutocomplete(
    searchCatalogoProdServ,
    (item: CatalogoProdServItem) => item.descripcion,
    (item: CatalogoProdServItem) => item.clave,
  );

  const unidadAc = useAutocomplete(
    searchCatalogoUnidad,
    (item: CatalogoUnidadItem) => item.nombre,
    (item: CatalogoUnidadItem) => item.clave,
  );

  const source = SOURCE_STYLES[line.mappingSource];

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{line.productoNombre}</p>
          {line.codigoBarra && (
            <p className="text-xs text-muted-foreground">{line.codigoBarra}</p>
          )}
        </div>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ml-2 ${source.bg}`}>
          {t(source.key)}
        </span>
      </div>

      <div className="flex items-center justify-between text-sm mb-3">
        <span className="text-muted-foreground">
          {line.cantidad} x {formatMXN(line.precioUnitario)}
        </span>
        <span className="font-semibold tabular-nums">{formatMXN(line.total)}</span>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{t('claveProdServ')}</label>
          <AutocompleteDropdown
            ac={prodServAc}
            value={claveProdServValue}
            onSelect={(key) => onUpdateOverride(line.productoId, 'claveProdServ', key)}
            placeholder={t('searchSatKey')}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{t('claveUnidad')}</label>
          <AutocompleteDropdown
            ac={unidadAc}
            value={claveUnidadValue}
            onSelect={(key) => onUpdateOverride(line.productoId, 'claveUnidad', key)}
            placeholder={t('searchUnit')}
          />
        </div>
      </div>
    </div>
  );
}
