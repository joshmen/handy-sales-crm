import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ClienteVisitaListaDto, ResultadoVisita, TipoVisita } from '@/types/visits';
import {
  Calendar,
  User,
  MapPin,
  Clock,
  Eye,
  Play,
  CheckCircle,
  ShoppingCart,
  AlertCircle,
} from 'lucide-react';

interface VisitCardProps {
  visit: ClienteVisitaListaDto;
  onViewDetails: (visitId: number) => void;
  onCheckIn?: (visitId: number) => void;
  onCheckOut?: (visitId: number) => void;
  className?: string;
}

const resultadoConfig: Record<ResultadoVisita, { label: string; color: string; dotColor: string }> = {
  [ResultadoVisita.Pendiente]: {
    label: 'Pendiente',
    color: 'bg-yellow-100 text-yellow-800',
    dotColor: 'bg-yellow-400',
  },
  [ResultadoVisita.Venta]: {
    label: 'Con Venta',
    color: 'bg-green-100 text-green-800',
    dotColor: 'bg-green-400',
  },
  [ResultadoVisita.SinVenta]: {
    label: 'Sin Venta',
    color: 'bg-gray-100 text-gray-800',
    dotColor: 'bg-gray-400',
  },
  [ResultadoVisita.NoEncontrado]: {
    label: 'No Encontrado',
    color: 'bg-orange-100 text-orange-800',
    dotColor: 'bg-orange-400',
  },
  [ResultadoVisita.Reprogramada]: {
    label: 'Reprogramada',
    color: 'bg-blue-100 text-blue-800',
    dotColor: 'bg-blue-400',
  },
  [ResultadoVisita.Cancelada]: {
    label: 'Cancelada',
    color: 'bg-red-100 text-red-800',
    dotColor: 'bg-red-400',
  },
};

const tipoVisitaConfig: Record<TipoVisita, { label: string; color: string }> = {
  [TipoVisita.Rutina]: { label: 'Rutina', color: 'text-blue-600' },
  [TipoVisita.Cobranza]: { label: 'Cobranza', color: 'text-green-600' },
  [TipoVisita.Entrega]: { label: 'Entrega', color: 'text-purple-600' },
  [TipoVisita.Prospeccion]: { label: 'Prospección', color: 'text-orange-600' },
  [TipoVisita.Seguimiento]: { label: 'Seguimiento', color: 'text-cyan-600' },
  [TipoVisita.Otro]: { label: 'Otro', color: 'text-gray-600' },
};

export const VisitCard: React.FC<VisitCardProps> = ({
  visit,
  onViewDetails,
  onCheckIn,
  onCheckOut,
  className = '',
}) => {
  const resultado = resultadoConfig[visit.resultado];
  const tipoVisita = tipoVisitaConfig[visit.tipoVisita];

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(dateStr));
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Intl.DateTimeFormat('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  };

  const isInProgress = visit.fechaHoraInicio && !visit.fechaHoraFin;
  const isPending = !visit.fechaHoraInicio;
  const isCompleted = visit.fechaHoraFin;

  return (
    <Card className={`hover:shadow-md transition-shadow ${className}`}>
      <CardContent className="p-4">
        {/* Header con estado y tipo */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div
              className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${resultado.color}`}
            >
              <div className={`w-2 h-2 rounded-full ${resultado.dotColor}`}></div>
              <span>{resultado.label}</span>
            </div>
            <span className={`text-sm font-medium ${tipoVisita.color}`}>
              {tipoVisita.label}
            </span>
          </div>
          {visit.tienePedido && (
            <div className="flex items-center text-green-600">
              <ShoppingCart size={16} />
            </div>
          )}
        </div>

        {/* Información del cliente */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center space-x-2">
            <User size={16} className="text-gray-400" />
            <span className="text-sm font-medium">{visit.clienteNombre}</span>
          </div>

          {visit.clienteDireccion && (
            <div className="flex items-center space-x-2">
              <MapPin size={16} className="text-gray-400" />
              <span className="text-sm text-gray-600 truncate">
                {visit.clienteDireccion}
              </span>
            </div>
          )}

          {visit.fechaProgramada && (
            <div className="flex items-center space-x-2">
              <Calendar size={16} className="text-gray-400" />
              <span className="text-sm text-gray-600">
                Programada: {formatDate(visit.fechaProgramada)}
              </span>
            </div>
          )}

          {visit.fechaHoraInicio && (
            <div className="flex items-center space-x-2">
              <Clock size={16} className="text-gray-400" />
              <span className="text-sm text-gray-600">
                Inicio: {formatTime(visit.fechaHoraInicio)}
                {visit.fechaHoraFin && ` - Fin: ${formatTime(visit.fechaHoraFin)}`}
              </span>
            </div>
          )}
        </div>

        {/* Métricas */}
        {visit.duracionMinutos && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-center">
              <span className="text-xs text-gray-500">Duración</span>
              <p className="font-semibold text-sm">{visit.duracionMinutos} min</p>
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(visit.id)}
            className="flex-1"
          >
            <Eye size={14} className="mr-1" />
            Ver Detalles
          </Button>

          {isPending && onCheckIn && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onCheckIn(visit.id)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play size={14} className="mr-1" />
              Iniciar
            </Button>
          )}

          {isInProgress && onCheckOut && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onCheckOut(visit.id)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <CheckCircle size={14} className="mr-1" />
              Finalizar
            </Button>
          )}

          {isCompleted && (
            <div className="flex items-center text-green-600 px-2">
              <CheckCircle size={16} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
