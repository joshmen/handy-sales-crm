"use client";

import React, { useState, useCallback } from "react";
import { ReportFilters } from "./ReportFilters";
import { SoftBadge } from "@/components/ui/SoftBadge";
import { getBalanceGeneral, BalanceGeneralCuenta, BalanceGeneralResponse } from "@/services/api/reports";
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

export function BalanceGeneralReport() {
  const { formatCurrency } = useFormatters();
  const t = useTranslations("reports.balanceGeneral");
  const tc = useTranslations("reports.common");
  const fmt = (n: number) => formatCurrency(n);

  const [dates, setDates] = useState(defaultDates);
  const [data, setData] = useState<BalanceGeneralResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const hasData = !!data && (data.activo.length > 0 || data.pasivo.length > 0 || data.capital.length > 0);

  const { exportPDF, exportExcel, exporting } = useReportExport({
    fileName: "balance-general",
    title: t("reportTitle"),
    // Balance general es a una fecha de corte: solo `hasta`.
    dateRange: { desde: dates.hasta, hasta: dates.hasta },
    kpis: data ? [
      { label: t("totalAssets"), value: fmt(data.totalActivo) },
      { label: t("totalLiabilities"), value: fmt(data.totalPasivo) },
      { label: t("totalEquity"), value: fmt(data.totalCapital) },
      { label: t("totalLiabilitiesEquity"), value: fmt(data.totalPasivoCapital) },
    ] : undefined,
    table: data ? {
      headers: [tc("name"), tc("amount")],
      rows: [
        [t("assets"), ""] as (string | number)[],
        ...data.activo.map(c => [`${c.cuenta}  ${c.nombre}`, fmt(c.monto)] as (string | number)[]),
        [t("totalAssets"), fmt(data.totalActivo)] as (string | number)[],
        [t("liabilities"), ""] as (string | number)[],
        ...data.pasivo.map(c => [`${c.cuenta}  ${c.nombre}`, fmt(c.monto)] as (string | number)[]),
        [t("totalLiabilities"), fmt(data.totalPasivo)] as (string | number)[],
        [t("equity"), ""] as (string | number)[],
        ...data.capital.map(c => [`${c.cuenta}  ${c.nombre}`, fmt(c.monto)] as (string | number)[]),
        [t("totalEquity"), fmt(data.totalCapital)] as (string | number)[],
      ],
      footerRow: [t("totalLiabilitiesEquity"), fmt(data.totalPasivoCapital)],
    } : undefined,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      // Balance general es a una fecha de corte: solo `hasta`.
      setData(await getBalanceGeneral({ hasta: dates.hasta }));
    } catch {
      toast.error(tc("errorLoading"));
    } finally {
      setLoading(false);
    }
  }, [dates.hasta, tc]);

  const Row = ({ c }: { c: BalanceGeneralCuenta }) => (
    <div className="flex items-center justify-between py-2 px-4 border-t border-border-subtle">
      <span className="text-[13px] text-foreground/80">
        <span className="font-mono text-muted-foreground mr-2">{c.cuenta}</span>
        {c.nombre}
      </span>
      <span className="tabular-nums text-[13px] text-foreground/90">{fmt(c.monto)}</span>
    </div>
  );

  const Subtotal = ({ label, value }: { label: string; value: number }) => (
    <div className="flex items-center justify-between py-2.5 px-4 border-t-2 border-border bg-surface-1">
      <span className="text-[13px] font-bold text-foreground">{label}</span>
      <span className="tabular-nums text-[13px] font-bold text-foreground">{fmt(value)}</span>
    </div>
  );

  const ColumnTitle = ({ children }: { children: React.ReactNode }) => (
    <div className="py-2.5 px-4 bg-surface-2">
      <span className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">{children}</span>
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
        onExportPDF={hasData ? exportPDF : undefined}
        onExportExcel={hasData ? exportExcel : undefined}
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
          <div className="flex items-center justify-end">
            {data.cuadrado ? (
              <SoftBadge tone="success">{t("balanced")}</SoftBadge>
            ) : (
              <SoftBadge tone="warning">{t("unbalanced")}</SoftBadge>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Activo */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <ColumnTitle>{t("assets")}</ColumnTitle>
              {data.activo.map((c, i) => <Row key={i} c={c} />)}
              <Subtotal label={t("totalAssets")} value={data.totalActivo} />
            </div>

            {/* Pasivo y Capital */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <ColumnTitle>{t("liabilitiesEquity")}</ColumnTitle>
              <div className="py-1.5 px-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t("liabilities")}</div>
              {data.pasivo.map((c, i) => <Row key={`p${i}`} c={c} />)}
              <Subtotal label={t("totalLiabilities")} value={data.totalPasivo} />
              <div className="py-1.5 px-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t("equity")}</div>
              {data.capital.map((c, i) => <Row key={`c${i}`} c={c} />)}
              <Subtotal label={t("totalEquity")} value={data.totalCapital} />
              <Subtotal label={t("totalLiabilitiesEquity")} value={data.totalPasivoCapital} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
