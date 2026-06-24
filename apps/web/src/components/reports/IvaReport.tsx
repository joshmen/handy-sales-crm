"use client";

import React, { useState, useCallback } from "react";
import { ReportFilters } from "./ReportFilters";
import { ReportKPICards } from "./ReportKPICards";
import { getReporteIva, ReporteIvaResponse } from "@/services/api/reports";
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

export function IvaReport() {
  const { formatCurrency } = useFormatters();
  const t = useTranslations("reports.iva");
  const tc = useTranslations("reports.common");
  const fmt = (n: number) => formatCurrency(n);

  const [dates, setDates] = useState(defaultDates);
  const [data, setData] = useState<ReporteIvaResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const balanceLabel = data ? (data.aCargo ? t("balanceDue") : t("balanceFavor")) : t("balanceFavor");

  const { exportPDF, exportExcel, exporting } = useReportExport({
    fileName: "iva",
    title: t("reportTitle"),
    dateRange: dates,
    kpis: data ? [
      { label: t("output"), value: fmt(data.trasladado) },
      { label: t("creditable"), value: fmt(data.acreditable) },
      { label: balanceLabel, value: fmt(Math.abs(data.saldo)) },
    ] : undefined,
    table: data ? {
      headers: [t("determination"), tc("total")],
      rows: [
        [t("output"), fmt(data.trasladado)],
        [t("minusCreditable"), `(${fmt(data.acreditable)})`],
        [t("taxedSales"), fmt(data.ventasGravadas)],
        [t("taxedPurchases"), fmt(data.comprasGravadas)],
      ],
      footerRow: [balanceLabel, fmt(Math.abs(data.saldo))],
    } : undefined,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setData(await getReporteIva(dates));
    } catch {
      toast.error(tc("errorLoading"));
    } finally {
      setLoading(false);
    }
  }, [dates, tc]);

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
        <>
          <ReportKPICards cards={[
            { label: t("output"), value: fmt(data.trasladado), color: "blue", subValue: t("outputHint") },
            { label: t("creditable"), value: fmt(data.acreditable), color: "gray", subValue: t("creditableHint") },
            {
              label: data.aCargo ? t("balanceDue") : t("balanceFavor"),
              value: fmt(Math.abs(data.saldo)),
              color: data.aCargo ? "amber" : "green",
              subValue: data.aCargo ? t("toPay") : t("toCredit"),
            },
          ]} />

          {/* Bloque de determinación */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-[13px] font-bold uppercase tracking-wide text-muted-foreground mb-4">{t("determination")}</h3>
            <div className="space-y-0">
              <div className="flex items-center justify-between py-2.5 border-b border-border-subtle">
                <span className="text-[13.5px] text-foreground/80">{t("output")}</span>
                <span className="tabular-nums text-[13.5px] text-foreground/90">{fmt(data.trasladado)}</span>
              </div>
              <div className="flex items-center justify-between py-2.5 border-b border-border-subtle">
                <span className="text-[13.5px] text-foreground/80">{t("minusCreditable")}</span>
                <span className="tabular-nums text-[13.5px] text-red-600">({fmt(data.acreditable)})</span>
              </div>
              <div className="flex items-center justify-between py-3 border-t-2 border-border">
                <span className="text-[13.5px] font-bold text-foreground">
                  {data.aCargo ? t("balanceDue") : t("balanceFavor")}
                </span>
                <span className={`tabular-nums text-[15px] font-bold ${data.aCargo ? "text-amber-600" : "text-green-700 dark:text-green-300"}`}>
                  {fmt(Math.abs(data.saldo))}
                </span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-[12.5px]">
              <div className="flex items-center justify-between bg-surface-1 rounded-lg px-3 py-2">
                <span className="text-muted-foreground">{t("taxedSales")}</span>
                <span className="tabular-nums text-foreground/90">{fmt(data.ventasGravadas)}</span>
              </div>
              <div className="flex items-center justify-between bg-surface-1 rounded-lg px-3 py-2">
                <span className="text-muted-foreground">{t("taxedPurchases")}</span>
                <span className="tabular-nums text-foreground/90">{fmt(data.comprasGravadas)}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
