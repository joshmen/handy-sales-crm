"use client";

import React, { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { Card } from "@tremor/react";
import { ReportFilters } from "./ReportFilters";
import { ReportKPICards } from "./ReportKPICards";
import { ReportTable, ReportColumn } from "./ReportTable";
import { getCumplimientoMetas, MetaCumplimiento, CumplimientoMetasResponse } from "@/services/api/reports";
import { toast } from "@/hooks/useToast";
import { useReportExport } from "@/hooks/useReportExport";
import { useFormatters } from "@/hooks/useFormatters";
import { useTranslations } from "next-intl";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

function defaultDates() {
  const h = new Date(); const d = new Date(h); d.setMonth(d.getMonth() - 1);
  return { desde: d.toISOString().slice(0, 10), hasta: h.toISOString().slice(0, 10) };
}

export function CumplimientoMetasReport() {
  const { formatCurrency } = useFormatters();
  const t = useTranslations("reports.cumplimientoMetas");
  const tc = useTranslations("reports.common");
  const fmt = (n: number) => formatCurrency(n);

  const TIPO_LABELS: Record<string, string> = { ventas: t("types.ventas"), visitas: t("types.visitas"), pedidos: t("types.pedidos") };

  const [dates, setDates] = useState(defaultDates);
  const [data, setData] = useState<CumplimientoMetasResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const { exportPDF, exporting } = useReportExport({
    fileName: "cumplimiento-metas", title: t("totalGoals"), dateRange: dates,
    kpis: data ? [
      { label: t("totalGoals"), value: data.resumen.totalMetas },
      { label: t("achieved"), value: data.resumen.cumplidas },
      { label: t("notAchieved"), value: data.resumen.noCumplidas },
      { label: t("avgAchievement"), value: `${data.resumen.promedioCumplimiento}%` },
    ] : undefined, chartRef,
    table: data ? {
      headers: [t("vendor"), t("type"), t("goal"), t("actual"), t("achievementPct"), t("status")],
      rows: data.metas.map(m => [m.vendedor, TIPO_LABELS[m.tipo] || m.tipo, m.tipo === "ventas" ? fmt(m.meta) : m.meta, m.tipo === "ventas" ? fmt(m.actual) : m.actual, `${m.porcentajeCumplimiento}%`, m.cumplida ? t("statusAchieved") : t("statusPending")]),
    } : undefined,
  });

  const loadData = useCallback(async () => {
    try { setLoading(true); setData(await getCumplimientoMetas(dates)); }
    catch { toast.error(tc("errorLoading")); }
    finally { setLoading(false); }
  }, [dates]);

  const chartData = data ? data.metas.map(m => ({ name: m.vendedor.split(" ")[0], meta: Number(m.meta), actual: Number(m.actual) })) : [];

  const columns: ReportColumn<MetaCumplimiento>[] = [
    { key: "vendedor", header: t("vendor"), sortable: true },
    { key: "tipo", header: t("type"), render: (r) => <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{TIPO_LABELS[r.tipo] || r.tipo}</span> },
    { key: "periodo", header: t("period") },
    { key: "meta", header: t("goal"), align: "right", sortable: true, render: (r) => r.tipo === "ventas" ? fmt(r.meta) : String(r.meta) },
    { key: "actual", header: t("actual"), align: "right", sortable: true, render: (r) => r.tipo === "ventas" ? fmt(r.actual) : String(r.actual) },
    { key: "porcentajeCumplimiento", header: t("achievementPct"), align: "right", sortable: true, render: (r) => {
      const color = r.porcentajeCumplimiento >= 100 ? "text-green-600" : r.porcentajeCumplimiento >= 70 ? "text-amber-600" : "text-red-600";
      return <span className={`font-semibold ${color}`}>{r.porcentajeCumplimiento}%</span>;
    }},
    { key: "cumplida", header: t("status"), render: (r) => r.cumplida
      ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">{t("statusAchieved")}</span>
      : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">{t("statusPending")}</span>
    },
  ];

  const chartOptions: ApexCharts.ApexOptions = {
    chart: { type: "bar", toolbar: { show: true }, animations: { enabled: true, speed: 700 } },
    plotOptions: { bar: { borderRadius: 6, columnWidth: "40%" } },
    colors: ["#94a3b8", "#10b981"],
    grid: { borderColor: "#f3f4f6", strokeDashArray: 3 },
    dataLabels: { enabled: false },
    xaxis: { categories: chartData.map(c => c.name), labels: { style: { fontSize: "11px", colors: "#9ca3af" } } },
    yaxis: { labels: { style: { fontSize: "11px", colors: "#9ca3af" } } },
    legend: { position: "top", fontSize: "12px" },
    tooltip: { shared: true },
  };

  return (
    <div className="space-y-4">
      <ReportFilters desde={dates.desde} hasta={dates.hasta} onDesdeChange={v => setDates(d => ({ ...d, desde: v }))} onHastaChange={v => setDates(d => ({ ...d, hasta: v }))} onApply={loadData} loading={loading} onExportPDF={data ? exportPDF : undefined} exporting={exporting} />
      {data && (
        <>
          <ReportKPICards cards={[
            { label: t("totalGoals"), value: data.resumen.totalMetas, color: "blue" },
            { label: t("achieved"), value: data.resumen.cumplidas, color: "green" },
            { label: t("notAchieved"), value: data.resumen.noCumplidas, color: "red" },
            { label: t("avgAchievement"), value: `${data.resumen.promedioCumplimiento}%`, color: "amber" },
          ]} />
          {chartData.length > 0 && (
            <Card ref={chartRef as React.RefObject<HTMLDivElement>}>
              <h3 className="text-sm font-semibold text-foreground/80 mb-3">{t("chartTitle")}</h3>
              <Chart type="bar" options={chartOptions} series={[
                { name: t("goalLabel"), data: chartData.map(c => c.meta) },
                { name: t("actualLabel"), data: chartData.map(c => c.actual) },
              ]} height={320} />
            </Card>
          )}
          <ReportTable data={data.metas as unknown as Record<string, unknown>[]} columns={columns as unknown as ReportColumn<Record<string, unknown>>[]} />
        </>
      )}
    </div>
  );
}
