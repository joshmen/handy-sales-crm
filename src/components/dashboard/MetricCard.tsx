import React from "react";
import { Card, CardContent } from '@/components/ui';
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  color?: "blue" | "green" | "purple" | "orange" | "red" | "gray";
  isLoading?: boolean;
  className?: string;
}

const colorConfig = {
  blue: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    icon: "text-blue-500",
    accent: "bg-blue-500",
  },
  green: {
    bg: "bg-green-50",
    text: "text-green-600",
    icon: "text-green-500",
    accent: "bg-green-500",
  },
  purple: {
    bg: "bg-purple-50",
    text: "text-purple-600",
    icon: "text-purple-500",
    accent: "bg-purple-500",
  },
  orange: {
    bg: "bg-orange-50",
    text: "text-orange-600",
    icon: "text-orange-500",
    accent: "bg-orange-500",
  },
  red: {
    bg: "bg-red-50",
    text: "text-red-600",
    icon: "text-red-500",
    accent: "bg-red-500",
  },
  gray: {
    bg: "bg-gray-50",
    text: "text-gray-600",
    icon: "text-gray-500",
    accent: "bg-gray-500",
  },
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "blue",
  isLoading = false,
  className = "",
}) => {
  const colors = colorConfig[color];

  const formatValue = (val: string | number) => {
    if (typeof val === "number") {
      // Si es un número grande, usar formato con comas
      if (val >= 1000) {
        return val.toLocaleString("es-MX");
      }
      return val.toString();
    }
    return val;
  };

  const getTrendIcon = () => {
    if (!trend) return null;

    if (trend.value > 0) {
      return <TrendingUp size={16} className="text-green-500" />;
    } else if (trend.value < 0) {
      return <TrendingDown size={16} className="text-red-500" />;
    } else {
      return <Minus size={16} className="text-gray-400" />;
    }
  };

  const getTrendColor = () => {
    if (!trend) return "text-gray-500";

    // Si se especifica isPositive, usar esa lógica
    if (trend.isPositive !== undefined) {
      return trend.isPositive ? "text-green-600" : "text-red-600";
    }

    // Sino, usar el valor numérico
    if (trend.value > 0) return "text-green-600";
    if (trend.value < 0) return "text-red-600";
    return "text-gray-500";
  };

  if (isLoading) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-20"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`hover:shadow-md transition-shadow ${className}`}>
      <CardContent className="p-6">
        {/* Header con título e icono */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-600 truncate">
            {title}
          </h3>
          <div className={`p-2 rounded-lg ${colors.bg}`}>
            <Icon size={20} className={colors.icon} />
          </div>
        </div>

        {/* Valor principal */}
        <div className="mb-2">
          <p className={`text-2xl font-bold ${colors.text}`}>
            {formatValue(value)}
          </p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>

        {/* Tendencia */}
        {trend && (
          <div className="flex items-center space-x-1">
            {getTrendIcon()}
            <span className={`text-sm font-medium ${getTrendColor()}`}>
              {Math.abs(trend.value)}%
            </span>
            <span className="text-sm text-gray-500">{trend.label}</span>
          </div>
        )}

        {/* Barra de acento en la parte inferior */}
        <div className={`h-1 ${colors.accent} rounded-full mt-4`}></div>
      </CardContent>
    </Card>
  );
};
