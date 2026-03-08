"use client";

import React, { useState, useCallback, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { ReportFilters } from "./ReportFilters";
import { useChartTheme } from "@/hooks/useChartTheme";
import { ReportKPICards } from "./ReportKPICards";
import { ReportTable, ReportColumn } from "./ReportTable";
import {
  getCumplimientoMetas,
  MetaCumplimiento,
  CumplimientoMetasResponse,
} from "@/services/api/reports";
import { toast } from "@/hooks/useToast";
import { useReportExport } from "@/hooks/useReportExport";
import { useFormatters } from "@/hooks/useFormatters";

function defaultDates() {
  const h = new Date();
  const d = new Date(h);
  d.setMonth(d.getMonth() - 1);
  return { desde: d.toISOString().slice(0, 10), hasta: h.toISOString().slice(0, 10) };
}

const TIPO_LABELS: Record<string, string> = {
  ventas: "Ventas ($)",
  visitas: "Visitas",
  pedidos: "Pedidos",
};

export function CumplimientoMetasReport() {
  const { formatCurrency } = useFormatters();
  const fmt = (n: number) => formatCurrency(n);
  const [dates, setDates] = useState(defaultDates);
  const ct = useChartTheme();
  const [data, setData] = useState<CumplimientoMetasResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const { exportPDF, exporting } = useReportExport({
    fileName: "cumplimiento-metas",
    title: "Cumplimiento de Metas",
    dateRange: dates,
    kpis: data
      ? [
          { label: "Total Metas", value: data.resumen.totalMetas },
          { label: "Cumplidas", value: data.resumen.cumplidas },
          { label: "No Cumplidas", value: data.resumen.noCumplidas },
          { label: "% Promedio", value: `${data.resumen.promedioCumplimiento}%` },
        ]
      : undefined,
    chartRef,
    table: data
      ? {
          headers: ["Vendedor", "Tipo", "Meta", "Actual", "% Cumplimiento", "Estado"],
          rows: data.metas.map((m) => [
            m.vendedor,
            TIPO_LABELS[m.tipo] || m.tipo,
            m.tipo === "ventas" ? fmt(m.meta) : m.meta,
            m.tipo === "ventas" ? fmt(m.actual) : m.actual,
            `${m.porcentajeCumplimiento}%`,
            m.cumplida ? "Cumplida" : "Pendiente",
          ]),
        }
      : undefined,
  });

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getCumplimientoMetas(dates);
      setData(res);
    } catch {
      toast.error("Error al cargar reporte");
    } finally {
      setLoading(false);
    }
  }, [dates]);

  const chartData = data
    ? data.metas.map((m) => ({
        name: m.vendedor.split(" ")[0],
        meta: Number(m.meta),
        actual: Number(m.actual),
        pct: m.porcentajeCumplimiento,
      }))
    : [];

  const columns: ReportColumn<MetaCumplimiento>[] = [
    { key: "vendedor", header: "Vendedor", sortable: true },
    {
      key: "tipo",
      header: "Tipo",
      render: (r) => (
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
          {TIPO_LABELS[r.tipo] || r.tipo}
        </span>
      ),
    },
    { key: "periodo", header: "Período" },
    {
      key: "meta",
      header: "Meta",
      align: "right",
      sortable: true,
      render: (r) => (r.tipo === "ventas" ? fmt(r.meta) : String(r.meta)),
    },
    {
      key: "actual",
      header: "Actual",
      align: "right",
      sortable: true,
      render: (r) => (r.tipo === "ventas" ? fmt(r.actual) : String(r.actual)),
    },
    {
      key: "porcentajeCumplimiento",
      header: "% Cumplimiento",
      align: "right",
      sortable: true,
      render: (r) => {
        const color =
          r.porcentajeCumplimiento >= 100
            ? "text-green-600"
            : r.porcentajeCumplimiento >= 70
            ? "text-amber-600"
            : "text-red-600";
        return <span className={`font-semibold ${color}`}>{r.porcentajeCumplimiento}%</span>;
      },
    },
    {
      key: "cumplida",
      header: "Estado",
      render: (r) =>
        r.cumplida ? (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
            Cumplida
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
            Pendiente
          </span>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <ReportFilters
        desde={dates.desde}
        hasta={dates.hasta}
        onDesdeChange={(v) => setDates((d) => ({ ...d, desde: v }))}
        onHastaChange={(v) => setDates((d) => ({ ...d, hasta: v }))}
        onApply={fetch}
        loading={loading}
        onExportPDF={data ? exportPDF : undefined}
        exporting={exporting}
      />

      {data && (
        <>
          <ReportKPICards
            cards={[
              { label: "Total Metas", value: data.resumen.totalMetas, color: "blue" },
              { label: "Cumplidas", value: data.resumen.cumplidas, color: "green" },
              { label: "No Cumplidas", value: data.resumen.noCumplidas, color: "red" },
              { label: "Promedio Cumplimiento", value: `${data.resumen.promedioCumplimiento}%`, color: "amber" },
            ]}
          />

          {chartData.length > 0 && (
            <div ref={chartRef} className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Meta vs Actual por Vendedor</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <ReferenceLine y={0} stroke="#666" />
                  <Bar dataKey="meta" name="Meta" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" name="Actual" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <ReportTable
            data={data.metas as unknown as Record<string, unknown>[]}
            columns={columns as unknown as ReportColumn<Record<string, unknown>>[]}
          />
        </>
      )}
    </div>
  );
}
