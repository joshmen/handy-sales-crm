"use client";

import React, { useState, useCallback } from "react";
import { ReportFilters } from "./ReportFilters";
import { ReportKPICards } from "./ReportKPICards";
import { ReportTable, ReportColumn } from "./ReportTable";
import { SoftBadge, SoftBadgeTone } from "@/components/ui/SoftBadge";
import { getCobranzaPeriodo, CobranzaCobro, CobranzaPeriodoResponse } from "@/services/api/reports";
import { toast } from "@/hooks/useToast";
import { useReportExport } from "@/hooks/useReportExport";
import { useFormatters } from "@/hooks/useFormatters";
import { useTranslations } from "next-intl";

function defaultDates() {
  const h = new Date(); const d = new Date(h); d.setMonth(d.getMonth() - 1);
  return { desde: d.toISOString().slice(0, 10), hasta: h.toISOString().slice(0, 10) };
}

/** Tono del badge por forma de pago (normalizado, acentos/case-insensitive). */
function formaTone(forma: string): SoftBadgeTone {
  const f = (forma || "").toLowerCase();
  if (f.includes("efectivo")) return "success";
  if (f.includes("transfer")) return "info";
  return "default";
}

export function CobranzaPeriodoReport() {
  const { formatCurrency, formatDateOnly } = useFormatters();
  const t = useTranslations("reports.cobranzaPeriodo");
  const tc = useTranslations("reports.common");
  const fmt = (n: number) => formatCurrency(n);

  const [dates, setDates] = useState(defaultDates);
  const [data, setData] = useState<CobranzaPeriodoResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Desglose efectivo vs resto (porcentaje) para el tercer KPI.
  const efectivoPct = data ? Math.round(data.porForma.filter(p => formaTone(p.forma) === "success").reduce((a, p) => a + p.porcentaje, 0)) : 0;
  const otrosPct = Math.max(0, 100 - efectivoPct);

  const { exportPDF, exportExcel, exporting } = useReportExport({
    fileName: "cobranza-periodo",
    title: t("reportTitle"),
    dateRange: dates,
    kpis: data ? [
      { label: t("totalCollected"), value: fmt(data.total) },
      { label: t("collectionsCount"), value: data.count },
      { label: t("cashVsOther"), value: `${efectivoPct}% / ${otrosPct}%` },
    ] : undefined,
    table: data ? {
      headers: [t("date"), t("client"), t("vendor"), t("paymentMethod"), t("amount")],
      rows: data.cobros.map(c => [formatDateOnly(c.fecha), c.cliente, c.vendedor, c.formaPago, fmt(c.monto)]),
    } : undefined,
  });

  const loadData = useCallback(async () => {
    try { setLoading(true); setData(await getCobranzaPeriodo(dates)); }
    catch { toast.error(tc("errorLoading")); }
    finally { setLoading(false); }
  }, [dates]);

  const columns: ReportColumn<CobranzaCobro>[] = [
    { key: "fecha", header: t("date"), sortable: true, render: r => formatDateOnly(r.fecha) },
    { key: "cliente", header: t("client"), sortable: true },
    { key: "vendedor", header: t("vendor"), sortable: true },
    { key: "formaPago", header: t("paymentMethod"), render: r => <SoftBadge tone={formaTone(r.formaPago)}>{r.formaPago}</SoftBadge> },
    { key: "monto", header: t("amount"), align: "right", sortable: true, render: r => fmt(r.monto) },
  ];

  return (
    <div className="space-y-4">
      <ReportFilters desde={dates.desde} hasta={dates.hasta} onDesdeChange={v => setDates(d => ({ ...d, desde: v }))} onHastaChange={v => setDates(d => ({ ...d, hasta: v }))} onApply={loadData} loading={loading} onExportPDF={data && data.cobros.length > 0 ? exportPDF : undefined} onExportExcel={data && data.cobros.length > 0 ? exportExcel : undefined} exporting={exporting} />

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
      {data && data.cobros.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-sm font-medium">{tc("noData")}</p>
          <p className="text-xs mt-1">{tc("tryDifferentDates")}</p>
        </div>
      )}
      {data && data.cobros.length > 0 && (
        <>
          <ReportKPICards cards={[
            { label: t("totalCollected"), value: fmt(data.total), color: "green" },
            { label: t("collectionsCount"), value: data.count, color: "blue" },
            { label: t("cashVsOther"), value: `${efectivoPct}% / ${otrosPct}%`, subValue: t("cashVsOtherHint"), color: "gray" },
          ]} />
          <ReportTable data={data.cobros as unknown as Record<string, unknown>[]} columns={columns as unknown as ReportColumn<Record<string, unknown>>[]} />
        </>
      )}
    </div>
  );
}
