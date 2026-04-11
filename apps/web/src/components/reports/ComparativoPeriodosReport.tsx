"use client";

import React, { useState, useCallback, useRef } from "react";
import { Card } from "@tremor/react";
import dynamic from "next/dynamic";
const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { ReportKPICards } from "./ReportKPICards";
import {
  getComparativo,
  ComparativoResponse,
} from "@/services/api/reports";
import { toast } from "@/hooks/useToast";
import { useReportExport } from "@/hooks/useReportExport";
import { useFormatters } from "@/hooks/useFormatters";
import { Search, Download, Loader2, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { useTranslations } from "next-intl";

function monthAgo(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

// METRIC_LABELS is now handled via translations inside the component

export function ComparativoPeriodosReport() {
  const { formatCurrency } = useFormatters();
  const t = useTranslations("reports.comparativo");
  const tMetrics = useTranslations("reports.comparativo.metrics");
  const tCommon = useTranslations("reports.common");
  const tFilters = useTranslations("reports.filters");
  const fmt = (n: number) => formatCurrency(n);
  const METRIC_LABELS: Record<string, string> = {
    totalVentas: tMetrics("totalVentas"),
    cantidadPedidos: tMetrics("cantidadPedidos"),
    ticketPromedio: tMetrics("ticketPromedio"),
    clientesUnicos: tMetrics("clientesUnicos"),
    totalVisitas: tMetrics("totalVisitas"),
    nuevosClientes: tMetrics("nuevosClientes"),
    totalCobros: tMetrics("totalCobros"),
  };
  const [p1Desde, setP1Desde] = useState(monthAgo(2));
  const [p1Hasta, setP1Hasta] = useState(monthAgo(1));
  const [p2Desde, setP2Desde] = useState(monthAgo(1));
  const [p2Hasta, setP2Hasta] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<ComparativoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const { exportPDF, exporting } = useReportExport({
    fileName: "comparativo-periodos",
    title: "Comparativo de Períodos",
    dateRange: { desde: p1Desde, hasta: p2Hasta },
    kpis: data
      ? [
          { label: "Ventas P1", value: fmt(data.periodo1.totalVentas) },
          { label: "Ventas P2", value: fmt(data.periodo2.totalVentas) },
          { label: "Variación", value: `${data.deltas.totalVentas?.porcentajeCambio ?? 0}%` },
        ]
      : undefined,
    chartRef,
    table: data
      ? {
          headers: ["Métrica", "Período 1", "Período 2", "Diferencia", "% Cambio"],
          rows: Object.entries(data.deltas).map(([key, d]) => [
            METRIC_LABELS[key] || key,
            key.includes("Ventas") || key.includes("Cobros") || key.includes("Promedio")
              ? fmt(d.valor1)
              : d.valor1,
            key.includes("Ventas") || key.includes("Cobros") || key.includes("Promedio")
              ? fmt(d.valor2)
              : d.valor2,
            key.includes("Ventas") || key.includes("Cobros") || key.includes("Promedio")
              ? fmt(d.diferencia)
              : d.diferencia,
            `${d.porcentajeCambio}%`,
          ]),
        }
      : undefined,
  });

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getComparativo({
        periodo1Desde: p1Desde,
        periodo1Hasta: p1Hasta,
        periodo2Desde: p2Desde,
        periodo2Hasta: p2Hasta,
      });
      setData(res);
    } catch {
      toast.error(tCommon("errorLoading"));
    } finally {
      setLoading(false);
    }
  }, [p1Desde, p1Hasta, p2Desde, p2Hasta]);

  const chartData = data
    ? Object.entries(data.deltas).map(([key, d]) => ({
        name: METRIC_LABELS[key] || key,
        periodo1: Number(d.valor1),
        periodo2: Number(d.valor2),
      }))
    : [];

  return (
    <div className="space-y-4">
      {/* Custom filters for 4 date pickers */}
      <div className="flex flex-wrap items-end gap-3 p-4 bg-surface-1 rounded-lg border border-border-subtle">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase">{tCommon("period1")}</span>
          <div className="flex gap-2">
            <DateTimePicker mode="date" label="Desde" value={p1Desde} onChange={setP1Desde} />
            <DateTimePicker mode="date" label="Hasta" value={p1Hasta} onChange={setP1Hasta} />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase">{tCommon("period2")}</span>
          <div className="flex gap-2">
            <DateTimePicker mode="date" label="Desde" value={p2Desde} onChange={setP2Desde} />
            <DateTimePicker mode="date" label="Hasta" value={p2Hasta} onChange={setP2Hasta} />
          </div>
        </div>
        <button
          onClick={fetch}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-success-foreground bg-success rounded-md hover:bg-success/90 disabled:opacity-50"
        >
          <Search className="w-3.5 h-3.5" />
          {loading ? tFilters("loading") : tFilters("apply")}
        </button>
        {data && (
          <button
            onClick={exportPDF}
            disabled={exporting}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-foreground/80 bg-white border border-border-default rounded-md hover:bg-surface-1 disabled:opacity-50 ml-auto"
          >
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {exporting ? tFilters("exporting") : "PDF"}
          </button>
        )}
      </div>

      {data && (
        <>
          <ReportKPICards
            cards={[
              { label: t("salesP1"), value: fmt(data.periodo1.totalVentas), color: "blue" },
              { label: t("salesP2"), value: fmt(data.periodo2.totalVentas), color: "green" },
              {
                label: t("salesVariation"),
                value: `${data.deltas.totalVentas?.porcentajeCambio ?? 0}%`,
                color: (data.deltas.totalVentas?.porcentajeCambio ?? 0) >= 0 ? "green" : "red",
              },
            ]}
          />

          {chartData.length > 0 && (
            <Card ref={chartRef as React.RefObject<HTMLDivElement>}>
              <h3 className="text-sm font-semibold text-foreground/80 mb-3">{t("chartTitle")}</h3>
              <ApexChart
                type="bar"
                options={{
                  chart: { type: "bar", toolbar: { show: true }, animations: { enabled: true, speed: 700 } },
                  plotOptions: { bar: { borderRadius: 6, columnWidth: "40%" } },
                  colors: ["#94a3b8", "#10b981"],
                  grid: { borderColor: "#f3f4f6", strokeDashArray: 3 },
                  dataLabels: { enabled: false },
                  xaxis: { categories: chartData.map(c => c.name), labels: { style: { fontSize: "10px", colors: "#9ca3af" }, rotate: -20 } },
                  yaxis: { labels: { style: { fontSize: "11px", colors: "#9ca3af" } } },
                  legend: { position: "top", fontSize: "12px" },
                  tooltip: { shared: true },
                }}
                series={[
                  { name: tCommon("period1"), data: chartData.map(c => c.periodo1) },
                  { name: tCommon("period2"), data: chartData.map(c => c.periodo2) },
                ]}
                height={320}
              />
            </Card>
          )}

          {/* Delta table */}
          <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-1 border-b border-border-subtle">
                  <th className="text-left px-4 py-3 font-semibold text-foreground/70">{t("metricLabel")}</th>
                  <th className="text-right px-4 py-3 font-semibold text-foreground/70">{tCommon("period1")}</th>
                  <th className="text-right px-4 py-3 font-semibold text-foreground/70">{tCommon("period2")}</th>
                  <th className="text-right px-4 py-3 font-semibold text-foreground/70">{t("difference")}</th>
                  <th className="text-right px-4 py-3 font-semibold text-foreground/70">{t("changePercent")}</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.deltas).map(([key, d]) => {
                  const isMoney = key.includes("Ventas") || key.includes("Cobros") || key.includes("Promedio");
                  const TrendIcon = d.porcentajeCambio > 0 ? ArrowUp : d.porcentajeCambio < 0 ? ArrowDown : Minus;
                  const trendColor =
                    d.porcentajeCambio > 0
                      ? "text-green-600"
                      : d.porcentajeCambio < 0
                      ? "text-red-600"
                      : "text-muted-foreground";
                  return (
                    <tr key={key} className="border-b border-border-subtle hover:bg-surface-1">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {METRIC_LABELS[key] || key}
                      </td>
                      <td className="px-4 py-3 text-right text-foreground/70">
                        {isMoney ? fmt(d.valor1) : d.valor1}
                      </td>
                      <td className="px-4 py-3 text-right text-foreground/70">
                        {isMoney ? fmt(d.valor2) : d.valor2}
                      </td>
                      <td className="px-4 py-3 text-right text-foreground/70">
                        {isMoney ? fmt(d.diferencia) : d.diferencia}
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${trendColor}`}>
                        <span className="inline-flex items-center gap-1">
                          <TrendIcon className="w-3.5 h-3.5" />
                          {d.porcentajeCambio}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
