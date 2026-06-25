"use client";

import React, { useState, useCallback } from "react";
import { ReportFilters } from "./ReportFilters";
import { ReportTable, ReportColumn } from "./ReportTable";
import { SoftBadge } from "@/components/ui/SoftBadge";
import { getBalanza, BalanzaFila, BalanzaResponse } from "@/services/api/reports";
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

export function BalanzaReport() {
  const { formatCurrency } = useFormatters();
  const t = useTranslations("reports.balanza");
  const tc = useTranslations("reports.common");
  const fmt = (n: number) => formatCurrency(n);

  const [dates, setDates] = useState(defaultDates);
  const [data, setData] = useState<BalanzaResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const { exportPDF, exportExcel, exporting } = useReportExport({
    fileName: "balanza",
    title: t("reportTitle"),
    dateRange: dates,
    table: data ? {
      headers: [t("account"), t("name"), t("debit"), t("credit")],
      rows: data.filas.map(f => [f.codigo, f.nombre, fmt(f.debe), fmt(f.haber)]),
      footerRow: ["", t("equalSums"), fmt(data.totalDebe), fmt(data.totalHaber)],
    } : undefined,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setData(await getBalanza(dates));
    } catch {
      toast.error(tc("errorLoading"));
    } finally {
      setLoading(false);
    }
  }, [dates, tc]);

  const columns: ReportColumn<BalanzaFila>[] = [
    { key: "codigo", header: t("account"), sortable: true, render: r => <span className="font-mono text-muted-foreground">{r.codigo}</span> },
    { key: "nombre", header: t("name"), sortable: true },
    { key: "debe", header: t("debit"), align: "right", sortable: true, render: r => fmt(r.debe) },
    { key: "haber", header: t("credit"), align: "right", sortable: true, render: r => fmt(r.haber) },
  ];

  const footerRow: Record<string, React.ReactNode> = data ? {
    codigo: "",
    nombre: <span className="font-semibold">{t("equalSums")}</span>,
    debe: <span className="font-semibold text-foreground">{fmt(data.totalDebe)}</span>,
    haber: <span className="font-semibold text-foreground">{fmt(data.totalHaber)}</span>,
  } : {};

  return (
    <div className="space-y-4">
      <ReportFilters
        desde={dates.desde}
        hasta={dates.hasta}
        onDesdeChange={v => setDates(d => ({ ...d, desde: v }))}
        onHastaChange={v => setDates(d => ({ ...d, hasta: v }))}
        onApply={loadData}
        loading={loading}
        onExportPDF={data && data.filas.length > 0 ? exportPDF : undefined}
        onExportExcel={data && data.filas.length > 0 ? exportExcel : undefined}
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
      {data && data.filas.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-sm font-medium">{tc("noData")}</p>
          <p className="text-xs mt-1">{tc("tryDifferentDates")}</p>
        </div>
      )}
      {data && data.filas.length > 0 && (
        <>
          <div className="flex items-center justify-end">
            {data.cuadrada ? (
              <SoftBadge tone="success">{t("balanced")}</SoftBadge>
            ) : (
              <SoftBadge tone="warning">{t("unbalanced")}</SoftBadge>
            )}
          </div>
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
