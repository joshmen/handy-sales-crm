"use client";

import React, { useState, useCallback } from "react";
import { ReportFilters } from "./ReportFilters";
import { ReportKPICards } from "./ReportKPICards";
import { ReportTable, ReportColumn } from "./ReportTable";
import { getEstadoCuenta, EstadoCuentaMovimiento, EstadoCuentaResponse } from "@/services/api/reports";
import { toast } from "@/hooks/useToast";
import { useReportExport } from "@/hooks/useReportExport";
import { useFormatters } from "@/hooks/useFormatters";
import { useTranslations } from "next-intl";

function defaultDates() {
  const h = new Date(); const d = new Date(h); d.setMonth(d.getMonth() - 3);
  return { desde: d.toISOString().slice(0, 10), hasta: h.toISOString().slice(0, 10) };
}

export function EstadoCuentaReport() {
  const { formatCurrency, formatDateOnly } = useFormatters();
  const t = useTranslations("reports.estadoCuenta");
  const tc = useTranslations("reports.common");
  const fmt = (n: number) => formatCurrency(n);

  const [dates, setDates] = useState(defaultDates);
  const [clienteId, setClienteId] = useState<number | undefined>(undefined);
  const [data, setData] = useState<EstadoCuentaResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const { exportPDF, exportExcel, exporting } = useReportExport({
    fileName: "estado-cuenta",
    title: data ? `${t("reportTitle")}: ${data.clienteNombre}` : t("reportTitle"),
    dateRange: dates,
    kpis: data ? [
      { label: t("totalCharges"), value: fmt(data.cargosTotal) },
      { label: t("totalPayments"), value: fmt(data.abonosTotal) },
      { label: t("currentBalance"), value: fmt(data.saldoActual) },
    ] : undefined,
    table: data ? {
      headers: [t("date"), t("concept"), t("charge"), t("payment"), t("balance")],
      rows: data.movimientos.map(m => [formatDateOnly(m.fecha), m.concepto, m.cargo ? fmt(m.cargo) : "-", m.abono ? fmt(m.abono) : "-", fmt(m.saldo)]),
    } : undefined,
  });

  const loadData = useCallback(async () => {
    try { setLoading(true); const res = await getEstadoCuenta({ ...dates, clienteId }); setData(res); if (res.clienteId) setClienteId(res.clienteId); }
    catch { toast.error(tc("errorLoading")); }
    finally { setLoading(false); }
  }, [dates, clienteId]);

  const columns: ReportColumn<EstadoCuentaMovimiento>[] = [
    { key: "fecha", header: t("date"), sortable: true, render: r => formatDateOnly(r.fecha) },
    { key: "concepto", header: t("concept"), sortable: true },
    { key: "cargo", header: t("charge"), align: "right", sortable: true, render: r => r.cargo ? fmt(r.cargo) : <span className="text-muted-foreground">-</span> },
    { key: "abono", header: t("payment"), align: "right", sortable: true, render: r => r.abono ? fmt(r.abono) : <span className="text-muted-foreground">-</span> },
    { key: "saldo", header: t("balance"), align: "right", render: r => <span className="font-semibold text-foreground">{fmt(r.saldo)}</span> },
  ];

  return (
    <div className="space-y-4">
      <ReportFilters desde={dates.desde} hasta={dates.hasta} onDesdeChange={v => setDates(d => ({ ...d, desde: v }))} onHastaChange={v => setDates(d => ({ ...d, hasta: v }))} onApply={loadData} loading={loading} onExportPDF={data && data.movimientos.length > 0 ? exportPDF : undefined} onExportExcel={data && data.movimientos.length > 0 ? exportExcel : undefined} exporting={exporting}>
        {data && data.clientes.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-foreground/70">{t("client")}</label>
            <select value={clienteId ?? ""} onChange={e => setClienteId(e.target.value ? Number(e.target.value) : undefined)} className="px-3 py-2 text-sm border border-border-default rounded-md min-w-[200px]">
              {data.clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
        )}
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
      {data && data.movimientos.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-sm font-medium">{tc("noData")}</p>
          <p className="text-xs mt-1">{tc("tryDifferentDates")}</p>
        </div>
      )}
      {data && data.movimientos.length > 0 && (
        <>
          {data.clienteRfc && (
            <p className="text-xs text-muted-foreground">{t("client")}: <span className="font-medium text-foreground/80">{data.clienteNombre}</span> · RFC {data.clienteRfc}</p>
          )}
          <ReportKPICards cards={[
            { label: t("totalCharges"), value: fmt(data.cargosTotal), color: "blue" },
            { label: t("totalPayments"), value: fmt(data.abonosTotal), color: "green" },
            { label: t("currentBalance"), value: fmt(data.saldoActual), color: data.saldoActual > 0 ? "amber" : "gray" },
          ]} />
          <ReportTable data={data.movimientos as unknown as Record<string, unknown>[]} columns={columns as unknown as ReportColumn<Record<string, unknown>>[]} />
        </>
      )}
    </div>
  );
}
