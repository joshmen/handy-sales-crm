"use client";

import React, { useState, useCallback } from "react";
import { ReportFilters } from "./ReportFilters";
import { getEstadoResultados, EstadoResultadosResponse } from "@/services/api/reports";
import { toast } from "@/hooks/useToast";
import { useReportExport } from "@/hooks/useReportExport";
import { useFormatters } from "@/hooks/useFormatters";
import { useTranslations } from "next-intl";

function defaultDates() {
  const h = new Date();
  const d = new Date(h);
  d.setDate(1);
  return { desde: d.toISOString().slice(0, 10), hasta: h.toISOString().slice(0, 10) };
}

interface StatementRowProps {
  label: string;
  value: number;
  /** % vertical (sobre ventas netas). undefined = sin porcentaje. */
  pct?: number;
  bold?: boolean;
  /** Sangría (nivel) para el desglose. */
  indent?: boolean;
  /** Resta -> mostrar entre paréntesis y en rojo. */
  negative?: boolean;
  /** Verde para utilidades clave. */
  positive?: boolean;
  /** Línea superior gruesa (subtotal). */
  topBorder?: boolean;
}

export function EstadoResultadosReport() {
  const { formatCurrency } = useFormatters();
  const t = useTranslations("reports.edoResultados");
  const tc = useTranslations("reports.common");
  const fmt = (n: number) => formatCurrency(n);

  const [dates, setDates] = useState(defaultDates);
  const [data, setData] = useState<EstadoResultadosResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const pctStr = (n: number) => `${n.toFixed(1)}%`;
  const negStr = (n: number) => `(${fmt(Math.abs(n))})`;

  const { exportPDF, exportExcel, exporting } = useReportExport({
    fileName: "estado-resultados",
    title: t("reportTitle"),
    dateRange: dates,
    kpis: data ? [
      { label: t("netSales"), value: fmt(data.ventasNetas) },
      { label: t("grossProfit"), value: fmt(data.utilidadBruta) },
      { label: t("netProfit"), value: fmt(data.utilidadNeta) },
    ] : undefined,
    table: data ? {
      headers: [t("concept"), tc("amount"), t("vertical")],
      rows: [
        [t("netSales"), fmt(data.ventasNetas), "100.0%"],
        [t("costOfSales"), negStr(data.costoVentas), pctStr(data.vertical.costoVentas)],
        [t("grossProfit"), fmt(data.utilidadBruta), pctStr(data.vertical.utilidadBruta)],
        ...data.gastos.map(g => [g.categoria, negStr(g.monto), ""] as (string | number)[]),
        [t("totalExpenses"), negStr(data.totalGastos), pctStr(data.vertical.gastos)],
        [t("operatingProfit"), fmt(data.utilidadOperacion), pctStr(data.vertical.utilidadOperacion)],
      ],
      footerRow: [t("netProfit"), fmt(data.utilidadNeta), pctStr(data.vertical.utilidadNeta)],
    } : undefined,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setData(await getEstadoResultados(dates));
    } catch {
      toast.error(tc("errorLoading"));
    } finally {
      setLoading(false);
    }
  }, [dates, tc]);

  const StatementRow = ({ label, value, pct, bold, indent, negative, positive, topBorder }: StatementRowProps) => (
    <div
      className={`flex items-center justify-between py-2.5 px-4 ${topBorder ? "border-t-2 border-border" : "border-t border-border-subtle"}`}
    >
      <span
        className={`text-[13.5px] ${indent ? "pl-5 text-muted-foreground" : ""} ${bold ? "font-bold text-foreground" : "text-foreground/80"} ${positive ? "text-green-700 dark:text-green-300" : ""}`}
      >
        {label}
      </span>
      <div className="flex items-center gap-6">
        <span
          className={`tabular-nums text-[13.5px] text-right min-w-[120px] ${bold ? "font-bold" : ""} ${negative ? "text-red-600" : positive ? "text-green-700 dark:text-green-300" : "text-foreground/90"}`}
        >
          {negative ? `(${fmt(Math.abs(value))})` : fmt(value)}
        </span>
        <span className="tabular-nums text-[12px] text-muted-foreground text-right min-w-[52px]">
          {pct !== undefined ? `${pct.toFixed(1)}%` : ""}
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <ReportFilters
        desde={dates.desde}
        hasta={dates.hasta}
        onDesdeChange={v => setDates(d => ({ ...d, desde: v }))}
        onHastaChange={v => setDates(d => ({ ...d, hasta: v }))}
        onApply={loadData}
        loading={loading}
        onExportPDF={data ? exportPDF : undefined}
        onExportExcel={data ? exportExcel : undefined}
        exporting={exporting}
      />

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
      {data && !loading && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {/* Encabezado de columnas */}
          <div className="flex items-center justify-between py-2.5 px-4 bg-surface-1">
            <span className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">{t("concept")}</span>
            <div className="flex items-center gap-6">
              <span className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground text-right min-w-[120px]">{tc("amount")}</span>
              <span className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground text-right min-w-[52px]">{t("vertical")}</span>
            </div>
          </div>

          <StatementRow label={t("netSales")} value={data.ventasNetas} pct={100} bold />
          <StatementRow label={t("costOfSales")} value={data.costoVentas} pct={data.vertical.costoVentas} negative indent />
          <StatementRow label={t("grossProfit")} value={data.utilidadBruta} pct={data.vertical.utilidadBruta} bold positive topBorder />

          {/* Desglose de gastos por categoría */}
          {data.gastos.map((g, i) => (
            <StatementRow key={i} label={g.categoria} value={g.monto} negative indent />
          ))}
          <StatementRow label={t("totalExpenses")} value={data.totalGastos} pct={data.vertical.gastos} negative />

          <StatementRow label={t("operatingProfit")} value={data.utilidadOperacion} pct={data.vertical.utilidadOperacion} bold topBorder />
          <StatementRow label={t("netProfit")} value={data.utilidadNeta} pct={data.vertical.utilidadNeta} bold positive topBorder />
        </div>
      )}
    </div>
  );
}
