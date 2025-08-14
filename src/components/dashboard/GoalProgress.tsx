import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import {
  Target,
  TrendingUp,
  Calendar,
  Users,
  DollarSign,
  Package,
  CheckCircle,
  Clock,
} from "lucide-react";

interface Goal {
  id: string;
  title: string;
  current: number;
  target: number;
  unit: string;
  type: "sales" | "visits" | "orders" | "clients" | "general";
  deadline?: Date;
  color?: "blue" | "green" | "purple" | "orange" | "red";
}

interface GoalProgressProps {
  goals: Goal[];
  title?: string;
  subtitle?: string;
  isLoading?: boolean;
  className?: string;
}

type ColorKey = "blue" | "green" | "purple" | "orange" | "red";

const goalIcons = {
  sales: DollarSign,
  visits: Calendar,
  orders: Package,
  clients: Users,
  general: Target,
};

const colorConfig: Record<
  ColorKey,
  {
    bg: string;
    progress: string;
    text: string;
    light: string;
  }
> = {
  blue: {
    bg: "bg-blue-100",
    progress: "bg-blue-500",
    text: "text-blue-600",
    light: "bg-blue-50",
  },
  green: {
    bg: "bg-green-100",
    progress: "bg-green-500",
    text: "text-green-600",
    light: "bg-green-50",
  },
  purple: {
    bg: "bg-purple-100",
    progress: "bg-purple-500",
    text: "text-purple-600",
    light: "bg-purple-50",
  },
  orange: {
    bg: "bg-orange-100",
    progress: "bg-orange-500",
    text: "text-orange-600",
    light: "bg-orange-50",
  },
  red: {
    bg: "bg-red-100",
    progress: "bg-red-500",
    text: "text-red-600",
    light: "bg-red-50",
  },
};

export const GoalProgress: React.FC<GoalProgressProps> = ({
  goals,
  title = "Metas y Objetivos",
  subtitle = "Progreso hacia los objetivos establecidos",
  isLoading = false,
  className = "",
}) => {
  const formatValue = (value: number, unit: string) => {
    if (unit === "currency" || unit === "$") {
      return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }

    if (unit === "percentage" || unit === "%") {
      return `${value}%`;
    }

    return `${value.toLocaleString("es-MX")} ${unit}`;
  };

  const calculateProgress = (current: number, target: number) => {
    if (target === 0) return 0;
    const progress = (current / target) * 100;
    return Math.min(progress, 100); // Cap at 100%
  };

  const getProgressColor = (
    progress: number,
    baseColor: ColorKey = "blue"
  ): ColorKey => {
    if (progress >= 100) return "green";
    if (progress >= 75) return baseColor;
    if (progress >= 50) return "orange";
    return "red";
  };

  const getDaysRemaining = (deadline?: Date) => {
    if (!deadline) return null;

    const today = new Date();
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "Vencido";
    if (diffDays === 0) return "Hoy";
    if (diffDays === 1) return "1 día";
    return `${diffDays} días`;
  };

  const getOverallProgress = () => {
    if (goals.length === 0) return 0;

    const totalProgress = goals.reduce((sum, goal) => {
      return sum + calculateProgress(goal.current, goal.target);
    }, 0);

    return totalProgress / goals.length;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-48"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600">{subtitle}</p>
          </div>

          {/* Progreso general */}
          <div className="text-right">
            <p className="text-xs text-gray-500">Progreso General</p>
            <p className="text-lg font-bold text-gray-900">
              {getOverallProgress().toFixed(1)}%
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {goals.map((goal) => {
            const Icon = goalIcons[goal.type];
            const progress = calculateProgress(goal.current, goal.target);
            const progressColor = getProgressColor(
              progress,
              goal.color || "blue"
            );
            const colors = colorConfig[progressColor];
            const daysRemaining = getDaysRemaining(goal.deadline);

            return (
              <div key={goal.id} className="space-y-3">
                {/* Header de la meta */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${colors.light}`}>
                      <Icon size={16} className={colors.text} />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {goal.title}
                      </h4>
                      {daysRemaining && (
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          <Clock size={12} />
                          <span>{daysRemaining}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {progress.toFixed(1)}%
                    </p>
                    {progress >= 100 && (
                      <CheckCircle
                        size={16}
                        className="text-green-500 ml-auto"
                      />
                    )}
                  </div>
                </div>

                {/* Barra de progreso */}
                <div className="space-y-1">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${colors.progress}`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    ></div>
                  </div>

                  {/* Valores */}
                  <div className="flex justify-between items-center text-xs text-gray-600">
                    <span>
                      {formatValue(goal.current, goal.unit)} de{" "}
                      {formatValue(goal.target, goal.unit)}
                    </span>
                    <span>
                      Falta:{" "}
                      {formatValue(
                        Math.max(0, goal.target - goal.current),
                        goal.unit
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {goals.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Target size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-sm">No hay metas configuradas</p>
              <p className="text-xs">
                Agrega objetivos para hacer seguimiento del progreso
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
