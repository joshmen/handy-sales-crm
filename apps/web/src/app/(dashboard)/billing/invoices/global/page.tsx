'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Receipt, ShieldCheck, Loader2, CheckCircle2, Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { toast } from '@/hooks/useToast';
import { useApiErrorToast } from '@/hooks/useApiErrorToast';
import { useFormatters } from '@/hooks/useFormatters';
import { crearFacturaGlobal, type FacturaGlobalRequest } from '@/services/api/billing';
import type { FacturaDetail } from '@/types/billing';

// Receptor fijo de factura global (CFDI 4.0 público en general).
const PUBLICO_GENERAL = { rfc: 'XAXX010101000', uso: 'S01', regimen: '616' };

// Código SAT c_Periodicidad.
const PERIODICIDADES: { code: string; key: 'daily' | 'weekly' | 'monthly' | 'bimonthly' }[] = [
  { code: '01', key: 'daily' },
  { code: '02', key: 'weekly' },
  { code: '04', key: 'monthly' },
  { code: '05', key: 'bimonthly' },
];

export default function FacturaGlobalPage() {
  const t = useTranslations('billing');
  const tc = useTranslations('common');
  const tn = useTranslations('nav');
  const locale = useLocale();
  const router = useRouter();
  const showApiError = useApiErrorToast();
  const { formatCurrency } = useFormatters();

  const now = new Date();
  const [periodicidad, setPeriodicidad] = useState('04');
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(now.getFullYear());
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<FacturaDetail | null>(null);

  const anios = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];
  const monthName = (m: number) => new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2000, m - 1, 1));

  const handleTimbrar = async () => {
    setSubmitting(true);
    try {
      // Rango = el mes seleccionado (consolidación mensual de ventas a público general).
      const fechaInicio = new Date(anio, mes - 1, 1);
      const fechaFin = new Date(anio, mes, 0, 23, 59, 59);
      const req: FacturaGlobalRequest = {
        fechaInicio: fechaInicio.toISOString(),
        fechaFin: fechaFin.toISOString(),
        periodicidad,
      };
      const factura = await crearFacturaGlobal(req);
      setResult(factura);
      toast.success(t('global.success'));
    } catch (err) {
      showApiError(err, t('global.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageHeader
      section="empresa"
      icon={Receipt}
      breadcrumbs={[
        { label: tc('home'), href: '/dashboard' },
        { label: tn('sectionCompany') },
        { label: t('title'), href: '/billing' },
        { label: t('global.title') },
      ]}
      title={t('global.title')}
      subtitle={t('global.subtitle')}
    >
      <div className="max-w-2xl space-y-5">
        {result ? (
          /* ── Pantalla de éxito ── */
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-lg font-bold text-foreground">{t('global.successTitle')}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t('global.successDesc')}</p>
            <div className="mt-5 space-y-2 text-left bg-surface-1 rounded-xl border border-border-subtle p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('global.folio')}</span>
                <span className="font-mono font-semibold text-foreground">{result.serie ? `${result.serie}-` : ''}{result.folio}</span>
              </div>
              {result.uuid && (
                <div className="flex justify-between text-sm gap-4">
                  <span className="text-muted-foreground flex-shrink-0">{t('global.uuid')}</span>
                  <span className="font-mono text-xs text-foreground break-all text-right">{result.uuid}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('global.total')}</span>
                <span className="font-semibold text-foreground">{formatCurrency(result.total)}</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 mt-6">
              <Button variant="wbOutline" onClick={() => router.push('/billing/invoices')}>{t('global.viewInvoices')}</Button>
              <Button variant="wbPrimary" onClick={() => router.push('/billing')}>{tc('done')}</Button>
            </div>
          </div>
        ) : (
          <>
            {/* Receptor fijo */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-semibold text-foreground">{t('global.receptorTitle')}</h3>
              </div>
              <p className="text-[15px] font-semibold text-foreground">PÚBLICO EN GENERAL</p>
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                RFC {PUBLICO_GENERAL.rfc} · Uso {PUBLICO_GENERAL.uso} · Régimen {PUBLICO_GENERAL.regimen}
              </p>
            </div>

            {/* Periodo */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">{t('global.periodTitle')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground/80 mb-1">{t('global.periodicityLabel')}</label>
                  <select
                    value={periodicidad}
                    onChange={(e) => setPeriodicidad(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-border-default rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {PERIODICIDADES.map((p) => (
                      <option key={p.code} value={p.code}>{t(`global.periodicity.${p.key}`)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground/80 mb-1">{t('global.monthLabel')}</label>
                  <select
                    value={mes}
                    onChange={(e) => setMes(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-border-default rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary capitalize"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m} className="capitalize">{monthName(m)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground/80 mb-1">{t('global.yearLabel')}</label>
                  <select
                    value={anio}
                    onChange={(e) => setAnio(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-border-default rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {anios.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <p className="text-[12px] text-muted-foreground">{t('global.note')}</p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button variant="wbOutline" onClick={() => router.push('/billing')} disabled={submitting}>{tc('cancel')}</Button>
              <Button variant="wbPrimary" onClick={handleTimbrar} disabled={submitting} className="gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {t('global.timbrar')}
              </Button>
            </div>
          </>
        )}
      </div>
    </PageHeader>
  );
}
