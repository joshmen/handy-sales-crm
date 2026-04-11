"use client";

import React, { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { Card } from "@tremor/react";
import { ReportFilters } from "./ReportFilters";
import { ReportKPICards } from "./ReportKPICards";
import { ReportTable, ReportColumn } from "./ReportTable";
import { getCarteraVencida, CarteraCliente, CarteraVencidaResponse } from "@/services/api/reports";
import { toast } from "@/hooks/useToast";
import { useReportExport } from "@/hooks/useReportExport";
import { useFormatters } from "@/hooks/useFormatters";
import { useTranslations } from "next-intl";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

function defaultDates() {
  const h = new Date(); const d = new Date(h); d.setMonth(d.getMonth() - 3);
  return { desde: d.toISOString().slice(0, 10), hasta: h.toISOString().slice(0, 10) };
}

export function CarteraVencidaReport() {
  const { formatCurrency, formatDate } = useFormatters();
  const t = useTranslations("reports.carteraVencida");
  const tc = useTranslations("reports.common");
  const fmt = (n: number) => formatCurrency(n);

  const BUCKET_LABELS: Record<string, string> = {
    corriente: t("buckets.corriente"), "31-60": t("buckets.31-60"), "61-90": t("buckets.61-90"), "90+": t("buckets.90+"),
  };

  const [dates, setDates] = useState(defaultDates);
  const [data, setData] = useState<CarteraVencidaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const { exportPDF, exporting } = useReportExport({
    fileName: "cartera-vencida", title: t("totalPortfolio"), dateRange: dates,
    kpis: data ? [
      { label: t("totalPortfolio"), value: fmt(data.totalCartera) },
      { label: t("clientsWithBalance"), value: data.totalClientes },
      { label: t("current030"), value: fmt(data.buckets.corriente.total) },
      { label: t("overdue90"), value: fmt(data.buckets.d90plus.total) },
    ] : undefined, chartRef,
    table: data ? {
      headers: [t("client"), t("balance"), t("daysOverdue"), t("category"), t("creditDays"), t("lastPayment")],
      rows: data.clientes.map(c => [c.nombre, fmt(c.saldo), c.diasVencido, BUCKET_LABELS[c.bucket] || c.bucket, c.diasCredito, c.ultimoPago ? formatDate(c.ultimoPago) : "—"]),
    } : undefined,
  });

  const loadData = useCallback(async () => {
    try { setLoading(true); setData(await getCarteraVencida(dates)); }
    catch { toast.error(tc("errorLoading")); }
    finally { setLoading(false); }
  }, [dates]);

  const bucketChart = data ? [
    { name: BUCKET_LABELS["corriente"], value: Number(data.buckets.corriente.total) },
    { name: BUCKET_LABELS["31-60"], value: Number(data.buckets.d31_60.total) },
    { name: BUCKET_LABELS["61-90"], value: Number(data.buckets.d61_90.total) },
    { name: BUCKET_LABELS["90+"], value: Number(data.buckets.d90plus.total) },
  ] : [];

  const columns: ReportColumn<CarteraCliente>[] = [
    { key: "nombre", header: t("client"), sortable: true },
    { key: "saldo", header: t("balance"), align: "right", sortable: true, render: r => fmt(r.saldo) },
    { key: "diasVencido", header: t("daysOverdue"), align: "right", sortable: true },
    { key: "bucket", header: t("category"), render: r => {
      const color = r.bucket === "corriente" ? "text-green-600 bg-green-50" : r.bucket === "31-60" ? "text-amber-600 bg-amber-50" : r.bucket === "61-90" ? "text-orange-600 bg-orange-50" : "text-red-600 bg-red-50";
      return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{BUCKET_LABELS[r.bucket] || r.bucket}</span>;
    }},
    { key: "diasCredito", header: t("creditDays"), align: "right" },
    { key: "ultimoPago" as keyof CarteraCliente, header: t("lastPayment"), render: r => r.ultimoPago ? formatDate(r.ultimoPago) : "—" },
  ];

  const chartOptions: ApexCharts.ApexOptions = {
    chart: { type: "bar", toolbar: { show: true }, animations: { enabled: true, speed: 700 } },
    plotOptions: { bar: { borderRadius: 6, columnWidth: "55%", distributed: true } },
    colors: ["#10b981", "#f59e0b", "#f97316", "#ef4444"],
    grid: { borderColor: "#f3f4f6", strokeDashArray: 3 },
    dataLabels: { enabled: true, formatter: (v) => fmt(Number(v)), style: { fontSize: "11px" } },
    xaxis: { categories: bucketChart.map(b => b.name), labels: { style: { fontSize: "11px", colors: "#9ca3af" } } },
    yaxis: { labels: { formatter: (v) => `$${(v / 1000).toFixed(0)}k`, style: { fontSize: "11px", colors: "#9ca3af" } } },
    legend: { show: false },
    tooltip: { y: { formatter: (v) => fmt(v) } },
  };

  return (
    <div className="space-y-4">
      <ReportFilters desde={dates.desde} hasta={dates.hasta} onDesdeChange={v => setDates(d => ({ ...d, desde: v }))} onHastaChange={v => setDates(d => ({ ...d, hasta: v }))} onApply={loadData} loading={loading} onExportPDF={data ? exportPDF : undefined} exporting={exporting} />
      {data && (
        <>
          <ReportKPICards cards={[
            { label: t("totalPortfolio"), value: fmt(data.totalCartera), color: "red" },
            { label: t("clientsWithBalance"), value: data.totalClientes, color: "amber" },
            { label: t("current030"), value: fmt(data.buckets.corriente.total), color: "green" },
            { label: t("overdue90"), value: fmt(data.buckets.d90plus.total), color: "red" },
          ]} />
          {bucketChart.some(b => b.value > 0) && (
            <Card ref={chartRef as React.RefObject<HTMLDivElement>}>
              <h3 className="text-sm font-semibold text-foreground/80 mb-3">{t("chartTitle")}</h3>
              <Chart type="bar" options={chartOptions} series={[{ name: t("balanceLabel"), data: bucketChart.map(b => b.value) }]} height={300} />
            </Card>
          )}
          <ReportTable data={data.clientes as unknown as Record<string, unknown>[]} columns={columns as unknown as ReportColumn<Record<string, unknown>>[]} />
        </>
      )}
    </div>
  );
}
