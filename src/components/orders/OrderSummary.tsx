import React from "react";
import { Card, CardContent } from '@/components/ui';
import {
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
} from "lucide-react";

interface OrderSummaryProps {
  totalOrders: number;
  pendingOrders: number;
  inProgressOrders: number;
  completedOrders: number;
  totalValue: number;
  className?: string;
}

interface SummaryCardProps {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: "blue" | "yellow" | "green" | "red" | "purple";
  className?: string;
}

const colorMap = {
  blue: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    icon: "text-blue-500",
  },
  yellow: {
    bg: "bg-yellow-50",
    text: "text-yellow-600",
    icon: "text-yellow-500",
  },
  green: {
    bg: "bg-green-50",
    text: "text-green-600",
    icon: "text-green-500",
  },
  red: {
    bg: "bg-red-50",
    text: "text-red-600",
    icon: "text-red-500",
  },
  purple: {
    bg: "bg-purple-50",
    text: "text-purple-600",
    icon: "text-purple-500",
  },
};

const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  icon: Icon,
  color,
  className = "",
}) => {
  const colors = colorMap[color];

  return (
    <Card className={`${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${colors.bg}`}>
              <Icon size={20} className={colors.icon} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className={`text-2xl font-bold ${colors.text}`}>
                {typeof value === "number" && title.includes("$")
                  ? `$${value.toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })} MXN`
                  : value}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  totalOrders,
  pendingOrders,
  inProgressOrders,
  completedOrders,
  totalValue,
  className = "",
}) => {
  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 ${className}`}
    >
      <SummaryCard
        title="Total Pedidos"
        value={totalOrders}
        icon={Package}
        color="blue"
      />

      <SummaryCard
        title="Pendientes"
        value={pendingOrders}
        icon={Clock}
        color="yellow"
      />

      <SummaryCard
        title="En Proceso"
        value={inProgressOrders}
        icon={AlertCircle}
        color="red"
      />

      <SummaryCard
        title="Completados"
        value={completedOrders}
        icon={CheckCircle}
        color="green"
      />

      <SummaryCard
        title="Valor Total"
        value={totalValue}
        icon={DollarSign}
        color="purple"
      />
    </div>
  );
};
