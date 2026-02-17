'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  ShoppingCart,
  AlertTriangle,
  MapPin,
  Users,
  Package,
  Info,
} from 'lucide-react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

type NotificationType = 'order' | 'alert' | 'route' | 'inventory' | 'general';
type NotificationStatus = 'sent' | 'pending' | 'failed';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  status: NotificationStatus;
  recipientCount: number;
  createdAt: Date;
  createdBy: string;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Nuevo pedido recibido',
    body: 'Se ha recibido un nuevo pedido de Cliente ABC por un total de $15,430.00 MXN',
    type: 'order',
    status: 'sent',
    recipientCount: 3,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    createdBy: 'Sistema',
  },
  {
    id: '2',
    title: 'Alerta de inventario bajo',
    body: 'El producto "Aceite Motor 5W-30" está por debajo del nivel mínimo de stock (5 unidades restantes)',
    type: 'alert',
    status: 'sent',
    recipientCount: 5,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    createdBy: 'Sistema',
  },
  {
    id: '3',
    title: 'Ruta asignada',
    body: 'Se ha asignado la Ruta Centro Norte para el día de mañana con 24 clientes programados',
    type: 'route',
    status: 'sent',
    recipientCount: 1,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    createdBy: 'Carlos López',
  },
  {
    id: '4',
    title: 'Actualización de precios',
    body: 'La lista de precios "Mayoreo 2025" ha sido actualizada con 45 productos modificados',
    type: 'general',
    status: 'sent',
    recipientCount: 12,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    createdBy: 'Admin',
  },
  {
    id: '5',
    title: 'Entrega completada',
    body: 'La entrega del pedido #P-2025-0142 ha sido completada exitosamente',
    type: 'order',
    status: 'sent',
    recipientCount: 2,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    createdBy: 'Sistema',
  },
  {
    id: '6',
    title: 'Recordatorio de visita',
    body: 'Tienes 8 visitas pendientes para hoy en la Zona Sur',
    type: 'route',
    status: 'pending',
    recipientCount: 1,
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    createdBy: 'Sistema',
  },
];

const typeLabels: Record<NotificationType, string> = {
  order: 'Pedidos',
  alert: 'Alertas',
  route: 'Rutas',
  inventory: 'Inventario',
  general: 'General',
};

const typeIcons: Record<NotificationType, React.ElementType> = {
  order: ShoppingCart,
  alert: AlertTriangle,
  route: MapPin,
  inventory: Package,
  general: Info,
};

const typeColors: Record<NotificationType, { bg: string; icon: string }> = {
  order: { bg: 'bg-blue-100', icon: 'text-blue-600' },
  alert: { bg: 'bg-yellow-100', icon: 'text-yellow-600' },
  route: { bg: 'bg-purple-100', icon: 'text-purple-600' },
  inventory: { bg: 'bg-green-100', icon: 'text-green-600' },
  general: { bg: 'bg-gray-100', icon: 'text-gray-600' },
};

const statusLabels: Record<NotificationStatus, string> = {
  sent: 'Enviada',
  pending: 'Pendiente',
  failed: 'Fallida',
};

const statusColors: Record<NotificationStatus, string> = {
  sent: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDate, setFilterDate] = useState('7days');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const timer = setTimeout(() => {
      setNotifications(mockNotifications);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const filteredNotifications = notifications.filter(n => {
    const matchesSearch = searchTerm === '' ||
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.body.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || n.type === filterType;

    // Date filter
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - n.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    let matchesDate = true;
    if (filterDate === '7days') matchesDate = daysDiff <= 7;
    else if (filterDate === '30days') matchesDate = daysDiff <= 30;
    else if (filterDate === 'today') matchesDate = daysDiff === 0;

    return matchesSearch && matchesType && matchesDate;
  });

  const totalItems = filteredNotifications.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  const paginatedNotifications = filteredNotifications.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours} horas`;
    if (days === 1) return 'Hace un día';
    if (days < 7) return `Hace ${days} días`;
    return date.toLocaleDateString('es-MX');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white px-8 py-6 border-b border-gray-200">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[13px] mb-4">
          <span className="text-gray-500">Administración</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900 font-semibold">Notificaciones</span>
        </div>

          {/* Title Row */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Historial de Notificaciones
            </h1>
            <button data-tour="notifications-create-btn" className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors">
              <Plus className="w-4 h-4" />
              <span>Nueva notificación</span>
            </button>
          </div>

          {/* Filter Row */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                data-tour="notifications-search"
                type="text"
                placeholder="Buscar notificación..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-[280px] pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              />
            </div>

            {/* Type Filter */}
            <div data-tour="notifications-filter-type" className="min-w-[170px]">
              <SearchableSelect
                options={[
                  { value: 'all', label: 'Todos los tipos' },
                  { value: 'order', label: 'Pedidos' },
                  { value: 'alert', label: 'Alertas' },
                  { value: 'route', label: 'Rutas' },
                  { value: 'inventory', label: 'Inventario' },
                  { value: 'general', label: 'General' },
                ]}
                value={filterType}
                onChange={(val) => setFilterType(val ? String(val) : 'all')}
                placeholder="Todos los tipos"
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
                onChange={(val) => setFilterDate(val ? String(val) : 'today')}
                placeholder="Hoy"
              />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto">
          <div className="px-8 py-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : paginatedNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 py-20">
                <Bell className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay notificaciones</h3>
                <p className="text-sm text-gray-500 text-center">
                  No se encontraron notificaciones para los filtros seleccionados
                </p>
              </div>
            ) : (
              <div data-tour="notifications-list" className="space-y-4">
                {paginatedNotifications.map((notification) => {
                  const IconComponent = typeIcons[notification.type];
                  const colors = typeColors[notification.type];
                  return (
                    <div
                      key={notification.id}
                      className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex gap-4">
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                          <IconComponent className={`w-5 h-5 ${colors.icon}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <h3 className="text-[15px] font-semibold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                              {notification.title}
                            </h3>
                            <span className="text-xs text-gray-400 flex-shrink-0">
                              {formatRelativeTime(notification.createdAt)}
                            </span>
                          </div>

                          {/* Body */}
                          <p className="text-[13px] text-gray-600 mb-3 line-clamp-2">
                            {notification.body}
                          </p>

                          {/* Footer */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 text-[11px] font-medium rounded ${colors.bg} ${colors.icon}`}>
                                {typeLabels[notification.type]}
                              </span>
                              <span className={`px-2 py-0.5 text-[11px] font-medium rounded ${statusColors[notification.status]}`}>
                                {statusLabels[notification.status]}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" />
                                {notification.recipientCount} destinatarios
                              </span>
                              <span>•</span>
                              <span>Por {notification.createdBy}</span>
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
                <span className="text-sm text-gray-500" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Mostrando {startItem}-{endItem} de {totalItems} notificaciones
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((page) => (
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
                  ))}

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
