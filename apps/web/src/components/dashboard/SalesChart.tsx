/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { useChartTheme } from "@/hooks/useChartTheme";
import { useTranslations, useLocale } from "next-intl";

interface SalesData {
  date: string;
  sales: number;
  orders: number;
  label?: string;
}

interface SalesChartProps {
  data: SalesData[];
  title?: string;
  subtitle?: string;
  type?: "line" | "area";
  color?: string;
  height?: number;
  isLoading?: boolean;
  className?: string;
}

export const SalesChart: React.FC<SalesChartProps> = ({
  data,
  title,
  subtitle,
  type = "area",
  color = "#06b6d4",
  height = 300,
  isLoading = false,
  className = "",
}) => {
  const ct = useChartTheme();
  const t = useTranslations("dashboard.salesChart");
  const locale = useLocale();
  const resolvedTitle = title ?? t("title");
  const resolvedSubtitle = subtitle ?? t("subtitle");

  // Formatear valores para mostrar en el tooltip
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString(locale);
  };

  // Componente personalizado para el tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 rounded-lg shadow-lg" style={{ backgroundColor: ct.tooltipBg, border: "1px solid " + ct.tooltipBorder }}>
          <p className="text-sm font-medium mb-2" style={{ color: ct.tooltipText }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              ></div>
              <span className="text-sm">
                {entry.dataKey === "sales" ? t("sales") : t("orders")}{" "}
                <span className="font-semibold">
                  {entry.dataKey === "sales"
                    ? formatCurrency(entry.value)
                    : formatNumber(entry.value)}
                </span>
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Calcular métricas rápidas
  const totalSales = data.reduce((sum, item) => sum + item.sales, 0);
  const totalOrders = data.reduce((sum, item) => sum + item.orders, 0);
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-6 bg-surface-3 rounded w-32 mb-2"></div>
            <div className="h-4 bg-surface-3 rounded w-48"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-64 bg-surface-3 rounded"></div>
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
            <h3 className="text-lg font-semibold text-foreground">{resolvedTitle}</h3>
            <p className="text-sm text-foreground/70">{resolvedSubtitle}</p>
          </div>

          {/* Métricas rápidas */}
          <div className="flex space-x-6 text-right">
            <div>
              <p className="text-xs text-muted-foreground">{t("totalSales")}</p>
              <p className="text-sm font-semibold text-foreground">
                {formatCurrency(totalSales)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("ordersLabel")}</p>
              <p className="text-sm font-semibold text-foreground">
                {formatNumber(totalOrders)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("average")}</p>
              <p className="text-sm font-semibold text-foreground">
                {formatCurrency(avgOrderValue)}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            {type === "area" ? (
              <AreaChart data={data}>
                <defs>
                  <linearGradient
                    id="salesGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  stroke={ct.axis}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke={ct.axis}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke={color}
                  strokeWidth={2}
                  fill="url(#salesGradient)"
                />
              </AreaChart>
            ) : (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  stroke={ct.axis}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke={ct.axis}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke={color}
                  strokeWidth={3}
                  dot={{ fill: color, strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
