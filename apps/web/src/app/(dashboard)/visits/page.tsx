'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { VisitList, VisitForm } from '@/components/visits';
import { VisitCalendarView } from '@/components/visits/VisitCalendarView';
import { Modal } from '@/components/ui/Modal';
import { Client } from '@/types';
import {
  ClienteVisitaListaDto,
  ClienteVisitaCreateDto,
  ResultadoVisita,
  CheckInDto,
  CheckOutDto,
} from '@/types/visits';
import { visitService } from '@/services/api/visits';
import { clientService } from '@/services/api/clients';
import { toast } from '@/hooks/useToast';
import { List, CalendarDays, Plus } from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';

type ViewMode = 'list' | 'calendar';

export default function VisitsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const viewParam = searchParams.get('view') as ViewMode | null;
  const currentView: ViewMode = viewParam === 'calendar' ? 'calendar' : 'list';

  const [visits, setVisits] = useState<ClienteVisitaListaDto[]>([]);
  const [calendarVisits, setCalendarVisits] = useState<ClienteVisitaListaDto[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefilledDate, setPrefilledDate] = useState<string | undefined>();

  const setView = (view: ViewMode) => {
    router.push(`/visits${view === 'calendar' ? '?view=calendar' : ''}`, { scroll: false });
  };

  // Cargar visitas para la lista
  const fetchVisits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await visitService.getVisits({ tamanoPagina: 100 });
      setVisits(response.items);
    } catch (err) {
      console.error('Error al cargar visitas:', err);
      setError('Error al cargar las visitas. Intenta de nuevo.');
      toast.error('Error al cargar las visitas');
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar visitas para el calendario por rango de fecha
  const fetchCalendarVisits = useCallback(async (start: Date, end: Date) => {
    try {
      setCalendarLoading(true);
      const response = await visitService.getVisits({
        fechaDesde: start.toISOString(),
        fechaHasta: end.toISOString(),
        tamanoPagina: 500,
      });
      setCalendarVisits(response.items);
    } catch (err) {
      console.error('Error al cargar visitas del calendario:', err);
    } finally {
      setCalendarLoading(false);
    }
  }, []);

  // Cargar clientes para el formulario
  const fetchClients = useCallback(async () => {
    try {
      const clientsResponse = await clientService.getClients({ limit: 100 });
      setClients(clientsResponse.clients || []);
    } catch (err) {
      console.error('Error al cargar clientes:', err);
    }
  }, []);

  useEffect(() => {
    fetchVisits();
    fetchClients();
  }, [fetchVisits, fetchClients]);

  // Fetch calendar data when switching to calendar view
  useEffect(() => {
    if (currentView === 'calendar' && calendarVisits.length === 0) {
      const now = new Date();
      fetchCalendarVisits(startOfMonth(now), endOfMonth(now));
    }
  }, [currentView, calendarVisits.length, fetchCalendarVisits]);

  const handleCreateVisit = () => {
    setPrefilledDate(undefined);
    setShowVisitForm(true);
  };

  const handleViewDetails = async (visitId: number) => {
    try {
      const visitDetail = await visitService.getVisitById(visitId);
      toast.info(`Visita a ${visitDetail.clienteNombre} - ${visitDetail.resultadoNombre}`);
    } catch {
      toast.error('Error al cargar los detalles de la visita');
    }
  };

  const handleCheckIn = (visitId: number) => {
    setSelectedVisitId(visitId);
    setShowCheckInModal(true);
  };

  const handleCheckOut = (visitId: number) => {
    setSelectedVisitId(visitId);
    setShowCheckOutModal(true);
  };

  const handleSaveVisit = async (data: ClienteVisitaCreateDto) => {
    try {
      await visitService.createVisit(data);
      toast.success('Visita programada correctamente');
      await fetchVisits();
      if (currentView === 'calendar') {
        const now = new Date();
        await fetchCalendarVisits(startOfMonth(now), endOfMonth(now));
      }
      setShowVisitForm(false);
    } catch {
      toast.error('Error al programar la visita');
    }
  };

  const handleConfirmCheckIn = async () => {
    if (!selectedVisitId) return;
    try {
      const position = await getCurrentPosition();
      const checkInData: CheckInDto = {
        latitud: position.coords.latitude,
        longitud: position.coords.longitude,
      };
      await visitService.checkIn(selectedVisitId, checkInData);
      toast.success('Check-in realizado correctamente');
      await fetchVisits();
      setShowCheckInModal(false);
      setSelectedVisitId(null);
    } catch {
      toast.error('Error al realizar el check-in');
    }
  };

  const handleConfirmCheckOut = async (resultado: ResultadoVisita) => {
    if (!selectedVisitId) return;
    try {
      let position: GeolocationPosition | null = null;
      try { position = await getCurrentPosition(); } catch { /* ok */ }
      const checkOutData: CheckOutDto = {
        resultado,
        latitud: position?.coords.latitude,
        longitud: position?.coords.longitude,
      };
      await visitService.checkOut(selectedVisitId, checkOutData);
      toast.success('Check-out realizado correctamente');
      await fetchVisits();
      setShowCheckOutModal(false);
      setSelectedVisitId(null);
    } catch {
      toast.error('Error al realizar el check-out');
    }
  };

  const getCurrentPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalización no soportada'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    });
  };

  // Calendar handlers
  const handleDateRangeChange = useCallback(
    (start: Date, end: Date) => {
      fetchCalendarVisits(start, end);
    },
    [fetchCalendarVisits]
  );

  const handleCalendarEventClick = useCallback(
    (visitId: number) => {
      handleViewDetails(visitId);
    },
    []
  );

  const handleCalendarSlotClick = useCallback(
    (date: Date) => {
      setPrefilledDate(date.toISOString().split('T')[0]);
      setShowVisitForm(true);
    },
    []
  );

  return (
    <>
      <div className="p-6">
        {/* Header with view toggle */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestión de Visitas</h1>
            <p className="text-muted-foreground">
              Administra las visitas a clientes de tu equipo de ventas
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="inline-flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setView('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  currentView === 'list'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <List className="w-4 h-4" />
                Lista
              </button>
              <button
                onClick={() => setView('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  currentView === 'calendar'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                Calendario
              </button>
            </div>

            <button
              onClick={handleCreateVisit}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Programar Visita
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
            <button onClick={fetchVisits} className="ml-4 underline hover:no-underline">
              Reintentar
            </button>
          </div>
        )}

        {/* List View */}
        {currentView === 'list' && (
          <div data-tour="visits-list">
            <VisitList
              visits={visits}
              loading={loading}
              onCreateVisit={handleCreateVisit}
              onViewDetails={handleViewDetails}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
            />
          </div>
        )}

        {/* Calendar View */}
        {currentView === 'calendar' && (
          <div data-tour="visits-calendar">
            <VisitCalendarView
              visits={calendarVisits}
              onDateRangeChange={handleDateRangeChange}
              onEventClick={handleCalendarEventClick}
              onSlotClick={handleCalendarSlotClick}
              loading={calendarLoading}
            />
          </div>
        )}

        {/* Modal para programar visita */}
        {showVisitForm && (
          <Modal
            isOpen={showVisitForm}
            onClose={() => setShowVisitForm(false)}
            title="Programar Nueva Visita"
            size="md"
            data-tour="visits-create"
          >
            <VisitForm
              clients={clients}
              onSave={handleSaveVisit}
              onCancel={() => setShowVisitForm(false)}
              defaultDate={prefilledDate}
            />
          </Modal>
        )}

        {/* Modal de Check-In */}
        {showCheckInModal && (
          <Modal
            isOpen={showCheckInModal}
            onClose={() => { setShowCheckInModal(false); setSelectedVisitId(null); }}
            title="Confirmar Check-In"
            size="sm"
            data-tour="visits-checkin"
          >
            <div className="space-y-4">
              <p className="text-gray-600">
                ¿Deseas iniciar esta visita? Se registrará tu ubicación actual.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => { setShowCheckInModal(false); setSelectedVisitId(null); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmCheckIn}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Iniciar Visita
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Modal de Check-Out */}
        {showCheckOutModal && (
          <Modal
            isOpen={showCheckOutModal}
            onClose={() => { setShowCheckOutModal(false); setSelectedVisitId(null); }}
            title="Finalizar Visita"
            size="sm"
            data-tour="visits-checkout"
          >
            <div className="space-y-4">
              <p className="text-gray-600">Selecciona el resultado de la visita:</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleConfirmCheckOut(ResultadoVisita.Venta)}
                  className="px-4 py-3 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 font-medium"
                >
                  Con Venta
                </button>
                <button
                  onClick={() => handleConfirmCheckOut(ResultadoVisita.SinVenta)}
                  className="px-4 py-3 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 font-medium"
                >
                  Sin Venta
                </button>
                <button
                  onClick={() => handleConfirmCheckOut(ResultadoVisita.NoEncontrado)}
                  className="px-4 py-3 bg-orange-100 text-orange-800 rounded-lg hover:bg-orange-200 font-medium"
                >
                  No Encontrado
                </button>
                <button
                  onClick={() => handleConfirmCheckOut(ResultadoVisita.Reprogramada)}
                  className="px-4 py-3 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 font-medium"
                >
                  Reprogramar
                </button>
              </div>
              <button
                onClick={() => { setShowCheckOutModal(false); setSelectedVisitId(null); }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 mt-2"
              >
                Cancelar
              </button>
            </div>
          </Modal>
        )}
      </div>
    </>
  );
}
