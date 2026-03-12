'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from '@/hooks/useToast';
import {
  Download,
  ChevronLeft,
  ChevronRight,
  Search,
  FileText,
} from 'lucide-react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { activityLogService, type ActivityLogDto } from '@/services/api/activityLogs';
import { tenantService } from '@/services/api/tenants';
import { getInitials } from '@/lib/utils';
import { useFormatters } from '@/hooks/useFormatters';
import type { Tenant } from '@/types/tenant';

const actionLabels: Record<string, string> = {
  create: 'Crear',
  update: 'Actualizar',
  delete: 'Eliminar',
  login: 'Login',
  logout: 'Logout',
  view: 'Ver',
  export: 'Exportar',
  error: 'Error',
};

const actionColors: Record<string, string> = {
  create: 'bg-green-100 text-green-700',
  update: 'bg-yellow-100 text-yellow-700',
  delete: 'bg-red-100 text-red-700',
  login: 'bg-blue-100 text-blue-700',
  logout: 'bg-gray-100 text-gray-700',
  view: 'bg-indigo-100 text-indigo-700',
  export: 'bg-emerald-100 text-emerald-700',
  error: 'bg-red-100 text-red-700',
};

const categoryLabels: Record<string, string> = {
  auth: 'Autenticación',
  users: 'Usuarios',
  products: 'Productos',
  orders: 'Pedidos',
  clients: 'Clientes',
  system: 'Sistema',
  security: 'Seguridad',
};

const statusColors: Record<string, string> = {
  success: 'text-green-600',
  failed: 'text-red-600',
  warning: 'text-yellow-600',
  pending: 'text-gray-500',
  info: 'text-blue-600',
};

const userColorPool = [
  'bg-blue-100 text-blue-600',
  'bg-red-100 text-red-600',
  'bg-indigo-100 text-indigo-600',
  'bg-green-100 text-green-600',
  'bg-amber-100 text-amber-600',
  'bg-purple-100 text-purple-600',
  'bg-pink-100 text-pink-600',
  'bg-cyan-100 text-cyan-600',
];

function getUserColor(userId: number): string {
  return userColorPool[userId % userColorPool.length];
}

function getDateRange(filter: string): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  if (filter === 'today') {
    const today = now.toISOString().split('T')[0];
    return { dateFrom: today, dateTo: today };
  }
  if (filter === '7days') {
    const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { dateFrom: from.toISOString().split('T')[0] };
  }
  if (filter === '30days') {
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { dateFrom: from.toISOString().split('T')[0] };
  }
  return {};
}

export default function ActivityLogsPage() {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
  const { formatDate, formatNumber } = useFormatters();
  const [logs, setLogs] = useState<ActivityLogDto[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDate, setFilterDate] = useState('7days');
  const [filterTenant, setFilterTenant] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Load tenants for SuperAdmin filter
  useEffect(() => {
    if (isSuperAdmin) {
      tenantService.getAll().then(setTenants).catch(() => {});
    }
  }, [isSuperAdmin]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const dateRange = getDateRange(filterDate);
      const result = await activityLogService.getAll({
        page: currentPage,
        pageSize,
        activityType: filterAction !== 'all' ? filterAction : undefined,
        activityCategory: filterCategory !== 'all' ? filterCategory : undefined,
        search: searchTerm || undefined,
        tenantId: isSuperAdmin && filterTenant !== 'all' ? Number(filterTenant) : undefined,
        ...dateRange,
      });
      setLogs(result.items);
      setTotalCount(result.totalCount);
      setTotalPages(result.totalPages);
    } catch {
      toast.error('Error al cargar los logs de actividad');
      setLogs([]);
      setTotalCount(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterAction, filterCategory, filterDate, filterTenant, searchTerm, isSuperAdmin]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterAction, filterCategory, filterDate, filterTenant, searchTerm]);

  const handleExport = () => {
    if (logs.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }
    const headers = ['Fecha', 'Usuario', 'Acción', 'Categoría', 'Estado', 'Descripción', 'IP'];
    const rows = logs.map(log => [
      formatDate(log.createdAt),
      log.userName,
      log.activityType,
      log.activityCategory,
      log.activityStatus,
      log.description || '',
      log.ipAddress || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Logs exportados correctamente');
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return formatDate(date, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }) + ' ' + formatDate(date, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const startItem = totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white px-8 py-6 border-b border-gray-200">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[13px] mb-4">
          <span className="text-gray-500">Administración</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900 font-semibold">Logs de Actividad</span>
        </div>

          {/* Title Row */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Logs de Actividad
            </h1>
            <button
              data-tour="logs-export-btn"
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"

            >
              <Download className="w-4 h-4" />
              <span>Exportar CSV</span>
            </button>
          </div>

          {/* Filter Row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                data-tour="logs-search"
                type="text"
                placeholder="Buscar por descripción, IP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-[280px] pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"

              />
            </div>

            {/* Action Filter */}
            <div data-tour="logs-filter-action" className="min-w-[170px]">
              <SearchableSelect
                options={[
                  { value: 'all', label: 'Todas las acciones' },
                  { value: 'create', label: 'Crear' },
                  { value: 'update', label: 'Actualizar' },
                  { value: 'delete', label: 'Eliminar' },
                  { value: 'login', label: 'Login' },
                  { value: 'logout', label: 'Logout' },
                  { value: 'view', label: 'Ver' },
                  { value: 'error', label: 'Error' },
                ]}
                value={filterAction}
                onChange={(val) => setFilterAction(val ? String(val) : 'all')}
                placeholder="Todas las acciones"
              />
            </div>

            {/* Category Filter */}
            <div className="min-w-[170px]">
              <SearchableSelect
                options={[
                  { value: 'all', label: 'Todas las categorías' },
                  { value: 'auth', label: 'Autenticación' },
                  { value: 'users', label: 'Usuarios' },
                  { value: 'products', label: 'Productos' },
                  { value: 'orders', label: 'Pedidos' },
                  { value: 'clients', label: 'Clientes' },
                  { value: 'security', label: 'Seguridad' },
                  { value: 'system', label: 'Sistema' },
                ]}
                value={filterCategory}
                onChange={(val) => setFilterCategory(val ? String(val) : 'all')}
                placeholder="Todas las categorías"
              />
            </div>

            {/* Date Filter */}
            <div className="min-w-[170px]">
              <SearchableSelect
                options={[
                  { value: 'today', label: 'Hoy' },
                  { value: '7days', label: 'Últimos 7 días' },
                  { value: '30days', label: 'Últimos 30 días' },
                  { value: 'all', label: 'Todo el tiempo' },
                ]}
                value={filterDate}
                onChange={(val) => setFilterDate(val ? String(val) : '7days')}
                placeholder="Últimos 7 días"
              />
            </div>

            {/* Tenant Filter (SuperAdmin only) */}
            {isSuperAdmin && (
              <div className="min-w-[200px]">
                <SearchableSelect
                  options={[
                    { value: 'all', label: 'Todas las empresas' },
                    ...tenants.map((t) => ({ value: String(t.id), label: t.nombreEmpresa })),
                  ]}
                  value={filterTenant}
                  onChange={(val) => setFilterTenant(val ? String(val) : 'all')}
                  placeholder="Todas las empresas"
                />
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto">
          <div className="px-8 py-6">
            {/* Table */}
            <div data-tour="logs-table" className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <div className="flex items-center gap-2">
                    <img src="/logo-icon.svg" alt="Handy Suites" className="w-8 h-8" />
                    <span className="text-lg font-semibold text-gray-700">Handy Suites<sup className="text-[8px] font-normal">®</sup></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-[#16A34A]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-sm text-gray-500">Cargando registros...</span>
                  </div>
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 py-20">
                  <FileText className="w-10 h-10 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay registros</h3>
                  <p className="text-sm text-gray-500 text-center">
                    No se encontraron logs de actividad para los filtros seleccionados
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block">
                    {/* Table Header */}
                    <div className="flex items-center bg-gray-50 px-4 h-10 border-b border-gray-200">
                      <div className="w-[160px] text-xs font-semibold text-gray-600">Usuario</div>
                      {isSuperAdmin && (
                        <div className="w-[140px] text-xs font-semibold text-gray-600">Empresa</div>
                      )}
                      <div className="w-[100px] text-xs font-semibold text-gray-600">Acción</div>
                      <div className="w-[110px] text-xs font-semibold text-gray-600">Categoría</div>
                      <div className="w-[80px] text-xs font-semibold text-gray-600">Estado</div>
                      <div className="flex-1 text-xs font-semibold text-gray-600">Descripción</div>
                      <div className="w-[140px] text-xs font-semibold text-gray-600">Fecha/Hora</div>
                      <div className="w-[120px] text-xs font-semibold text-gray-600">IP</div>
                    </div>

                    {/* Table Rows */}
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-[160px] flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full ${getUserColor(log.userId)} flex items-center justify-center text-[10px] font-medium shrink-0`}>
                            {getInitials(log.userName)}
                          </div>
                          <span className="text-[13px] text-gray-900 truncate">{log.userName}</span>
                        </div>

                        {isSuperAdmin && (
                          <div className="w-[140px] text-[13px] text-gray-600 truncate">
                            {log.tenantName || '-'}
                          </div>
                        )}

                        <div className="w-[100px]">
                          <span className={`px-2 py-0.5 text-[11px] font-medium rounded ${actionColors[log.activityType] || 'bg-gray-100 text-gray-700'}`}>
                            {actionLabels[log.activityType] || log.activityType}
                          </span>
                        </div>

                        <div className="w-[110px] text-[13px] text-gray-700">
                          {categoryLabels[log.activityCategory] || log.activityCategory}
                        </div>

                        <div className="w-[80px]">
                          <span className={`text-[12px] font-medium ${statusColors[log.activityStatus] || 'text-gray-500'}`}>
                            {log.activityStatus}
                          </span>
                        </div>

                        <div className="flex-1 text-[13px] text-gray-700 truncate pr-4">
                          {log.description || '-'}
                        </div>

                        <div className="w-[140px] text-[13px] text-gray-500">
                          {formatDateTime(log.createdAt)}
                        </div>

                        <div className="w-[120px] text-[13px] text-gray-500 font-mono">
                          {log.ipAddress || '-'}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-2 p-3">
                    {logs.map((log) => (
                      <div key={log.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full ${getUserColor(log.userId)} flex items-center justify-center text-[10px] font-medium`}>
                              {getInitials(log.userName)}
                            </div>
                            <span className="text-[13px] font-medium text-gray-900">{log.userName}</span>
                          </div>
                          <span className={`px-2 py-0.5 text-[11px] font-medium rounded ${actionColors[log.activityType] || 'bg-gray-100 text-gray-700'}`}>
                            {actionLabels[log.activityType] || log.activityType}
                          </span>
                        </div>
                        <p className="text-[13px] text-gray-700">{log.description || '-'}</p>
                        <div className="flex items-center justify-between text-[12px] text-gray-500">
                          <span>{categoryLabels[log.activityCategory] || log.activityCategory}</span>
                          <span>{formatDateTime(log.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Pagination */}
            {!loading && totalCount > 0 && (
              <div className="flex items-center justify-between pt-4">
                <span className="text-sm text-gray-500">
                  Mostrando {startItem}-{endItem} de {totalCount.toLocaleString()} registros
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"

                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Anterior</span>
                  </button>

                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let page: number;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`min-w-[32px] px-2 py-1 text-sm rounded-md transition-colors ${
                          page === currentPage
                            ? 'bg-green-600 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"

                  >
                    <span>Siguiente</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
