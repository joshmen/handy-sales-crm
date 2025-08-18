import React from "react";
import { Card, CardContent } from '@/components/ui';
import { Button } from '@/components/ui';
import { Order } from "@/types/orders";
import {
  Calendar,
  User,
  MapPin,
  DollarSign,
  Package,
  Eye,
  Edit,
  Trash2,
} from "lucide-react";

interface OrderCardProps {
  order: Order;
  onViewDetails: (orderId: string) => void;
  onEdit: (orderId: string) => void;
  onDelete: (orderId: string) => void;
  className?: string;
}

const statusConfig = {
  draft: {
    label: "Borrador",
    color: "bg-gray-100 text-gray-800",
    dotColor: "bg-gray-400",
  },
  pending: {
    label: "Pendiente",
    color: "bg-yellow-100 text-yellow-800",
    dotColor: "bg-yellow-400",
  },
  confirmed: {
    label: "Confirmado",
    color: "bg-blue-100 text-blue-800",
    dotColor: "bg-blue-400",
  },
  in_progress: {
    label: "En Progreso",
    color: "bg-orange-100 text-orange-800",
    dotColor: "bg-orange-400",
  },
  delivered: {
    label: "Entregado",
    color: "bg-green-100 text-green-800",
    dotColor: "bg-green-400",
  },
  cancelled: {
    label: "Cancelado",
    color: "bg-red-100 text-red-800",
    dotColor: "bg-red-400",
  },
};

const priorityConfig = {
  low: { label: "Baja", color: "text-green-600" },
  normal: { label: "Normal", color: "text-blue-600" },
  high: { label: "Alta", color: "text-orange-600" },
  urgent: { label: "Urgente", color: "text-red-600" },
};

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onViewDetails,
  onEdit,
  onDelete,
  className = "",
}) => {
  const status = statusConfig[order.status];
  const priority = priorityConfig[order.priority];

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(date));
  };

  return (
    <Card className={`hover:shadow-md transition-shadow ${className}`}>
      <CardContent className="p-4">
        {/* Header con estado y código */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div
              className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}
            >
              <div className={`w-2 h-2 rounded-full ${status.dotColor}`}></div>
              <span>{status.label}</span>
            </div>
            <span className={`text-sm font-medium ${priority.color}`}>
              {priority.label}
            </span>
          </div>
          <span className="text-sm font-mono text-gray-500">#{order.code}</span>
        </div>

        {/* Información del cliente */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center space-x-2">
            <User size={16} className="text-gray-400" />
            <span className="text-sm font-medium">{order.client.name}</span>
          </div>

          {order.address && (
            <div className="flex items-center space-x-2">
              <MapPin size={16} className="text-gray-400" />
              <span className="text-sm text-gray-600 truncate">
                {order.address}
              </span>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Calendar size={16} className="text-gray-400" />
            <span className="text-sm text-gray-600">
              Pedido: {formatDate(order.orderDate)}
            </span>
          </div>

          {order.deliveryDate && (
            <div className="flex items-center space-x-2">
              <Calendar size={16} className="text-gray-400" />
              <span className="text-sm text-gray-600">
                Entrega: {formatDate(order.deliveryDate)}
              </span>
            </div>
          )}
        </div>

        {/* Métricas del pedido */}
        <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1">
              <Package size={14} className="text-gray-400" />
              <span className="text-xs text-gray-500">Productos</span>
            </div>
            <p className="font-semibold text-sm">{order.items.length}</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center space-x-1">
              <DollarSign size={14} className="text-gray-400" />
              <span className="text-xs text-gray-500">Total</span>
            </div>
            <p className="font-semibold text-sm">
              $
              {order.total.toLocaleString("es-MX", {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(order.id)}
            className="flex-1"
          >
            <Eye size={14} className="mr-1" />
            Ver Detalles
          </Button>

          <Button variant="outline" size="sm" onClick={() => onEdit(order.id)}>
            <Edit size={14} />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(order.id)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
