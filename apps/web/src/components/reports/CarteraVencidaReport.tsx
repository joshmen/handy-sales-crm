"use client";

import React, { useState, useCallback } from "react";
import { ReportFilters } from "./ReportFilters";
import { ReportKPICards } from "./ReportKPICards";
import { ReportTable, ReportColumn } from "./ReportTable";
import { getCarteraVencida, CarteraFila, CarteraVencidaResponse } from "@/services/api/reports";
import { toast } from "@/hooks/useToast";
import { useReportExport } from "@/hooks/useReportExport";
import { useFormatters } from "@/hooks/useFormatters";
import { useTranslations } from "next-intl";

function defaultDates() {
  const h = new Date(); const d = new Date(h); d.setMonth(d.getMonth() - 3);
  return { desde: d.toISOString().slice(0, 10), hasta: h.toISOString().slice(0, 10) };
}

export function CarteraVencidaReport() {
  const { formatCurrency } = useFormatters();
  const t = useTranslations("reports.carteraVencida");
  const tc = useTranslations("reports.common");
  const fmt = (n: number) => formatCurrency(n);

  const [dates, setDates] = useState(defaultDates);
  const [agrupar, setAgrupar] = useState<"cliente" | "vendedor">("cliente");
  const [data, setData] = useState<CarteraVencidaResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // KPIs derivados de los totales por bucket (antigüedad de saldos).
  const tot = data?.totalesPorBucket;
  const vencido = tot ? tot.b0_30 + tot.b1_31_60 + tot.b2_61_90 + tot.b3_mas90 : 0;
  const pctVencido = tot && tot.total > 0 ? Math.round((vencido / tot.total) * 100) : 0;

  const groupHeader = agrupar === "vendedor" ? t("vendor") : t("client");

  const { exportPDF, exportExcel, exporting } = useReportExport({
    fileName: "antiguedad-saldos",
    title: t("reportTitle"),
    dateRange: dates,
    kpis: tot ? [
      { label: t("totalPortfolio"), value: fmt(tot.total) },
      { label: t("notDue"), value: fmt(tot.porVencer) },
      { label: t("overdue"), value: fmt(vencido) },
      { label: t("overduePct"), value: `${pctVencido}%` },
    ] : undefined,
    table: data ? {
      headers: [groupHeader, t("notDue"), t("buckets.0-30"), t("buckets.31-60"), t("buckets.61-90"), t("buckets.90+"), t("totalCol")],
      rows: data.filas.map(f => [f.nombre, fmt(f.porVencer), fmt(f.b0_30), fmt(f.b1_31_60), fmt(f.b2_61_90), fmt(f.b3_mas90), fmt(f.total)]),
    } : undefined,
  });

  const loadData = useCallback(async () => {
    try { setLoading(true); setData(await getCarteraVencida({ ...dates, agrupar })); }
    catch { toast.error(tc("errorLoading")); }
    finally { setLoading(false); }
  }, [dates, agrupar]);

  const columns: ReportColumn<CarteraFila>[] = [
    { key: "nombre", header: groupHeader, sortable: true },
    { key: "porVencer", header: t("notDue"), align: "right", sortable: true, render: r => fmt(r.porVencer) },
    { key: "b0_30", header: t("buckets.0-30"), align: "right", sortable: true, render: r => fmt(r.b0_30) },
    { key: "b1_31_60", header: t("buckets.31-60"), align: "right", sortable: true, render: r => fmt(r.b1_31_60) },
    { key: "b2_61_90", header: t("buckets.61-90"), align: "right", sortable: true, render: r => <span className="text-red-600">{fmt(r.b2_61_90)}</span> },
    { key: "b3_mas90", header: t("buckets.90+"), align: "right", sortable: true, render: r => <span className="text-red-600">{fmt(r.b3_mas90)}</span> },
    { key: "total", header: t("totalCol"), align: "right", sortable: true, render: r => <span className="font-semibold text-foreground">{fmt(r.total)}</span> },
  ];

  const footerRow: Record<string, React.ReactNode> = tot ? {
    nombre: tc("total"),
    porVencer: fmt(tot.porVencer),
    b0_30: fmt(tot.b0_30),
    b1_31_60: fmt(tot.b1_31_60),
    b2_61_90: <span className="text-red-600">{fmt(tot.b2_61_90)}</span>,
    b3_mas90: <span className="text-red-600">{fmt(tot.b3_mas90)}</span>,
    total: fmt(tot.total),
  } : {};

  return (
    <div className="space-y-4">
      <ReportFilters desde={dates.desde} hasta={dates.hasta} onDesdeChange={v => setDates(d => ({ ...d, desde: v }))} onHastaChange={v => setDates(d => ({ ...d, hasta: v }))} onApply={loadData} loading={loading} onExportPDF={data && data.filas.length > 0 ? exportPDF : undefined} onExportExcel={data && data.filas.length > 0 ? exportExcel : undefined} exporting={exporting}>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-foreground/70">{t("groupBy")}</label>
          <select value={agrupar} onChange={e => setAgrupar(e.target.value as "cliente" | "vendedor")} className="px-3 py-2 text-sm border border-border-default rounded-md">
            <option value="cliente">{t("byClient")}</option>
            <option value="vendedor">{t("byVendor")}</option>
          </select>
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
      {data && data.filas.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-sm font-medium">{tc("noData")}</p>
          <p className="text-xs mt-1">{tc("tryDifferentDates")}</p>
        </div>
      )}
      {data && data.filas.length > 0 && (
        <>
          <ReportKPICards cards={[
            { label: t("totalPortfolio"), value: fmt(tot!.total), color: "blue" },
            { label: t("notDue"), value: fmt(tot!.porVencer), color: "green" },
            { label: t("overdue"), value: fmt(vencido), color: "red" },
            { label: t("overduePct"), value: `${pctVencido}%`, color: "amber" },
          ]} />
          <ReportTable
            data={data.filas as unknown as Record<string, unknown>[]}
            columns={columns as unknown as ReportColumn<Record<string, unknown>>[]}
            footerRow={footerRow}
          />
        </>
      )}
    </div>
  );
}
