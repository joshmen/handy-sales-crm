'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  ShoppingCart,
  AlertTriangle,
  MapPin,
  Package,
  Info,
  CheckCheck,
  Trash2,
  Check,
} from 'lucide-react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Button } from '@/components/ui/Button';
import { useFormatters } from '@/hooks/useFormatters';
import { notificationService, NotificationDto } from '@/services/api/notificationService';
import { toast } from '@/hooks/useToast';

type NotificationType = 'order' | 'alert' | 'route' | 'inventory' | 'general';

// Type labels are resolved via translations at render time

const typeIcons: Record<string, React.ElementType> = {
  order: ShoppingCart,
  alert: AlertTriangle,
  route: MapPin,
  inventory: Package,
  general: Info,
};

const typeColors: Record<string, { bg: string; icon: string; darkBg: string; darkIcon: string }> = {
  order: { bg: 'bg-blue-100', icon: 'text-blue-600', darkBg: 'dark:bg-blue-900/30', darkIcon: 'dark:text-blue-400' },
  alert: { bg: 'bg-yellow-100', icon: 'text-yellow-600', darkBg: 'dark:bg-yellow-900/30', darkIcon: 'dark:text-yellow-400' },
  route: { bg: 'bg-purple-100', icon: 'text-purple-600', darkBg: 'dark:bg-purple-900/30', darkIcon: 'dark:text-purple-400' },
  inventory: { bg: 'bg-green-100', icon: 'text-green-600', darkBg: 'dark:bg-green-900/30', darkIcon: 'dark:text-green-400' },
  general: { bg: 'bg-surface-3', icon: 'text-foreground/70', darkBg: 'dark:bg-surface-3/50', darkIcon: 'dark:text-muted-foreground' },
};

// Status labels are resolved via translations at render time

const statusColors: Record<string, string> = {
  sent: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  read: 'bg-surface-3 text-muted-foreground dark:bg-surface-3/50 dark:text-muted-foreground',
};

const PAGE_SIZE = 10;

export default function NotificationsPage() {
  const t = useTranslations('notifications');
  const { formatDate } = useFormatters();

  const typeLabels: Record<string, string> = {
    order: t('typeOrders'),
    alert: t('typeAlerts'),
    route: t('typeRoutes'),
    inventory: t('typeInventory'),
    general: t('typeGeneral'),
  };
  const statusLabels: Record<string, string> = {
    sent: t('statusSent'),
    pending: t('statusPending'),
    failed: t('statusFailed'),
    read: t('statusRead'),
  };

  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterUnread, setFilterUnread] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await notificationService.getNotifications({
        tipo: filterType !== 'all' ? filterType : undefined,
        noLeidas: filterUnread === 'unread' ? true : undefined,
        pagina: currentPage,
        tamanoPagina: PAGE_SIZE,
      });

      if (response.success && response.data) {
        setNotifications(response.data.items);
        setTotalItems(response.data.totalItems);
        setTotalPages(response.data.totalPaginas);
        setUnreadCount(response.data.noLeidas);
      } else {
        setNotifications([]);
        setTotalItems(0);
        setTotalPages(0);
      }
    } catch {
      toast({
        title: 'Error',
        description: t('errorLoading'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [filterType, filterUnread, currentPage]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, filterUnread, searchTerm]);

  const handleMarkAsRead = async (id: number) => {
    setActionLoading(id);
    try {
      const response = await notificationService.markAsRead(id);
      if (response.success) {
        setNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, leidoEn: new Date().toISOString(), status: 'read' } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await notificationService.markAllAsRead();
      if (response.success) {
        toast({
          title: t('updated'),
          description: t('markedAsRead', { count: response.data?.marcadas ?? 0 }),
        });
        fetchNotifications();
      }
    } catch {
      toast({
        title: 'Error',
        description: t('errorMarking'),
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: number) => {
    setActionLoading(id);
    try {
      const response = await notificationService.deleteNotification(id);
      if (response.success) {
        toast({ title: t('deleted') });
        fetchNotifications();
      } else {
        toast({
          title: 'Error',
          description: response.error || t('errorDeleting'),
          variant: 'destructive',
        });
      }
    } finally {
      setActionLoading(null);
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return t('agoMinutes', { count: minutes });
    if (hours < 24) return t('agoHours', { count: hours });
    if (days === 1) return t('agoOneDay');
    if (days < 7) return t('agoDays', { count: days });
    return formatDate(date);
  };

  // Client-side search filter (API doesn't support text search)
  const displayedNotifications = searchTerm
    ? notifications.filter(n =>
        n.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.mensaje.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : notifications;

  const startItem = totalItems > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const endItem = Math.min(currentPage * PAGE_SIZE, totalItems);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-surface-2 dark:bg-card px-8 py-6 border-b border-border-subtle dark:border-border-strong">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[13px] mb-4">
          <span className="text-muted-foreground dark:text-muted-foreground">{t('breadcrumbAdmin')}</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <span className="text-foreground dark:text-gray-100 font-semibold">{t('breadcrumbNotifications')}</span>
        </div>

        {/* Title Row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground dark:text-gray-100">
              {t('title')}
            </h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 text-xs font-bold text-white bg-red-500 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              {t('markAllRead')}
            </Button>
          )}
        </div>

        {/* Filter Row */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              data-tour="notifications-search"
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-[280px] pl-10 pr-3 py-2.5 text-sm border border-border-subtle dark:border-gray-600 rounded-md bg-surface-2 dark:bg-card text-foreground dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Type Filter */}
          <div data-tour="notifications-filter-type" className="min-w-[170px]">
            <SearchableSelect
              options={[
                { value: 'all', label: t('allTypes') },
                { value: 'order', label: t('typeOrders') },
                { value: 'alert', label: t('typeAlerts') },
                { value: 'route', label: t('typeRoutes') },
                { value: 'inventory', label: t('typeInventory') },
                { value: 'general', label: t('typeGeneral') },
              ]}
              value={filterType}
              onChange={(val) => setFilterType(val ? String(val) : 'all')}
              placeholder={t('allTypes')}
            />
          </div>

          {/* Read/Unread Filter */}
          <div className="min-w-[170px]">
            <SearchableSelect
              options={[
                { value: 'all', label: t('filterAll') },
                { value: 'unread', label: t('filterUnread') },
              ]}
              value={filterUnread}
              onChange={(val) => setFilterUnread(val ? String(val) : 'all')}
              placeholder={t('filterAll')}
            />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto">
        <div className="px-8 py-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-border-subtle"></div>
            </div>
          ) : displayedNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 py-20">
              <Bell className="w-16 h-16 text-muted-foreground/60 dark:text-foreground/70 mb-4" />
              <h3 className="text-lg font-semibold text-foreground/80 dark:text-muted-foreground/60 mb-2">{t('emptyTitle')}</h3>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground text-center">
                {searchTerm
                  ? t('emptySearchMessage')
                  : t('emptyFilterMessage')}
              </p>
            </div>
          ) : (
            <div data-tour="notifications-list" className="space-y-3">
              {displayedNotifications.map((notification) => {
                const tipo = notification.tipo as NotificationType;
                const IconComponent = typeIcons[tipo] || Info;
                const colors = typeColors[tipo] || typeColors.general;
                const isUnread = !notification.leidoEn;
                const displayStatus = notification.leidoEn ? 'read' : notification.status;

                return (
                  <div
                    key={notification.id}
                    className={`border rounded-lg p-5 hover:shadow-sm transition-shadow cursor-pointer ${
                      isUnread
                        ? 'bg-surface-2 dark:bg-card border-border-subtle dark:border-border-strong'
                        : 'bg-surface-1 dark:bg-surface-3/50 border-border-subtle dark:border-gray-800'
                    }`}
                    onClick={() => isUnread && handleMarkAsRead(notification.id)}
                  >
                    <div className="flex gap-4">
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-lg ${colors.bg} ${colors.darkBg} flex items-center justify-center flex-shrink-0 relative`}>
                        <IconComponent className={`w-5 h-5 ${colors.icon} ${colors.darkIcon}`} />
                        {isUnread && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-gray-800" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <h3 className={`text-[15px] ${isUnread ? 'font-semibold' : 'font-medium'} text-foreground dark:text-gray-100`}>
                            {notification.titulo}
                          </h3>
                          <span className="text-xs text-muted-foreground dark:text-muted-foreground flex-shrink-0">
                            {formatRelativeTime(notification.creadoEn)}
                          </span>
                        </div>

                        {/* Body */}
                        <p className="text-[13px] text-foreground/70 dark:text-muted-foreground mb-3 line-clamp-2">
                          {notification.mensaje}
                        </p>

                        {/* Footer */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-[11px] font-medium rounded ${colors.bg} ${colors.darkBg} ${colors.icon} ${colors.darkIcon}`}>
                              {typeLabels[tipo] || tipo}
                            </span>
                            <span className={`px-2 py-0.5 text-[11px] font-medium rounded ${statusColors[displayStatus] || statusColors.sent}`}>
                              {statusLabels[displayStatus] || displayStatus}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {isUnread && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notification.id); }}
                                disabled={actionLoading === notification.id}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                                title={t('markAsRead')}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(notification.id); }}
                              disabled={actionLoading === notification.id}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title={t('deleted')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {!loading && totalItems > 0 && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-sm text-muted-foreground dark:text-muted-foreground">
                {t('showing', { start: startItem, end: endItem, total: totalItems })}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-border-subtle dark:border-gray-600 rounded-md text-foreground/70 dark:text-muted-foreground hover:bg-surface-1 dark:hover:bg-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
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
                          : 'text-foreground/70 dark:text-muted-foreground hover:bg-surface-3 dark:hover:bg-foreground'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 bg-success text-success-foreground rounded-md hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
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
