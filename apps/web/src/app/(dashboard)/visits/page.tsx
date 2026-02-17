'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { VisitList, VisitForm } from '@/components/visits';
import { Modal } from '@/components/ui/Modal';
import { Client, ClientType } from '@/types';
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

export default function VisitsPage() {
  const [visits, setVisits] = useState<ClienteVisitaListaDto[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar visitas desde la API
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

  const handleCreateVisit = () => {
    setShowVisitForm(true);
  };

  const handleViewDetails = async (visitId: number) => {
    try {
      const visitDetail = await visitService.getVisitById(visitId);
      console.log('Detalles de la visita:', visitDetail);
      toast.info(`Visita a ${visitDetail.clienteNombre} - ${visitDetail.resultadoNombre}`);
    } catch (err) {
      console.error('Error al cargar detalles:', err);
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
      setShowVisitForm(false);
    } catch (err) {
      console.error('Error al crear visita:', err);
      toast.error('Error al programar la visita');
    }
  };

  const handleConfirmCheckIn = async () => {
    if (!selectedVisitId) return;

    try {
      // Obtener ubicación actual
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
    } catch (err) {
      console.error('Error al hacer check-in:', err);
      toast.error('Error al realizar el check-in');
    }
  };

  const handleConfirmCheckOut = async (resultado: ResultadoVisita) => {
    if (!selectedVisitId) return;

    try {
      // Obtener ubicación actual (opcional para check-out)
      let position: GeolocationPosition | null = null;
      try {
        position = await getCurrentPosition();
      } catch {
        // Continuar sin ubicación si no está disponible
      }

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
    } catch (err) {
      console.error('Error al hacer check-out:', err);
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

  const handleCancelForm = () => {
    setShowVisitForm(false);
  };

  return (
    <>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Gestión de Visitas</h1>
          <p className="text-muted-foreground">
            Administra las visitas a clientes de tu equipo de ventas
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
            <button
              onClick={fetchVisits}
              className="ml-4 underline hover:no-underline"
            >
              Reintentar
            </button>
          </div>
        )}

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

        {/* Modal para programar visita */}
        {showVisitForm && (
          <Modal
            isOpen={showVisitForm}
            onClose={handleCancelForm}
            title="Programar Nueva Visita"
            size="md"
            data-tour="visits-create"
          >
            <VisitForm
              clients={clients}
              onSave={handleSaveVisit}
              onCancel={handleCancelForm}
            />
          </Modal>
        )}

        {/* Modal de Check-In */}
        {showCheckInModal && (
          <Modal
            isOpen={showCheckInModal}
            onClose={() => {
              setShowCheckInModal(false);
              setSelectedVisitId(null);
            }}
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
                  onClick={() => {
                    setShowCheckInModal(false);
                    setSelectedVisitId(null);
                  }}
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
            onClose={() => {
              setShowCheckOutModal(false);
              setSelectedVisitId(null);
            }}
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
                onClick={() => {
                  setShowCheckOutModal(false);
                  setSelectedVisitId(null);
                }}
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
