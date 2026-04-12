"use client";

import React, { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { Card } from "@tremor/react";
import { ReportFilters } from "./ReportFilters";
import { ReportKPICards } from "./ReportKPICards";
import { ReportTable, ReportColumn } from "./ReportTable";
import { getEfectividadVisitas, EfectividadVendedor, EfectividadVisitasResponse } from "@/services/api/reports";
import { toast } from "@/hooks/useToast";
import { useReportExport } from "@/hooks/useReportExport";
import { useTranslations } from "next-intl";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

function defaultDates() {
  const h = new Date(); const d = new Date(h); d.setMonth(d.getMonth() - 1);
  return { desde: d.toISOString().slice(0, 10), hasta: h.toISOString().slice(0, 10) };
}

export function EfectividadVisitasReport() {
  const t = useTranslations("reports.efectividadVisitas");
  const tc = useTranslations("reports.common");
  const [dates, setDates] = useState(defaultDates);
  const [data, setData] = useState<EfectividadVisitasResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const { exportPDF, exporting } = useReportExport({
    fileName: "efectividad-visitas", title: t("reportTitle"), dateRange: dates,
    kpis: data ? [
      { label: t("totalVisits"), value: data.resumen.totalVisitas },
      { label: t("withSale"), value: data.resumen.totalConVenta },
      { label: t("conversionRate"), value: `${data.resumen.tasaConversionGeneral}%` },
    ] : undefined, chartRef,
    table: data ? {
      headers: [t("vendor"), t("visits"), t("withSaleCol"), t("ratePct"), t("avgDuration")],
      rows: data.vendedores.map(v => [v.nombre, v.totalVisitas, v.visitasConVenta, `${v.tasaConversion}%`, v.duracionPromedio]),
    } : undefined,
  });

  const loadData = useCallback(async () => {
    try { setLoading(true); setData(await getEfectividadVisitas(dates)); }
    catch { toast.error(tc("errorLoading")); }
    finally { setLoading(false); }
  }, [dates]);

  const columns: ReportColumn<EfectividadVendedor>[] = [
    { key: "nombre", header: t("vendor"), sortable: true },
    { key: "totalVisitas", header: t("visits"), align: "right", sortable: true },
    { key: "visitasConVenta", header: t("withSaleCol"), align: "right", sortable: true },
    { key: "tasaConversion", header: t("ratePct"), align: "right", sortable: true, render: (r) => {
      const color = r.tasaConversion >= 50 ? "text-green-600" : r.tasaConversion >= 30 ? "text-amber-600" : "text-red-600";
      return <span className={`font-semibold ${color}`}>{r.tasaConversion}%</span>;
    }},
    { key: "duracionPromedio", header: t("avgDuration"), align: "right" },
  ];

  const chartOptions: ApexCharts.ApexOptions = {
    chart: { type: "bar", toolbar: { show: true }, animations: { enabled: true, speed: 700 } },
    plotOptions: { bar: { borderRadius: 6, columnWidth: "45%" } },
    colors: ["#94a3b8", "#10b981"],
    grid: { borderColor: "#f3f4f6", strokeDashArray: 3 },
    dataLabels: { enabled: false },
    xaxis: { categories: data?.vendedores.map(v => v.nombre) || [], labels: { style: { fontSize: "11px", colors: "#9ca3af" } } },
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
            { label: t("totalVisits"), value: data.resumen.totalVisitas, color: "blue" },
            { label: t("withSale"), value: data.resumen.totalConVenta, color: "green" },
            { label: t("conversionRate"), value: `${data.resumen.tasaConversionGeneral}%`, color: "blue" },
          ]} />
          {data.vendedores.length > 0 && (
            <Card ref={chartRef as React.RefObject<HTMLDivElement>}>
              <Chart type="bar" options={chartOptions} series={[
                { name: t("totalBar"), data: data.vendedores.map(v => v.totalVisitas) },
                { name: t("withSaleBar"), data: data.vendedores.map(v => v.visitasConVenta) },
              ]} height={320} />
            </Card>
          )}
          <ReportTable data={data.vendedores as unknown as Record<string, unknown>[]} columns={columns as unknown as ReportColumn<Record<string, unknown>>[]} />
        </>
      )}
    </div>
  );
}
