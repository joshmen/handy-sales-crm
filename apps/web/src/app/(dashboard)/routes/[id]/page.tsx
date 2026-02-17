'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { routeService, RouteDetail, RouteStop, AddStopRequest } from '@/services/api/routes';
import { clientService } from '@/services/api/clients';
import { toast } from '@/hooks/useToast';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Modal } from '@/components/ui/Modal';
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Play,
  CheckCircle,
  XCircle,
  MapPin,
  User,
  Calendar,
  Clock,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

export default function RouteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const routeId = Number(params.id);

  const [route, setRoute] = useState<RouteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Add stop modal
  const [isAddStopOpen, setIsAddStopOpen] = useState(false);
  const [clients, setClients] = useState<{ value: string; label: string }[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [stopForm, setStopForm] = useState({ clienteId: 0, duracion: 30, notas: '' });

  // Cancel modal
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelMotivo, setCancelMotivo] = useState('');

  const fetchRoute = useCallback(async () => {
    try {
      setLoading(true);
      const data = await routeService.getRuta(routeId);
      setRoute(data);
    } catch {
      toast.error('Error al cargar la ruta');
    } finally {
      setLoading(false);
    }
  }, [routeId]);

  const fetchClients = async (search?: string) => {
    try {
      const response = await clientService.getClients({ search, limit: 50, isActive: true });
      setClients(response.clients.map(c => ({ value: c.id, label: c.name })));
    } catch {
      console.error('Error al cargar clientes');
    }
  };

  useEffect(() => {
    fetchRoute();
  }, [fetchRoute]);

  useEffect(() => {
    fetchClients();
  }, []);

  const isPlanificada = route?.estado === 0;
  const isEnProgreso = route?.estado === 1;
  const isEditable = isPlanificada;

  // Actions
  const handleIniciar = async () => {
    if (!route) return;
    try {
      setActionLoading(true);
      await routeService.iniciarRuta(route.id);
      toast.success('Ruta iniciada');
      fetchRoute();
    } catch {
      toast.error('Error al iniciar la ruta');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompletar = async () => {
    if (!route) return;
    try {
      setActionLoading(true);
      await routeService.completarRuta(route.id);
      toast.success('Ruta completada');
      fetchRoute();
    } catch {
      toast.error('Error al completar la ruta');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelar = async () => {
    if (!route) return;
    try {
      setActionLoading(true);
      await routeService.cancelarRuta(route.id, cancelMotivo || undefined);
      toast.success('Ruta cancelada');
      setIsCancelOpen(false);
      setCancelMotivo('');
      fetchRoute();
    } catch {
      toast.error('Error al cancelar la ruta');
    } finally {
      setActionLoading(false);
    }
  };

  // Stops
  const handleAddStop = async () => {
    if (!route || !stopForm.clienteId) {
      toast.error('Selecciona un cliente');
      return;
    }
    try {
      setActionLoading(true);
      const nextOrder = route.detalles.length > 0
        ? Math.max(...route.detalles.map(d => d.ordenVisita)) + 1
        : 1;
      const data: AddStopRequest = {
        clienteId: stopForm.clienteId,
        ordenVisita: nextOrder,
        duracionEstimadaMinutos: stopForm.duracion || 30,
        notas: stopForm.notas || undefined,
      };
      await routeService.addParada(route.id, data);
      toast.success('Parada agregada');
      setIsAddStopOpen(false);
      setStopForm({ clienteId: 0, duracion: 30, notas: '' });
      fetchRoute();
    } catch {
      toast.error('Error al agregar parada');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteStop = async (detalleId: number) => {
    if (!route) return;
    try {
      await routeService.deleteParada(route.id, detalleId);
      toast.success('Parada eliminada');
      fetchRoute();
    } catch {
      toast.error('Error al eliminar parada');
    }
  };

  const handleMoveStop = async (stop: RouteStop, direction: 'up' | 'down') => {
    if (!route) return;
    const sorted = [...route.detalles].sort((a, b) => a.ordenVisita - b.ordenVisita);
    const idx = sorted.findIndex(s => s.id === stop.id);
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === sorted.length - 1)) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const newOrder = sorted.map(s => s.id);
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];

    try {
      await routeService.reorderParadas(route.id, newOrder);
      fetchRoute();
    } catch {
      toast.error('Error al reordenar');
    }
  };

  // Badges
  const getEstadoBadge = (estado: number) => {
    switch (estado) {
      case 0: return { label: 'Planificada', cls: 'bg-gray-100 text-gray-600' };
      case 1: return { label: 'En progreso', cls: 'bg-yellow-100 text-yellow-600' };
      case 2: return { label: 'Completada', cls: 'bg-green-100 text-green-600' };
      case 3: return { label: 'Cancelada', cls: 'bg-red-100 text-red-600' };
      default: return { label: 'Desconocido', cls: 'bg-gray-100 text-gray-600' };
    }
  };

  const getParadaBadge = (estado: number) => {
    switch (estado) {
      case 0: return { label: 'Pendiente', cls: 'bg-gray-100 text-gray-600' };
      case 1: return { label: 'En camino', cls: 'bg-blue-100 text-blue-600' };
      case 2: return { label: 'Visitado', cls: 'bg-green-100 text-green-600' };
      case 3: return { label: 'Omitido', cls: 'bg-red-100 text-red-600' };
      default: return { label: 'Desconocido', cls: 'bg-gray-100 text-gray-600' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!route) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-gray-500">Ruta no encontrada</p>
        <Link href="/routes" className="text-green-600 hover:underline text-sm">Volver a rutas</Link>
      </div>
    );
  }

  const badge = getEstadoBadge(route.estado);
  const sortedStops = [...route.detalles].sort((a, b) => a.ordenVisita - b.ordenVisita);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white px-8 py-6 border-b border-gray-200">
        <Breadcrumb items={[
          { label: 'Inicio', href: '/dashboard' },
          { label: 'Rutas', href: '/routes' },
          { label: route.nombre },
        ]} />

        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/routes')} className="p-1 text-gray-400 hover:text-gray-600 rounded">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {route.nombre}
            </h1>
            <span className={`inline-flex px-2.5 py-0.5 text-[11px] font-medium rounded-full ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isPlanificada && (
              <>
                <button
                  onClick={handleIniciar}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  Iniciar ruta
                </button>
                <button
                  onClick={() => setIsCancelOpen(true)}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  Cancelar
                </button>
              </>
            )}
            {isEnProgreso && (
              <>
                <button
                  onClick={handleCompletar}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  Completar ruta
                </button>
                <button
                  onClick={() => setIsCancelOpen(true)}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-8 py-6 space-y-6 overflow-auto">
        {/* Info Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-[11px] text-gray-500">Usuario</p>
                <p className="text-[13px] font-medium text-gray-900">{route.usuarioNombre}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-[11px] text-gray-500">Zona</p>
                <p className="text-[13px] font-medium text-gray-900">{route.zonaNombre || 'Sin zona'}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-[11px] text-gray-500">Fecha</p>
                <p className="text-[13px] font-medium text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {new Date(route.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-[11px] text-gray-500">Horario</p>
                <p className="text-[13px] font-medium text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {route.horaInicioEstimada || '--:--'} - {route.horaFinEstimada || '--:--'}
                </p>
              </div>
            </div>
          </div>
          {route.notas && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-[11px] text-gray-500 mb-1">Notas</p>
              <p className="text-[13px] text-gray-700">{route.notas}</p>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-6">
            <div>
              <span className="text-[11px] text-gray-500">Paradas: </span>
              <span className="text-[13px] font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                <span className={route.paradasCompletadas === route.totalParadas && route.totalParadas > 0 ? 'text-green-600' : ''}>
                  {route.paradasCompletadas}
                </span>
                /{route.totalParadas}
              </span>
            </div>
            {route.kilometrosEstimados && (
              <div>
                <span className="text-[11px] text-gray-500">Km estimados: </span>
                <span className="text-[13px] font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {route.kilometrosEstimados}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Stops Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Paradas ({route.totalParadas})
            </h2>
            {isEditable && (
              <button
                onClick={() => setIsAddStopOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar parada
              </button>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* Table Header */}
            <div className="flex items-center gap-3 bg-gray-50 px-4 h-10 border-b border-gray-200">
              <div className="w-[50px] text-xs font-semibold text-gray-600 text-center">#</div>
              <div className="flex-1 min-w-[160px] text-xs font-semibold text-gray-600">Cliente</div>
              <div className="w-[200px] text-xs font-semibold text-gray-600">Dirección</div>
              <div className="w-[60px] text-xs font-semibold text-gray-600 text-center">Min.</div>
              <div className="w-[90px] text-xs font-semibold text-gray-600 text-center">Estado</div>
              {isEditable && (
                <div className="w-[90px] text-xs font-semibold text-gray-600 text-center">Acciones</div>
              )}
            </div>

            {/* Table Body */}
            {sortedStops.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <MapPin className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-700 mb-1">Sin paradas</p>
                <p className="text-xs text-gray-500 mb-3">Agrega clientes para planificar la ruta</p>
                {isEditable && (
                  <button
                    onClick={() => setIsAddStopOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Agregar parada
                  </button>
                )}
              </div>
            ) : (
              sortedStops.map((stop, idx) => {
                const paradaBadge = getParadaBadge(stop.estado);
                return (
                  <div
                    key={stop.id}
                    className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-[50px] text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-[11px] font-medium text-gray-600" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        {stop.ordenVisita}
                      </span>
                    </div>
                    <div className="flex-1 min-w-[160px]">
                      <p className="text-[13px] font-medium text-gray-900 truncate">{stop.clienteNombre}</p>
                      {stop.notas && <p className="text-[11px] text-gray-500 truncate">{stop.notas}</p>}
                    </div>
                    <div className="w-[200px]">
                      <p className="text-[13px] text-gray-600 truncate">{stop.clienteDireccion || '-'}</p>
                    </div>
                    <div className="w-[60px] text-center">
                      <span className="text-[13px] text-gray-600" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        {stop.duracionEstimadaMinutos || 30}
                      </span>
                    </div>
                    <div className="w-[90px] text-center">
                      <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full ${paradaBadge.cls}`}>
                        {paradaBadge.label}
                      </span>
                    </div>
                    {isEditable && (
                      <div className="w-[90px] flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleMoveStop(stop, 'up')}
                          disabled={idx === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 rounded"
                          title="Subir"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveStop(stop, 'down')}
                          disabled={idx === sortedStops.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 rounded"
                          title="Bajar"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStop(stop.id)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Add Stop Modal */}
      <Modal
        isOpen={isAddStopOpen}
        onClose={() => !actionLoading && setIsAddStopOpen(false)}
        title="Agregar parada"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cliente <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={clients}
              value={stopForm.clienteId ? stopForm.clienteId.toString() : ''}
              onChange={(val) => setStopForm({ ...stopForm, clienteId: val ? parseInt(String(val)) : 0 })}
              placeholder="Buscar cliente..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duración estimada (minutos)
            </label>
            <input
              type="number"
              value={stopForm.duracion}
              onChange={(e) => setStopForm({ ...stopForm, duracion: parseInt(e.target.value) || 30 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              value={stopForm.notas}
              onChange={(e) => setStopForm({ ...stopForm, notas: e.target.value })}
              rows={2}
              placeholder="Notas para esta parada..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => setIsAddStopOpen(false)}
              disabled={actionLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddStop}
              disabled={actionLoading || !stopForm.clienteId}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Agregar
            </button>
          </div>
        </div>
      </Modal>

      {/* Cancel Route Modal */}
      <Modal
        isOpen={isCancelOpen}
        onClose={() => !actionLoading && setIsCancelOpen(false)}
        title="Cancelar ruta"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            ¿Estás seguro de que deseas cancelar esta ruta? Esta acción no se puede deshacer.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo (opcional)</label>
            <textarea
              value={cancelMotivo}
              onChange={(e) => setCancelMotivo(e.target.value)}
              rows={2}
              placeholder="Motivo de la cancelación..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => setIsCancelOpen(false)}
              disabled={actionLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Volver
            </button>
            <button
              onClick={handleCancelar}
              disabled={actionLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Cancelar ruta
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
