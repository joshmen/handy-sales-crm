'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { SegmentedBar } from '@/components/ui/SegmentedBar';
import { Sparkline } from '@/components/ui/Sparkline';
import { automationService } from '@/services/api/automations';
import { ExecutionDetailDrawer } from '@/components/automations/ExecutionDetailDrawer';
import type { AutomationTemplate, AutomationExecution } from '@/types/automations';
import { PARAM_CONFIG, TEMPLATE_KEYS, CATEGORY_COLORS, CATEGORY_LABEL_KEYS } from '@/types/automations';
import { toast } from '@/hooks/useToast';
import { useBackendTranslation } from '@/hooks/useBackendTranslation';
import { useApiErrorToast } from '@/hooks/useApiErrorToast';
import {
  RefreshCw,
  Loader2,
  Bot,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Settings,
  Package,
  ClipboardList,
  UserPlus,
  Users,
  BellRing,
  UserCheck,
  Repeat,
  MapPin,
  Target,
  Play,
  Info,
  ArrowRight,
  ChevronRight,
  MessageCircle,
  Mail,
  Smartphone,
  Lock,
  Check,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Switch } from '@/components/ui/Switch';
import { useFormatters } from '@/hooks/useFormatters';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';

const ICON_MAP: Record<string, LucideIcon> = {
  PackageOpen: Package, ClipboardList: ClipboardList,
  UserPlus, BellRinging: BellRing, UserCheck, Repeat, MapPinLine: MapPin,
  Target, CheckCircle: CheckCircle2, Warning: AlertTriangle, Robot: Bot,
};

function getTemplateIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] || Bot;
}

const STATUS_STYLES: Record<string, { bg: string; labelKey: string; icon?: LucideIcon }> = {
  Success: { bg: 'bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300', labelKey: 'statusSuccess', icon: CheckCircle2 },
  Failed: { bg: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300', labelKey: 'statusError', icon: AlertTriangle },
  Skipped: { bg: 'bg-surface-3 text-foreground/70', labelKey: 'statusSkipped' },
};

// Etiquetas amables de "Cuando…" (trigger) y "Entonces…" (action), derivadas del enum real del backend.
const TRIGGER_KEYS: Record<string, string> = {
  Event: 'trigger.event',
  Cron: 'trigger.cron',
  Condition: 'trigger.condition',
};
const ACTION_KEYS: Record<string, string> = {
  Notification: 'action.notification',
  Email: 'action.email',
  CreateEntity: 'action.createEntity',
};

// Color (hex) por categoría para acento, tint del lado "Entonces" y sparkline.
const CATEGORY_HEX: Record<string, string> = {
  Cobranza: '#E11D48',
  Ventas: '#4F46E5',
  Inventario: '#D97706',
  Operacion: '#0891B2',
  Clientes: '#7C3AED',
  Equipo: '#2563EB',
};

// Canales de envío. WhatsApp/Correo seleccionables; SMS bloqueado (no conectado).
// La preferencia se guarda en paramsJson.canales (presentación; el dispatch multi-canal es backend).
const CHANNELS: { id: string; icon: LucideIcon; labelKey: string; locked: boolean }[] = [
  { id: 'whatsapp', icon: MessageCircle, labelKey: 'channels.whatsapp', locked: false },
  { id: 'correo', icon: Mail, labelKey: 'channels.email', locked: false },
  { id: 'sms', icon: Smartphone, labelKey: 'channels.sms', locked: true },
];

function StatusBadge({ status, size = 'sm' }: { status: string; size?: 'sm' | 'xs' }) {
  const t = useTranslations('automations');
  const s = STATUS_STYLES[status] || STATUS_STYLES.Skipped;
  const IconComp = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-md ${s.bg} ${size === 'xs' ? 'text-[10px]' : 'text-xs'}`}>
      {IconComp && <IconComp size={12} />}
      {t(s.labelKey)}
    </span>
  );
}

const HIST_PAGE_SIZE = 50;

// Serie diaria (conteo de ejecuciones por día) a partir del historial REAL cargado.
function buildDailySeries(execs: AutomationExecution[]): number[] {
  if (!execs.length) return [];
  const byDay: Record<string, number> = {};
  for (const e of execs) {
    const d = e.ejecutadoEn.slice(0, 10);
    byDay[d] = (byDay[d] || 0) + 1;
  }
  return Object.keys(byDay).sort().map(k => byDay[k]);
}

export default function AutomationsPage() {
  const t = useTranslations('automations');
  const tc = useTranslations('common');
  const { tApi } = useBackendTranslation();
  const showApiError = useApiErrorToast();
  const { formatDate, formatNumber } = useFormatters();
  const { data: session } = useSession();
  const subscriptionStatus = (session?.user as Record<string, unknown>)?.subscriptionStatus as string | undefined;
  const isExpired = subscriptionStatus === 'Expired' || subscriptionStatus === 'PastDue';

  // i18n helpers para los templates de automatización
  const tName = (slug: string, fallback: string) => {
    const keys = TEMPLATE_KEYS[slug];
    if (!keys) return fallback;
    try { return t(keys.nameKey); } catch { return fallback; }
  };
  const tShortDesc = (slug: string, fallback: string) => {
    const keys = TEMPLATE_KEYS[slug];
    if (!keys) return fallback;
    try { return t(keys.shortDescKey); } catch { return fallback; }
  };
  const tTrigger = (type: string) => {
    const key = TRIGGER_KEYS[type];
    return key ? t(key) : type;
  };
  const tActionType = (type: string) => {
    const key = ACTION_KEYS[type];
    return key ? t(key) : type;
  };
  const tCategory = (cat: string) => {
    const key = CATEGORY_LABEL_KEYS[cat];
    return key ? t(key) : cat;
  };
  // Traduce el texto de acción ejecutada (historial), conservando el prefijo [TEST]
  const tAction = (text: string) => {
    if (!text) return '';
    const testPrefix = text.startsWith('[TEST] ') ? '[TEST] ' : '';
    const core = testPrefix ? text.slice(7) : text;
    return testPrefix + tApi(core);
  };

  const [templates, setTemplates] = useState<AutomationTemplate[]>([]);
  const [historial, setHistorial] = useState<AutomationExecution[]>([]);
  const [historialTotal, setHistorialTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null);

  // Pestañas: Plantillas | Historial
  const [activeTab, setActiveTab] = useState<'templates' | 'history'>('templates');
  const [histFilter, setHistFilter] = useState<'all' | 'Success' | 'Failed' | 'Skipped'>('all');
  const [catFilter, setCatFilter] = useState<string>('__all__');

  // Editor (drawer de configuración)
  const [configDrawerOpen, setConfigDrawerOpen] = useState(false);
  const [configTemplate, setConfigTemplate] = useState<AutomationTemplate | null>(null);
  const [configParams, setConfigParams] = useState<Record<string, string | number | boolean>>({});
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingSlug, setTestingSlug] = useState<string | null>(null);
  const [lastTest, setLastTest] = useState<{ slug: string; ok: boolean; text: string } | null>(null);

  // Confirmación de desactivación
  const [confirmDeactivate, setConfirmDeactivate] = useState<AutomationTemplate | null>(null);

  // Historial
  const [historialPage, setHistorialPage] = useState(1);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [selectedExecution, setSelectedExecution] = useState<AutomationExecution | null>(null);

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
      const { items, total } = await automationService.getHistorial(page, HIST_PAGE_SIZE);
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
    loadHistorial();
  }, [loadTemplates, loadHistorial]);

  const handleToggle = async (template: AutomationTemplate) => {
    // Confirmar antes de desactivar
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
        toast({ title: t('deactivated'), description: tName(template.slug, template.nombre) });
      } else {
        await automationService.activar(template.slug, template.defaultParamsJson || undefined);
        toast({ title: t('activated'), description: tName(template.slug, template.nombre) });
      }
      await loadTemplates();
    } catch (err: unknown) {
      showApiError(err, tc('error'));
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

      // Auto-inyectar cooldown_horas para triggers Condition que aún no lo tengan guardado.
      if (template.triggerType === 'Condition' && !('cooldown_horas' in params)) {
        params.cooldown_horas = '1';
      }
      // Canal por defecto si no hay preferencia guardada.
      if (!('canales' in params)) {
        params.canales = 'correo';
      }

      setConfigParams(params);
    } catch {
      setConfigParams({ canales: 'correo' });
    }
    setLastTest(null);
    setConfigDrawerOpen(true);
  };

  const handleSaveConfig = async () => {
    if (!configTemplate) return;
    setSavingConfig(true);
    try {
      await automationService.configurar(configTemplate.slug, JSON.stringify(configParams));
      toast({ title: t('configSaved'), description: tName(configTemplate.slug, configTemplate.nombre) });
      setConfigDrawerOpen(false);
      await loadTemplates();
    } catch (err: unknown) {
      showApiError(err, tc('error'));
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTest = async (slug: string, _nombre: string) => {
    setTestingSlug(slug);
    try {
      const result = await automationService.test(slug);
      const text = result.success ? tApi(result.action) : (tApi(result.error) || t('unknownError'));
      setLastTest({ slug, ok: result.success, text });
      if (result.success) {
        toast({ title: t('testSuccess'), description: tApi(result.action) });
      } else {
        toast({ title: t('testFailed'), description: tApi(result.error) || t('unknownError'), variant: 'destructive' });
      }
      await loadTemplates();
      loadHistorial();
    } catch (err: unknown) {
      showApiError(err, t('testError'));
    } finally {
      setTestingSlug(null);
    }
  };

  // ── Canales (drawer) ──
  const selectedChannels = String(configParams.canales ?? 'correo').split(',').map(s => s.trim()).filter(Boolean);
  const toggleChannel = (id: string) => {
    const set = new Set(selectedChannels);
    if (set.has(id)) set.delete(id); else set.add(id);
    setConfigParams(prev => ({ ...prev, canales: Array.from(set).join(',') }));
  };

  // ── Métricas derivadas (dato real + estimación etiquetada) ──
  const activas = templates.filter(tp => tp.activada).length;
  const totalAcciones = templates.reduce((s, tp) => s + tp.totalEjecuciones, 0);
  const horasAhorradas = Math.round((totalAcciones * 3) / 60); // ~3 min por acción (estimación)
  const ultimaEjecucion = templates.reduce<string | null>(
    (max, tp) => (tp.ultimaEjecucion && (!max || tp.ultimaEjecucion > max) ? tp.ultimaEjecucion : max),
    null
  );
  const heroSeries = buildDailySeries(historial);

  // Filtro por categoría (pills): "Todas" + categorías reales presentes en las plantillas.
  const categories = ['__all__', ...Array.from(new Set(templates.map(tp => tp.categoria)))];
  const filteredTemplates = catFilter === '__all__' ? templates : templates.filter(tp => tp.categoria === catFilter);

  // Historial: tasa de éxito + conteos (sobre el historial cargado = reciente)
  const cSuccess = historial.filter(e => e.status === 'Success').length;
  const cFailed = historial.filter(e => e.status === 'Failed').length;
  const cSkipped = historial.filter(e => e.status === 'Skipped').length;
  const successRate = historial.length > 0 ? Math.round((cSuccess / historial.length) * 100) : 0;
  const filteredHist = histFilter === 'all' ? historial : historial.filter(e => e.status === histFilter);
  // El backend a veces devuelve total=0 aunque haya items; usar el cargado como respaldo.
  const histCount = historialTotal || historial.length;

  const configHasParams = Object.keys(configParams).some(k => !!PARAM_CONFIG[k]);

  return (
    <>
      <PageHeader
        section="herramientas"
        icon={Zap}
        breadcrumbs={[
          { label: tc('home'), href: '/dashboard' },
          { label: t('title') },
        ]}
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <button
            onClick={() => { loadTemplates(); loadHistorial(historialPage); }}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 h-10 text-xs font-medium text-foreground border border-border-strong bg-card rounded-full hover:bg-surface-2 transition-colors disabled:opacity-50"
            data-tour="automations-refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{tc('refresh')}</span>
          </button>
        }
      >
        <div className="space-y-6">
          {error && <ErrorBanner error={error} onRetry={() => { setError(''); loadTemplates(); }} />}

          {isExpired && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
              <AlertTriangle size={20} className="text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">{t('subscriptionExpired')}</p>
                <p className="text-xs text-amber-600 mt-0.5">{t('subscriptionExpiredDesc')}</p>
              </div>
            </div>
          )}

          {/* Hero: anillo activas/total + "Trabajando por ti" + badge horas (izq); 2 cards (der) */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
              <div className="flex items-center gap-4 lg:border-r lg:border-border lg:pr-6">
                <ProgressRing value={activas ? (activas / Math.max(1, templates.length)) * 100 : 0} color="hsl(var(--primary))" size={86} stroke={9}>
                  <span className={`text-lg font-bold tabular-nums text-foreground ${loading ? 'animate-pulse' : ''}`}>{activas}/{templates.length}</span>
                </ProgressRing>
                <div>
                  <p className="text-[16px] font-semibold text-foreground">{t('hero.title')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('hero.activeOf', { active: activas, total: templates.length })}</p>
                  <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-md text-[11px] font-medium bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300">
                    <Clock size={12} /> {t('hero.hoursSavedShort', { hours: horasAhorradas })}
                  </span>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl bg-surface-1 p-3.5">
                  <p className="text-xs font-medium text-muted-foreground">{t('hero.totalActions')}</p>
                  <div className="flex items-end justify-between gap-2 mt-1">
                    <p className="text-2xl font-bold text-foreground tabular-nums">{formatNumber(totalAcciones)}</p>
                    {heroSeries.length >= 2 && <Sparkline data={heroSeries} color="hsl(var(--primary))" width={88} height={32} />}
                  </div>
                </div>
                <div className="rounded-xl bg-surface-1 p-3.5">
                  <p className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500" /> {t('hero.lastRun')}
                  </p>
                  <p className="text-sm font-semibold text-foreground mt-1">
                    {ultimaEjecucion ? formatDate(ultimaEjecucion, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : t('hero.never')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Pestañas: Plantillas | Historial (con contadores) */}
          <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-border bg-surface-1 p-1">
            {([
              { key: 'templates' as const, label: t('tabs.templates'), count: templates.length },
              { key: 'history' as const, label: t('tabs.history'), count: histCount },
            ]).map(tab => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  aria-pressed={active}
                  className={`px-4 py-1.5 text-[13px] font-medium rounded-lg transition-colors ${active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {tab.label}
                  <span className={`ml-1.5 text-[11px] ${active ? 'text-primary-foreground/80' : 'text-muted-foreground/70'}`}>{tab.count}</span>
                </button>
              );
            })}
          </div>

          {/* ── Plantillas: filtros por categoría + tarjetas clicables ── */}
          {activeTab === 'templates' && (
            <div data-tour="automations-grid" className="space-y-4">
              {!loading && templates.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {categories.map(c => {
                    const active = catFilter === c;
                    const label = c === '__all__' ? t('filterAll') : tCategory(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCatFilter(c)}
                        className={`px-3.5 py-2 rounded-full text-[12.5px] font-semibold transition-colors ${active ? 'bg-primary text-primary-foreground' : 'bg-surface-1 text-foreground/70 hover:text-foreground'}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
              {loading ? (
                <div className="py-16 text-center"><RefreshCw className="w-6 h-6 mx-auto mb-2 text-muted-foreground/60 animate-spin" /><p className="text-sm text-muted-foreground">{tc('loading')}</p></div>
              ) : templates.length === 0 ? (
                <div className="py-16 text-center"><Bot size={28} className="mx-auto mb-2 text-muted-foreground/60" /><p className="text-sm text-muted-foreground">{t('emptyDefault')}</p></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTemplates.map(tpl => {
                    const Icon = getTemplateIcon(tpl.icono);
                    const isToggling = togglingSlug === tpl.slug;
                    const series = buildDailySeries(historial.filter(e => e.templateSlug === tpl.slug));
                    const cat = CATEGORY_HEX[tpl.categoria] ?? '#0176D3';
                    // Destinatario derivado de los params (admin/vendedores/ambos) para el subtítulo del card.
                    let dest: string | null = null;
                    try {
                      const p = JSON.parse(tpl.paramsJson || tpl.defaultParamsJson || '{}');
                      if (p.destinatario === 'admin') dest = t('params.recipientOptions.admin');
                      else if (p.destinatario === 'vendedores') dest = t('params.recipientOptions.vendors');
                      else if (p.destinatario === 'ambos') dest = t('params.recipientOptions.both');
                    } catch { /* sin params */ }
                    return (
                      <div
                        key={tpl.slug}
                        onClick={() => handleOpenConfig(tpl)}
                        className={`relative cursor-pointer bg-card border rounded-2xl p-4 shadow-sm transition-all duration-200 hover:shadow-md overflow-hidden ${tpl.activada ? '' : 'opacity-[0.62]'}`}
                        style={{ borderColor: tpl.activada ? `color-mix(in srgb, ${cat} 30%, hsl(var(--border)))` : 'hsl(var(--border))' }}
                      >
                        {/* Barra de acento 3px (color de categoría cuando activa) */}
                        <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: tpl.activada ? cat : 'transparent' }} />

                        {/* Header: ícono + (nombre + destinatario) + toggle */}
                        <div className="flex items-start gap-3 mb-3">
                          <div
                            className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center shrink-0"
                            style={tpl.activada
                              ? { background: `color-mix(in srgb, ${cat} 13%, hsl(var(--card)))`, color: cat }
                              : undefined}
                          >
                            <Icon size={19} className={tpl.activada ? undefined : 'text-muted-foreground'} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13.5px] font-bold text-foreground leading-tight truncate">{tName(tpl.slug, tpl.nombre)}</p>
                            {dest ? (
                              <span className="text-[11px] text-muted-foreground mt-1 inline-flex items-center gap-1"><Users size={10} /> {dest}</span>
                            ) : (
                              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-1">{tShortDesc(tpl.slug, tpl.descripcionCorta)}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleToggle(tpl); }}
                            disabled={isToggling}
                            title={tpl.activada ? tc('deactivate') : tc('activate')}
                            className="relative shrink-0 rounded-full disabled:opacity-60"
                            style={{ width: 40, height: 23, padding: 0, border: 'none', background: tpl.activada ? cat : 'hsl(var(--muted-foreground) / 0.35)', transition: 'background .18s' }}
                          >
                            <span className="absolute rounded-full bg-white shadow-sm" style={{ top: 2, left: tpl.activada ? 19 : 2, width: 19, height: 19, transition: 'left .18s' }} />
                          </button>
                        </div>

                        {/* Cuando → Entonces (2 partes; derecha tintada por categoría) */}
                        <div className="flex items-stretch rounded-[10px] border border-border overflow-hidden mb-3">
                          <div className="flex-1 min-w-0 py-2 px-2.5 bg-surface-1">
                            <p className="text-[9px] font-bold uppercase tracking-[0.04em] text-muted-foreground">{t('columns.when')}</p>
                            <p className="text-[11.5px] font-semibold text-foreground/80 truncate mt-0.5">{tTrigger(tpl.triggerType)}</p>
                          </div>
                          <div className="flex items-center px-1 shrink-0 bg-surface-1" style={{ color: cat }}>
                            <ArrowRight size={15} />
                          </div>
                          <div className="flex-1 min-w-0 py-2 px-2.5" style={{ background: `color-mix(in srgb, ${cat} 7%, hsl(var(--card)))` }}>
                            <p className="text-[9px] font-bold uppercase tracking-[0.04em]" style={{ color: cat }}>{t('columns.then')}</p>
                            <p className="text-[11.5px] font-semibold text-foreground/80 truncate mt-0.5">{tActionType(tpl.actionType)}</p>
                          </div>
                        </div>

                        {/* Caja de ejecuciones + sparkline (solo activa) */}
                        {tpl.activada && (
                          <div className="flex items-end justify-between gap-2.5 rounded-[10px] bg-surface-1 px-3 py-2.5 mb-2.5">
                            <div>
                              <p className="text-[17px] font-extrabold text-foreground tabular-nums leading-none">{formatNumber(tpl.totalEjecuciones)}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{t('columns.executions')}</p>
                            </div>
                            {series.length >= 2 && <Sparkline data={series} color={cat} width={86} height={26} />}
                          </div>
                        )}

                        {/* Footer: categoría + última ejecución + Configurar */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium ${CATEGORY_COLORS[tpl.categoria] ?? 'bg-surface-3 text-foreground/70'}`}>
                            {tCategory(tpl.categoria)}
                          </span>
                          {tpl.activada && tpl.ultimaEjecucion && (
                            <span className="text-[10.5px] text-muted-foreground">{formatDate(tpl.ultimaEjecucion, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                          )}
                          <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                            {t('configure')} <ChevronRight size={13} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Historial: panel enriquecido ── */}
          {activeTab === 'history' && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden" data-tour="automations-historial">
              {/* Cabecera: tasa de éxito + barra tricolor + filtros */}
              <div className="p-5 border-b border-border">
                <div className="flex items-start justify-between gap-5 flex-wrap">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('successRate')}</p>
                    <p className="text-2xl font-bold text-foreground tabular-nums">{successRate}%</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{t('recentBasis')}</p>
                  </div>
                  <div className="flex-1 min-w-[220px] max-w-md pt-1">
                    <SegmentedBar
                      segments={[
                        { value: cSuccess, color: '#16A34A', label: t('statusSuccess') },
                        { value: cSkipped, color: '#9AA6B6', label: t('statusSkipped') },
                        { value: cFailed, color: '#DC2626', label: t('statusError') },
                      ]}
                    />
                  </div>
                </div>
                {/* Filtros */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {([
                    { k: 'all' as const, label: t('filterAll'), count: historial.length },
                    { k: 'Success' as const, label: t('statusSuccess'), count: cSuccess },
                    { k: 'Failed' as const, label: t('statusError'), count: cFailed },
                    { k: 'Skipped' as const, label: t('statusSkipped'), count: cSkipped },
                  ]).map(f => {
                    const active = histFilter === f.k;
                    return (
                      <button
                        key={f.k}
                        type="button"
                        onClick={() => setHistFilter(f.k)}
                        className={`px-3 py-1.5 text-[12px] font-medium rounded-lg border transition-colors ${active ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:text-foreground hover:bg-surface-1'}`}
                      >
                        {f.label} <span className="opacity-70">({f.count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filas */}
              {historialLoading ? (
                <div className="py-12 text-center"><RefreshCw className="w-6 h-6 mx-auto mb-2 text-muted-foreground/60 animate-spin" /><p className="text-sm text-muted-foreground">{tc('loading')}</p></div>
              ) : filteredHist.length === 0 ? (
                <div className="py-12 text-center"><Clock size={32} className="mx-auto mb-2 text-muted-foreground/40" /><p className="text-sm text-muted-foreground">{t('emptyHistoryTitle')}</p><p className="text-xs text-muted-foreground/60 mt-1">{t('emptyHistoryDesc')}</p></div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredHist.map(exec => (
                    <button
                      key={exec.id}
                      onClick={() => setSelectedExecution(exec)}
                      className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-surface-1 transition-colors"
                      title={t('clickForDetail')}
                    >
                      <StatusBadge status={exec.status} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-foreground truncate inline-flex items-center gap-1.5">
                          {tName(exec.templateSlug, exec.templateNombre)}
                          <Info size={13} className="text-muted-foreground/60" />
                        </p>
                        <p className="text-[11.5px] text-muted-foreground truncate">{tAction(exec.errorMessage || exec.actionTaken)}</p>
                      </div>
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                        {formatDate(exec.ejecutadoEn, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Paginación */}
              {historialTotal > HIST_PAGE_SIZE && (
                <div className="flex items-center justify-center gap-3 px-5 py-3 border-t border-border">
                  <button onClick={() => loadHistorial(historialPage - 1)} disabled={historialPage <= 1} className="text-xs text-muted-foreground hover:text-foreground/80 disabled:opacity-50 transition-colors">{tc('previous')}</button>
                  <span className="text-xs text-muted-foreground">{tc('page')} {historialPage} {tc('of')} {Math.ceil(historialTotal / HIST_PAGE_SIZE)}</span>
                  <button onClick={() => loadHistorial(historialPage + 1)} disabled={historialPage >= Math.ceil(historialTotal / HIST_PAGE_SIZE)} className="text-xs text-muted-foreground hover:text-foreground/80 disabled:opacity-50 transition-colors">{tc('next')}</button>
                </div>
              )}
            </div>
          )}
        </div>
      </PageHeader>

      {/* Editor / Drawer de configuración (se abre al hacer click en una tarjeta) */}
      <Drawer
        isOpen={configDrawerOpen}
        onClose={() => setConfigDrawerOpen(false)}
        title={t('configurePrefix', { name: configTemplate ? tName(configTemplate.slug, configTemplate.nombre) : '' })}
        description={t('drawerConfigDesc')}
        icon={<Settings size={20} className="text-muted-foreground" />}
        footer={
          <div className="flex items-center justify-end w-full gap-3" data-tour="automations-drawer-actions">
            <Button type="button" variant="wbOutline" onClick={() => setConfigDrawerOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button type="button" variant="wbPrimary" onClick={handleSaveConfig} disabled={savingConfig} className="flex items-center gap-2">
              {savingConfig && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('saveChanges')}
            </Button>
          </div>
        }
      >
        <div className="space-y-5 p-6" data-tour="automations-drawer-form">
          {configTemplate && (
            <p className="text-sm text-muted-foreground bg-surface-1 rounded-lg p-3" data-tour="automations-drawer-desc">
              {TEMPLATE_KEYS[configTemplate.slug] ? t(TEMPLATE_KEYS[configTemplate.slug].descKey) : configTemplate.descripcion}
            </p>
          )}

          {/* Canales de envío (multi-selección; SMS bloqueado) */}
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">{t('channels.title')}</label>
            <div className="space-y-2">
              {CHANNELS.map(ch => {
                const checked = selectedChannels.includes(ch.id);
                const Icon = ch.icon;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    disabled={ch.locked}
                    onClick={() => !ch.locked && toggleChannel(ch.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                      ch.locked
                        ? 'border-border-subtle opacity-60 cursor-not-allowed'
                        : checked
                        ? 'border-primary bg-primary/5'
                        : 'border-border-default hover:border-border-strong'
                    }`}
                  >
                    <Icon size={18} className={checked && !ch.locked ? 'text-primary' : 'text-muted-foreground'} />
                    <span className="flex-1 text-sm text-foreground/80">{t(ch.labelKey)}</span>
                    {ch.locked ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Lock size={12} />{t('channels.notConnected')}</span>
                    ) : (
                      <span className={`w-4 h-4 rounded border flex items-center justify-center ${checked ? 'bg-primary border-primary' : 'border-border-strong'}`}>
                        {checked && <Check size={11} className="text-primary-foreground" />}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {selectedChannels.length > 1 && <p className="text-[11px] text-muted-foreground mt-2">{t('channels.order')}</p>}
          </div>

          {/* Parámetros configurables */}
          {configHasParams && <div className="h-px bg-border" />}
          {Object.entries(configParams).map(([key, value]) => {
            const config = PARAM_CONFIG[key];
            if (!config) return null;

            if (config.type === 'boolean') {
              return (
                <label key={key} className="flex items-center justify-between">
                  <span className="text-sm text-foreground/80">{t(config.labelKey)}</span>
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
                  <label className="block text-sm font-medium text-foreground/80 mb-1">{t(config.labelKey)}</label>
                  <input
                    type="time"
                    value={String(value || '')}
                    onChange={e => setConfigParams(prev => ({ ...prev, [key]: e.target.value }))}
                    className="w-full px-3 py-2 border border-border-default rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              );
            }

            if (config.type === 'select') {
              return (
                <div key={key}>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">{t(config.labelKey)}</label>
                  <select
                    value={String(value || '')}
                    onChange={e => setConfigParams(prev => ({ ...prev, [key]: e.target.value }))}
                    className="w-full px-3 py-2 border border-border-default rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-2"
                  >
                    {config.optionKeys.map(opt => (
                      <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
                    ))}
                  </select>
                </div>
              );
            }

            return (
              <div key={key}>
                <label className="block text-sm font-medium text-foreground/80 mb-1">{t(config.labelKey)}</label>
                <input
                  type="number"
                  value={Number(value) || 0}
                  min={config.min}
                  max={config.max}
                  onChange={e => setConfigParams(prev => ({ ...prev, [key]: parseInt(e.target.value, 10) }))}
                  className="w-full px-3 py-2 border border-border-default rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                {config.min !== undefined && config.max !== undefined && (
                  <p className="text-[11px] text-muted-foreground mt-1">{t('range', { min: config.min, max: config.max })}</p>
                )}
              </div>
            );
          })}

          {/* Probar antes de activar — envío de prueba a tu propia cuenta */}
          <div className="rounded-lg border border-dashed border-border-strong p-3.5">
            <p className="text-sm font-medium text-foreground/80">{t('testBeforeActivate')}</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">{t('testBeforeActivateDesc')}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 flex items-center gap-2"
              onClick={() => configTemplate && handleTest(configTemplate.slug, tName(configTemplate.slug, configTemplate.nombre))}
              disabled={!!testingSlug}
            >
              {testingSlug ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
              {t('runTest')}
            </Button>
            {lastTest && configTemplate && lastTest.slug === configTemplate.slug && (
              <p className={`text-[12px] mt-2 inline-flex items-center gap-1.5 ${lastTest.ok ? 'text-green-600' : 'text-red-600'}`}>
                {lastTest.ok ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                {lastTest.text}
              </p>
            )}
          </div>
        </div>
      </Drawer>

      {/* Confirmación de desactivación */}
      <Modal
        isOpen={!!confirmDeactivate}
        onClose={() => setConfirmDeactivate(null)}
        title={t('confirmDeactivateTitle')}
        size="sm"
      >
        <p className="text-sm text-foreground/70 mb-4">
          {t('confirmDeactivateDesc', { name: confirmDeactivate ? tName(confirmDeactivate.slug, confirmDeactivate.nombre) : '' })}
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

      {/* Detalle de ejecución (click en una fila del historial) */}
      <ExecutionDetailDrawer
        execution={selectedExecution}
        onClose={() => setSelectedExecution(null)}
      />
    </>
  );
}
