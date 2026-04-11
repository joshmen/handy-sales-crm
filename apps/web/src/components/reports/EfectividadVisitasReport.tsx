"use client";

import React, { useState, useCallback, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ReportFilters } from "./ReportFilters";
import { useChartTheme } from "@/hooks/useChartTheme";
import { ReportKPICards } from "./ReportKPICards";
import { ReportTable, ReportColumn } from "./ReportTable";
import { getEfectividadVisitas, EfectividadVendedor, EfectividadVisitasResponse } from "@/services/api/reports";
import { toast } from "@/hooks/useToast";
import { useReportExport } from "@/hooks/useReportExport";
import { useTranslations } from "next-intl";

function defaultDates() {
  const h = new Date();
  const d = new Date(h);
  d.setMonth(d.getMonth() - 1);
  return { desde: d.toISOString().slice(0, 10), hasta: h.toISOString().slice(0, 10) };
}

export function EfectividadVisitasReport() {
  const t = useTranslations("reports.efectividadVisitas");
  const tc = useTranslations("reports.common");
  const [dates, setDates] = useState(defaultDates);
  const ct = useChartTheme();
  const [data, setData] = useState<EfectividadVisitasResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const { exportPDF, exporting } = useReportExport({
    fileName: "efectividad-visitas",
    title: t("totalVisits"),
    dateRange: dates,
    kpis: data ? [
      { label: t("totalVisits"), value: data.resumen.totalVisitas },
      { label: t("withSale"), value: data.resumen.totalConVenta },
      { label: t("conversionRate"), value: `${data.resumen.tasaConversionGeneral}%` },
    ] : undefined,
    chartRef,
    table: data ? {
      headers: [t("vendor"), t("visits"), t("withSaleCol"), t("ratePct"), t("avgDuration")],
      rows: data.vendedores.map(v => [v.nombre, v.totalVisitas, v.visitasConVenta, `${v.tasaConversion}%`, v.duracionPromedio]),
    } : undefined,
  });

  const fetch = useCallback(async () => {
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

  return (
    <div className="space-y-4">
      <ReportFilters desde={dates.desde} hasta={dates.hasta} onDesdeChange={v => setDates(d => ({ ...d, desde: v }))} onHastaChange={v => setDates(d => ({ ...d, hasta: v }))} onApply={fetch} loading={loading} onExportPDF={data ? exportPDF : undefined} exporting={exporting} />
      {data && (
        <>
          <ReportKPICards cards={[
            { label: t("totalVisits"), value: data.resumen.totalVisitas, color: "blue" },
            { label: t("withSale"), value: data.resumen.totalConVenta, color: "green" },
            { label: t("conversionRate"), value: `${data.resumen.tasaConversionGeneral}%`, color: "blue" },
          ]} />
          {data.vendedores.length > 0 && (
            <div ref={chartRef} className="bg-white border border-gray-200 rounded-lg p-4">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.vendedores}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                  <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="totalVisitas" name={t("totalBar")} fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="visitasConVenta" name={t("withSaleBar")} fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <ReportTable data={data.vendedores as unknown as Record<string, unknown>[]} columns={columns as unknown as ReportColumn<Record<string, unknown>>[]} />
        </>
      )}
    </div>
  );
}
