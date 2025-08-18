/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Button } from '@/components/ui';
import { SelectCompat as Select } from '@/components/ui';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Grid3X3,
  List,
  Plus,
} from 'lucide-react';

interface CalendarHeaderProps {
  currentDate: Date;
  viewMode: 'month' | 'week' | 'day';
  selectedUser?: string;
  users: Array<{ id: string; name: string }>;
  onDateChange: (date: Date) => void;
  onViewModeChange: (mode: 'month' | 'week' | 'day') => void;
  onUserChange: (userId: string) => void;
  onCreateVisit: () => void;
  onDeleteAllVisits?: () => void;
  onManageRules?: () => void;
  className?: string;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentDate,
  viewMode,
  selectedUser,
  users,
  onDateChange,
  onViewModeChange,
  onUserChange,
  onCreateVisit,
  onDeleteAllVisits,
  onManageRules,
  className = '',
}) => {
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);

    switch (viewMode) {
      case 'month':
        newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'day':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
    }

    onDateChange(newDate);
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  const formatCurrentPeriod = () => {
    const options: Intl.DateTimeFormatOptions = {
      month: 'long',
      year: 'numeric',
    };

    switch (viewMode) {
      case 'month':
        return currentDate.toLocaleDateString('es-ES', options);
      case 'week':
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay() + 1);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        return `${weekStart.toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'short',
        })} - ${weekEnd.toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}`;
      case 'day':
        return currentDate.toLocaleDateString('es-ES', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      default:
        return '';
    }
  };

  const userOptions = users.map(user => ({
    value: user.id,
    label: user.name,
  }));

  const viewModeOptions = [
    { value: 'month', label: 'Mes', icon: Grid3X3 },
    { value: 'week', label: 'Semana', icon: List },
    { value: 'day', label: 'Día', icon: CalendarIcon },
  ];

  return (
    <div className={`bg-white border-b border-gray-200 p-6 ${className}`}>
      {/* Título y botones principales */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">📅 Calendario de visitas</h1>
          <p className="text-sm text-gray-600">Gestiona y programa todas tus visitas comerciales</p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={onCreateVisit}
            className="bg-primary-600 hover:bg-primary-700 text-white"
          >
            <Plus size={16} className="mr-2" />
            Programar visita
          </Button>

          {onDeleteAllVisits && (
            <Button
              variant="outline"
              onClick={onDeleteAllVisits}
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              Borrar visitas
            </Button>
          )}

          {onManageRules && (
            <Button
              variant="outline"
              onClick={onManageRules}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Reglas de prospectos
            </Button>
          )}
        </div>
      </div>

      {/* Controles de navegación */}
      <div className="flex items-center justify-between">
        {/* Navegación de fecha */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate('prev')}
              className="text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft size={16} />
            </Button>

            <div className="min-w-[200px] text-center">
              <h2 className="text-lg font-semibold text-gray-900 capitalize">
                {formatCurrentPeriod()}
              </h2>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate('next')}
              className="text-gray-600 hover:text-gray-900"
            >
              <ChevronRight size={16} />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="text-primary-600 border-primary-300 hover:bg-primary-50"
          >
            Hoy
          </Button>
        </div>

        {/* Controles de vista y filtros */}
        <div className="flex items-center gap-4">
          {/* Selector de vista */}
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            {viewModeOptions.map(option => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => onViewModeChange(option.value as any)}
                  className={`px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors ${
                    viewMode === option.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={14} />
                  {option.label}
                </button>
              );
            })}
          </div>

          {/* Selector de usuario */}
          <Select
            value={selectedUser || ''}
            onChange={e => onUserChange(e.target.value)}
            className="min-w-[150px]"
          >
            <option value="">Todos los usuarios</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>

          <Button size="sm" variant="outline" className="text-gray-600 hover:text-gray-900">
            🔄 Actualizar
          </Button>
        </div>
      </div>
    </div>
  );
};
