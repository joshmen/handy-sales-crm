import React from 'react';
import { Input } from '@/components/ui/Input';
import { SelectCompat as Select } from '@/components/ui/SelectCompat';
import { Button } from '@/components/ui/Button';
import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface OrderFiltersProps {
  searchTerm: string;
  statusFilter: string;
  priorityFilter: string;
  dateFilter: string;
  clientFilter: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onClientChange: (value: string) => void;
  onClearFilters: () => void;
  clients?: Array<{ id: string; name: string }>;
  className?: string;
}

export const OrderFilters: React.FC<OrderFiltersProps> = ({
  searchTerm,
  statusFilter,
  priorityFilter,
  dateFilter,
  clientFilter,
  onSearchChange,
  onStatusChange,
  onPriorityChange,
  onDateChange,
  onClientChange,
  onClearFilters,
  clients = [],
  className = '',
}) => {
  const t = useTranslations('orders.filterForm');

  const statusOptions = [
    { value: '', label: t('allStatuses') },
    { value: 'draft', label: t('statusDraft') },
    { value: 'pending', label: t('statusPending') },
    { value: 'confirmed', label: t('statusConfirmed') },
    { value: 'in_progress', label: t('statusInProgress') },
    { value: 'delivered', label: t('statusDelivered') },
    { value: 'cancelled', label: t('statusCancelled') },
  ];

  const priorityOptions = [
    { value: '', label: t('allPriorities') },
    { value: 'low', label: t('priorityLow') },
    { value: 'normal', label: t('priorityNormal') },
    { value: 'high', label: t('priorityHigh') },
    { value: 'urgent', label: t('priorityUrgent') },
  ];

  const dateOptions = [
    { value: '', label: t('anyDate') },
    { value: 'today', label: t('today') },
    { value: 'yesterday', label: t('yesterday') },
    { value: 'this_week', label: t('thisWeek') },
    { value: 'last_week', label: t('lastWeek') },
    { value: 'this_month', label: t('thisMonth') },
    { value: 'last_month', label: t('lastMonth') },
  ];

  const clientOptions = [
    { value: '', label: t('allClients') },
    ...clients.map(client => ({
      value: client.id,
      label: client.name,
    })),
  ];

  const hasActiveFilters = Boolean(
    searchTerm || statusFilter || priorityFilter || dateFilter || clientFilter
  );

  return (
    <div className={`bg-white rounded-lg border p-4 space-y-4 ${className}`}>
      {/* Barra de búsqueda principal */}
      <div className="relative">
        <Search
          size={20}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
        />
        <Input
          placeholder={t('searchPlaceholder')}
          value={searchTerm}
          onChange={e => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filtros en fila */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Select
          //options={statusOptions}
          value={statusFilter}
          onChange={e => onStatusChange(e.target.value)}
          placeholder="Estado"
        >
          {statusOptions.map(u => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </Select>

        <Select
          //options={priorityOptions}
          value={priorityFilter}
          onChange={e => onPriorityChange(e.target.value)}
          placeholder="Prioridad"
        >
          {priorityOptions.map(u => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </Select>

        <Select
          //options={dateOptions}
          value={dateFilter}
          onChange={e => onDateChange(e.target.value)}
          placeholder="Fecha"
        >
          {dateOptions.map(u => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </Select>

        <Select
          //options={clientOptions}
          value={clientFilter}
          onChange={e => onClientChange(e.target.value)}
          placeholder="Cliente"
        >
          {clientOptions.map(u => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Botón para limpiar filtros */}
      {hasActiveFilters && (
        <div className="flex justify-between items-center pt-2 border-t">
          <span className="text-sm text-gray-500">{t('activeFilters')}</span>
          <Button variant="outline" size="sm" onClick={onClearFilters} className="text-gray-600">
            <X size={16} className="mr-1" />
            {t('clearFilters')}
          </Button>
        </div>
      )}
    </div>
  );
};
