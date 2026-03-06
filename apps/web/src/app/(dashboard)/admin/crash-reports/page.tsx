'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ChevronRight,
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
} from '@phosphor-icons/react';
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
import { useFormatters } from '@/hooks/useFormatters';
import { formatDate as libFmtDate } from '@/lib/formatters';

const PAGE_SIZE = 20;

type SeverityFilter = 'ALL' | 'CRASH' | 'ERROR' | 'WARNING';

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
      return (
        <Badge variant="secondary">{severity}</Badge>
      );
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

export default function CrashReportsPage() {
  const { formatCurrency } = useFormatters();
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
        resueltoFilter === 'ALL'
          ? null
          : resueltoFilter === 'true';

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
        description: 'No se pudieron cargar los crash reports',
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

  // Reset page when filters change
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
        description: ((data?.errorMessage ?? data?.ErrorMessage) as string)?.substring(0, 80) || 'Se recibio un nuevo reporte',
      });
      // Refresh both list and stats
      loadReports();
      loadEstadisticas();
    };

    const handleCrashResolved = (...args: unknown[]) => {
      const data = args[0] as Record<string, unknown>;
      const reportId = (data?.id ?? data?.Id) as number;
      // Update the report in the current list without full reload
      setReports(prev =>
        prev.map(r => r.id === reportId ? { ...r, resuelto: true } : r)
      );
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

    // Load fresh detail
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
      toast.success('Crash report marcado como resuelto');
      setResolverOpen(false);
      setResolverNota('');
      // Refresh data
      loadReports();
      loadEstadisticas();
      // Update drawer state
      setSelectedReport(prev => prev ? { ...prev, resuelto: true, notaResolucion: resolverNota || null } : null);
    } catch {
      toast.error('No se pudo marcar como resuelto');
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

  // ---- Render: Loading skeleton ----

  if (loading && reports.length === 0) {
    return (
      <div className="space-y-6">
        {/* Breadcrumb Skeleton */}
        <div className="h-6 w-64 bg-gray-200 rounded-md animate-pulse" />

        {/* Header Skeleton */}
        <div>
          <div className="h-8 w-48 bg-gray-200 rounded-md animate-pulse mb-2" />
          <div className="h-5 w-96 bg-gray-200 rounded-md animate-pulse" />
        </div>

        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 w-24 bg-gray-200 rounded-md animate-pulse mb-3" />
                  <div className="h-8 w-20 bg-gray-200 rounded-md animate-pulse" />
                </div>
                <div className="h-12 w-12 rounded-lg bg-gray-100 animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* Table Skeleton */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <div className="h-10 w-full bg-gray-100 rounded-md animate-pulse" />
          </div>
          <div className="divide-y divide-gray-100">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="p-4">
                <div className="h-5 w-full bg-gray-100 rounded-md animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-gray-500">
        <span>Administracion</span>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900 font-medium">Crash Reports</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bug size={28} weight="duotone" className="text-red-500" />
            Crash Reports
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Errores reportados desde la app movil
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Hoy */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Hoy</p>
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

        {/* Sin resolver */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Sin resolver</p>
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

        {/* Crashes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Crashes</p>
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

        {/* Errors */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Errors</p>
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

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Severity filter */}
          <div className="w-full sm:w-48">
            <Select
              value={severityFilter}
              onValueChange={(val: string) => setSeverityFilter(val as SeverityFilter)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Severidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas las severidades</SelectItem>
                <SelectItem value="CRASH">Crash</SelectItem>
                <SelectItem value="ERROR">Error</SelectItem>
                <SelectItem value="WARNING">Warning</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Resuelto filter */}
          <div className="w-full sm:w-44">
            <Select
              value={resueltoFilter}
              onValueChange={setResueltoFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los estados</SelectItem>
                <SelectItem value="false">Pendientes</SelectItem>
                <SelectItem value="true">Resueltos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search by version */}
          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por version de app..."
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
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Severidad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Error
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dispositivo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Version
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4">
                      <div className="h-4 w-32 bg-gray-100 rounded-md animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-48 bg-gray-100 rounded-md animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-28 bg-gray-100 rounded-md animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-16 bg-gray-100 rounded-md animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-5 w-20 bg-gray-100 rounded-full animate-pulse" />
                    </td>
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
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
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
                        <div className="text-xs text-gray-400 mt-0.5">
                          en {report.componentName}
                        </div>
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

        {/* Pagination */}
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
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm animate-pulse">
              <div className="flex justify-between mb-3">
                <div className="h-5 w-16 bg-gray-100 rounded-full" />
                <div className="h-5 w-20 bg-gray-100 rounded-full" />
              </div>
              <div className="h-4 w-full bg-gray-100 rounded-md mb-2" />
              <div className="h-4 w-2/3 bg-gray-100 rounded-md" />
            </div>
          ))
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
            <Bug size={48} weight="duotone" className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">No se encontraron crash reports</p>
          </div>
        ) : (
          reports.map(report => (
            <div
              key={report.id}
              onClick={() => handleRowClick(report)}
              className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                {getSeverityBadge(report.severity)}
                {getEstadoBadge(report.resuelto)}
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                {report.errorMessage}
              </p>
              {report.componentName && (
                <p className="text-xs text-gray-400 mb-2">
                  en {report.componentName}
                </p>
              )}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <DeviceMobile size={12} />
                  {report.deviceName || report.deviceId || '-'}
                </span>
                <span>{formatDate(report.creadoEn)}</span>
              </div>
              {report.appVersion && (
                <div className="text-xs text-gray-400 mt-1">
                  v{report.appVersion}
                </div>
              )}
            </div>
          ))
        )}

        {/* Mobile Pagination */}
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
                      className="bg-green-600 hover:bg-green-700 text-white"
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
                  className="bg-green-600 hover:bg-green-700 text-white"
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
            {/* Status & Severity */}
            <div className="flex items-center gap-3">
              {getSeverityBadge(selectedReport.severity)}
              {getEstadoBadge(selectedReport.resuelto)}
            </div>

            {/* Error Message */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Warning size={14} className="text-orange-500" />
                Mensaje de error
              </h3>
              <p className="text-sm text-gray-900 bg-red-50 rounded-lg p-3 border border-red-100">
                {selectedReport.errorMessage}
              </p>
            </div>

            {/* Component */}
            {selectedReport.componentName && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Code size={14} className="text-purple-500" />
                  Componente
                </h3>
                <p className="text-sm text-gray-900 font-mono bg-purple-50 rounded-lg px-3 py-2 border border-purple-100">
                  {selectedReport.componentName}
                </p>
              </div>
            )}

            {/* Stack Trace */}
            {selectedReport.stackTrace && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Code size={14} className="text-indigo-500" />
                  Stack Trace
                </h3>
                <pre className="text-xs text-gray-800 bg-gray-900 text-green-400 rounded-lg p-4 overflow-x-auto max-h-64 overflow-y-auto font-mono whitespace-pre-wrap break-all border border-gray-700">
                  {selectedReport.stackTrace}
                </pre>
              </div>
            )}

            {/* Device Info */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <DeviceMobile size={14} className="text-cyan-500" />
                Dispositivo
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-400">Nombre</p>
                  <p className="text-sm text-gray-900 font-medium">
                    {selectedReport.deviceName || '-'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-400">Device ID</p>
                  <p className="text-sm text-gray-900 font-mono truncate">
                    {selectedReport.deviceId || '-'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-400">Version App</p>
                  <p className="text-sm text-gray-900 font-medium">
                    {selectedReport.appVersion || '-'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-400">OS Version</p>
                  <p className="text-sm text-gray-900 font-medium">
                    {selectedReport.osVersion || '-'}
                  </p>
                </div>
              </div>
            </div>

            {/* Tenant & User */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <User size={14} className="text-emerald-500" />
                Contexto
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Buildings size={12} />
                    Empresa
                  </p>
                  <p className="text-sm text-gray-900 font-medium">
                    {selectedReport.tenantNombre || `Tenant #${selectedReport.tenantId}`}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <User size={12} />
                    Usuario
                  </p>
                  <p className="text-sm text-gray-900 font-medium">
                    {selectedReport.userNombre || (selectedReport.userId ? `User #${selectedReport.userId}` : '-')}
                  </p>
                </div>
              </div>
            </div>

            {/* Timestamp */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CalendarDots size={14} className="text-blue-500" />
                Fecha de reporte
              </h3>
              <p className="text-sm text-gray-900">
                {formatDate(selectedReport.creadoEn)}
              </p>
            </div>

            {/* Resolution note */}
            {selectedReport.resuelto && selectedReport.notaResolucion && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
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
