import React, { useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { useChartTheme } from "@/hooks/useChartTheme";
import { useTranslations, useLocale } from "next-intl";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

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

  // Formatear valores para mostrar en el tooltip — memoized to avoid recreating Intl objects
  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }, [locale]);

  const formatNumber = useCallback((value: number) => {
    return value.toLocaleString(locale);
  }, [locale]);

  // YAxis tick formatter — memoized to keep stable reference
  const yAxisTickFormatter = useCallback((value: number) => `$${(value / 1000).toFixed(0)}k`, []);

  // Calcular métricas rápidas — memoized since data array can be large
  const { totalSales, totalOrders, avgOrderValue } = useMemo(() => {
    const sales = data.reduce((sum, item) => sum + item.sales, 0);
    const orders = data.reduce((sum, item) => sum + item.orders, 0);
    return {
      totalSales: sales,
      totalOrders: orders,
      avgOrderValue: orders > 0 ? sales / orders : 0,
    };
  }, [data]);

  // Solo graficamos la serie de ventas (igual que la version recharts)
  const series = useMemo(
    () => [{ name: t("sales"), data: data.map((d) => d.sales) }],
    [data, t]
  );

  const options: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        type: type === "area" ? "area" : "line",
        toolbar: { show: false },
        fontFamily: "inherit",
        animations: { enabled: true, speed: 500 },
        zoom: { enabled: false },
      },
      colors: [color],
      stroke: {
        curve: "smooth",
        width: type === "area" ? 2 : 3,
      },
      markers: {
        size: type === "area" ? 0 : 4,
        strokeWidth: 0,
        hover: { size: 6 },
      },
      dataLabels: { enabled: false },
      grid: { borderColor: ct.grid, strokeDashArray: 3, padding: { left: 8, right: 8 } },
      xaxis: {
        categories: data.map((d) => d.date),
        labels: { style: { fontSize: "12px", colors: ct.textSecondary } },
        axisBorder: { color: ct.grid },
        axisTicks: { color: ct.grid },
        tooltip: { enabled: false },
      },
      yaxis: {
        labels: {
          style: { fontSize: "12px", colors: ct.textSecondary },
          formatter: (value: number) => yAxisTickFormatter(value),
        },
      },
      legend: { show: false },
      fill:
        type === "area"
          ? {
              type: "gradient",
              gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.3,
                opacityTo: 0,
                stops: [5, 95],
              },
            }
          : { type: "solid", opacity: 1 },
      tooltip: {
        shared: true,
        intersect: false,
        custom: ({ dataPointIndex }) => {
          const point = data[dataPointIndex];
          if (!point) return "";
          const label = point.label ?? point.date;
          const salesRow = `<div class="flex items-center space-x-2" style="display:flex;align-items:center;gap:8px">
            <span style="width:12px;height:12px;border-radius:9999px;background:${color};display:inline-block"></span>
            <span style="font-size:13px">${t("sales")} <span style="font-weight:600">${formatCurrency(point.sales)}</span></span>
          </div>`;
          const ordersRow = `<div class="flex items-center space-x-2" style="display:flex;align-items:center;gap:8px;margin-top:4px">
            <span style="width:12px;height:12px;border-radius:9999px;background:${ct.textMuted};display:inline-block"></span>
            <span style="font-size:13px">${t("orders")} <span style="font-weight:600">${formatNumber(point.orders)}</span></span>
          </div>`;
          return `<div style="padding:10px 12px;border-radius:8px;background:${ct.tooltipBg};border:1px solid ${ct.tooltipBorder};color:${ct.tooltipText}">
            <p style="font-size:13px;font-weight:500;margin-bottom:6px">${label}</p>
            ${salesRow}
            ${ordersRow}
          </div>`;
        },
      },
    }),
    [type, color, ct, data, t, locale, formatCurrency, formatNumber, yAxisTickFormatter]
  );

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
        <Chart
          key={ct.isDark ? "dark" : "light"}
          type={type === "area" ? "area" : "line"}
          height={height}
          options={options}
          series={series}
        />
      </CardContent>
    </Card>
  );
};
