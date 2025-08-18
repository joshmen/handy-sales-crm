import React, { useState, useMemo } from 'react';
import { OrderCard } from './OrderCard';
import { OrderFilters } from './OrderFilters';
import { OrderSummary } from './OrderSummary';
import { Button } from '@/components/ui';
import { EmptyState } from '@/components/common/EmptyState';
import { Order } from '@/types/orders';
import { Plus, Package } from 'lucide-react';

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
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');

  // Función para filtrar por fecha
  const filterByDate = (order: Order, filter: string) => {
    if (!filter) return true;

    const orderDate = new Date(order.orderDate);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    switch (filter) {
      case 'today':
        return orderDate.toDateString() === today.toDateString();
      case 'yesterday':
        return orderDate.toDateString() === yesterday.toDateString();
      case 'this_week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return orderDate >= weekStart;
      case 'last_week':
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        return orderDate >= lastWeekStart && orderDate <= lastWeekEnd;
      case 'this_month':
        return (
          orderDate.getMonth() === today.getMonth() &&
          orderDate.getFullYear() === today.getFullYear()
        );
      case 'last_month':
        const lastMonth = new Date(today);
        lastMonth.setMonth(today.getMonth() - 1);
        return (
          orderDate.getMonth() === lastMonth.getMonth() &&
          orderDate.getFullYear() === lastMonth.getFullYear()
        );
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
    const pendingOrders = filteredOrders.filter(o => o.status === 'pending').length;
    const inProgressOrders = filteredOrders.filter(o => o.status === 'in_progress').length;
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
          <div className="h-32 bg-gray-200 rounded-lg mb-6"></div>
          <div className="h-24 bg-gray-200 rounded-lg mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
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
          Crear Pedido
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
          title={orders.length === 0 ? 'No hay pedidos' : 'No se encontraron pedidos'}
          description={
            orders.length === 0
              ? 'Comienza creando tu primer pedido'
              : 'Intenta cambiar los filtros o crear un nuevo pedido'
          }
          action={{
            label: 'Crear Primer Pedido',
            onClick: onCreateOrder,
          }}
        />
      )}
    </div>
  );
};
