"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, Download, Loader2, FileSpreadsheet } from "lucide-react";
import { ReportKPICards } from "./ReportKPICards";
import { ReportTable, ReportColumn } from "./ReportTable";
import { SoftBadge } from "@/components/ui/SoftBadge";
import { getPorVencer, PorVencerDocumento, PorVencerResponse } from "@/services/api/reports";
import { toast } from "@/hooks/useToast";
import { useReportExport } from "@/hooks/useReportExport";
import { useFormatters } from "@/hooks/useFormatters";
import { useTranslations } from "next-intl";

export function PorVencerReport() {
  const { formatCurrency, formatDateOnly } = useFormatters();
  const t = useTranslations("reports.porVencer");
  const tc = useTranslations("reports.common");
  const tFilters = useTranslations("reports.filters");
  const fmt = (n: number) => formatCurrency(n);

  const [dias, setDias] = useState<number>(15);
  const [data, setData] = useState<PorVencerResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const { exportPDF, exportExcel, exporting } = useReportExport({
    fileName: "por-vencer",
    title: t("reportTitle"),
    kpis: data ? [
      { label: t("upcomingDue"), value: fmt(data.totalPorVencer) },
      { label: t("dso"), value: t("dsoValue", { dias: data.dso }) },
      { label: t("documents"), value: data.count },
    ] : undefined,
    table: data ? {
      headers: [t("client"), t("folio"), t("dueDate"), t("inDays"), t("amount")],
      rows: data.documentos.map(d => [d.cliente, d.folio, formatDateOnly(d.vence), t("daysValue", { dias: d.dias }), fmt(d.monto)]),
    } : undefined,
  });

  const loadData = useCallback(async () => {
    try { setLoading(true); setData(await getPorVencer({ dias })); }
    catch { toast.error(tc("errorLoading")); }
    finally { setLoading(false); }
  }, [dias]);

  useEffect(() => { loadData(); }, []);

  const columns: ReportColumn<PorVencerDocumento>[] = [
    { key: "cliente", header: t("client"), sortable: true },
    { key: "folio", header: t("folio"), render: r => <span className="font-mono text-xs">{r.folio}</span> },
    { key: "vence", header: t("dueDate"), sortable: true, render: r => formatDateOnly(r.vence) },
    { key: "dias", header: t("inDays"), align: "right", sortable: true, render: r => <SoftBadge tone={r.dias <= 5 ? "warning" : "default"}>{t("daysValue", { dias: r.dias })}</SoftBadge> },
    { key: "monto", header: t("amount"), align: "right", sortable: true, render: r => fmt(r.monto) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 p-4 bg-surface-1 rounded-lg border border-border-subtle">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-foreground/70">{t("nextDays")}</label>
          <select value={dias} onChange={e => setDias(Number(e.target.value))} className="px-3 py-2 text-sm border border-border-default rounded-md">
            <option value={15}>{t("daysOption", { dias: 15 })}</option>
            <option value={30}>{t("daysOption", { dias: 30 })}</option>
          </select>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-success-foreground bg-success rounded-md hover:bg-success/90 disabled:opacity-50"
        >
          <Search className="w-3.5 h-3.5" />
          {loading ? tc("loading") : t("apply")}
        </button>
        {data && data.documentos.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={exportExcel}
              disabled={exporting}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-foreground/80 bg-white border border-border-default rounded-md hover:bg-surface-1 disabled:opacity-50"
              title="Excel"
            >
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
              Excel
            </button>
            <button
              onClick={exportPDF}
              disabled={exporting}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-foreground/80 bg-white border border-border-default rounded-md hover:bg-surface-1 disabled:opacity-50"
              title={tFilters("exportPDF")}
            >
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {exporting ? tFilters("exporting") : "PDF"}
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}
      {data && data.documentos.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-sm font-medium">{tc("noData")}</p>
          <p className="text-xs mt-1">{t("tryMoreDays")}</p>
        </div>
      )}
      {data && data.documentos.length > 0 && !loading && (
        <>
          <ReportKPICards cards={[
            { label: t("upcomingDue"), value: fmt(data.totalPorVencer), color: "blue" },
            { label: t("dso"), value: t("dsoValue", { dias: data.dso }), color: "amber" },
            { label: t("documents"), value: data.count, color: "gray" },
          ]} />
          <ReportTable data={data.documentos as unknown as Record<string, unknown>[]} columns={columns as unknown as ReportColumn<Record<string, unknown>>[]} />
        </>
      )}
    </div>
  );
}
