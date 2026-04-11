"use client";

import React, { useState, useCallback, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart } from "recharts";
import { ReportFilters } from "./ReportFilters";
import { useChartTheme } from "@/hooks/useChartTheme";
import { ReportKPICards } from "./ReportKPICards";
import { ReportTable, ReportColumn } from "./ReportTable";
import { getAnalisisABC, ABCItem, AnalisisABCResponse } from "@/services/api/reports";
import { toast } from "@/hooks/useToast";
import { useReportExport } from "@/hooks/useReportExport";
import { useFormatters } from "@/hooks/useFormatters";
import { useTranslations } from "next-intl";

function defaultDates() {
  const h = new Date();
  const d = new Date(h);
  d.setMonth(d.getMonth() - 3);
  return { desde: d.toISOString().slice(0, 10), hasta: h.toISOString().slice(0, 10) };
}

const CLASS_COLORS: Record<string, string> = { A: "text-green-600 bg-green-50", B: "text-amber-600 bg-amber-50", C: "text-red-600 bg-red-50" };
const CLASS_FILLS: Record<string, string> = { A: "#10b981", B: "#f59e0b", C: "#ef4444" };

export function AnalisisABCReport() {
  const { formatCurrency } = useFormatters();
  const t = useTranslations("reports.analisisABC");
  const tc = useTranslations("reports.common");
  const fmt = (n: number) => formatCurrency(n);
  const [dates, setDates] = useState(defaultDates);
  const ct = useChartTheme();
  const [tipo, setTipo] = useState<"clientes" | "productos">("clientes");
  const [data, setData] = useState<AnalisisABCResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const { exportPDF, exporting } = useReportExport({
    fileName: "analisis-abc",
    title: `ABC (${tipo === 'clientes' ? t('clients') : t('products')})`,
    dateRange: dates,
    kpis: data ? [
      { label: t("classA"), value: data.resumen.claseA },
      { label: t("classB"), value: data.resumen.claseB },
      { label: t("classC"), value: data.resumen.claseC },
      { label: t("totalSales"), value: fmt(data.resumen.totalGeneral) },
    ] : undefined,
    chartRef,
    table: data ? {
      headers: [t("name"), t("sales"), t("pctTotal"), t("pctAccum"), t("class")],
      rows: data.items.map(i => [i.nombre, fmt(i.totalVentas), `${i.porcentaje}%`, `${i.porcentajeAcumulado}%`, i.clase]),
    } : undefined,
  });

  const fetch = useCallback(async () => {
    try { setLoading(true); setData(await getAnalisisABC({ ...dates, tipo })); }
    catch { toast.error(tc("errorLoading")); }
    finally { setLoading(false); }
  }, [dates, tipo]);

  const columns: ReportColumn<ABCItem>[] = [
    { key: "nombre", header: t("name"), sortable: true },
    { key: "totalVentas", header: t("sales"), align: "right", sortable: true, render: r => fmt(r.totalVentas) },
    { key: "porcentaje", header: t("pctTotal"), align: "right", sortable: true, render: r => `${r.porcentaje}%` },
    { key: "porcentajeAcumulado", header: t("pctAccum"), align: "right", render: r => `${r.porcentajeAcumulado}%` },
    { key: "clase", header: t("class"), render: r => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${CLASS_COLORS[r.clase]}`}>{r.clase}</span>
    )},
  ];

  return (
    <div className="space-y-4">
      <ReportFilters desde={dates.desde} hasta={dates.hasta} onDesdeChange={v => setDates(d => ({ ...d, desde: v }))} onHastaChange={v => setDates(d => ({ ...d, hasta: v }))} onApply={fetch} loading={loading} onExportPDF={data ? exportPDF : undefined} exporting={exporting}>
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
          {data.items.length > 0 && (
            <div ref={chartRef} className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">{t("chartTitle")}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={data.items.slice(0, 20)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                  <XAxis dataKey="nombre" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                  <Tooltip formatter={(v, name) => [name === "porcentajeAcumulado" ? `${v}%` : fmt(Number(v)), name === "porcentajeAcumulado" ? t("accumLabel") : t("salesLabel")]} />
                  <Bar yAxisId="left" dataKey="totalVentas" radius={[4, 4, 0, 0]}>
                    {data.items.slice(0, 20).map((item, i) => (
                      <rect key={i} fill={CLASS_FILLS[item.clase] || "#94a3b8"} />
                    ))}
                  </Bar>
                  <Line yAxisId="right" type="monotone" dataKey="porcentajeAcumulado" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
          <ReportTable data={data.items as unknown as Record<string, unknown>[]} columns={columns as unknown as ReportColumn<Record<string, unknown>>[]} showIndex />
        </>
      )}
    </div>
  );
}
