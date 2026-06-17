import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { useChartTheme } from "@/hooks/useChartTheme";
import { useTranslations } from "next-intl";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

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
  title,
  subtitle,
  type = "stacked",
  height = 300,
  isLoading = false,
  className = "",
}) => {
  const ct = useChartTheme();
  const t = useTranslations("dashboard.visitsChart");
  const resolvedTitle = title ?? t("title");
  const resolvedSubtitle = subtitle ?? t("subtitle");

  // Colores por tipo de visita (mismos que la version recharts)
  const colors = useMemo(
    () => ({
      completadas: "#10b981", // Verde
      pendientes: "#f59e0b", // Amarillo/Naranja
      canceladas: "#ef4444", // Rojo
    }),
    []
  );

  // Totales para las metricas del header
  const totals = useMemo(
    () =>
      data.reduce(
        (acc, item) => ({
          programadas: acc.programadas + item.programadas,
          completadas: acc.completadas + item.completadas,
          canceladas: acc.canceladas + item.canceladas,
          pendientes: acc.pendientes + item.pendientes,
        }),
        { programadas: 0, completadas: 0, canceladas: 0, pendientes: 0 }
      ),
    [data]
  );

  const totalVisits = useMemo(
    () => Object.values(totals).reduce((sum, val) => sum + val, 0),
    [totals]
  );
  const completionRate = useMemo(
    () =>
      totals.programadas > 0
        ? ((totals.completadas / totals.programadas) * 100).toFixed(1)
        : "0",
    [totals]
  );

  const series = useMemo(
    () => [
      { name: t("completed"), data: data.map((d) => d.completadas) },
      { name: t("pending"), data: data.map((d) => d.pendientes) },
      { name: t("cancelled"), data: data.map((d) => d.canceladas) },
    ],
    [data, t]
  );

  const options: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        type: "bar",
        stacked: type === "stacked",
        toolbar: { show: false },
        fontFamily: "inherit",
        animations: { enabled: true, speed: 500 },
      },
      colors: [colors.completadas, colors.pendientes, colors.canceladas],
      plotOptions: {
        bar: {
          borderRadius: 4,
          borderRadiusApplication: "end",
          columnWidth: "60%",
        },
      },
      dataLabels: { enabled: false },
      grid: { borderColor: ct.grid, strokeDashArray: 3, padding: { left: 8, right: 8 } },
      xaxis: {
        categories: data.map((d) => d.date),
        labels: { style: { fontSize: "12px", colors: ct.textSecondary } },
        axisBorder: { color: ct.grid },
        axisTicks: { color: ct.grid },
      },
      yaxis: { labels: { style: { fontSize: "12px", colors: ct.textSecondary } } },
      legend: {
        position: "bottom",
        labels: { colors: ct.textSecondary },
        markers: { size: 6 },
        itemMargin: { horizontal: 10 },
      },
      fill: { opacity: 1 },
      tooltip: {
        shared: true,
        intersect: false,
        custom: ({ series: s, dataPointIndex, w }) => {
          const label = data[dataPointIndex]?.date ?? "";
          let total = 0;
          const rows = (w.globals.seriesNames as string[])
            .map((name, i) => {
              const val = s[i]?.[dataPointIndex] ?? 0;
              total += val;
              const color = w.globals.colors[i];
              return `<div class="flex items-center justify-between gap-4 py-0.5">
                <div class="flex items-center gap-2"><span style="width:10px;height:10px;border-radius:9999px;background:${color};display:inline-block"></span><span style="font-size:13px">${name}</span></div>
                <span style="font-size:13px;font-weight:600">${val}</span></div>`;
            })
            .join("");
          return `<div style="padding:10px 12px;border-radius:8px;background:${ct.tooltipBg};border:1px solid ${ct.tooltipBorder};color:${ct.tooltipText}">
            <p style="font-size:13px;font-weight:500;margin-bottom:6px">${label}</p>
            ${rows}
            <div style="border-top:1px solid ${ct.tooltipBorder};padding-top:4px;margin-top:4px"><div class="flex items-center justify-between"><span style="font-size:13px;font-weight:500">${t("total")}</span><span style="font-size:13px;font-weight:700">${total}</span></div></div>
          </div>`;
        },
      },
    }),
    [type, colors, ct, data, t]
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
              <p className="text-xs text-muted-foreground">{t("totalVisits")}</p>
              <p className="text-sm font-semibold text-foreground">{totalVisits}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("completed")}</p>
              <p className="text-sm font-semibold text-green-600">{totals.completadas}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("successRate")}</p>
              <p className="text-sm font-semibold text-blue-600">{completionRate}%</p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Chart
          key={ct.isDark ? "dark" : "light"}
          type="bar"
          height={height}
          options={options}
          series={series}
        />
      </CardContent>
    </Card>
  );
};
