import React from "react";
import { Card, CardContent } from "@/components/ui/Card";
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
    <Card className={`relative hover:shadow-lg transition-all duration-200 hover:-translate-y-1 ${className} border-0 shadow-sm bg-white rounded-2xl overflow-hidden`}>
      {/* Indicador sutil de color */}
      <div className={`absolute top-0 left-0 w-full h-1 ${colors.accent} opacity-60`}></div>
      
      <CardContent className="p-6">
        {/* Header con título e icono - Estilo Google */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-medium text-gray-600 truncate">
            {title}
          </h3>
          <div className={`p-3 rounded-full ${colors.bg} shadow-sm`}>
            <Icon size={20} className={colors.icon} />
          </div>
        </div>

        {/* Valor principal - Estilo Google */}
        <div className="mb-4">
          <p className={`text-3xl font-normal ${colors.text} mb-1`}>
            {formatValue(value)}
          </p>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>

        {/* Tendencia - Estilo Google */}
        {trend && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getTrendIcon()}
              <span className={`text-sm font-medium ${getTrendColor()}`}>
                {trend.value > 0 ? '+' : ''}{trend.value}%
              </span>
            </div>
            <span className="text-xs text-gray-500">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
