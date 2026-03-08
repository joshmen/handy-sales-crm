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

function defaultDates() {
  const h = new Date();
  const d = new Date(h);
  d.setMonth(d.getMonth() - 1);
  return { desde: d.toISOString().slice(0, 10), hasta: h.toISOString().slice(0, 10) };
}

export function EfectividadVisitasReport() {
  const [dates, setDates] = useState(defaultDates);
  const ct = useChartTheme();
  const [data, setData] = useState<EfectividadVisitasResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const { exportPDF, exporting } = useReportExport({
    fileName: "efectividad-visitas",
    title: "Efectividad de Visitas",
    dateRange: dates,
    kpis: data ? [
      { label: "Total Visitas", value: data.resumen.totalVisitas },
      { label: "Con Venta", value: data.resumen.totalConVenta },
      { label: "Tasa Conversion", value: `${data.resumen.tasaConversionGeneral}%` },
    ] : undefined,
    chartRef,
    table: data ? {
      headers: ["Vendedor", "Visitas", "Con Venta", "Tasa %", "Duracion Prom (min)"],
      rows: data.vendedores.map(v => [v.nombre, v.totalVisitas, v.visitasConVenta, `${v.tasaConversion}%`, v.duracionPromedio]),
    } : undefined,
  });

  const fetch = useCallback(async () => {
    try { setLoading(true); setData(await getEfectividadVisitas(dates)); }
    catch { toast.error("Error al cargar reporte"); }
    finally { setLoading(false); }
  }, [dates]);

  const columns: ReportColumn<EfectividadVendedor>[] = [
    { key: "nombre", header: "Vendedor", sortable: true },
    { key: "totalVisitas", header: "Visitas", align: "right", sortable: true },
    { key: "visitasConVenta", header: "Con Venta", align: "right", sortable: true },
    { key: "tasaConversion", header: "Tasa %", align: "right", sortable: true, render: (r) => {
      const color = r.tasaConversion >= 50 ? "text-green-600" : r.tasaConversion >= 30 ? "text-amber-600" : "text-red-600";
      return <span className={`font-semibold ${color}`}>{r.tasaConversion}%</span>;
    }},
    { key: "duracionPromedio", header: "Duración Prom (min)", align: "right" },
  ];

  return (
    <div className="space-y-4">
      <ReportFilters desde={dates.desde} hasta={dates.hasta} onDesdeChange={v => setDates(d => ({ ...d, desde: v }))} onHastaChange={v => setDates(d => ({ ...d, hasta: v }))} onApply={fetch} loading={loading} onExportPDF={data ? exportPDF : undefined} exporting={exporting} />
      {data && (
        <>
          <ReportKPICards cards={[
            { label: "Total Visitas", value: data.resumen.totalVisitas, color: "blue" },
            { label: "Con Venta", value: data.resumen.totalConVenta, color: "green" },
            { label: "Tasa Conversión", value: `${data.resumen.tasaConversionGeneral}%`, color: "blue" },
          ]} />
          {data.vendedores.length > 0 && (
            <div ref={chartRef} className="bg-white border border-gray-200 rounded-lg p-4">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.vendedores}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                  <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="totalVisitas" name="Total" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="visitasConVenta" name="Con Venta" fill="#16a34a" radius={[4, 4, 0, 0]} />
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
