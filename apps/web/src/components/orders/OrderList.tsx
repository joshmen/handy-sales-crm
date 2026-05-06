import React, { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { OrderCard } from './OrderCard';
import { OrderFilters } from './OrderFilters';
import { OrderSummary } from './OrderSummary';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { Order } from '@/types/orders';
import { Plus, Package } from 'lucide-react';
import { useFormatters } from '@/hooks/useFormatters';

interface OrderListProps {
  orders: Order[];
  loading?: boolean;
  onCreateOrder: () => void;
  onViewDetails: (orderId: string) => void;
  onEditOrder: (orderId: string) => void;
  onDeleteOrder: (orderId: string) => void;
  className?: string;
}

export const OrderList: React.FC<OrderListProps> = ({
  orders,
  loading = false,
  onCreateOrder,
  onViewDetails,
  onEditOrder,
  onDeleteOrder,
  className = '',
}) => {
  const t = useTranslations('orders.list');
  // Día calendario en TZ tenant — antes los presets ("hoy", "esta semana")
  // dependían de la TZ del browser, descartando órdenes legítimas en TZ
  // negativa al cruce de medianoche.
  const { tenantToday } = useFormatters();
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');

  // Función para filtrar por fecha (anclada en día tenant)
  const filterByDate = (order: Order, filter: string) => {
    if (!filter) return true;

    const orderKey = (typeof order.orderDate === 'string'
      ? order.orderDate
      : new Date(order.orderDate).toISOString()
    ).slice(0, 10);
    const todayKey = tenantToday();
    const [ty, tm, td] = todayKey.split('-').map(Number);
    const todayUtcNoon = new Date(Date.UTC(ty ?? 0, (tm ?? 1) - 1, td ?? 1, 12, 0, 0));
    const ymdOf = (d: Date) =>
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

    switch (filter) {
      case 'today':
        return orderKey === todayKey;
      case 'yesterday': {
        const y = new Date(todayUtcNoon);
        y.setUTCDate(y.getUTCDate() - 1);
        return orderKey === ymdOf(y);
      }
      case 'this_week': {
        const weekStart = new Date(todayUtcNoon);
        weekStart.setUTCDate(todayUtcNoon.getUTCDate() - todayUtcNoon.getUTCDay());
        return orderKey >= ymdOf(weekStart);
      }
      case 'last_week': {
        const lastWeekStart = new Date(todayUtcNoon);
        lastWeekStart.setUTCDate(todayUtcNoon.getUTCDate() - todayUtcNoon.getUTCDay() - 7);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setUTCDate(lastWeekStart.getUTCDate() + 6);
        return orderKey >= ymdOf(lastWeekStart) && orderKey <= ymdOf(lastWeekEnd);
      }
      case 'this_month': {
        return orderKey.slice(0, 7) === todayKey.slice(0, 7);
      }
      case 'last_month': {
        const lm = new Date(todayUtcNoon);
        lm.setUTCMonth(todayUtcNoon.getUTCMonth() - 1);
        return orderKey.slice(0, 7) === `${lm.getUTCFullYear()}-${String(lm.getUTCMonth() + 1).padStart(2, '0')}`;
      }
      default:
        return true;
    }
  };

  // Órdenes filtradas
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Filtro de búsqueda
      const matchesSearch =
        searchTerm === '' ||
        order.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.notes && order.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      // Filtros específicos
      const matchesStatus = statusFilter === '' || order.status === statusFilter;
      const matchesPriority = priorityFilter === '' || order.priority === priorityFilter;
      const matchesClient = clientFilter === '' || order.clientId === clientFilter;
      const matchesDate = filterByDate(order, dateFilter);

      return matchesSearch && matchesStatus && matchesPriority && matchesClient && matchesDate;
    });
  }, [orders, searchTerm, statusFilter, priorityFilter, clientFilter, dateFilter]);

  // Cálculos para el resumen
  const summaryData = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const pendingOrders = filteredOrders.filter(o => o.status === 'confirmed').length;
    const inProgressOrders = filteredOrders.filter(o => o.status === 'en_route').length;
    const completedOrders = filteredOrders.filter(o => o.status === 'delivered').length;
    const totalValue = filteredOrders.reduce((sum, order) => sum + order.total, 0);

    return {
      totalOrders,
      pendingOrders,
      inProgressOrders,
      completedOrders,
      totalValue,
    };
  }, [filteredOrders]);

  // Obtener lista única de clientes para el filtro
  const clients = useMemo(() => {
    const uniqueClients = orders.reduce((acc, order) => {
      if (!acc.find(c => c.id === order.clientId)) {
        acc.push({ id: order.clientId, name: order.client.name });
      }
      return acc;
    }, [] as Array<{ id: string; name: string }>);

    return uniqueClients.sort((a, b) => a.name.localeCompare(b.name));
  }, [orders]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setPriorityFilter('');
    setDateFilter('');
    setClientFilter('');
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-32 bg-surface-3 rounded-lg mb-6"></div>
          <div className="h-24 bg-surface-3 rounded-lg mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 bg-surface-3 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Resumen de órdenes */}
      <OrderSummary {...summaryData} />

      {/* Header con filtros y botón crear */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex-1">
          <OrderFilters
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            priorityFilter={priorityFilter}
            dateFilter={dateFilter}
            clientFilter={clientFilter}
            onSearchChange={setSearchTerm}
            onStatusChange={setStatusFilter}
            onPriorityChange={setPriorityFilter}
            onDateChange={setDateFilter}
            onClientChange={setClientFilter}
            onClearFilters={handleClearFilters}
            clients={clients}
          />
        </div>

        <Button onClick={onCreateOrder} className="lg:ml-4">
          <Plus size={20} className="mr-2" />
          {t('createOrder')}
        </Button>
      </div>

      {/* Lista de órdenes */}
      {filteredOrders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onViewDetails={onViewDetails}
              onEdit={onEditOrder}
              onDelete={onDeleteOrder}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Package}
          title={orders.length === 0 ? t('emptyTitle') : t('noResults')}
          description={
            orders.length === 0
              ? t('emptyDescription')
              : t('noResultsDescription')
          }
          action={{
            label: t('createFirstOrder'),
            onClick: onCreateOrder,
          }}
        />
      )}
    </div>
  );
};
