'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Loader2,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import {
  Bug,
  Warning,
  ShieldWarning,
  CheckCircle,
  Clock,
  DeviceMobile,
  Code,
  User,
  Buildings,
  CalendarDots,
  CloudArrowUp,
  ArrowsClockwise,
  CaretDown,
  CaretRight,
  GearSix,
  WarningCircle,
} from '@phosphor-icons/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Drawer } from '@/components/ui/Drawer';
import { Pagination } from '@/components/ui/Pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { toast } from '@/hooks/useToast';
import { useSignalR } from '@/contexts/SignalRContext';
import {
  crashReportService,
  CrashReportDto,
  CrashReportEstadisticas,
} from '@/services/api/crashReports';
import {
  monitoringService,
  MonitoringStats,
  LogEntry,
  LogLevels,
} from '@/services/api/monitoring';
import { useFormatters } from '@/hooks/useFormatters';
import { formatDate as libFmtDate } from '@/lib/formatters';
import { useTranslations } from 'next-intl';

const PAGE_SIZE = 20;

type SeverityFilter = 'ALL' | 'CRASH' | 'ERROR' | 'WARNING';
type ActiveTab = 'cloudwatch' | 'mobile';

// ============ SHARED HELPERS ============

function getSeverityBadge(severity: string) {
  switch (severity?.toUpperCase()) {
    case 'CRASH':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
          <ShieldWarning size={14} weight="fill" className="text-red-600" />
          Crash
        </span>
      );
    case 'ERROR':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-800">
          <Bug size={14} weight="fill" className="text-orange-600" />
          Error
        </span>
      );
    case 'WARNING':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-800">
          <Warning size={14} weight="fill" className="text-yellow-600" />
          Warning
        </span>
      );
    default:
      return <Badge variant="secondary">{severity}</Badge>;
  }
}

function getEstadoBadge(resuelto: boolean) {
  if (resuelto) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
        <CheckCircle size={14} weight="fill" className="text-green-600" />
        Resuelto
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
      <Clock size={14} weight="fill" className="text-gray-500" />
      Pendiente
    </span>
  );
}

function formatDate(dateStr: string) {
  try {
    const date = new Date(dateStr);
    return libFmtDate(date, null, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function truncateText(text: string, maxLength: number) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// ============ LOG GROUP COLORS ============

const LOG_GROUP_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'api-main': { bg: 'bg-blue-100', text: 'text-blue-800', dot: '#3b82f6' },
  'api-billing': { bg: 'bg-purple-100', text: 'text-purple-800', dot: '#8b5cf6' },
  'api-mobile': { bg: 'bg-cyan-100', text: 'text-cyan-800', dot: '#06b6d4' },
  web: { bg: 'bg-emerald-100', text: 'text-emerald-800', dot: '#10b981' },
};

function getLogGroupBadge(logGroup: string) {
  const colors = LOG_GROUP_COLORS[logGroup] || { bg: 'bg-gray-100', text: 'text-gray-700', dot: '#6b7280' };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full ${colors.bg} px-2.5 py-0.5 text-xs font-semibold ${colors.text}`}>
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.dot }} />
      {logGroup}
    </span>
  );
}

// ============ CLOUDWATCH TAB ============

const LOG_LEVEL_OPTIONS = [
  { value: 'Warning', label: 'Errores' },
  { value: 'Information', label: 'Info' },
  { value: 'Debug', label: 'Debug' },
  { value: 'Verbose', label: 'Todo' },
] as const;

type LogLevelValue = 'Warning' | 'Information' | 'Debug' | 'Verbose';

const API_NAMES: { key: keyof LogLevels; label: string }[] = [
  { key: 'apiMain', label: 'API Principal' },
  { key: 'apiBilling', label: 'API Facturacion' },
  { key: 'apiMobile', label: 'API Movil' },
];

function LogLevelControls() {
  const t = useTranslations('admin.crashReports');
  const [open, setOpen] = useState(false);
  const [levels, setLevels] = useState<LogLevels | null>(null);
  const [draft, setDraft] = useState<Record<keyof LogLevels, LogLevelValue>>({
    apiMain: 'Warning',
    apiBilling: 'Warning',
    apiMobile: 'Warning',
  });
  const [loadingLevels, setLoadingLevels] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!open || levels) return;
    setLoadingLevels(true);
    monitoringService
      .getLogLevels()
      .then(data => {
        setLevels(data);
        setDraft({
          apiMain: (data.apiMain as LogLevelValue) || 'Warning',
          apiBilling: (data.apiBilling as LogLevelValue) || 'Warning',
          apiMobile: (data.apiMobile as LogLevelValue) || 'Warning',
        });
      })
      .catch(() => {
        toast.error(t('logLevelLoadError'));
      })
      .finally(() => setLoadingLevels(false));
  }, [open, levels]);

  const hasChanges =
    levels != null &&
    (draft.apiMain !== levels.apiMain ||
      draft.apiBilling !== levels.apiBilling ||
      draft.apiMobile !== levels.apiMobile);

  const hasVerboseLevel =
    draft.apiMain !== 'Warning' ||
    draft.apiBilling !== 'Warning' ||
    draft.apiMobile !== 'Warning';

  const handleApply = async () => {
    if (!levels) return;
    setApplying(true);
    try {
      const keyToApiName: Record<string, string> = {
        apiMain: 'api-main',
        apiBilling: 'api-billing',
        apiMobile: 'api-mobile',
      };
      const changes: { apiName: string; level: string }[] = [];
      for (const { key } of API_NAMES) {
        if (draft[key] !== levels[key]) {
          changes.push({ apiName: keyToApiName[key] || key, level: draft[key] });
        }
      }
      await Promise.all(changes.map(c => monitoringService.setLogLevel(c.apiName, c.level)));
      setLevels({ ...draft });
      toast.success(
        t('logLevelUpdated', { count: changes.length })
      );
    } catch {
      toast.error(t('logLevelError'));
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="bg-surface-2 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-surface-1 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <GearSix size={18} weight="duotone" className="text-gray-500" />
          {t('logLevel')}
        </span>
        {open ? (
          <CaretDown size={16} className="text-gray-400" />
        ) : (
          <CaretRight size={16} className="text-gray-400" />
        )}
      </button>

      {open && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4">
          {loadingLevels ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-8 w-full bg-gray-100 rounded-md animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {API_NAMES.map(({ key, label }) => (
                  <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <span className="text-sm font-medium text-gray-600 w-36 shrink-0">{label}</span>
                    <div className="flex items-center gap-4">
                      {LOG_LEVEL_OPTIONS.map(opt => (
                        <label
                          key={opt.value}
                          className="flex items-center gap-1.5 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name={`log-level-${key}`}
                            value={opt.value}
                            checked={draft[key] === opt.value}
                            onChange={() =>
                              setDraft(prev => ({ ...prev, [key]: opt.value as LogLevelValue }))
                            }
                            className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {hasVerboseLevel && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-800">
                  <WarningCircle size={16} weight="fill" className="text-amber-500 shrink-0 mt-0.5" />
                  <span>
                    Niveles Info o Debug activos — genera mas logs y aumenta costos de CloudWatch.
                    Revertir a Errores cuando termine el diagnostico.
                  </span>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleApply}
                  disabled={!hasChanges || applying}
                  className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                  {applying ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  ) : null}
                  Aplicar
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function CloudWatchTab() {
  const t = useTranslations('admin.crashReports');
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [recentErrors, setRecentErrors] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorsLoading, setErrorsLoading] = useState(true);
  const [logGroupFilter, setLogGroupFilter] = useState<string>('ALL');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const data = await monitoringService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading monitoring stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRecentErrors = useCallback(async () => {
    try {
      setErrorsLoading(true);
      const data = await monitoringService.getRecentErrors({
        logGroup: logGroupFilter === 'ALL' ? undefined : logGroupFilter,
        limit: 50,
      });
      setRecentErrors(data);
    } catch (error) {
      console.error('Error loading recent errors:', error);
    } finally {
      setErrorsLoading(false);
    }
  }, [logGroupFilter]);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    loadStats();
    loadRecentErrors();
  }, [loadStats, loadRecentErrors]);

  useEffect(() => {
    loadStats();
    loadRecentErrors();
  }, [loadStats, loadRecentErrors]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(handleRefresh, 30_000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, handleRefresh]);

  const toggleRow = (index: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // Prepare chart data — group by hour with log group breakdown
  const chartData = stats?.errorsByHour ?? [];

  return (
    <div className="space-y-6">
      {/* Log Level Controls (collapsible) */}
      <LogLevelControls />

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Log group filter */}
          <div className="w-48">
            <Select value={logGroupFilter} onValueChange={setLogGroupFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Log Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('allServices')}</SelectItem>
                <SelectItem value="api-main">api-main</SelectItem>
                <SelectItem value="api-billing">api-billing</SelectItem>
                <SelectItem value="api-mobile">api-mobile</SelectItem>
                <SelectItem value="web">web</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(prev => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
              autoRefresh
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-surface-2 border-gray-200 text-gray-500 hover:bg-surface-1'
            }`}
          >
            <ArrowsClockwise size={14} weight={autoRefresh ? 'fill' : 'regular'} className={autoRefresh ? 'animate-spin' : ''} />
            Auto (30s)
          </button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            {t('apply')}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface-2 rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{t('errors24h')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {loading ? (
                  <span className="inline-block h-8 w-12 bg-gray-200 rounded-md animate-pulse" />
                ) : (
                  stats?.errorsLast24h ?? 0
                )}
              </p>
            </div>
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-orange-100">
              <Bug size={24} weight="duotone" className="text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-surface-2 rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{t('warnings24h')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {loading ? (
                  <span className="inline-block h-8 w-12 bg-gray-200 rounded-md animate-pulse" />
                ) : (
                  stats?.warningsLast24h ?? 0
                )}
              </p>
            </div>
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-yellow-100">
              <Warning size={24} weight="duotone" className="text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-surface-2 rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{t('crashes24h')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {loading ? (
                  <span className="inline-block h-8 w-12 bg-gray-200 rounded-md animate-pulse" />
                ) : (
                  stats?.crashesLast24h ?? 0
                )}
              </p>
            </div>
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-red-100">
              <ShieldWarning size={24} weight="duotone" className="text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-surface-2 rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{t('apisWithErrors')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {loading ? (
                  <span className="inline-block h-8 w-12 bg-gray-200 rounded-md animate-pulse" />
                ) : (
                  stats?.apisWithErrors ?? 0
                )}
              </p>
            </div>
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-100">
              <CloudArrowUp size={24} weight="duotone" className="text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Bar Chart — Errors by Hour */}
      <div className="bg-surface-2 rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('errorsByHour')}</h3>
        {loading ? (
          <div className="h-64 w-full bg-surface-1 rounded-lg animate-pulse" />
        ) : chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-sm text-gray-400">
            {t('noDataLast24h')}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <RechartsTooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                labelStyle={{ fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="count" name="Errores" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recent Errors Table */}
      <div className="bg-surface-2 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">{t('recentErrors')}</h3>
        </div>

        {errorsLoading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-6 py-4">
                <div className="h-4 w-full bg-gray-100 rounded-md animate-pulse" />
              </div>
            ))}
          </div>
        ) : recentErrors.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <CheckCircle size={48} weight="duotone" className="mx-auto text-green-300 mb-3" />
            <p className="text-gray-500 text-sm">{t('noRecentErrors')}</p>
            <p className="text-gray-400 text-xs mt-1">{t('noRecentErrorsDesc')}</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-surface-1">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 w-8" />
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Timestamp</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Log Group</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Mensaje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentErrors.map((entry, idx) => (
                    <>
                      <tr
                        key={`row-${idx}`}
                        onClick={() => toggleRow(idx)}
                        className="hover:bg-surface-1 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-3">
                          {expandedRows.has(idx) ? (
                            <CaretDown size={14} className="text-gray-400" />
                          ) : (
                            <CaretRight size={14} className="text-gray-400" />
                          )}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(entry.timestamp)}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          {getLogGroupBadge(entry.logGroup)}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-900 max-w-md truncate">
                          {truncateText(entry.message, 100)}
                        </td>
                      </tr>
                      {expandedRows.has(idx) && (
                        <tr key={`detail-${idx}`}>
                          <td colSpan={4} className="px-6 py-4 bg-surface-1">
                            <div className="space-y-3">
                              <div className="flex gap-4 text-xs text-gray-500">
                                <span><span className="font-medium">Nivel:</span> {entry.level}</span>
                                <span><span className="font-medium">Log Stream:</span> {entry.logStream}</span>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-600 mb-1">Mensaje:</p>
                                <pre className="text-xs bg-gray-100 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all text-gray-800">
{entry.message}
                                </pre>
                              </div>
                              {entry.exception && (
                                <div>
                                  <p className="text-xs font-medium text-red-600 mb-1">Stack Trace:</p>
                                  <pre className="text-xs bg-gray-900 text-red-400 rounded-lg p-4 overflow-x-auto max-h-64 overflow-y-auto font-mono whitespace-pre-wrap break-all">
{entry.exception}
                                  </pre>
                                </div>
                              )}
                              {Object.keys(entry.properties).length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-gray-600 mb-1">Propiedades:</p>
                                  <div className="grid grid-cols-2 gap-1 text-xs">
                                    {Object.entries(entry.properties).map(([k, v]) => (
                                      <div key={k} className="flex gap-1">
                                        <span className="text-gray-500 font-medium">{k}:</span>
                                        <span className="text-gray-700 truncate">{v}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {recentErrors.map((entry, idx) => (
                <div
                  key={idx}
                  onClick={() => toggleRow(idx)}
                  className="px-4 py-3 cursor-pointer hover:bg-surface-1 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    {getLogGroupBadge(entry.logGroup)}
                    <span className="text-xs text-gray-400">{formatDate(entry.timestamp)}</span>
                  </div>
                  <p className="text-sm text-gray-900 line-clamp-2">{entry.message}</p>
                  {expandedRows.has(idx) && (
                    <div className="mt-2 space-y-2">
                      <pre className="text-xs bg-gray-100 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all text-gray-800">
{entry.message}
                      </pre>
                      {entry.exception && (
                        <pre className="text-xs text-red-400 bg-gray-900 rounded-lg p-3 overflow-x-auto max-h-40 overflow-y-auto font-mono whitespace-pre-wrap break-all">
{entry.exception}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============ MOBILE CRASHES TAB ============

function MobileCrashesTab() {
  const t = useTranslations('admin.crashReports');
  const { isConnected, on, off } = useSignalR();

  // Data state
  const [reports, setReports] = useState<CrashReportDto[]>([]);
  const [estadisticas, setEstadisticas] = useState<CrashReportEstadisticas | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL');
  const [resueltoFilter, setResueltoFilter] = useState<string>('ALL');
  const [searchVersion, setSearchVersion] = useState('');
  const [appliedSearchVersion, setAppliedSearchVersion] = useState('');

  // Drawer state
  const [selectedReport, setSelectedReport] = useState<CrashReportDto | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Resolver state
  const [resolverOpen, setResolverOpen] = useState(false);
  const [resolverNota, setResolverNota] = useState('');
  const [resolverLoading, setResolverLoading] = useState(false);

  // ---- Data fetching ----

  const loadEstadisticas = useCallback(async () => {
    try {
      setStatsLoading(true);
      const data = await crashReportService.getEstadisticas();
      setEstadisticas(data);
    } catch (error) {
      console.error('Error loading estadisticas:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      const resueltoParam =
        resueltoFilter === 'ALL' ? null : resueltoFilter === 'true';

      const result = await crashReportService.getAll({
        page,
        pageSize: PAGE_SIZE,
        severity: severityFilter === 'ALL' ? undefined : severityFilter,
        resuelto: resueltoParam,
        appVersion: appliedSearchVersion || undefined,
      });
      setReports(result.data);
      setTotalCount(result.pagination.totalCount);
      setTotalPages(result.pagination.totalPages);
    } catch (error) {
      console.error('Error loading crash reports:', error);
      toast({
        title: 'Error',
        description: t('loadError'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [page, severityFilter, resueltoFilter, appliedSearchVersion]);

  useEffect(() => {
    loadEstadisticas();
  }, [loadEstadisticas]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    setPage(1);
  }, [severityFilter, resueltoFilter, appliedSearchVersion]);

  // ---- Real-time SignalR events ----

  useEffect(() => {
    if (!isConnected) return;

    const handleCrashCreated = (...args: unknown[]) => {
      const data = args[0] as Record<string, unknown>;
      const severity = (data?.severity ?? data?.Severity) as string;
      toast({
        title: `Nuevo ${severity || 'crash report'}`,
        description:
          ((data?.errorMessage ?? data?.ErrorMessage) as string)?.substring(0, 80) ||
          'Se recibio un nuevo reporte',
      });
      loadReports();
      loadEstadisticas();
    };

    const handleCrashResolved = (...args: unknown[]) => {
      const data = args[0] as Record<string, unknown>;
      const reportId = (data?.id ?? data?.Id) as number;
      setReports(prev => prev.map(r => (r.id === reportId ? { ...r, resuelto: true } : r)));
      loadEstadisticas();
    };

    on('CrashReportCreated', handleCrashCreated);
    on('CrashReportResolved', handleCrashResolved);

    return () => {
      off('CrashReportCreated', handleCrashCreated);
      off('CrashReportResolved', handleCrashResolved);
    };
  }, [isConnected, on, off, loadReports, loadEstadisticas]);

  // ---- Handlers ----

  const handleRowClick = async (report: CrashReportDto) => {
    setSelectedReport(report);
    setDrawerOpen(true);
    setResolverOpen(false);
    setResolverNota('');

    try {
      setDetailLoading(true);
      const detail = await crashReportService.getById(report.id);
      setSelectedReport(detail);
    } catch {
      // Keep the list data if detail fetch fails
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedReport(null);
    setResolverOpen(false);
    setResolverNota('');
  };

  const handleMarcarResuelto = async () => {
    if (!selectedReport) return;
    try {
      setResolverLoading(true);
      await crashReportService.marcarResuelto(selectedReport.id, resolverNota || undefined);
      toast.success(t('crashResolved'));
      setResolverOpen(false);
      setResolverNota('');
      loadReports();
      loadEstadisticas();
      setSelectedReport(prev =>
        prev ? { ...prev, resuelto: true, notaResolucion: resolverNota || null } : null
      );
    } catch {
      toast.error(t('crashResolveError'));
    } finally {
      setResolverLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearchVersion(searchVersion);
  };

  const handleClearSearch = () => {
    setSearchVersion('');
    setAppliedSearchVersion('');
  };

  const handleRefresh = () => {
    loadReports();
    loadEstadisticas();
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface-2 rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{t('today')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {statsLoading ? (
                  <span className="inline-block h-8 w-12 bg-gray-200 rounded-md animate-pulse" />
                ) : (
                  estadisticas?.totalHoy ?? 0
                )}
              </p>
            </div>
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-100">
              <CalendarDots size={24} weight="duotone" className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-surface-2 rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{t('unresolved')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {statsLoading ? (
                  <span className="inline-block h-8 w-12 bg-gray-200 rounded-md animate-pulse" />
                ) : (
                  estadisticas?.sinResolver ?? 0
                )}
              </p>
            </div>
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-amber-100">
              <Clock size={24} weight="duotone" className="text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-surface-2 rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{t('crashes')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {statsLoading ? (
                  <span className="inline-block h-8 w-12 bg-gray-200 rounded-md animate-pulse" />
                ) : (
                  estadisticas?.totalCrashes ?? 0
                )}
              </p>
            </div>
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-red-100">
              <ShieldWarning size={24} weight="duotone" className="text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-surface-2 rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{t('errors')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {statsLoading ? (
                  <span className="inline-block h-8 w-12 bg-gray-200 rounded-md animate-pulse" />
                ) : (
                  estadisticas?.totalErrors ?? 0
                )}
              </p>
            </div>
            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-orange-100">
              <Bug size={24} weight="duotone" className="text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters + Refresh */}
      <div className="bg-surface-2 rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="w-full sm:w-48">
            <Select
              value={severityFilter}
              onValueChange={(val: string) => setSeverityFilter(val as SeverityFilter)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Severidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('allSeverities')}</SelectItem>
                <SelectItem value="CRASH">Crash</SelectItem>
                <SelectItem value="ERROR">Error</SelectItem>
                <SelectItem value="WARNING">Warning</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-44">
            <Select value={resueltoFilter} onValueChange={setResueltoFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('allStatuses')}</SelectItem>
                <SelectItem value="false">{t('pending')}</SelectItem>
                <SelectItem value="true">{t('resolved')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('searchByVersion')}
                value={searchVersion}
                onChange={e => setSearchVersion(e.target.value)}
                className="w-full h-10 pl-10 pr-8 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
              {searchVersion && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-gray-100"
                >
                  <X className="h-3 w-3 text-gray-400" />
                </button>
              )}
            </div>
            <Button type="submit" variant="outline" size="sm" className="h-10">
              <Search className="h-4 w-4 text-blue-500" />
            </Button>
          </form>

          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="h-10">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-surface-2 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-surface-1">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Severidad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Error</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Dispositivo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Version</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Estado</th>
              </tr>
            </thead>
            <tbody className="bg-surface-2 divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><div className="h-4 w-32 bg-gray-100 rounded-md animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-48 bg-gray-100 rounded-md animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-28 bg-gray-100 rounded-md animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-16 bg-gray-100 rounded-md animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-5 w-20 bg-gray-100 rounded-full animate-pulse" /></td>
                  </tr>
                ))
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Bug size={48} weight="duotone" className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 text-sm">No se encontraron crash reports</p>
                    <p className="text-gray-400 text-xs mt-1">Ajusta los filtros o espera a que se reporten errores</p>
                  </td>
                </tr>
              ) : (
                reports.map(report => (
                  <tr
                    key={report.id}
                    onClick={() => handleRowClick(report)}
                    className="hover:bg-surface-1 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(report.creadoEn)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getSeverityBadge(report.severity)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 font-medium max-w-xs truncate">
                        {truncateText(report.errorMessage, 60)}
                      </div>
                      {report.componentName && (
                        <div className="text-xs text-gray-400 mt-0.5">en {report.componentName}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {report.deviceName || report.deviceId || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {report.appVersion || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getEstadoBadge(report.resuelto)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalCount > 0 && (
          <div className="border-t border-gray-200 px-4">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              hasNextPage={page < totalPages}
              hasPreviousPage={page > 1}
              totalCount={totalCount}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              onNextPage={() => setPage(p => Math.min(p + 1, totalPages))}
              onPreviousPage={() => setPage(p => Math.max(p - 1, 1))}
            />
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-surface-2 rounded-xl border border-gray-200 p-4 shadow-sm animate-pulse">
              <div className="flex justify-between mb-3">
                <div className="h-5 w-16 bg-gray-100 rounded-full" />
                <div className="h-5 w-20 bg-gray-100 rounded-full" />
              </div>
              <div className="h-4 w-full bg-gray-100 rounded-md mb-2" />
              <div className="h-4 w-2/3 bg-gray-100 rounded-md" />
            </div>
          ))
        ) : reports.length === 0 ? (
          <div className="bg-surface-2 rounded-xl border border-gray-200 p-8 text-center shadow-sm">
            <Bug size={48} weight="duotone" className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">No se encontraron crash reports</p>
          </div>
        ) : (
          reports.map(report => (
            <div
              key={report.id}
              onClick={() => handleRowClick(report)}
              className="bg-surface-2 rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                {getSeverityBadge(report.severity)}
                {getEstadoBadge(report.resuelto)}
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                {report.errorMessage}
              </p>
              {report.componentName && (
                <p className="text-xs text-gray-400 mb-2">en {report.componentName}</p>
              )}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <DeviceMobile size={12} />
                  {report.deviceName || report.deviceId || '-'}
                </span>
                <span>{formatDate(report.creadoEn)}</span>
              </div>
              {report.appVersion && (
                <div className="text-xs text-gray-400 mt-1">v{report.appVersion}</div>
              )}
            </div>
          ))
        )}

        {totalCount > 0 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            hasNextPage={page < totalPages}
            hasPreviousPage={page > 1}
            totalCount={totalCount}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            onNextPage={() => setPage(p => Math.min(p + 1, totalPages))}
            onPreviousPage={() => setPage(p => Math.max(p - 1, 1))}
          />
        )}
      </div>

      {/* Detail Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
        title="Detalle del Crash Report"
        icon={<Bug size={22} weight="duotone" className="text-red-500" />}
        width="lg"
        footer={
          selectedReport && !selectedReport.resuelto ? (
            <div className="flex justify-end">
              {resolverOpen ? (
                <div className="flex flex-col w-full gap-3">
                  <label className="text-sm font-medium text-gray-700">
                    Nota de resolucion (opcional)
                  </label>
                  <textarea
                    value={resolverNota}
                    onChange={e => setResolverNota(e.target.value)}
                    placeholder="Describe como se resolvio el problema..."
                    className="w-full h-24 rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setResolverOpen(false);
                        setResolverNota('');
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleMarcarResuelto}
                      disabled={resolverLoading}
                      className="bg-success hover:bg-success/90 text-white"
                    >
                      {resolverLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <CheckCircle size={16} weight="fill" className="mr-1" />
                      )}
                      Confirmar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => setResolverOpen(true)}
                  className="bg-success hover:bg-success/90 text-white"
                >
                  <CheckCircle size={16} weight="fill" className="mr-2" />
                  Marcar como resuelto
                </Button>
              )}
            </div>
          ) : selectedReport?.resuelto ? (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-4 py-3">
              <CheckCircle size={18} weight="fill" className="text-green-600" />
              <div>
                <span className="font-medium">Resuelto</span>
                {selectedReport.resueltoPorNombre && (
                  <span className="text-green-600 ml-1">
                    por {selectedReport.resueltoPorNombre}
                  </span>
                )}
              </div>
            </div>
          ) : undefined
        }
      >
        {detailLoading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <div className="h-3 w-20 bg-gray-200 rounded-md animate-pulse mb-2" />
                <div className="h-5 w-full bg-gray-100 rounded-md animate-pulse" />
              </div>
            ))}
          </div>
        ) : selectedReport ? (
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-3">
              {getSeverityBadge(selectedReport.severity)}
              {getEstadoBadge(selectedReport.resuelto)}
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                <Warning size={14} className="text-orange-500" />
                Mensaje de error
              </h3>
              <p className="text-sm text-gray-900 bg-red-50 rounded-lg p-3 border border-red-100">
                {selectedReport.errorMessage}
              </p>
            </div>

            {selectedReport.componentName && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                  <Code size={14} className="text-purple-500" />
                  Componente
                </h3>
                <p className="text-sm text-gray-900 font-mono bg-purple-50 rounded-lg px-3 py-2 border border-purple-100">
                  {selectedReport.componentName}
                </p>
              </div>
            )}

            {selectedReport.stackTrace && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                  <Code size={14} className="text-indigo-500" />
                  Stack Trace
                </h3>
                <pre className="text-xs text-gray-800 bg-gray-900 text-green-400 rounded-lg p-4 overflow-x-auto max-h-64 overflow-y-auto font-mono whitespace-pre-wrap break-all border border-gray-700">
                  {selectedReport.stackTrace}
                </pre>
              </div>
            )}

            <div>
              <h3 className="text-xs font-semibold text-gray-500 mb-3 flex items-center gap-1.5">
                <DeviceMobile size={14} className="text-cyan-500" />
                Dispositivo
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-1 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-400">Nombre</p>
                  <p className="text-sm text-gray-900 font-medium">{selectedReport.deviceName || '-'}</p>
                </div>
                <div className="bg-surface-1 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-400">Device ID</p>
                  <p className="text-sm text-gray-900 font-mono truncate">{selectedReport.deviceId || '-'}</p>
                </div>
                <div className="bg-surface-1 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-400">Version App</p>
                  <p className="text-sm text-gray-900 font-medium">{selectedReport.appVersion || '-'}</p>
                </div>
                <div className="bg-surface-1 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-400">OS Version</p>
                  <p className="text-sm text-gray-900 font-medium">{selectedReport.osVersion || '-'}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-500 mb-3 flex items-center gap-1.5">
                <User size={14} className="text-emerald-500" />
                Contexto
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-1 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Buildings size={12} />
                    Empresa
                  </p>
                  <p className="text-sm text-gray-900 font-medium">
                    {selectedReport.tenantNombre || `Tenant #${selectedReport.tenantId}`}
                  </p>
                </div>
                <div className="bg-surface-1 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <User size={12} />
                    Usuario
                  </p>
                  <p className="text-sm text-gray-900 font-medium">
                    {selectedReport.userNombre ||
                      (selectedReport.userId ? `User #${selectedReport.userId}` : '-')}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                <CalendarDots size={14} className="text-blue-500" />
                Fecha de reporte
              </h3>
              <p className="text-sm text-gray-900">{formatDate(selectedReport.creadoEn)}</p>
            </div>

            {selectedReport.resuelto && selectedReport.notaResolucion && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-green-500" />
                  Nota de resolucion
                </h3>
                <p className="text-sm text-gray-900 bg-green-50 rounded-lg p-3 border border-green-100">
                  {selectedReport.notaResolucion}
                </p>
              </div>
            )}
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}

// ============ MAIN PAGE ============

export default function CrashReportsPage() {
  const t = useTranslations('admin.crashReports');
  const ta = useTranslations('admin');
  const [activeTab, setActiveTab] = useState<ActiveTab>('cloudwatch');

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-gray-500">
        <span>{ta('breadcrumb')}</span>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900 font-medium">{t('title')}</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bug size={28} weight="duotone" className="text-red-500" />
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {t('subtitle')}
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('cloudwatch')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'cloudwatch'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <CloudArrowUp size={16} weight="duotone" />
              {t('tabCloudWatch')}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('mobile')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'mobile'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <DeviceMobile size={16} weight="duotone" />
              {t('tabMobileCrashes')}
            </span>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'cloudwatch' ? <CloudWatchTab /> : <MobileCrashesTab />}
    </div>
  );
}
