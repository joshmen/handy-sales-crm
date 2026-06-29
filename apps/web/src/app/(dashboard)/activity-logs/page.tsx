'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from '@/hooks/useToast';
import {
  Download,
  FileText,
  ShoppingCart,
  Package,
  Store,
  UserPlus,
  Lock,
  Settings,
  ShieldAlert,
  XCircle,
  Pencil,
  Smartphone,
  Globe,
  type LucideIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchBar } from '@/components/common/SearchBar';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { DateRangeFilter, type DateRangeValue } from '@/components/ui/DateRangeFilter';
import { startOfMonthIso } from '@/components/ui/dateFilterUtils';
import { ListPagination } from '@/components/ui/ListPagination';
import { Drawer } from '@/components/ui/Drawer';
import { useTranslations } from 'next-intl';
import { activityLogService, type ActivityLogDto } from '@/services/api/activityLogs';
import { tenantService } from '@/services/api/tenants';
import { NameAvatar } from '@/components/ui/NameAvatar';
import { useFormatters } from '@/hooks/useFormatters';
import { downloadBlob } from '@/lib/download';
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
  success: 'text-primary',
  failed: 'text-red-600',
  warning: 'text-yellow-600',
  pending: 'text-muted-foreground',
  info: 'text-blue-600',
};

// Cuadro tintado por tono para el ícono de acción (mismo patrón que Reportes/Automatizaciones).
const toneBadge: Record<string, string> = {
  success: 'bg-green-100 text-green-700',
  primary: 'bg-primary/10 text-primary',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-cyan-100 text-cyan-700',
  default: 'bg-surface-3 text-muted-foreground',
};

// Ícono + tono por acción. Destructivas (delete / cancelación / fallo) en rojo.
// El tono primario se deriva de la categoría real (orders/products/clients/...).
function getActionVisual(log: ActivityLogDto): { Icon: LucideIcon; tone: string } {
  const type = (log.activityType || '').toLowerCase();
  const cat = (log.activityCategory || '').toLowerCase();
  const desc = (log.description || '').toLowerCase();

  if (type === 'delete' || type === 'error' || log.activityStatus === 'failed' || /cancel/.test(desc)) {
    return { Icon: XCircle, tone: 'danger' };
  }
  if (type === 'export') return { Icon: Download, tone: 'default' };
  if (type === 'login' || type === 'logout' || cat === 'auth') return { Icon: Lock, tone: 'default' };

  switch (cat) {
    case 'orders': return { Icon: ShoppingCart, tone: 'success' };
    case 'products': return { Icon: Package, tone: 'warning' };
    case 'clients': return { Icon: Store, tone: 'info' };
    case 'users': return { Icon: UserPlus, tone: 'info' };
    case 'security': return { Icon: ShieldAlert, tone: 'warning' };
    case 'system': return { Icon: Settings, tone: 'default' };
    default: return { Icon: Pencil, tone: 'default' };
  }
}

// Móvil (app) vs Web según deviceType (desktop/mobile/tablet/web).
function isMobileOrigin(log: ActivityLogDto): boolean {
  const dt = (log.deviceType || '').toLowerCase();
  return dt === 'mobile' || dt === 'tablet';
}

export default function ActivityLogsPage() {
  const t = useTranslations('activity');
  const tc = useTranslations('common');
  const ta = useTranslations('admin');
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
  const { formatDate, tenantToday } = useFormatters();

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
  const [filterCategory, setFilterCategory] = useState('all');
  const [rango, setRango] = useState<DateRangeValue>(() => {
    const hoy = tenantToday();
    return { mode: 'mes', from: startOfMonthIso(hoy), to: hoy };
  });
  const [filterTenant, setFilterTenant] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<ActivityLogDto | null>(null);
  const pageSize = 10;

  // Load tenants for SuperAdmin filter
  useEffect(() => {
    if (isSuperAdmin) {
      tenantService.getAll()
        .then(setTenants)
        .catch((err) => console.error('[ActivityLogs] failed to load tenants for filter:', err));
    }
  }, [isSuperAdmin]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await activityLogService.getAll({
        page: currentPage,
        pageSize,
        activityCategory: filterCategory !== 'all' ? filterCategory : undefined,
        search: searchTerm || undefined,
        tenantId: isSuperAdmin && filterTenant !== 'all' ? Number(filterTenant) : undefined,
        dateFrom: rango.from,
        dateTo: rango.to,
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
  }, [currentPage, filterCategory, rango, filterTenant, searchTerm, isSuperAdmin]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory, rango, filterTenant, searchTerm]);

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
    downloadBlob(blob, `activity-logs-${new Date().toISOString().split('T')[0]}.csv`);
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

  return (
    <PageHeader
      section="equipo"
      breadcrumbs={[
        { label: ta('breadcrumb') },
        { label: t('title') },
      ]}
      title={t('title')}
      actions={
        <div className="flex items-center gap-3">
          <DateRangeFilter value={rango} onChange={setRango} retentionDays={730} />
          <button
            data-tour="logs-export-btn"
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-foreground border border-border-strong bg-card rounded-full hover:bg-surface-2 transition-colors"
          >
            <Download className="w-4 h-4 text-muted-foreground" />
            <span>{tc('export')}</span>
          </button>
        </div>
      }
    >
          {/* Filters: category chips + search */}
          <div className="space-y-3 mb-6">
            {/* Category chips */}
            <div data-tour="logs-filter-category" className="flex flex-wrap items-center gap-2">
              {[
                { id: 'all', label: t('chipAll') },
                { id: 'orders', label: t('categories.orders') },
                { id: 'clients', label: t('categories.clients') },
                { id: 'products', label: t('categories.products') },
                { id: 'users', label: t('categories.users') },
                { id: 'auth', label: t('categories.auth') },
                { id: 'system', label: t('categories.system') },
                { id: 'security', label: t('categories.security') },
              ].map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => setFilterCategory(chip.id)}
                  className={`px-3 py-1.5 text-[13px] font-medium rounded-lg border transition-colors ${
                    filterCategory === chip.id
                      ? 'bg-primary text-primary-foreground border-transparent'
                      : 'bg-card text-foreground/70 border-border hover:bg-surface-1'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Search + company (SuperAdmin) */}
            <div className="flex flex-wrap items-center gap-3">
              <SearchBar
                dataTour="logs-search"
                value={searchTerm}
                onChange={(v) => setSearchTerm(v)}
                placeholder={t('searchPlaceholder')}
                className="w-[280px]"
              />

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
          </div>
            {/* Table */}
            <div data-tour="logs-table" className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              {loading ? (
                // Skeleton rows alineadas a las columnas reales — mismo patrón que
                // DataGrid (clients/products/orders) para consistencia entre catálogos.
                <>
                  {/* Header placeholder (mismo header que se muestra cargado) */}
                  <div className="hidden md:flex items-center bg-surface-1 px-4 h-10 border-b border-border-subtle">
                    <div className="w-[180px] text-xs font-semibold text-foreground/70">{t('columns.user')}</div>
                    {isSuperAdmin && (
                      <div className="w-[140px] text-xs font-semibold text-foreground/70">{t('columns.company')}</div>
                    )}
                    <div className="w-[180px] text-xs font-semibold text-foreground/70">{t('columns.action')}</div>
                    <div className="flex-1 text-xs font-semibold text-foreground/70">{t('columns.description')}</div>
                    <div className="w-[170px] text-xs font-semibold text-foreground/70">{t('columns.origin')}</div>
                    <div className="w-[140px] text-xs font-semibold text-foreground/70">{t('columns.dateTime')}</div>
                  </div>
                  <div role="status" aria-label={t('loadingRecords')}>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className="hidden md:flex items-center px-4 py-3 border-b border-border-subtle animate-pulse"
                        style={{ animationDelay: `${i * 75}ms` }}
                      >
                        <div className="w-[180px] flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-surface-3 shrink-0" />
                          <div className="h-4 bg-surface-3 rounded w-3/4" />
                        </div>
                        {isSuperAdmin && (
                          <div className="w-[140px]"><div className="h-4 bg-surface-3 rounded w-3/4" /></div>
                        )}
                        <div className="w-[180px] flex items-center gap-2.5">
                          <div className="w-[26px] h-[26px] rounded-lg bg-surface-3 shrink-0" />
                          <div className="h-4 bg-surface-3 rounded w-16" />
                        </div>
                        <div className="flex-1 pr-4"><div className="h-4 bg-surface-3 rounded w-3/4" /></div>
                        <div className="w-[170px]"><div className="h-4 bg-surface-3 rounded w-3/4" /></div>
                        <div className="w-[140px]"><div className="h-4 bg-surface-3 rounded w-3/4" /></div>
                      </div>
                    ))}
                    {/* Mobile skeleton — más simple */}
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={`m-${i}`}
                        className="md:hidden p-4 border-b border-border-subtle animate-pulse space-y-2"
                        style={{ animationDelay: `${i * 75}ms` }}
                      >
                        <div className="h-4 bg-surface-3 rounded w-2/3" />
                        <div className="h-3 bg-surface-3 rounded w-1/2" />
                        <div className="h-3 bg-surface-3 rounded w-3/4" />
                      </div>
                    ))}
                  </div>
                </>
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
                      <div className="w-[180px] text-xs font-semibold text-foreground/70">{t('columns.user')}</div>
                      {isSuperAdmin && (
                        <div className="w-[140px] text-xs font-semibold text-foreground/70">{t('columns.company')}</div>
                      )}
                      <div className="w-[180px] text-xs font-semibold text-foreground/70">{t('columns.action')}</div>
                      <div className="flex-1 text-xs font-semibold text-foreground/70">{t('columns.description')}</div>
                      <div className="w-[170px] text-xs font-semibold text-foreground/70">{t('columns.origin')}</div>
                      <div className="w-[140px] text-xs font-semibold text-foreground/70">{t('columns.dateTime')}</div>
                    </div>

                    {/* Table Rows */}
                    {logs.map((log) => {
                      const { Icon, tone } = getActionVisual(log);
                      const isMobile = isMobileOrigin(log);
                      const isDanger = tone === 'danger';
                      return (
                      <div
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        title={t('detail.viewDetail')}
                        className="flex items-center px-4 py-3 border-b border-border-subtle hover:bg-surface-1 transition-colors cursor-pointer"
                      >
                        <div className="w-[180px] flex items-center gap-2">
                          <NameAvatar name={log.userName} size={28} />
                          <span className="text-[13px] text-foreground truncate">{log.userName}</span>
                        </div>

                        {isSuperAdmin && (
                          <div className="w-[140px] text-[13px] text-foreground/70 truncate">
                            {log.tenantName || '-'}
                          </div>
                        )}

                        <div className="w-[180px] flex items-center gap-2.5">
                          <span className={`w-[26px] h-[26px] rounded-lg flex items-center justify-center shrink-0 ${toneBadge[tone]}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </span>
                          <span className={`text-[13px] font-medium truncate ${isDanger ? 'text-red-600' : 'text-foreground'}`}>
                            {actionLabels[log.activityType] || log.activityType}
                          </span>
                        </div>

                        <div className="flex-1 text-[13px] text-foreground/80 truncate pr-4">
                          {log.description || '-'}
                        </div>

                        <div className="w-[170px] flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                          {isMobile ? <Smartphone className="w-3.5 h-3.5 shrink-0" /> : <Globe className="w-3.5 h-3.5 shrink-0" />}
                          <span className="truncate">
                            {isMobile ? t('mobileApp') : (log.ipAddress ? `${t('webOrigin')} · ${log.ipAddress}` : t('webOrigin'))}
                          </span>
                        </div>

                        <div className="w-[140px] text-[13px] text-muted-foreground">
                          {formatDateTime(log.createdAt)}
                        </div>
                      </div>
                      );
                    })}
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-2 p-3">
                    {logs.map((log) => {
                      const { Icon, tone } = getActionVisual(log);
                      const isMobile = isMobileOrigin(log);
                      const isDanger = tone === 'danger';
                      return (
                      <div key={log.id} onClick={() => setSelectedLog(log)} className="border border-border-subtle rounded-lg p-3 space-y-2 cursor-pointer active:bg-surface-1/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <NameAvatar name={log.userName} size={28} />
                            <span className="text-[13px] font-medium text-foreground">{log.userName}</span>
                          </div>
                          <span className={`w-[26px] h-[26px] rounded-lg flex items-center justify-center shrink-0 ${toneBadge[tone]}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </span>
                        </div>
                        <p className={`text-[13px] font-medium ${isDanger ? 'text-red-600' : 'text-foreground'}`}>
                          {actionLabels[log.activityType] || log.activityType}
                        </p>
                        <p className="text-[13px] text-foreground/80">{log.description || '-'}</p>
                        <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            {isMobile ? <Smartphone className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                            {isMobile ? t('mobileApp') : t('webOrigin')}
                          </span>
                          <span>{formatDateTime(log.createdAt)}</span>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div className="pt-4">
                <ListPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalCount}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}

      {/* Detalle de auditoría (solo lectura, inmutable) */}
      <Drawer
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={t('detail.title')}
        width="md"
        footer={
          <div className="flex justify-end">
            <button
              onClick={() => setSelectedLog(null)}
              className="px-4 py-2 text-sm font-medium text-foreground/80 border border-border-default rounded-md hover:bg-surface-1 transition-colors"
            >
              {tc('close')}
            </button>
          </div>
        }
      >
        {selectedLog && (
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 text-[11px] font-medium rounded ${actionColors[selectedLog.activityType] || 'bg-surface-3 text-foreground/80'}`}>
                {actionLabels[selectedLog.activityType] || selectedLog.activityType}
              </span>
              <span className={`text-[12px] font-medium ${statusColors[selectedLog.activityStatus] || 'text-muted-foreground'}`}>
                {selectedLog.activityStatus}
              </span>
            </div>

            {selectedLog.description && <p className="text-sm text-foreground/80">{selectedLog.description}</p>}

            <div>
              <DetailRow label={t('columns.user')} value={selectedLog.userName} />
              {isSuperAdmin && <DetailRow label={t('columns.company')} value={selectedLog.tenantName || '—'} />}
              <DetailRow
                label={t('detail.affectedObject')}
                value={selectedLog.entityType
                  ? `${selectedLog.entityType}${selectedLog.entityName ? ` · ${selectedLog.entityName}` : ''}${selectedLog.entityId ? ` (#${selectedLog.entityId})` : ''}`
                  : '—'}
              />
              <DetailRow label={t('columns.category')} value={categoryLabels[selectedLog.activityCategory] || selectedLog.activityCategory} />
              <DetailRow label={t('columns.dateTime')} value={formatDateTime(selectedLog.createdAt)} />
            </div>

            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-1">{t('detail.origin')}</h4>
              <DetailRow label={t('detail.device')} value={selectedLog.deviceType || '—'} />
              <DetailRow label={t('detail.browser')} value={selectedLog.browser || '—'} />
              <DetailRow label={t('detail.os')} value={selectedLog.operatingSystem || '—'} />
              <DetailRow label={t('columns.ip')} value={selectedLog.ipAddress || '—'} mono />
              <DetailRow label={t('detail.location')} value={[selectedLog.city, selectedLog.countryName].filter(Boolean).join(', ') || '—'} />
            </div>

            <p className="text-[11px] text-muted-foreground italic">{t('detail.immutableNote')}</p>
          </div>
        )}
      </Drawer>
    </PageHeader>
  );
}

function DetailRow({ label, value, mono }: { label: string; value?: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border-subtle last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className={`text-[13px] text-foreground text-right break-words ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</span>
    </div>
  );
}
