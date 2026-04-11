"use client";

import React, { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { Card } from "@tremor/react";
import { ReportFilters } from "./ReportFilters";
import { ReportKPICards } from "./ReportKPICards";
import { ReportTable, ReportColumn } from "./ReportTable";
import { getAnalisisABC, ABCItem, AnalisisABCResponse } from "@/services/api/reports";
import { toast } from "@/hooks/useToast";
import { useReportExport } from "@/hooks/useReportExport";
import { useFormatters } from "@/hooks/useFormatters";
import { useTranslations } from "next-intl";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

function defaultDates() {
  const h = new Date(); const d = new Date(h); d.setMonth(d.getMonth() - 3);
  return { desde: d.toISOString().slice(0, 10), hasta: h.toISOString().slice(0, 10) };
}

const CLASS_COLORS: Record<string, string> = { A: "text-green-600 bg-green-50", B: "text-amber-600 bg-amber-50", C: "text-red-600 bg-red-50" };

export function AnalisisABCReport() {
  const { formatCurrency } = useFormatters();
  const t = useTranslations("reports.analisisABC");
  const tc = useTranslations("reports.common");
  const fmt = (n: number) => formatCurrency(n);
  const [dates, setDates] = useState(defaultDates);
  const [tipo, setTipo] = useState<"clientes" | "productos">("clientes");
  const [data, setData] = useState<AnalisisABCResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const { exportPDF, exporting } = useReportExport({
    fileName: "analisis-abc", title: `ABC (${tipo === 'clientes' ? t('clients') : t('products')})`, dateRange: dates,
    kpis: data ? [
      { label: t("classA"), value: data.resumen.claseA },
      { label: t("classB"), value: data.resumen.claseB },
      { label: t("classC"), value: data.resumen.claseC },
      { label: t("totalSales"), value: fmt(data.resumen.totalGeneral) },
    ] : undefined, chartRef,
    table: data ? {
      headers: [t("name"), t("sales"), t("pctTotal"), t("pctAccum"), t("class")],
      rows: data.items.map(i => [i.nombre, fmt(i.totalVentas), `${i.porcentaje}%`, `${i.porcentajeAcumulado}%`, i.clase]),
    } : undefined,
  });

  const loadData = useCallback(async () => {
    try { setLoading(true); setData(await getAnalisisABC({ ...dates, tipo })); }
    catch { toast.error(tc("errorLoading")); }
    finally { setLoading(false); }
  }, [dates, tipo]);

  const columns: ReportColumn<ABCItem>[] = [
    { key: "nombre", header: t("name"), sortable: true },
    { key: "totalVentas", header: t("sales"), align: "right", sortable: true, render: r => fmt(r.totalVentas) },
    { key: "porcentaje", header: t("pctTotal"), align: "right", sortable: true, render: r => `${r.porcentaje}%` },
    { key: "porcentajeAcumulado", header: t("pctAccum"), align: "right", render: r => `${r.porcentajeAcumulado}%` },
    { key: "clase", header: t("class"), render: r => <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${CLASS_COLORS[r.clase]}`}>{r.clase}</span> },
  ];

  const top20 = data?.items.slice(0, 20) || [];

  // Mixed chart: bars + line for Pareto curve
  const chartOptions: ApexCharts.ApexOptions = {
    chart: { type: "line", toolbar: { show: true }, animations: { enabled: true, speed: 800 } },
    stroke: { width: [0, 3], curve: "smooth" },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "60%" } },
    colors: ["#10b981", "#3b82f6"],
    grid: { borderColor: "#f3f4f6", strokeDashArray: 3 },
    dataLabels: { enabled: false },
    xaxis: { categories: top20.map(i => i.nombre.substring(0, 15)), labels: { style: { fontSize: "9px", colors: "#9ca3af" }, rotate: -30 } },
    yaxis: [
      { title: { text: t("salesLabel"), style: { fontSize: "11px", color: "#9ca3af" } }, labels: { formatter: (v) => `$${(v / 1000).toFixed(0)}k`, style: { fontSize: "11px", colors: "#9ca3af" } } },
      { opposite: true, title: { text: t("accumLabel"), style: { fontSize: "11px", color: "#9ca3af" } }, labels: { formatter: (v) => `${v}%`, style: { fontSize: "11px", colors: "#9ca3af" } }, min: 0, max: 100 },
    ],
    tooltip: { shared: true },
    legend: { position: "top", fontSize: "12px" },
  };

  return (
    <div className="space-y-4">
      <ReportFilters desde={dates.desde} hasta={dates.hasta} onDesdeChange={v => setDates(d => ({ ...d, desde: v }))} onHastaChange={v => setDates(d => ({ ...d, hasta: v }))} onApply={loadData} loading={loading} onExportPDF={data ? exportPDF : undefined} exporting={exporting}>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">{t("analyze")}</label>
          <select value={tipo} onChange={e => setTipo(e.target.value as "clientes" | "productos")} className="px-3 py-2 text-sm border border-gray-300 rounded-md">
            <option value="clientes">{t("clients")}</option>
            <option value="productos">{t("products")}</option>
          </select>
        </div>
      </ReportFilters>
      {data && (
        <>
          <ReportKPICards cards={[
            { label: t("classA"), value: data.resumen.claseA, color: "green" },
            { label: t("classB"), value: data.resumen.claseB, color: "amber" },
            { label: t("classC"), value: data.resumen.claseC, color: "red" },
            { label: t("totalSales"), value: fmt(data.resumen.totalGeneral), color: "blue" },
          ]} />
          {top20.length > 0 && (
            <Card ref={chartRef as React.RefObject<HTMLDivElement>}>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">{t("chartTitle")}</h3>
              <Chart type="line" options={chartOptions} series={[
                { name: t("salesLabel"), type: "column", data: top20.map(i => i.totalVentas) },
                { name: t("accumLabel"), type: "line", data: top20.map(i => i.porcentajeAcumulado) },
              ]} height={350} />
            </Card>
          )}
          <ReportTable data={data.items as unknown as Record<string, unknown>[]} columns={columns as unknown as ReportColumn<Record<string, unknown>>[]} showIndex />
        </>
      )}
    </div>
  );
}
