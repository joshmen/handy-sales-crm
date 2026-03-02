'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Drawer } from '@/components/ui/Drawer';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { automationService } from '@/services/api/automations';
import type { AutomationTemplate, AutomationExecution } from '@/types/automations';
import { PARAM_CONFIG, CATEGORY_COLORS, CATEGORY_LABELS } from '@/types/automations';
import { toast } from '@/hooks/useToast';
import { RefreshCw } from 'lucide-react';
import {
  Robot,
  CheckCircle,
  Clock,
  Warning,
  GearSix,
  CaretDown,
  CaretUp,
  Lightning,
  Crown,
  Package,
  ClipboardText,
  UserPlus,
  BellRinging,
  UserCheck,
  Repeat,
  MapPinLine,
  Target,
  Sparkle,
} from '@phosphor-icons/react';
import type { IconProps } from '@phosphor-icons/react';
import { Switch } from '@/components/ui/Switch';

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
  Skipped: { bg: 'bg-gray-100 text-gray-600', label: 'Omitido' },
};

function StatusBadge({ status, size = 'sm' }: { status: string; size?: 'sm' | 'xs' }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.Skipped;
  const IconComp = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-full ${s.bg} ${size === 'xs' ? 'text-[10px]' : 'text-xs'}`}>
      {IconComp && <IconComp size={12} weight="fill" />}
      {s.label}
    </span>
  );
}

const CATEGORY_TAB_COLORS: Record<string, string> = {
  Todas: 'bg-gray-900 text-white',
  Cobranza: 'bg-rose-600 text-white',
  Ventas: 'bg-indigo-600 text-white',
  Inventario: 'bg-amber-600 text-white',
  Operacion: 'bg-cyan-600 text-white',
};

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'hace un momento';
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

export default function AutomationsPage() {
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
  const [configParams, setConfigParams] = useState<Record<string, unknown>>({});
  const [savingConfig, setSavingConfig] = useState(false);

  // Historial
  const [showHistorial, setShowHistorial] = useState(false);
  const [historialPage, setHistorialPage] = useState(1);

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await automationService.getTemplates();
      setTemplates(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar automatizaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistorial = useCallback(async (page = 1) => {
    try {
      const { items, total } = await automationService.getHistorial(page, 10);
      setHistorial(items);
      setHistorialTotal(total);
      setHistorialPage(page);
    } catch {
      // Silent fail for historial
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleToggle = async (template: AutomationTemplate) => {
    setTogglingSlug(template.slug);
    try {
      if (template.activada) {
        await automationService.desactivar(template.slug);
        toast({ title: 'Automatización desactivada', description: template.nombre });
      } else {
        await automationService.activar(template.slug, template.defaultParamsJson || undefined);
        toast({ title: 'Automatización activada', description: template.nombre });
      }
      await loadTemplates();
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' });
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
      toast({ title: 'Configuración guardada', description: configTemplate.nombre });
      setConfigDrawerOpen(false);
      await loadTemplates();
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' });
    } finally {
      setSavingConfig(false);
    }
  };

  const filtered = activeCategory === 'Todas'
    ? templates
    : templates.filter(t => t.categoria === activeCategory);

  const activeCount = templates.filter(t => t.activada).length;
  const totalExecutions = templates.reduce((sum, t) => sum + t.totalEjecuciones, 0);
  const lastExecution = templates
    .filter(t => t.ultimaEjecucion)
    .sort((a, b) => new Date(b.ultimaEjecucion!).getTime() - new Date(a.ultimaEjecucion!).getTime())[0]
    ?.ultimaEjecucion;

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: 'Inicio', href: '/dashboard' },
          { label: 'Automatizaciones' },
        ]}
        title="Automatizaciones"
        subtitle="Activa recetas para que el sistema trabaje por ti"
        actions={
          <button
            onClick={() => loadTemplates()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            data-tour="automations-refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        }
      >
        <div className="space-y-6">
          {error && <ErrorBanner error={error} onRetry={() => { setError(''); loadTemplates(); }} />}

          {/* KPI summary bar */}
          <div className="grid grid-cols-3 gap-3" data-tour="automations-kpis">
            <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Lightning size={14} weight="fill" className="text-emerald-600" />
                </div>
                <span className="text-xs text-gray-500">Activas</span>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{loading ? '—' : activeCount}</p>
              <p className="text-[11px] text-gray-400">de {templates.length} disponibles</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Sparkle size={14} weight="fill" className="text-indigo-600" />
                </div>
                <span className="text-xs text-gray-500">Ejecuciones</span>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{loading ? '—' : totalExecutions}</p>
              <p className="text-[11px] text-gray-400">total acumulado</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center">
                  <Clock size={14} weight="fill" className="text-violet-600" />
                </div>
                <span className="text-xs text-gray-500">Última ejecución</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 truncate">
                {loading ? '—' : lastExecution ? formatTimeAgo(lastExecution) : 'Ninguna'}
              </p>
              <p className="text-[11px] text-gray-400">más reciente</p>
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1" data-tour="automations-categories">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  activeCategory === cat
                    ? CATEGORY_TAB_COLORS[cat] || 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat === 'Operacion' ? 'Operación' : cat}
              </button>
            ))}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-100 rounded w-full" />
                    </div>
                  </div>
                  <div className="flex gap-2 mb-3">
                    <div className="h-5 bg-gray-100 rounded-full w-16" />
                    <div className="h-5 bg-gray-100 rounded-full w-14" />
                  </div>
                  <div className="h-8 bg-gray-50 rounded" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Robot size={32} className="text-gray-300" />
              </div>
              <p className="font-semibold text-gray-700 mb-1">Sin automatizaciones en esta categoría</p>
              <p className="text-sm text-gray-400 max-w-sm mx-auto">
                {activeCategory !== 'Todas'
                  ? `No hay recetas de tipo "${CATEGORY_LABELS[activeCategory] || activeCategory}". Prueba con otra categoría.`
                  : 'Las automatizaciones aparecerán aquí cuando estén disponibles.'}
              </p>
              {activeCategory !== 'Todas' && (
                <button
                  onClick={() => setActiveCategory('Todas')}
                  className="mt-4 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Ver todas
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-tour="automations-grid">
              {filtered.map(template => {
                const Icon = getTemplateIcon(template.icono);
                const isPremium = template.tier === 'Premium';
                const isToggling = togglingSlug === template.slug;

                return (
                  <div
                    key={template.slug}
                    className={`bg-white rounded-xl border transition-all duration-200 ${
                      template.activada
                        ? 'border-emerald-200 ring-1 ring-emerald-100 hover:shadow-md hover:-translate-y-0.5'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="p-5">
                      {/* Header: Icon + Name + Toggle */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            template.activada ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                          }`}>
                            <Icon size={22} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                              {template.nombre}
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                              {template.descripcionCorta}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0" data-tour="automations-toggle">
                          <Switch
                            checked={template.activada}
                            onCheckedChange={() => handleToggle(template)}
                            disabled={isToggling}
                          />
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          CATEGORY_COLORS[template.categoria] || 'bg-gray-100 text-gray-600'
                        }`}>
                          {CATEGORY_LABELS[template.categoria] || template.categoria}
                        </span>
                        {isPremium && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 flex items-center gap-1">
                            <Crown size={10} weight="fill" /> Premium
                          </span>
                        )}
                      </div>

                      {/* Active info */}
                      {template.activada && (
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            {template.ultimaEjecucion && (
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {formatTimeAgo(template.ultimaEjecucion)}
                              </span>
                            )}
                            {template.totalEjecuciones > 0 && (
                              <span>{template.totalEjecuciones} ejecuciones</span>
                            )}
                          </div>
                          {template.defaultParamsJson && (
                            <button
                              onClick={() => handleOpenConfig(template)}
                              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
                              data-tour="automations-config-btn"
                            >
                              <GearSix size={14} /> Configurar
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Historial section */}
          <div className="bg-white rounded-xl border border-gray-200" data-tour="automations-historial">
            <button
              onClick={() => {
                setShowHistorial(!showHistorial);
                if (!showHistorial && historial.length === 0) loadHistorial();
              }}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors rounded-xl"
            >
              <div className="flex items-center gap-2">
                <Lightning size={18} className="text-amber-500" />
                <span className="font-semibold text-sm text-gray-900">Historial de ejecuciones</span>
                {historialTotal > 0 && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    {historialTotal}
                  </span>
                )}
              </div>
              {showHistorial ? <CaretUp size={16} className="text-gray-400" /> : <CaretDown size={16} className="text-gray-400" />}
            </button>

            {showHistorial && (
              <div className="border-t border-gray-100">
                {historial.length === 0 ? (
                  <div className="py-12 text-center">
                    <Clock size={32} className="mx-auto mb-2 text-gray-200" />
                    <p className="text-sm text-gray-400">Sin ejecuciones registradas</p>
                    <p className="text-xs text-gray-300 mt-1">Las ejecuciones aparecerán aquí cuando las automatizaciones se ejecuten.</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop table */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="text-left px-5 py-2.5 font-medium text-gray-500">Fecha</th>
                            <th className="text-left px-5 py-2.5 font-medium text-gray-500">Automatización</th>
                            <th className="text-left px-5 py-2.5 font-medium text-gray-500">Resultado</th>
                            <th className="text-left px-5 py-2.5 font-medium text-gray-500">Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historial.map(exec => (
                            <tr key={exec.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                              <td className="px-5 py-2.5 text-gray-600 whitespace-nowrap">
                                {new Date(exec.ejecutadoEn).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="px-5 py-2.5 font-medium text-gray-900">
                                {exec.templateNombre}
                              </td>
                              <td className="px-5 py-2.5">
                                <StatusBadge status={exec.status} />
                              </td>
                              <td className="px-5 py-2.5 text-gray-500 max-w-xs truncate">
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
                          <p className="text-xs text-gray-500 truncate">{exec.errorMessage || exec.actionTaken}</p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {new Date(exec.ejecutadoEn).toLocaleString('es-MX')}
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
                          className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors"
                        >
                          Anterior
                        </button>
                        <span className="text-xs text-gray-400">
                          Página {historialPage} de {Math.ceil(historialTotal / 10)}
                        </span>
                        <button
                          onClick={() => loadHistorial(historialPage + 1)}
                          disabled={historialPage >= Math.ceil(historialTotal / 10)}
                          className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors"
                        >
                          Siguiente
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

      {/* Config Drawer */}
      <Drawer
        isOpen={configDrawerOpen}
        onClose={() => setConfigDrawerOpen(false)}
        title={`Configurar: ${configTemplate?.nombre || ''}`}
        description="Ajusta los parámetros de esta automatización"
        icon={<GearSix size={20} className="text-gray-500" />}
        footer={
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setConfigDrawerOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50 transition-colors"
              style={{ backgroundColor: 'var(--company-primary-color, #16a34a)' }}
            >
              {savingConfig ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        }
      >
        <div className="space-y-5 p-1">
          {configTemplate?.descripcion && (
            <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
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
                    checked={value as boolean}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
                {config.min !== undefined && config.max !== undefined && (
                  <p className="text-[11px] text-gray-400 mt-1">Rango: {config.min} – {config.max}</p>
                )}
              </div>
            );
          })}
        </div>
      </Drawer>
    </>
  );
}
