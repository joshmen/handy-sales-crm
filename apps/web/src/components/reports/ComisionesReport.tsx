"use client";

import React, { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { Card } from "@tremor/react";
import { ReportFilters } from "./ReportFilters";
import { ReportKPICards } from "./ReportKPICards";
import { ReportTable, ReportColumn } from "./ReportTable";
import { getComisiones, ComisionVendedor, ComisionesResponse } from "@/services/api/reports";
import { toast } from "@/hooks/useToast";
import { useReportExport } from "@/hooks/useReportExport";
import { useFormatters } from "@/hooks/useFormatters";
import { useTranslations } from "next-intl";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

function defaultDates() {
  const h = new Date(); const d = new Date(h); d.setMonth(d.getMonth() - 1);
  return { desde: d.toISOString().slice(0, 10), hasta: h.toISOString().slice(0, 10) };
}

export function ComisionesReport() {
  const { formatCurrency } = useFormatters();
  const t = useTranslations("reports.comisionesReport");
  const tc = useTranslations("reports.common");
  const fmt = (n: number) => formatCurrency(n);
  const [dates, setDates] = useState(defaultDates);
  const [porcentaje, setPorcentaje] = useState(5);
  const [data, setData] = useState<ComisionesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const { exportPDF, exporting } = useReportExport({
    fileName: "comisiones", title: t("reportTitle"), dateRange: dates,
    kpis: data ? [
      { label: t("totalSales"), value: fmt(data.totalVentas) },
      { label: t("totalCommissions"), value: fmt(data.totalComisiones) },
      { label: t("appliedPct"), value: `${data.porcentajeAplicado}%` },
    ] : undefined, chartRef,
    table: data ? {
      headers: [t("vendor"), t("sales"), t("orders"), t("commission")],
      rows: data.vendedores.map(v => [v.nombre, fmt(v.totalVentas), v.cantidadPedidos, fmt(v.comision)]),
      footerRow: [tc("total"), fmt(data.totalVentas), "", fmt(data.totalComisiones)],
    } : undefined,
  });

  const loadData = useCallback(async () => {
    try { setLoading(true); setData(await getComisiones({ ...dates, porcentaje })); }
    catch { toast.error(tc("errorLoading")); }
    finally { setLoading(false); }
  }, [dates, porcentaje]);

  const columns: ReportColumn<ComisionVendedor>[] = [
    { key: "nombre", header: t("vendor"), sortable: true },
    { key: "totalVentas", header: t("sales"), align: "right", sortable: true, render: r => fmt(r.totalVentas) },
    { key: "cantidadPedidos", header: t("orders"), align: "right", sortable: true },
    { key: "comision", header: t("commission"), align: "right", sortable: true, render: r => <span className="font-semibold text-green-600">{fmt(r.comision)}</span> },
  ];

  const chartOptions: ApexCharts.ApexOptions = {
    chart: { type: "bar", toolbar: { show: true }, animations: { enabled: true, speed: 700 } },
    plotOptions: { bar: { borderRadius: 6, columnWidth: "50%" } },
    colors: ["#10b981"],
    grid: { borderColor: "#f3f4f6", strokeDashArray: 3 },
    dataLabels: { enabled: true, formatter: (v) => fmt(Number(v)), style: { fontSize: "11px", colors: ["#374151"] } },
    xaxis: { categories: data?.vendedores.map(v => v.nombre) || [], labels: { style: { fontSize: "11px", colors: "#9ca3af" } } },
    yaxis: { labels: { formatter: (v) => `$${(v / 1000).toFixed(0)}k`, style: { fontSize: "11px", colors: "#9ca3af" } } },
    tooltip: { y: { formatter: (v) => fmt(v) } },
  };

  return (
    <div className="space-y-4">
      <ReportFilters desde={dates.desde} hasta={dates.hasta} onDesdeChange={v => setDates(d => ({ ...d, desde: v }))} onHastaChange={v => setDates(d => ({ ...d, hasta: v }))} onApply={loadData} loading={loading} onExportPDF={data ? exportPDF : undefined} exporting={exporting}>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-foreground/70">{t("commissionPct")}</label>
          <input type="number" value={porcentaje} onChange={e => setPorcentaje(Number(e.target.value))} min={0} max={100} step={0.5} className="px-3 py-2 text-sm border border-border-default rounded-md w-20" />
        </div>
      </ReportFilters>
      {!data && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-sm">{tc("clickApply")}</p>
        </div>
      )}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}
      {data && data.vendedores.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-sm font-medium">{tc("noData")}</p>
          <p className="text-xs mt-1">{tc("tryDifferentDates")}</p>
        </div>
      )}
      {data && data.vendedores.length > 0 && (
        <>
          <ReportKPICards cards={[
            { label: t("totalSales"), value: fmt(data.totalVentas), color: "blue" },
            { label: t("totalCommissions"), value: fmt(data.totalComisiones), color: "green" },
            { label: t("appliedPct"), value: `${data.porcentajeAplicado}%`, color: "amber" },
          ]} />
          {data.vendedores.length > 0 && (
            <Card ref={chartRef as React.RefObject<HTMLDivElement>}>
              <Chart type="bar" options={chartOptions} series={[{ name: t("chartName"), data: data.vendedores.map(v => v.comision) }]} height={320} />
            </Card>
          )}
          <ReportTable data={data.vendedores as unknown as Record<string, unknown>[]} columns={columns as unknown as ReportColumn<Record<string, unknown>>[]} footerRow={{ nombre: tc("total"), totalVentas: fmt(data.totalVentas), cantidadPedidos: "", comision: fmt(data.totalComisiones) }} />
        </>
      )}
    </div>
  );
}
