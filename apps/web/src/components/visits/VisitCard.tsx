'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
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
} from 'lucide-react';
import { useFormatters } from '@/hooks/useFormatters';
import { formatDate as libFmtDate } from '@/lib/formatters';

interface VisitCardProps {
  visit: ClienteVisitaListaDto;
  onViewDetails: (visitId: number) => void;
  onCheckIn?: (visitId: number) => void;
  onCheckOut?: (visitId: number) => void;
  className?: string;
}

const resultadoColorConfig: Record<ResultadoVisita, { key: string; color: string; dotColor: string }> = {
  [ResultadoVisita.Pendiente]: { key: 'pending', color: 'bg-yellow-100 text-yellow-800', dotColor: 'bg-yellow-400' },
  [ResultadoVisita.Venta]: { key: 'withSale', color: 'bg-green-100 text-green-800', dotColor: 'bg-green-400' },
  [ResultadoVisita.SinVenta]: { key: 'noSale', color: 'bg-surface-3 text-foreground', dotColor: 'bg-muted-foreground' },
  [ResultadoVisita.NoEncontrado]: { key: 'notFound', color: 'bg-orange-100 text-orange-800', dotColor: 'bg-orange-400' },
  [ResultadoVisita.Reprogramada]: { key: 'rescheduled', color: 'bg-blue-100 text-blue-800', dotColor: 'bg-blue-400' },
  [ResultadoVisita.Cancelada]: { key: 'cancelled', color: 'bg-red-100 text-red-800', dotColor: 'bg-red-400' },
};

const tipoVisitaColorConfig: Record<TipoVisita, { key: string; color: string }> = {
  [TipoVisita.Rutina]: { key: 'routine', color: 'text-blue-600' },
  [TipoVisita.Cobranza]: { key: 'collection', color: 'text-green-600' },
  [TipoVisita.Entrega]: { key: 'delivery', color: 'text-purple-600' },
  [TipoVisita.Prospeccion]: { key: 'prospecting', color: 'text-orange-600' },
  [TipoVisita.Seguimiento]: { key: 'followUp', color: 'text-cyan-600' },
  [TipoVisita.Otro]: { key: 'other', color: 'text-foreground/70' },
};

export const VisitCard: React.FC<VisitCardProps> = ({
  visit,
  onViewDetails,
  onCheckIn,
  onCheckOut,
  className = '',
}) => {
  const t = useTranslations('visits');
  const tr = useTranslations('visits.results');
  const tt = useTranslations('visits.types');
  const getResultado = (val: ResultadoVisita) => {
    const cfg = resultadoColorConfig[val] ?? resultadoColorConfig[ResultadoVisita.Pendiente];
    return { label: tr(cfg.key), color: cfg.color, dotColor: cfg.dotColor };
  };
  const getTipo = (val: TipoVisita) => {
    const cfg = tipoVisitaColorConfig[val] ?? tipoVisitaColorConfig[TipoVisita.Otro];
    return { label: tt(cfg.key), color: cfg.color };
  };
  const resultado = getResultado(visit.resultado);
  const tipoVisita = getTipo(visit.tipoVisita);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return libFmtDate(dateStr, null, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    return libFmtDate(dateStr, null, {
      hour: '2-digit',
      minute: '2-digit',
    });
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
            <User size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium">{visit.clienteNombre}</span>
          </div>

          {visit.clienteDireccion && (
            <div className="flex items-center space-x-2">
              <MapPin size={16} className="text-muted-foreground" />
              <span className="text-sm text-foreground/70 truncate">
                {visit.clienteDireccion}
              </span>
            </div>
          )}

          {visit.fechaProgramada && (
            <div className="flex items-center space-x-2">
              <Calendar size={16} className="text-muted-foreground" />
              <span className="text-sm text-foreground/70">
                {t('detail.scheduled')}: {formatDate(visit.fechaProgramada)}
              </span>
            </div>
          )}

          {visit.fechaHoraInicio && (
            <div className="flex items-center space-x-2">
              <Clock size={16} className="text-muted-foreground" />
              <span className="text-sm text-foreground/70">
                {t('detail.start')}: {formatTime(visit.fechaHoraInicio)}
                {visit.fechaHoraFin && ` - ${t('detail.end')}: ${formatTime(visit.fechaHoraFin)}`}
              </span>
            </div>
          )}
        </div>

        {/* Métricas */}
        {visit.duracionMinutos && (
          <div className="mb-4 p-3 bg-surface-1 rounded-lg">
            <div className="text-center">
              <span className="text-xs text-muted-foreground">{t('detail.durationLabel')}</span>
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
            {t('card.viewDetails')}
          </Button>

          {isPending && onCheckIn && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onCheckIn(visit.id)}
              className="bg-success hover:bg-success/90"
            >
              <Play size={14} className="mr-1" />
              {t('card.start')}
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
              {t('card.finish')}
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
