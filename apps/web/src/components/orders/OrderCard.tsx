import React from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
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

const statusStyles = {
  draft: { color: "bg-surface-3 text-foreground", dotColor: "bg-muted-foreground" },
  confirmed: { color: "bg-blue-100 text-blue-800", dotColor: "bg-blue-400" },
  en_route: { color: "bg-cyan-100 text-cyan-800", dotColor: "bg-cyan-400" },
  delivered: { color: "bg-green-100 text-green-800", dotColor: "bg-green-400" },
  cancelled: { color: "bg-red-100 text-red-800", dotColor: "bg-red-400" },
};

const priorityStyles = {
  low: "text-green-600",
  normal: "text-blue-600",
  high: "text-orange-600",
  urgent: "text-red-600",
};

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onViewDetails,
  onEdit,
  onDelete,
  className = "",
}) => {
  const t = useTranslations('orders.card');
  const locale = useLocale();
  const status = statusStyles[order.status];
  const priorityColor = priorityStyles[order.priority];

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(locale, {
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
              <span>{t(`status.${order.status}`)}</span>
            </div>
            <span className={`text-sm font-medium ${priorityColor}`}>
              {t(`priority.${order.priority}`)}
            </span>
          </div>
          <span className="text-sm font-mono text-muted-foreground">#{order.code}</span>
        </div>

        {/* Información del cliente */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center space-x-2">
            <User size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium">{order.client.name}</span>
          </div>

          {order.address && (
            <div className="flex items-center space-x-2">
              <MapPin size={16} className="text-muted-foreground" />
              <span className="text-sm text-foreground/70 truncate">
                {order.address}
              </span>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Calendar size={16} className="text-muted-foreground" />
            <span className="text-sm text-foreground/70">
              {t('orderDate')}: {formatDate(order.orderDate)}
            </span>
          </div>

          {order.deliveryDate && (
            <div className="flex items-center space-x-2">
              <Calendar size={16} className="text-muted-foreground" />
              <span className="text-sm text-foreground/70">
                {t('deliveryDate')}: {formatDate(order.deliveryDate)}
              </span>
            </div>
          )}
        </div>

        {/* Métricas del pedido */}
        <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-surface-1 rounded-lg">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1">
              <Package size={14} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{t('products')}</span>
            </div>
            <p className="font-semibold text-sm">{order.items.length}</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center space-x-1">
              <DollarSign size={14} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{t('total')}</span>
            </div>
            <p className="font-semibold text-sm">
              $
              {order.total.toLocaleString(locale, {
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
            {t('viewDetails')}
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
