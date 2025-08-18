import React from 'react';
import { Input } from '@/components/ui';
import { SelectCompat as Select } from '@/components/ui';
import { Button } from '@/components/ui';
import { Search, Filter, X } from 'lucide-react';

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

const statusOptions = [
  { value: '', label: 'Todos los estados' },
  { value: 'draft', label: 'Borrador' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'in_progress', label: 'En Progreso' },
  { value: 'delivered', label: 'Entregado' },
  { value: 'cancelled', label: 'Cancelado' },
];

const priorityOptions = [
  { value: '', label: 'Todas las prioridades' },
  { value: 'low', label: 'Baja' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
];

const dateOptions = [
  { value: '', label: 'Cualquier fecha' },
  { value: 'today', label: 'Hoy' },
  { value: 'yesterday', label: 'Ayer' },
  { value: 'this_week', label: 'Esta semana' },
  { value: 'last_week', label: 'Semana pasada' },
  { value: 'this_month', label: 'Este mes' },
  { value: 'last_month', label: 'Mes pasado' },
];

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
  const clientOptions = [
    { value: '', label: 'Todos los clientes' },
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
          placeholder="Buscar por código, cliente o notas..."
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
          <span className="text-sm text-gray-500">Filtros activos aplicados</span>
          <Button variant="outline" size="sm" onClick={onClearFilters} className="text-gray-600">
            <X size={16} className="mr-1" />
            Limpiar filtros
          </Button>
        </div>
      )}
    </div>
  );
};
