'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { formatTimeAgo } from '@/lib/utils';
import { automationService } from '@/services/api/automations';
import type { AutomationTemplate, AutomationExecution } from '@/types/automations';
import { PARAM_CONFIG, CATEGORY_COLORS, CATEGORY_LABELS } from '@/types/automations';
import { toast } from '@/hooks/useToast';
import { RefreshCw, Loader2 } from 'lucide-react';
import {
  Robot,
  CheckCircle,
  Clock,
  Warning,
  GearSix,
  CaretDown,
  CaretUp,
  Lightning,
  Package,
  User,
  Users,
  UsersThree,
  ClipboardText,
  UserPlus,
  BellRinging,
  UserCheck,
  Repeat,
  MapPinLine,
  Target,
  Sparkle,
  Play,
  CircleNotch,
} from '@phosphor-icons/react';
import type { IconProps } from '@phosphor-icons/react';
import { Switch } from '@/components/ui/Switch';
import { useFormatters } from '@/hooks/useFormatters';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';

const CATEGORIES = ['Todas', ...Object.keys(CATEGORY_LABELS)];

const ICON_MAP: Record<string, React.ComponentType<IconProps>> = {
  PackageOpen: Package, ClipboardList: ClipboardText,
  UserPlus, BellRinging, UserCheck, Repeat, MapPinLine,
  Target, CheckCircle, Warning, Robot,
};

function getTemplateIcon(iconName: string): React.ComponentType<IconProps> {
  return ICON_MAP[iconName] || Robot;
}

const STATUS_STYLES: Record<string, { bg: string; label: string; icon?: React.ComponentType<IconProps> }> = {
  Success: { bg: 'bg-emerald-50 text-emerald-700', label: 'Exitoso', icon: CheckCircle },
  Failed: { bg: 'bg-red-50 text-red-700', label: 'Error', icon: Warning },
  Skipped: { bg: 'bg-surface-3 text-foreground/70', label: 'Omitido' },
};

const DESTINATARIO_INFO: Record<string, { icon: React.ComponentType<IconProps>; label: string }> = {
  admin: { icon: User, label: 'Admin' },
  vendedores: { icon: Users, label: 'Vendedores' },
  ambos: { icon: UsersThree, label: 'Todos' },
};

function getDestinatario(template: AutomationTemplate): string {
  try {
    const params = template.paramsJson || template.defaultParamsJson;
    if (params) return JSON.parse(params).destinatario || 'admin';
  } catch { /* fallback */ }
  return 'admin';
}

function StatusBadge({ status, size = 'sm' }: { status: string; size?: 'sm' | 'xs' }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.Skipped;
  const IconComp = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-md ${s.bg} ${size === 'xs' ? 'text-[10px]' : 'text-xs'}`}>
      {IconComp && <IconComp size={12} weight="fill" />}
      {s.label}
    </span>
  );
}

export default function AutomationsPage() {
  const t = useTranslations('automations');
  const tc = useTranslations('common');
  const { formatDate, formatNumber } = useFormatters();
  const { data: session } = useSession();
  const subscriptionStatus = (session?.user as Record<string, unknown>)?.subscriptionStatus as string | undefined;
  const isExpired = subscriptionStatus === 'Expired' || subscriptionStatus === 'PastDue';
  const [templates, setTemplates] = useState<AutomationTemplate[]>([]);
  const [historial, setHistorial] = useState<AutomationExecution[]>([]);
  const [historialTotal, setHistorialTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null);

  // Config drawer
  const [configDrawerOpen, setConfigDrawerOpen] = useState(false);
  const [configTemplate, setConfigTemplate] = useState<AutomationTemplate | null>(null);
  const [configParams, setConfigParams] = useState<Record<string, string | number | boolean>>({});
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingSlug, setTestingSlug] = useState<string | null>(null);

  // Deactivation confirmation
  const [confirmDeactivate, setConfirmDeactivate] = useState<AutomationTemplate | null>(null);

  // Historial
  const [showHistorial, setShowHistorial] = useState(false);
  const [historialPage, setHistorialPage] = useState(1);
  const [historialLoading, setHistorialLoading] = useState(false);

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await automationService.getTemplates();
      setTemplates(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('errorLoading'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistorial = useCallback(async (page = 1) => {
    try {
      setHistorialLoading(true);
      const { items, total } = await automationService.getHistorial(page, 10);
      setHistorial(items);
      setHistorialTotal(total);
      setHistorialPage(page);
    } catch {
      toast({ title: tc('error'), description: t('errorLoadingHistory'), variant: 'destructive' });
    } finally {
      setHistorialLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleToggle = async (template: AutomationTemplate) => {
    // Confirm before deactivating
    if (template.activada) {
      setConfirmDeactivate(template);
      return;
    }
    await executeToggle(template);
  };

  const executeToggle = async (template: AutomationTemplate) => {
    setTogglingSlug(template.slug);
    try {
      if (template.activada) {
        await automationService.desactivar(template.slug);
        toast({ title: t('deactivated'), description: template.nombre });
      } else {
        await automationService.activar(template.slug, template.defaultParamsJson || undefined);
        toast({ title: t('activated'), description: template.nombre });
      }
      await loadTemplates();
    } catch (err: unknown) {
      toast({ title: tc('error'), description: err instanceof Error ? err.message : tc('error'), variant: 'destructive' });
    } finally {
      setTogglingSlug(null);
    }
  };

  const handleOpenConfig = (template: AutomationTemplate) => {
    setConfigTemplate(template);
    try {
      const params = template.paramsJson
        ? JSON.parse(template.paramsJson)
        : template.defaultParamsJson
        ? JSON.parse(template.defaultParamsJson)
        : {};
      setConfigParams(params);
    } catch {
      setConfigParams({});
    }
    setConfigDrawerOpen(true);
  };

  const handleSaveConfig = async () => {
    if (!configTemplate) return;
    setSavingConfig(true);
    try {
      await automationService.configurar(configTemplate.slug, JSON.stringify(configParams));
      toast({ title: t('configSaved'), description: configTemplate.nombre });
      setConfigDrawerOpen(false);
      await loadTemplates();
    } catch (err: unknown) {
      toast({ title: tc('error'), description: err instanceof Error ? err.message : tc('error'), variant: 'destructive' });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTest = async (slug: string, nombre: string) => {
    setTestingSlug(slug);
    try {
      const result = await automationService.test(slug);
      if (result.success) {
        toast({ title: t('testSuccess'), description: result.action });
      } else {
        toast({ title: t('testFailed'), description: result.error || t('unknownError'), variant: 'destructive' });
      }
      await loadTemplates();
      loadHistorial();
    } catch (err: unknown) {
      toast({ title: tc('error'), description: err instanceof Error ? err.message : t('testError'), variant: 'destructive' });
    } finally {
      setTestingSlug(null);
    }
  };

  const filtered = useMemo(() =>
    activeCategory === 'Todas'
      ? templates
      : templates.filter(t => t.categoria === activeCategory),
    [templates, activeCategory]
  );

  const { activeCount, totalExecutions, lastExecution } = useMemo(() => {
    const active = templates.filter(t => t.activada).length;
    const total = templates.reduce((sum, t) => sum + t.totalEjecuciones, 0);
    const last = templates
      .filter(t => t.ultimaEjecucion)
      .sort((a, b) => new Date(b.ultimaEjecucion!).getTime() - new Date(a.ultimaEjecucion!).getTime())[0]
      ?.ultimaEjecucion ?? null;
    return { activeCount: active, totalExecutions: total, lastExecution: last };
  }, [templates]);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: tc('home'), href: '/dashboard' },
          { label: t('title') },
        ]}
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <button
            onClick={() => loadTemplates()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors"
            data-tour="automations-refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{tc('refresh')}</span>
          </button>
        }
      >
        <div className="space-y-6">
          {error && <ErrorBanner error={error} onRetry={() => { setError(''); loadTemplates(); }} />}

          {/* KPI summary bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" data-tour="automations-kpis">
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-green-200 bg-green-50 text-green-700">
              <Lightning size={18} weight="fill" className="flex-shrink-0 opacity-60" />
              <div>
                <p className="text-lg font-bold leading-none">{loading ? '—' : activeCount}</p>
                <p className="text-[11px] opacity-70 mt-0.5">{t('activeOf', { total: templates.length })}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border-subtle bg-surface-1 text-gray-700">
              <Sparkle size={18} weight="fill" className="flex-shrink-0 opacity-60" />
              <div>
                <p className="text-lg font-bold leading-none">{loading ? '—' : totalExecutions}</p>
                <p className="text-[11px] opacity-70 mt-0.5">{t('totalExecutions')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border-subtle bg-surface-1 text-gray-700">
              <Clock size={18} weight="fill" className="flex-shrink-0 opacity-60" />
              <div>
                <p className="text-lg font-bold leading-none truncate">
                  {loading ? '—' : lastExecution ? formatTimeAgo(lastExecution) : t('noExecution')}
                </p>
                <p className="text-[11px] opacity-70 mt-0.5">{t('lastExecution')}</p>
              </div>
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1" data-tour="automations-categories">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategory === cat
                    ? 'bg-success text-success-foreground'
                    : 'bg-surface-3 text-foreground/70 hover:bg-surface-3'
                }`}
              >
                {cat === 'Todas' ? t('allCategories') : cat === 'Operacion' ? t('operationCategory') : cat}
              </button>
            ))}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-surface-2 rounded-xl border border-border-subtle p-3 animate-pulse">
                  <div className="flex items-start gap-2.5 mb-3">
                    <div className="w-9 h-9 bg-surface-3 rounded-lg" />
                    <div className="flex-1">
                      <div className="h-4 bg-surface-3 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-surface-3 rounded w-full" />
                    </div>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <div className="h-5 bg-surface-3 rounded-md w-16" />
                    <div className="h-5 bg-surface-3 rounded-md w-14" />
                  </div>
                  <div className="h-7 bg-surface-1 rounded" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-10 h-10 bg-surface-3 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Robot size={20} className="text-muted-foreground" />
              </div>
              <p className="font-semibold text-gray-700 mb-1">{t('noCategory')}</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {activeCategory !== 'Todas'
                  ? t('noCategoryDesc', { category: CATEGORY_LABELS[activeCategory] || activeCategory })
                  : t('emptyDefault')}
              </p>
              {activeCategory !== 'Todas' && (
                <button
                  onClick={() => setActiveCategory('Todas')}
                  className="mt-4 px-4 py-2 text-sm font-medium text-foreground/70 bg-surface-3 rounded-lg hover:bg-surface-3 transition-colors"
                >
                  {t('viewAll')}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" data-tour="automations-grid">
              {filtered.map(template => {
                const Icon = getTemplateIcon(template.icono);
                const isToggling = togglingSlug === template.slug;

                return (
                  <div
                    key={template.slug}
                    className={`bg-surface-2 rounded-xl border transition-colors ${
                      template.activada
                        ? 'border-green-200 hover:bg-surface-1'
                        : 'border-border-subtle hover:bg-surface-1 opacity-60'
                    }`}
                  >
                    <div className="p-3">
                      {/* Header: Icon + Name + Toggle */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            template.activada
                              ? 'bg-green-50 text-green-600'
                              : 'bg-surface-3 text-muted-foreground'
                          }`}>
                            <Icon size={20} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-medium text-gray-900 text-[13px] leading-tight truncate">
                                {template.nombre}
                              </h3>

                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {template.descripcionCorta}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 mt-0.5" data-tour="automations-toggle">
                          {isToggling ? (
                            <RefreshCw className="w-5 h-5 text-green-600 animate-spin" />
                          ) : (
                            <Switch
                              checked={template.activada}
                              onCheckedChange={() => handleToggle(template)}
                              disabled={isToggling}
                            />
                          )}
                        </div>
                      </div>

                      {/* Footer: Badge + Destinatario + Stats + Config */}
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium ${
                          CATEGORY_COLORS[template.categoria] || 'bg-surface-3 text-foreground/70'
                        }`}>
                          {CATEGORY_LABELS[template.categoria] || template.categoria}
                        </span>
                        {(() => {
                          const dest = getDestinatario(template);
                          const info = DESTINATARIO_INFO[dest];
                          if (!info) return null;
                          const DestIcon = info.icon;
                          return (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground" title={`Notifica a: ${info.label}`}>
                              <DestIcon size={11} />
                              {info.label}
                            </span>
                          );
                        })()}
                        {template.activada && template.totalEjecuciones > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            {t('executionCount', { count: template.totalEjecuciones })}{template.ultimaEjecucion ? ` · ${formatTimeAgo(template.ultimaEjecucion)}` : ''}
                          </span>
                        )}
                        <span className="ml-auto inline-flex items-center gap-1">
                          <button
                              onClick={() => handleTest(template.slug, template.nombre)}
                              disabled={testingSlug === template.slug}
                              className="text-muted-foreground hover:text-green-600 text-xs transition-colors disabled:opacity-50"
                              aria-label={`${t('testNow')} ${template.nombre}`}
                              title={t('testNow')}
                            >
                              {testingSlug === template.slug ? <CircleNotch size={14} className="animate-spin" /> : <Play size={14} weight="fill" />}
                            </button>
                          {template.defaultParamsJson && (
                            <button
                              onClick={() => handleOpenConfig(template)}
                              className="text-muted-foreground hover:text-foreground/70 text-xs transition-colors"
                              data-tour="automations-config-btn"
                              aria-label={`${t('configure')} ${template.nombre}`}
                              title={t('configure')}
                            >
                              <GearSix size={14} />
                            </button>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Historial section */}
          <div className="bg-surface-2 rounded-xl border border-border-subtle" data-tour="automations-historial">
            <button
              onClick={() => {
                setShowHistorial(!showHistorial);
                if (!showHistorial && historial.length === 0) loadHistorial();
              }}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-surface-1 transition-colors rounded-lg"
            >
              <div className="flex items-center gap-2">
                <Lightning size={18} className="text-amber-500" />
                <span className="font-semibold text-sm text-gray-900">{t('historyTitle')}</span>
                {historialTotal > 0 && (
                  <span className="text-xs bg-surface-3 text-muted-foreground px-2 py-0.5 rounded-md">
                    {historialTotal}
                  </span>
                )}
              </div>
              {showHistorial ? <CaretUp size={16} className="text-muted-foreground" /> : <CaretDown size={16} className="text-muted-foreground" />}
            </button>

            {showHistorial && (
              <div className="border-t border-gray-100">
                {historialLoading ? (
                  <div className="py-12 text-center">
                    <RefreshCw className="w-6 h-6 mx-auto mb-2 text-gray-300 animate-spin" />
                    <p className="text-sm text-muted-foreground">{tc('loading')}</p>
                  </div>
                ) : historial.length === 0 ? (
                  <div className="py-12 text-center">
                    <Clock size={32} className="mx-auto mb-2 text-gray-200" />
                    <p className="text-sm text-muted-foreground">{t('emptyHistoryTitle')}</p>
                    <p className="text-xs text-gray-300 mt-1">{t('emptyHistoryDesc')}</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop table */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-surface-1 border-b border-gray-100">
                            <th className="text-left px-5 py-2.5 font-medium text-muted-foreground">{t('columns.date')}</th>
                            <th className="text-left px-5 py-2.5 font-medium text-muted-foreground">{t('columns.automation')}</th>
                            <th className="text-left px-5 py-2.5 font-medium text-muted-foreground">{t('columns.result')}</th>
                            <th className="text-left px-5 py-2.5 font-medium text-muted-foreground">{t('columns.action')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historial.map(exec => (
                            <tr key={exec.id} className="border-b border-gray-50 hover:bg-surface-1/50 transition-colors">
                              <td className="px-5 py-2.5 text-foreground/70 whitespace-nowrap">
                                {formatDate(exec.ejecutadoEn, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="px-5 py-2.5 font-medium text-gray-900">
                                {exec.templateNombre}
                              </td>
                              <td className="px-5 py-2.5">
                                <StatusBadge status={exec.status} />
                              </td>
                              <td className="px-5 py-2.5 text-muted-foreground max-w-xs truncate">
                                {exec.errorMessage || exec.actionTaken}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="sm:hidden divide-y divide-gray-50">
                      {historial.map(exec => (
                        <div key={exec.id} className="px-4 py-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm text-gray-900">{exec.templateNombre}</span>
                            <StatusBadge status={exec.status} size="xs" />
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{exec.errorMessage || exec.actionTaken}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {formatDate(exec.ejecutadoEn)}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                    {historialTotal > 10 && (
                      <div className="flex items-center justify-center gap-2 px-5 py-3 border-t border-gray-100">
                        <button
                          onClick={() => loadHistorial(historialPage - 1)}
                          disabled={historialPage <= 1}
                          className="text-xs text-muted-foreground hover:text-gray-700 disabled:opacity-50 transition-colors"
                        >
                          {tc('previous')}
                        </button>
                        <span className="text-xs text-muted-foreground">
                          {tc('page')} {historialPage} {tc('of')} {Math.ceil(historialTotal / 10)}
                        </span>
                        <button
                          onClick={() => loadHistorial(historialPage + 1)}
                          disabled={historialPage >= Math.ceil(historialTotal / 10)}
                          className="text-xs text-muted-foreground hover:text-gray-700 disabled:opacity-50 transition-colors"
                        >
                          {tc('next')}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </PageHeader>

      {isExpired && (
        <div className="mx-4 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
          <Warning size={20} className="text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">{t('subscriptionExpired')}</p>
            <p className="text-xs text-amber-600 mt-0.5">
              {t('subscriptionExpiredDesc')}
            </p>
          </div>
        </div>
      )}

      {/* Config Drawer */}
      <Drawer
        isOpen={configDrawerOpen}
        onClose={() => setConfigDrawerOpen(false)}
        title={t('configurePrefix', { name: configTemplate?.nombre || '' })}
        description={t('drawerConfigDesc')}
        icon={<GearSix size={20} className="text-muted-foreground" />}
        footer={
          <div className="flex gap-3 justify-end" data-tour="automations-drawer-actions">
            <Button type="button" variant="outline" onClick={() => setConfigDrawerOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button type="button" variant="success" onClick={handleSaveConfig} disabled={savingConfig} className="flex items-center gap-2">
              {savingConfig && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('saveChanges')}
            </Button>
          </div>
        }
      >
        <div className="space-y-5 p-6" data-tour="automations-drawer-form">
          {configTemplate?.descripcion && (
            <p className="text-sm text-muted-foreground bg-surface-1 rounded-lg p-3" data-tour="automations-drawer-desc">
              {configTemplate.descripcion}
            </p>
          )}

          {Object.entries(configParams).map(([key, value]) => {
            const config = PARAM_CONFIG[key];
            if (!config) return null;

            if (config.type === 'boolean') {
              return (
                <label key={key} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{config.label}</span>
                  <Switch
                    checked={Boolean(value)}
                    onCheckedChange={(checked: boolean) =>
                      setConfigParams(prev => ({ ...prev, [key]: checked }))
                    }
                  />
                </label>
              );
            }

            if (config.type === 'time') {
              return (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{config.label}</label>
                  <input
                    type="time"
                    value={String(value || '')}
                    onChange={e => setConfigParams(prev => ({ ...prev, [key]: e.target.value }))}
                    className="w-full px-3 py-2 border border-border-default rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              );
            }

            if (config.type === 'select') {
              return (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{config.label}</label>
                  <select
                    value={String(value || '')}
                    onChange={e => setConfigParams(prev => ({ ...prev, [key]: e.target.value }))}
                    className="w-full px-3 py-2 border border-border-default rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent bg-surface-2"
                  >
                    {config.options.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              );
            }

            return (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{config.label}</label>
                <input
                  type="number"
                  value={Number(value) || 0}
                  min={config.min}
                  max={config.max}
                  onChange={e => setConfigParams(prev => ({ ...prev, [key]: parseInt(e.target.value, 10) }))}
                  className="w-full px-3 py-2 border border-border-default rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                {config.min !== undefined && config.max !== undefined && (
                  <p className="text-[11px] text-muted-foreground mt-1">{t('range', { min: config.min, max: config.max })}</p>
                )}
              </div>
            );
          })}
        </div>
      </Drawer>

      {/* Deactivation confirmation modal */}
      <Modal
        isOpen={!!confirmDeactivate}
        onClose={() => setConfirmDeactivate(null)}
        title={t('confirmDeactivateTitle')}
        size="sm"
      >
        <p className="text-sm text-foreground/70 mb-4">
          {t('confirmDeactivateDesc', { name: confirmDeactivate?.nombre || '' })}
        </p>
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => setConfirmDeactivate(null)}>
            {tc('cancel')}
          </Button>
          <Button type="button" variant="destructive" onClick={async () => {
              if (confirmDeactivate) {
                setConfirmDeactivate(null);
                await executeToggle(confirmDeactivate);
              }
            }}>
            {tc('deactivate')}
          </Button>
        </div>
      </Modal>
    </>
  );
}
