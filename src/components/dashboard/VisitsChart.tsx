/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardHeader, CardContent } from '@/components/ui';

interface VisitsData {
  date: string;
  programadas: number;
  completadas: number;
  canceladas: number;
  pendientes: number;
  label?: string;
}

interface VisitsChartProps {
  data: VisitsData[];
  title?: string;
  subtitle?: string;
  type?: "stacked" | "grouped";
  height?: number;
  isLoading?: boolean;
  className?: string;
}

export const VisitsChart: React.FC<VisitsChartProps> = ({
  data,
  title = "Visitas",
  subtitle = "Estado de visitas por período",
  type = "stacked",
  height = 300,
  isLoading = false,
  className = "",
}) => {
  // Colores para cada tipo de visita
  const colors = {
    programadas: "#3b82f6", // Azul
    completadas: "#10b981", // Verde
    canceladas: "#ef4444", // Rojo
    pendientes: "#f59e0b", // Amarillo/Naranja
  };

  // Componente personalizado para el tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce(
        (sum: number, entry: any) => sum + entry.value,
        0
      );

      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-600 mb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  ></div>
                  <span className="text-sm capitalize">{entry.dataKey}:</span>
                </div>
                <span className="text-sm font-semibold">{entry.value}</span>
              </div>
            ))}
            <div className="border-t pt-1 mt-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total:</span>
                <span className="text-sm font-bold">{total}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calcular métricas totales
  const totals = data.reduce(
    (acc, item) => ({
      programadas: acc.programadas + item.programadas,
      completadas: acc.completadas + item.completadas,
      canceladas: acc.canceladas + item.canceladas,
      pendientes: acc.pendientes + item.pendientes,
    }),
    { programadas: 0, completadas: 0, canceladas: 0, pendientes: 0 }
  );

  const totalVisits = Object.values(totals).reduce((sum, val) => sum + val, 0);
  const completionRate =
    totals.programadas > 0
      ? ((totals.completadas / totals.programadas) * 100).toFixed(1)
      : "0";

  // Componente personalizado para la leyenda
  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex justify-center space-x-6 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center space-x-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            ></div>
            <span className="text-sm text-gray-600 capitalize">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
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
          <div className="animate-pulse">
            <div className="h-64 bg-gray-200 rounded"></div>
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

          {/* Métricas rápidas */}
          <div className="flex space-x-6 text-right">
            <div>
              <p className="text-xs text-gray-500">Total Visitas</p>
              <p className="text-sm font-semibold text-gray-900">
                {totalVisits}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Completadas</p>
              <p className="text-sm font-semibold text-green-600">
                {totals.completadas}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Tasa Éxito</p>
              <p className="text-sm font-semibold text-blue-600">
                {completionRate}%
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#6b7280" />
              <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />

              <Bar
                dataKey="completadas"
                stackId={type === "stacked" ? "visits" : undefined}
                fill={colors.completadas}
                radius={type === "stacked" ? [0, 0, 0, 0] : [2, 2, 0, 0]}
              />
              <Bar
                dataKey="pendientes"
                stackId={type === "stacked" ? "visits" : undefined}
                fill={colors.pendientes}
                radius={type === "stacked" ? [0, 0, 0, 0] : [2, 2, 0, 0]}
              />
              <Bar
                dataKey="canceladas"
                stackId={type === "stacked" ? "visits" : undefined}
                fill={colors.canceladas}
                radius={type === "stacked" ? [2, 2, 0, 0] : [2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
