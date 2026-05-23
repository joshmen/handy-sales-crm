'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/layout/PageHeader';
import { GoogleMapWrapper, type MapMarker } from '@/components/maps/GoogleMapWrapper';
import { automationService } from '@/services/api/automations';
import type { AutomationExecution } from '@/types/automations';
import { useFormatters } from '@/hooks/useFormatters';
import { toast } from '@/hooks/useToast';
import { Lightning, Eye, CalendarPlus, MapPin, Storefront, Flame, CurrencyDollar } from '@phosphor-icons/react';
import { RefreshCw, Loader2 } from 'lucide-react';

interface UrgenteCliente {
  clienteId: number;
  clienteNombre: string;
  vendedorId: number | null;
  vendedorNombre: string;
  intervaloDias: number;
  diasSinPedido: number;
  urgenciaPct: number;
  montoPromedio: number;
  ultimoPedido?: string;
  latitud?: number | null;
  longitud?: number | null;
}

interface DetalleReorden {
  clientesEvaluados: number;
  notificacionesEnviadas?: number;
  urgentes: UrgenteCliente[];
}

export default function OportunidadesReordenPage() {
  const t = useTranslations('automations.oportunidadesReorden');
  const tc = useTranslations('common');
  const router = useRouter();
  const { formatDate } = useFormatters();

  const [exec, setExec] = useState<AutomationExecution | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [selectedClienteId, setSelectedClienteId] = useState<number | null>(null);

  const loadLatest = useCallback(async () => {
    try {
      setLoading(true);
      const result = await automationService.getHistorial(1, 1, 'pedido-recurrente');
      setExec(result.items[0] ?? null);
    } catch (e) {
      toast.error(tc('errorLoading'));
    } finally {
      setLoading(false);
    }
  }, [tc]);

  const runNow = async () => {
    try {
      setRunning(true);
      const result = await automationService.test('pedido-recurrente');
      if (!result.success) {
        toast.error(result.error || tc('errorGeneric'));
        return;
      }
      toast.success(t('runNowSuccess'));
      await loadLatest();
    } catch (e) {
      toast.error(tc('errorGeneric'));
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => { loadLatest(); }, [loadLatest]);

  const detalle: DetalleReorden | null = exec?.resultadoJson
    ? (() => { try { return JSON.parse(exec.resultadoJson); } catch { return null; } })()
    : null;

  const urgentes = detalle?.urgentes ?? [];
  const conUbicacion = urgentes.filter(u => u.latitud != null && u.longitud != null);

  const markers: MapMarker[] = conUbicacion.map(u => ({
    id: u.clienteId,
    lat: u.latitud!,
    lng: u.longitud!,
    title: u.clienteNombre,
    label: undefined,
    color: u.urgenciaPct >= 200 ? 'red' : u.urgenciaPct >= 150 ? 'orange' : 'blue',
  }));

  const valorEstimado = urgentes.reduce((sum, u) => sum + u.montoPromedio, 0);
  const veryUrgent = urgentes.filter(u => u.urgenciaPct >= 200).length;

  return (
    <PageHeader
      breadcrumbs={[
        { label: tc('home'), href: '/dashboard' },
        { label: t('breadcrumbClients'), href: '/clients' },
        { label: t('title') },
      ]}
      title={t('title')}
      subtitle={exec ? t('lastRun', { when: formatDate(exec.ejecutadoEn, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) }) : undefined}
      actions={
        <button
          onClick={runNow}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-foreground border border-border-subtle rounded hover:bg-surface-1 transition-colors disabled:opacity-50"
          data-testid="run-now-btn"
        >
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lightning className="w-3.5 h-3.5 text-amber-500" weight="fill" />}
          {running ? tc('processing') : t('runNow')}
        </button>
      }
    >
      <div className="p-4 sm:p-6 space-y-6" data-testid="oportunidades-page">
        {loading && !exec ? (
          <div className="py-16 text-center">
            <RefreshCw className="w-6 h-6 mx-auto mb-2 text-muted-foreground/60 animate-spin" />
            <p className="text-sm text-muted-foreground">{tc('loading')}</p>
          </div>
        ) : !detalle ? (
          <div className="rounded-xl border border-border-subtle bg-surface-2 py-16 text-center">
            <Storefront size={40} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{t('noData')}</p>
            <p className="text-xs text-muted-foreground/60 mt-1">{t('noDataHint')}</p>
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" data-testid="kpis">
              <KpiCard
                label={t('kpi.evaluados')}
                value={detalle.clientesEvaluados}
                icon={<Storefront size={20} className="text-blue-600" weight="duotone" />}
              />
              <KpiCard
                label={t('kpi.urgentes')}
                value={urgentes.length}
                accent={veryUrgent > 0 ? 'text-red-600' : 'text-amber-700'}
                icon={<Flame size={20} className={veryUrgent > 0 ? 'text-red-500' : 'text-amber-500'} weight="duotone" />}
              />
              <KpiCard
                label={t('kpi.valorEstimado')}
                value={`~${valorEstimado.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })}`}
                icon={<CurrencyDollar size={20} className="text-green-600" weight="duotone" />}
              />
            </div>

            {/* Map */}
            {markers.length > 0 ? (
              <div className="rounded-xl border border-border-subtle bg-surface-2 overflow-hidden" data-testid="map-container">
                <div className="px-4 py-2.5 border-b border-border-subtle">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <MapPin size={16} className="text-blue-500" weight="duotone" />
                    {t('mapTitle', { count: markers.length })}
                  </h3>
                </div>
                <GoogleMapWrapper
                  markers={markers}
                  height="380px"
                  onMarkerClick={m => setSelectedClienteId(Number(m.id))}
                />
              </div>
            ) : urgentes.length > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
                {t('noLocationHint')}
              </div>
            )}

            {/* Table */}
            <div className="bg-surface-2 rounded-xl border border-border-subtle overflow-hidden" data-testid="urgentes-table">
              <div className="px-4 py-2.5 border-b border-border-subtle">
                <h3 className="text-sm font-semibold text-foreground">{t('tableTitle')}</h3>
              </div>
              {urgentes.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">{t('empty')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-surface-1 border-b border-border-subtle">
                        <th className="text-left px-4 py-2.5 text-xs uppercase font-medium text-muted-foreground tracking-wide">{t('col.cliente')}</th>
                        <th className="text-left px-4 py-2.5 text-xs uppercase font-medium text-muted-foreground tracking-wide">{t('col.vendedor')}</th>
                        <th className="text-left px-4 py-2.5 text-xs uppercase font-medium text-muted-foreground tracking-wide">{t('col.ciclo')}</th>
                        <th className="text-left px-4 py-2.5 text-xs uppercase font-medium text-muted-foreground tracking-wide">{t('col.diasSinPedido')}</th>
                        <th className="text-left px-4 py-2.5 text-xs uppercase font-medium text-muted-foreground tracking-wide">{t('col.urgencia')}</th>
                        <th className="text-left px-4 py-2.5 text-xs uppercase font-medium text-muted-foreground tracking-wide">{t('col.ticketProm')}</th>
                        <th className="text-right px-4 py-2.5 text-xs uppercase font-medium text-muted-foreground tracking-wide">{t('col.acciones')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {urgentes.map(u => (
                        <tr
                          key={u.clienteId}
                          data-testid={`urgente-row-${u.clienteId}`}
                          className={`border-b border-border-subtle hover:bg-surface-1/50 transition-colors ${selectedClienteId === u.clienteId ? 'bg-surface-1' : ''}`}
                        >
                          <td className="px-4 py-2.5 font-medium text-foreground">{u.clienteNombre}</td>
                          <td className="px-4 py-2.5 text-foreground/70">{u.vendedorNombre}</td>
                          <td className="px-4 py-2.5 text-foreground/70">{u.intervaloDias}d</td>
                          <td className="px-4 py-2.5 text-foreground/70">{u.diasSinPedido}d</td>
                          <td className="px-4 py-2.5">
                            <span className={`font-semibold ${u.urgenciaPct >= 200 ? 'text-red-600' : u.urgenciaPct >= 150 ? 'text-amber-600' : 'text-blue-600'}`}>
                              {u.urgenciaPct}%
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-foreground/70">
                            {u.montoPromedio.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => router.push(`/clients/${u.clienteId}`)}
                                title={t('action.viewClient')}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-blue-700 border border-blue-200 hover:bg-blue-50 rounded transition-colors"
                                data-testid={`view-cliente-${u.clienteId}`}
                              >
                                <Eye size={14} weight="duotone" />
                                <span className="hidden sm:inline">{t('action.view')}</span>
                              </button>
                              <button
                                onClick={() => router.push(`/visits?clienteId=${u.clienteId}`)}
                                title={t('action.scheduleVisit')}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-white bg-green-600 hover:bg-green-700 rounded transition-colors"
                                data-testid={`visit-cliente-${u.clienteId}`}
                              >
                                <CalendarPlus size={14} weight="duotone" />
                                <span className="hidden sm:inline">{t('action.visit')}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </PageHeader>
  );
}

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: string;
}

function KpiCard({ label, value, icon, accent = 'text-foreground' }: KpiCardProps) {
  return (
    <div className="rounded-xl bg-surface-2 border border-border-subtle px-4 py-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        {icon}
      </div>
      <div className={`text-2xl font-bold ${accent}`}>{value}</div>
    </div>
  );
}
