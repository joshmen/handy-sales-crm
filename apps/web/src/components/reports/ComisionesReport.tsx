"use client";

import React, { useState, useCallback, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ReportFilters } from "./ReportFilters";
import { useChartTheme } from "@/hooks/useChartTheme";
import { ReportKPICards } from "./ReportKPICards";
import { ReportTable, ReportColumn } from "./ReportTable";
import { getComisiones, ComisionVendedor, ComisionesResponse } from "@/services/api/reports";
import { toast } from "@/hooks/useToast";
import { useReportExport } from "@/hooks/useReportExport";
import { useFormatters } from "@/hooks/useFormatters";
import { useTranslations } from "next-intl";

function defaultDates() {
  const h = new Date();
  const d = new Date(h);
  d.setMonth(d.getMonth() - 1);
  return { desde: d.toISOString().slice(0, 10), hasta: h.toISOString().slice(0, 10) };
}

export function ComisionesReport() {
  const { formatCurrency } = useFormatters();
  const t = useTranslations("reports.comisionesReport");
  const tc = useTranslations("reports.common");
  const fmt = (n: number) => formatCurrency(n);
  const [dates, setDates] = useState(defaultDates);
  const ct = useChartTheme();
  const [porcentaje, setPorcentaje] = useState(5);
  const [data, setData] = useState<ComisionesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const { exportPDF, exporting } = useReportExport({
    fileName: "comisiones",
    title: t("totalCommissions"),
    dateRange: dates,
    kpis: data ? [
      { label: t("totalSales"), value: fmt(data.totalVentas) },
      { label: t("totalCommissions"), value: fmt(data.totalComisiones) },
      { label: t("appliedPct"), value: `${data.porcentajeAplicado}%` },
    ] : undefined,
    chartRef,
    table: data ? {
      headers: [t("vendor"), t("sales"), t("orders"), t("commission")],
      rows: data.vendedores.map(v => [v.nombre, fmt(v.totalVentas), v.cantidadPedidos, fmt(v.comision)]),
      footerRow: [tc("total"), fmt(data.totalVentas), "", fmt(data.totalComisiones)],
    } : undefined,
  });

  const fetch = useCallback(async () => {
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

  return (
    <div className="space-y-4">
      <ReportFilters desde={dates.desde} hasta={dates.hasta} onDesdeChange={v => setDates(d => ({ ...d, desde: v }))} onHastaChange={v => setDates(d => ({ ...d, hasta: v }))} onApply={fetch} loading={loading} onExportPDF={data ? exportPDF : undefined} exporting={exporting}>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">{t("commissionPct")}</label>
          <input type="number" value={porcentaje} onChange={e => setPorcentaje(Number(e.target.value))} min={0} max={100} step={0.5} className="px-3 py-2 text-sm border border-gray-300 rounded-md w-20" />
        </div>
      </ReportFilters>
      {data && (
        <>
          <ReportKPICards cards={[
            { label: t("totalSales"), value: fmt(data.totalVentas), color: "blue" },
            { label: t("totalCommissions"), value: fmt(data.totalComisiones), color: "green" },
            { label: t("appliedPct"), value: `${data.porcentajeAplicado}%`, color: "amber" },
          ]} />
          {data.vendedores.length > 0 && (
            <div ref={chartRef} className="bg-white border border-gray-200 rounded-lg p-4">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.vendedores}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                  <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => [fmt(Number(v))]} />
                  <Bar dataKey="comision" name={t("chartName")} fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <ReportTable data={data.vendedores as unknown as Record<string, unknown>[]} columns={columns as unknown as ReportColumn<Record<string, unknown>>[]} footerRow={{ nombre: tc("total"), totalVentas: fmt(data.totalVentas), cantidadPedidos: "", comision: fmt(data.totalComisiones) }} />
        </>
      )}
    </div>
  );
}
