'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, type View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { ClienteVisitaListaDto } from '@/types/visits';

const locales = { es };

const localizer = dateFnsLocalizer({
  format: (date: Date, formatStr: string) => format(date, formatStr, { locale: es }),
  parse: (str: string, formatStr: string) => parse(str, formatStr, new Date(), { locale: es }),
  startOfWeek: () => startOfWeek(new Date(), { locale: es }),
  getDay,
  locales,
});

const VISIT_TYPE_COLORS: Record<string, string> = {
  Rutina: '#3b82f6',
  Cobranza: '#10b981',
  Entrega: '#f59e0b',
  Prospeccion: '#8b5cf6',
  Seguimiento: '#06b6d4',
  Otro: '#6b7280',
};

interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  visit: ClienteVisitaListaDto;
  color: string;
}

interface VisitCalendarViewProps {
  visits: ClienteVisitaListaDto[];
  onDateRangeChange: (start: Date, end: Date) => void;
  onEventClick: (visitId: number) => void;
  onSlotClick: (date: Date) => void;
  loading?: boolean;
}

export function VisitCalendarView({
  visits,
  onDateRangeChange,
  onEventClick,
  onSlotClick,
  loading,
}: VisitCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>('month');

  const events: CalendarEvent[] = useMemo(() => {
    return visits.map((v) => {
      const startDate = v.fechaProgramada
        ? new Date(v.fechaProgramada)
        : v.fechaHoraInicio
          ? new Date(v.fechaHoraInicio)
          : new Date(v.fechaHoraFin || Date.now());

      const endDate = v.fechaHoraFin
        ? new Date(v.fechaHoraFin)
        : new Date(startDate.getTime() + 60 * 60 * 1000); // default 1h

      const title = `${v.clienteNombre} - ${v.tipoVisitaNombre}`.slice(0, 30);

      return {
        id: v.id,
        title,
        start: startDate,
        end: endDate,
        visit: v,
        color: VISIT_TYPE_COLORS[v.tipoVisita] || '#6b7280',
      };
    });
  }, [visits]);

  const handleNavigate = useCallback(
    (date: Date) => {
      setCurrentDate(date);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      onDateRangeChange(start, end);
    },
    [onDateRangeChange]
  );

  const handleViewChange = useCallback((newView: View) => {
    setView(newView);
  }, []);

  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    return {
      style: {
        backgroundColor: event.color,
        borderRadius: '4px',
        color: 'white',
        border: 'none',
        fontSize: '12px',
        padding: '2px 4px',
      },
    };
  }, []);

  const handleSelectSlot = useCallback(
    (slotInfo: { start: Date }) => {
      onSlotClick(slotInfo.start);
    },
    [onSlotClick]
  );

  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      onEventClick(event.id);
    },
    [onEventClick]
  );

  const messages = {
    today: 'Hoy',
    previous: 'Anterior',
    next: 'Siguiente',
    month: 'Mes',
    week: 'Semana',
    day: 'Día',
    agenda: 'Agenda',
    date: 'Fecha',
    time: 'Hora',
    event: 'Evento',
    noEventsInRange: 'No hay visitas en este período.',
    showMore: (total: number) => `+${total} más`,
  };

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
          <div className="text-sm text-gray-500">Cargando visitas...</div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        {Object.entries(VISIT_TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
            <span className="text-gray-600">{type}</span>
          </div>
        ))}
      </div>

      <div style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          date={currentDate}
          view={view}
          onNavigate={handleNavigate}
          onView={handleViewChange}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          selectable
          eventPropGetter={eventStyleGetter}
          messages={messages}
          popup
          views={['month', 'week', 'day', 'agenda']}
        />
      </div>
    </div>
  );
}
