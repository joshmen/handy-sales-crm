"use client";

import React, { useState, useCallback, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { ReportFilters } from "./ReportFilters";
import { useChartTheme } from "@/hooks/useChartTheme";
import { ReportKPICards } from "./ReportKPICards";
import { ReportTable, ReportColumn } from "./ReportTable";
import { getCumplimientoMetas, MetaCumplimiento, CumplimientoMetasResponse } from "@/services/api/reports";
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

export function CumplimientoMetasReport() {
  const { formatCurrency } = useFormatters();
  const t = useTranslations("reports.cumplimientoMetas");
  const tc = useTranslations("reports.common");
  const fmt = (n: number) => formatCurrency(n);

  const TIPO_LABELS: Record<string, string> = {
    ventas: t("types.ventas"),
    visitas: t("types.visitas"),
    pedidos: t("types.pedidos"),
  };

  const [dates, setDates] = useState(defaultDates);
  const ct = useChartTheme();
  const [data, setData] = useState<CumplimientoMetasResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const { exportPDF, exporting } = useReportExport({
    fileName: "cumplimiento-metas",
    title: t("totalGoals"),
    dateRange: dates,
    kpis: data ? [
      { label: t("totalGoals"), value: data.resumen.totalMetas },
      { label: t("achieved"), value: data.resumen.cumplidas },
      { label: t("notAchieved"), value: data.resumen.noCumplidas },
      { label: t("avgAchievement"), value: `${data.resumen.promedioCumplimiento}%` },
    ] : undefined,
    chartRef,
    table: data ? {
      headers: [t("vendor"), t("type"), t("goal"), t("actual"), t("achievementPct"), t("status")],
      rows: data.metas.map(m => [
        m.vendedor,
        TIPO_LABELS[m.tipo] || m.tipo,
        m.tipo === "ventas" ? fmt(m.meta) : m.meta,
        m.tipo === "ventas" ? fmt(m.actual) : m.actual,
        `${m.porcentajeCumplimiento}%`,
        m.cumplida ? t("statusAchieved") : t("statusPending"),
      ]),
    } : undefined,
  });

  const fetch = useCallback(async () => {
    try { setLoading(true); setData(await getCumplimientoMetas(dates)); }
    catch { toast.error(tc("errorLoading")); }
    finally { setLoading(false); }
  }, [dates]);

  const chartData = data ? data.metas.map(m => ({
    name: m.vendedor.split(" ")[0],
    meta: Number(m.meta),
    actual: Number(m.actual),
    pct: m.porcentajeCumplimiento,
  })) : [];

  const columns: ReportColumn<MetaCumplimiento>[] = [
    { key: "vendedor", header: t("vendor"), sortable: true },
    { key: "tipo", header: t("type"), render: (r) => (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
        {TIPO_LABELS[r.tipo] || r.tipo}
      </span>
    )},
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

  return (
    <div className="space-y-4">
      <ReportFilters desde={dates.desde} hasta={dates.hasta} onDesdeChange={v => setDates(d => ({ ...d, desde: v }))} onHastaChange={v => setDates(d => ({ ...d, hasta: v }))} onApply={fetch} loading={loading} onExportPDF={data ? exportPDF : undefined} exporting={exporting} />
      {data && (
        <>
          <ReportKPICards cards={[
            { label: t("totalGoals"), value: data.resumen.totalMetas, color: "blue" },
            { label: t("achieved"), value: data.resumen.cumplidas, color: "green" },
            { label: t("notAchieved"), value: data.resumen.noCumplidas, color: "red" },
            { label: t("avgAchievement"), value: `${data.resumen.promedioCumplimiento}%`, color: "amber" },
          ]} />
          {chartData.length > 0 && (
            <div ref={chartRef} className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">{t("chartTitle")}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <ReferenceLine y={0} stroke="#666" />
                  <Bar dataKey="meta" name={t("goalLabel")} fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" name={t("actualLabel")} fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <ReportTable data={data.metas as unknown as Record<string, unknown>[]} columns={columns as unknown as ReportColumn<Record<string, unknown>>[]} />
        </>
      )}
    </div>
  );
}
