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
  Loader2,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useTranslations } from 'next-intl';
import { activityLogService, type ActivityLogDto } from '@/services/api/activityLogs';
import { tenantService } from '@/services/api/tenants';
import { getInitials } from '@/lib/utils';
import { useFormatters } from '@/hooks/useFormatters';
import type { Tenant } from '@/types/tenant';

// Action labels resolved via useTranslations at render time

const actionColors: Record<string, string> = {
  create: 'bg-green-100 text-green-700',
  update: 'bg-yellow-100 text-yellow-700',
  delete: 'bg-red-100 text-red-700',
  login: 'bg-blue-100 text-blue-700',
  logout: 'bg-surface-3 text-foreground/80',
  view: 'bg-indigo-100 text-indigo-700',
  export: 'bg-emerald-100 text-emerald-700',
  error: 'bg-red-100 text-red-700',
};

// Category labels resolved via useTranslations at render time

const statusColors: Record<string, string> = {
  success: 'text-green-600',
  failed: 'text-red-600',
  warning: 'text-yellow-600',
  pending: 'text-muted-foreground',
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
  const t = useTranslations('activity');
  const tc = useTranslations('common');
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
  const { formatDate, formatNumber } = useFormatters();

  const actionLabels: Record<string, string> = {
    create: t('actions.create'),
    update: t('actions.update'),
    delete: t('actions.delete'),
    login: t('actions.login'),
    logout: t('actions.logout'),
    view: t('actions.view'),
    export: t('actions.export'),
    error: t('actions.error'),
  };

  const categoryLabels: Record<string, string> = {
    auth: t('categories.auth'),
    users: t('categories.users'),
    products: t('categories.products'),
    orders: t('categories.orders'),
    clients: t('categories.clients'),
    system: t('categories.system'),
    security: t('categories.security'),
  };
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
      toast.error(t('errorLoading'));
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
      toast.error(t('noDataExport'));
      return;
    }
    const headers = [t('columns.dateTime'), t('columns.user'), t('columns.action'), t('columns.category'), t('columns.status'), t('columns.description'), t('columns.ip')];
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
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t('exported'));
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
    <PageHeader
      breadcrumbs={[
        { label: tc('home'), href: '/dashboard' },
        { label: t('title') },
      ]}
      title={t('title')}
      actions={
        <button
          data-tour="logs-export-btn"
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-foreground/80 border border-border-subtle rounded-md hover:bg-surface-1 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>{tc('export')}</span>
        </button>
      }
    >
          {/* Filter Row */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                data-tour="logs-search"
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-[280px] pl-10 pr-3 py-2.5 text-sm border border-border-subtle rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Action Filter */}
            <div data-tour="logs-filter-action" className="min-w-[170px]">
              <SearchableSelect
                options={[
                  { value: 'all', label: t('allActions') },
                  ...Object.entries(actionLabels).map(([k, v]) => ({ value: k, label: v })),
                ]}
                value={filterAction}
                onChange={(val) => setFilterAction(val ? String(val) : 'all')}
                placeholder={t('allActions')}
              />
            </div>

            {/* Category Filter */}
            <div className="min-w-[170px]">
              <SearchableSelect
                options={[
                  { value: 'all', label: t('allCategories') },
                  ...Object.entries(categoryLabels).map(([k, v]) => ({ value: k, label: v })),
                ]}
                value={filterCategory}
                onChange={(val) => setFilterCategory(val ? String(val) : 'all')}
                placeholder={t('allCategories')}
              />
            </div>

            {/* Date Filter */}
            <div className="min-w-[170px]">
              <SearchableSelect
                options={[
                  { value: 'today', label: t('today') },
                  { value: '7days', label: t('last7Days') },
                  { value: '30days', label: t('last30Days') },
                  { value: 'all', label: t('allTime') },
                ]}
                value={filterDate}
                onChange={(val) => setFilterDate(val ? String(val) : '7days')}
                placeholder={t('last7Days')}
              />
            </div>

            {/* Tenant Filter (SuperAdmin only) */}
            {isSuperAdmin && (
              <div className="min-w-[200px]">
                <SearchableSelect
                  options={[
                    { value: 'all', label: t('allCompanies') },
                    ...tenants.map((t) => ({ value: String(t.id), label: t.nombreEmpresa })),
                  ]}
                  value={filterTenant}
                  onChange={(val) => setFilterTenant(val ? String(val) : 'all')}
                  placeholder={t('allCompanies')}
                />
              </div>
            )}
          </div>
            {/* Table */}
            <div data-tour="logs-table" className="bg-card border border-border rounded-lg overflow-hidden">
              {loading ? (
                <div role="status" className="flex items-center justify-center h-64 gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-green-600" aria-hidden="true" />
                  <span className="text-sm text-muted-foreground">{t('loadingRecords')}</span>
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 py-20">
                  <FileText className="w-10 h-10 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground/80 mb-2">{t('noRecords')}</h3>
                  <p className="text-sm text-muted-foreground text-center">
                    {t('noRecordsDesc')}
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block">
                    {/* Table Header */}
                    <div className="flex items-center bg-surface-1 px-4 h-10 border-b border-border-subtle">
                      <div className="w-[160px] text-xs font-semibold text-foreground/70">{t('columns.user')}</div>
                      {isSuperAdmin && (
                        <div className="w-[140px] text-xs font-semibold text-foreground/70">{t('columns.company')}</div>
                      )}
                      <div className="w-[100px] text-xs font-semibold text-foreground/70">{t('columns.action')}</div>
                      <div className="w-[110px] text-xs font-semibold text-foreground/70">{t('columns.category')}</div>
                      <div className="w-[80px] text-xs font-semibold text-foreground/70">{t('columns.status')}</div>
                      <div className="flex-1 text-xs font-semibold text-foreground/70">{t('columns.description')}</div>
                      <div className="w-[140px] text-xs font-semibold text-foreground/70">{t('columns.dateTime')}</div>
                      <div className="w-[120px] text-xs font-semibold text-foreground/70">{t('columns.ip')}</div>
                    </div>

                    {/* Table Rows */}
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center px-4 py-3 border-b border-border-subtle hover:bg-surface-1 transition-colors"
                      >
                        <div className="w-[160px] flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full ${getUserColor(log.userId)} flex items-center justify-center text-[10px] font-medium shrink-0`}>
                            {getInitials(log.userName)}
                          </div>
                          <span className="text-[13px] text-foreground truncate">{log.userName}</span>
                        </div>

                        {isSuperAdmin && (
                          <div className="w-[140px] text-[13px] text-foreground/70 truncate">
                            {log.tenantName || '-'}
                          </div>
                        )}

                        <div className="w-[100px]">
                          <span className={`px-2 py-0.5 text-[11px] font-medium rounded ${actionColors[log.activityType] || 'bg-surface-3 text-foreground/80'}`}>
                            {actionLabels[log.activityType] || log.activityType}
                          </span>
                        </div>

                        <div className="w-[110px] text-[13px] text-foreground/80">
                          {categoryLabels[log.activityCategory] || log.activityCategory}
                        </div>

                        <div className="w-[80px]">
                          <span className={`text-[12px] font-medium ${statusColors[log.activityStatus] || 'text-muted-foreground'}`}>
                            {log.activityStatus}
                          </span>
                        </div>

                        <div className="flex-1 text-[13px] text-foreground/80 truncate pr-4">
                          {log.description || '-'}
                        </div>

                        <div className="w-[140px] text-[13px] text-muted-foreground">
                          {formatDateTime(log.createdAt)}
                        </div>

                        <div className="w-[120px] text-[13px] text-muted-foreground font-mono">
                          {log.ipAddress || '-'}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-2 p-3">
                    {logs.map((log) => (
                      <div key={log.id} className="border border-border-subtle rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full ${getUserColor(log.userId)} flex items-center justify-center text-[10px] font-medium`}>
                              {getInitials(log.userName)}
                            </div>
                            <span className="text-[13px] font-medium text-foreground">{log.userName}</span>
                          </div>
                          <span className={`px-2 py-0.5 text-[11px] font-medium rounded ${actionColors[log.activityType] || 'bg-surface-3 text-foreground/80'}`}>
                            {actionLabels[log.activityType] || log.activityType}
                          </span>
                        </div>
                        <p className="text-[13px] text-foreground/80">{log.description || '-'}</p>
                        <div className="flex items-center justify-between text-[12px] text-muted-foreground">
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
                <span className="text-sm text-muted-foreground">
                  {t('showingRange', { start: startItem, end: endItem, total: formatNumber(totalCount) })}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-foreground/70 border border-border-subtle rounded-md hover:bg-surface-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"

                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>{tc('previous')}</span>
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
                            ? 'bg-success text-success-foreground'
                            : 'text-foreground/70 hover:bg-surface-3'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-foreground/70 border border-border-subtle rounded-md hover:bg-surface-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"

                  >
                    <span>{tc('next')}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
    </PageHeader>
  );
}
