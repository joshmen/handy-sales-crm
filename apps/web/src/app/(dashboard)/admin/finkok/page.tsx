'use client';

/**
 * SuperAdmin — Panel Finkok: lista todos los emisores registrados bajo la cuenta
 * partner Finkok y permite operaciones admin (suspender/reactivar/switch modalidad/
 * asignar créditos).
 *
 * Solo accesible si role=SUPER_ADMIN. El backend valida en cada endpoint.
 * BILL-1 extensión (2026-05-26).
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, CheckCircle, AlertCircle, AlertTriangle, Pause, Play, Coins, ArrowLeftRight } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/hooks/useToast';
import { useTranslations } from 'next-intl';
import {
  listEmitters,
  suspendEmitter,
  reactivateEmitter,
  switchEmitterMode,
  assignCredits,
  type EmitterRow,
} from '@/services/api/finkokAdmin';

export default function FinkokAdminPage() {
  const t = useTranslations('admin.finkok');
  const ta = useTranslations('admin');
  const [emitters, setEmitters] = useState<EmitterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'suspended' | 'frozen'>('all');
  const [filterMode, setFilterMode] = useState<'all' | 'P' | 'O'>('all');
  const [actionLoadingRfc, setActionLoadingRfc] = useState<string | null>(null);

  // Modal asignar créditos
  const [creditsModalRfc, setCreditsModalRfc] = useState<string | null>(null);
  const [creditsInput, setCreditsInput] = useState('');

  // Modal switch modalidad
  const [switchModalRfc, setSwitchModalRfc] = useState<string | null>(null);
  const [switchNewMode, setSwitchNewMode] = useState<'P' | 'O'>('P');

  const fetchEmitters = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listEmitters(1);
      setEmitters(result.items);
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'Error al consultar Finkok';
      toast({ title: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEmitters(); }, [fetchEmitters]);

  const filtered = emitters.filter(e =>
    (filterStatus === 'all' || e.status === filterStatus)
    && (filterMode === 'all' || e.typeUser === filterMode),
  );

  const handleSuspend = async (rfc: string) => {
    if (!confirm(`¿Suspender RFC ${rfc}? Esto deshabilitará el timbrado para ese tenant. Reversible.`)) return;
    setActionLoadingRfc(rfc);
    try {
      await suspendEmitter(rfc);
      toast({ title: `${rfc} suspendido.` });
      await fetchEmitters();
    } catch (err) {
      toast({
        title: 'Error al suspender',
        description: (err as { response?: { data?: { error?: string } } })?.response?.data?.error,
        variant: 'destructive',
      });
    } finally {
      setActionLoadingRfc(null);
    }
  };

  const handleReactivate = async (rfc: string) => {
    setActionLoadingRfc(rfc);
    try {
      await reactivateEmitter(rfc);
      toast({ title: `${rfc} reactivado.` });
      await fetchEmitters();
    } catch (err) {
      toast({
        title: 'Error al reactivar',
        description: (err as { response?: { data?: { error?: string } } })?.response?.data?.error,
        variant: 'destructive',
      });
    } finally {
      setActionLoadingRfc(null);
    }
  };

  const handleAssignCredits = async () => {
    if (!creditsModalRfc) return;
    const credits = parseInt(creditsInput);
    if (!Number.isInteger(credits) || credits <= 0) {
      toast({ title: 'Cantidad inválida', variant: 'destructive' });
      return;
    }
    setActionLoadingRfc(creditsModalRfc);
    try {
      const r = await assignCredits(creditsModalRfc, credits);
      toast({ title: `${credits} créditos asignados a ${creditsModalRfc}. Total: ${r.creditsTotal ?? '?'}` });
      setCreditsModalRfc(null);
      setCreditsInput('');
      await fetchEmitters();
    } catch (err) {
      toast({
        title: 'Error al asignar créditos',
        description: (err as { response?: { data?: { error?: string } } })?.response?.data?.error,
        variant: 'destructive',
      });
    } finally {
      setActionLoadingRfc(null);
    }
  };

  const handleSwitchMode = async () => {
    if (!switchModalRfc) return;
    setActionLoadingRfc(switchModalRfc);
    try {
      await switchEmitterMode(switchModalRfc, switchNewMode);
      toast({ title: `Modalidad cambiada a ${switchNewMode === 'O' ? 'Ilimitado' : 'Prepago'}.` });
      setSwitchModalRfc(null);
      await fetchEmitters();
    } catch (err) {
      toast({
        title: 'Error al cambiar modalidad',
        description: (err as { response?: { data?: { error?: string } } })?.response?.data?.error,
        variant: 'destructive',
      });
    } finally {
      setActionLoadingRfc(null);
    }
  };

  // KPIs
  const kpis = {
    total: emitters.length,
    active: emitters.filter(e => e.status === 'active').length,
    suspended: emitters.filter(e => e.status === 'suspended').length,
    prepaid: emitters.filter(e => e.typeUser === 'P').length,
    unlimited: emitters.filter(e => e.typeUser === 'O').length,
  };

  return (
    <PageHeader
      breadcrumbs={[
        { label: ta('breadcrumb') },
        { label: t('breadcrumb') },
      ]}
      title={t('title')}
      subtitle={t('subtitle')}
      actions={
        <button
          onClick={fetchEmitters}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-foreground/80 bg-surface-2 border border-border-default rounded-lg hover:bg-surface-1 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </button>
      }
    >
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3" data-testid="finkok-kpis">
          <KpiCard label={t('kpi.total')} value={kpis.total} />
          <KpiCard label={t('kpi.active')} value={kpis.active} accent="text-green-600" />
          <KpiCard label={t('kpi.suspended')} value={kpis.suspended} accent="text-red-500" />
          <KpiCard label={t('kpi.prepaid')} value={kpis.prepaid} />
          <KpiCard label={t('kpi.unlimited')} value={kpis.unlimited} />
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap items-center">
          <label className="text-xs font-medium text-foreground/80">{t('filters.status')}:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            className="text-sm px-2 py-1.5 border border-border-default rounded bg-background"
          >
            <option value="all">{t('filters.all')}</option>
            <option value="active">{t('filters.active')}</option>
            <option value="suspended">{t('filters.suspended')}</option>
            <option value="frozen">{t('filters.frozen')}</option>
          </select>

          <label className="text-xs font-medium text-foreground/80 ml-2">{t('filters.mode')}:</label>
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as typeof filterMode)}
            className="text-sm px-2 py-1.5 border border-border-default rounded bg-background"
          >
            <option value="all">{t('filters.allModes')}</option>
            <option value="P">{t('filters.prepaid')}</option>
            <option value="O">{t('filters.unlimited')}</option>
          </select>

          <span className="text-xs text-muted-foreground ml-auto">
            {t('counter', { filtered: filtered.length, total: emitters.length })}
          </span>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border-subtle bg-surface-2 overflow-hidden">
          {loading && emitters.length === 0 ? (
            <div className="py-16 text-center">
              <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t('loading')}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center px-6">
              {emitters.length === 0 ? (
                <>
                  <AlertCircle className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" aria-hidden="true" />
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {t('emptyTitle')}
                  </p>
                  <p className="text-xs text-muted-foreground/70 max-w-md mx-auto">
                    {t.rich('emptyDesc', {
                      fiscal: () => (
                        <span className="font-mono text-[11px] bg-surface-3 px-1.5 py-0.5 rounded">
                          {t('fiscalPath')}
                        </span>
                      ),
                    })}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{t('noResults')}</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-1 border-b border-border-subtle">
                    <Th>{t('table.rfc')}</Th>
                    <Th>{t('table.razonSocial')}</Th>
                    <Th>{t('table.status')}</Th>
                    <Th>{t('table.mode')}</Th>
                    <Th>{t('table.credits')}</Th>
                    <Th>{t('table.registered')}</Th>
                    <Th className="text-right">{t('table.actions')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.rfc} className="border-b border-border-subtle hover:bg-surface-1/50" data-testid={`emitter-${e.rfc}`}>
                      <td className="px-4 py-2.5 font-mono text-xs">{e.rfc}</td>
                      <td className="px-4 py-2.5 text-foreground/80">{e.razonSocial || <span className="text-muted-foreground italic">sin definir</span>}</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={e.status} />
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs font-medium">
                          {e.typeUser === 'O' ? 'Ilimitado' : e.typeUser === 'P' ? 'Prepago' : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {e.typeUser === 'P' && e.creditsRemaining != null
                          ? <span className="font-mono text-xs">{e.creditsRemaining.toLocaleString('es-MX')}</span>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {e.registeredAt ? new Date(e.registeredAt).toLocaleDateString('es-MX') : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          {actionLoadingRfc === e.rfc && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                          {e.status === 'active' && (
                            <button
                              onClick={() => handleSuspend(e.rfc)}
                              disabled={actionLoadingRfc === e.rfc}
                              title={t('actions.suspend')}
                              aria-label={t('actions.suspend')}
                              className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 disabled:opacity-50"
                              data-testid={`suspend-${e.rfc}`}
                            >
                              <Pause className="w-4 h-4" />
                            </button>
                          )}
                          {e.status === 'suspended' && (
                            <button
                              onClick={() => handleReactivate(e.rfc)}
                              disabled={actionLoadingRfc === e.rfc}
                              title={t('actions.reactivate')}
                              aria-label={t('actions.reactivate')}
                              className="p-1.5 rounded hover:bg-green-50 dark:hover:bg-green-950/30 text-green-600 disabled:opacity-50"
                              data-testid={`reactivate-${e.rfc}`}
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          )}
                          {e.typeUser === 'P' && (
                            <button
                              onClick={() => { setCreditsModalRfc(e.rfc); setCreditsInput('100'); }}
                              title={t('actions.assignCredits')}
                              aria-label={t('actions.assignCredits')}
                              className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-600"
                              data-testid={`assign-credits-${e.rfc}`}
                            >
                              <Coins className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => { setSwitchModalRfc(e.rfc); setSwitchNewMode(e.typeUser === 'O' ? 'P' : 'O'); }}
                            title={t('actions.switchMode')}
                            aria-label={t('actions.switchMode')}
                            className="p-1.5 rounded hover:bg-purple-50 dark:hover:bg-purple-950/30 text-purple-600"
                            data-testid={`switch-mode-${e.rfc}`}
                          >
                            <ArrowLeftRight className="w-4 h-4" />
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
      </div>

      {/* Modal: asignar créditos */}
      <Modal isOpen={!!creditsModalRfc} onClose={() => setCreditsModalRfc(null)} title="Asignar créditos" size="sm">
        <div className="p-6">
          <p className="text-sm text-muted-foreground mb-4">
            RFC: <span className="font-mono text-foreground">{creditsModalRfc}</span>
          </p>
          <label className="block text-xs font-medium text-foreground/80 mb-1">Cantidad de créditos a agregar</label>
          <input
            type="number"
            min="1"
            value={creditsInput}
            onChange={(e) => setCreditsInput(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border-default rounded-lg bg-background mb-4"
            data-testid="credits-input"
            autoFocus
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
            <button
              onClick={() => setCreditsModalRfc(null)}
              disabled={actionLoadingRfc === creditsModalRfc}
              className="px-4 py-2 text-sm font-medium text-foreground/80 bg-white border border-border-default hover:bg-surface-1 rounded-lg disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleAssignCredits}
              disabled={!creditsInput || actionLoadingRfc === creditsModalRfc}
              className="px-4 py-2 text-sm font-medium bg-success text-success-foreground rounded-lg hover:bg-success/90 disabled:opacity-50 flex items-center gap-2"
              data-testid="confirm-assign-credits"
            >
              {actionLoadingRfc === creditsModalRfc && <Loader2 className="w-4 h-4 animate-spin" />}
              Asignar
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: switch modalidad */}
      <Modal isOpen={!!switchModalRfc} onClose={() => setSwitchModalRfc(null)} title="Cambiar modalidad" size="sm">
        <div className="p-6">
          <p className="text-sm text-muted-foreground mb-4">
            RFC: <span className="font-mono text-foreground">{switchModalRfc}</span>
          </p>
          <div className="space-y-3 mb-4">
            <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-surface-1">
              <input type="radio" name="mode" value="P" checked={switchNewMode === 'P'} onChange={() => setSwitchNewMode('P')} />
              <span className="text-sm"><strong>Prepago</strong>: asignas créditos manualmente</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-surface-1">
              <input type="radio" name="mode" value="O" checked={switchNewMode === 'O'} onChange={() => setSwitchNewMode('O')} />
              <span className="text-sm"><strong>Ilimitado</strong>: tarifa mensual fija</span>
            </label>
          </div>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 p-3 text-xs text-amber-900 dark:text-amber-200 mb-4 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>Esto cambia cómo Finkok te cobra por este emisor. Confírmalo con tu cuenta partner antes de aplicar.</span>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
            <button
              onClick={() => setSwitchModalRfc(null)}
              disabled={actionLoadingRfc === switchModalRfc}
              className="px-4 py-2 text-sm font-medium text-foreground/80 bg-white border border-border-default hover:bg-surface-1 rounded-lg disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSwitchMode}
              disabled={actionLoadingRfc === switchModalRfc}
              className="px-4 py-2 text-sm font-medium bg-success text-success-foreground rounded-lg hover:bg-success/90 disabled:opacity-50 flex items-center gap-2"
              data-testid="confirm-switch-mode"
            >
              {actionLoadingRfc === switchModalRfc && <Loader2 className="w-4 h-4 animate-spin" />}
              Cambiar
            </button>
          </div>
        </div>
      </Modal>
    </PageHeader>
  );
}

function KpiCard({ label, value, accent = 'text-foreground' }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-xl bg-surface-2 border border-border-subtle px-4 py-3">
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-bold ${accent}`}>{value}</div>
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`text-left px-4 py-2.5 text-xs uppercase font-medium text-muted-foreground tracking-wide ${className}`}>
      {children}
    </th>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-muted-foreground text-xs">desconocido</span>;
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
    suspended: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
    frozen: 'bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  };
  const icons: Record<string, React.ReactNode> = {
    active: <CheckCircle className="w-3 h-3" />,
    suspended: <AlertCircle className="w-3 h-3" />,
    frozen: <AlertCircle className="w-3 h-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${styles[status] || 'bg-muted text-muted-foreground'}`}>
      {icons[status]}
      {status}
    </span>
  );
}

