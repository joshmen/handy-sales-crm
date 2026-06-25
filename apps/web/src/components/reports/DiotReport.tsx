"use client";

import React, { useState, useCallback } from "react";
import { Download } from "lucide-react";
import { ReportFilters } from "./ReportFilters";
import { ReportKPICards } from "./ReportKPICards";
import { ReportTable, ReportColumn } from "./ReportTable";
import { getDiot, DiotProveedor, DiotResponse } from "@/services/api/reports";
import { downloadBlob } from "@/services/api/billing";
import { toast } from "@/hooks/useToast";
import { useFormatters } from "@/hooks/useFormatters";
import { useTranslations } from "next-intl";

function defaultDates() {
  const h = new Date();
  const d = new Date(h);
  d.setDate(1);
  return { desde: d.toISOString().slice(0, 10), hasta: h.toISOString().slice(0, 10) };
}

export function DiotReport() {
  const { formatCurrency } = useFormatters();
  const t = useTranslations("reports.diot");
  const tc = useTranslations("reports.common");
  const fmt = (n: number) => formatCurrency(n);

  const [dates, setDates] = useState(defaultDates);
  const [data, setData] = useState<DiotResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setData(await getDiot(dates));
    } catch {
      toast.error(tc("errorLoading"));
    } finally {
      setLoading(false);
    }
  }, [dates, tc]);

  // Exportaciones cliente (placeholder DIOT): TXT con pipe (formato típico DIOT)
  // y CSV abrible en Excel. La generación oficial SAT vive en el backend.
  const exportTxt = () => {
    if (!data) return;
    const lines = data.proveedores.map(p =>
      [p.tipoTercero, p.rfc, p.nombre, p.base.toFixed(2), p.ivaPagado.toFixed(2)].join("|")
    );
    downloadBlob(new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }), `DIOT_${dates.desde}_${dates.hasta}.txt`);
  };

  const exportExcel = () => {
    if (!data) return;
    const header = [t("rfc"), t("supplier"), t("thirdPartyType"), t("base"), t("vatPaid")].join(",");
    const rows = data.proveedores.map(p =>
      [p.rfc, `"${p.nombre}"`, p.tipoTercero, p.base.toFixed(2), p.ivaPagado.toFixed(2)].join(",")
    );
    downloadBlob(new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" }), `DIOT_${dates.desde}_${dates.hasta}.csv`);
  };

  const columns: ReportColumn<DiotProveedor>[] = [
    { key: "rfc", header: t("rfc"), sortable: true, render: r => <span className="font-mono text-muted-foreground">{r.rfc}</span> },
    { key: "nombre", header: t("supplier"), sortable: true },
    { key: "tipoTercero", header: t("thirdPartyType"), sortable: true },
    { key: "base", header: t("base"), align: "right", sortable: true, render: r => fmt(r.base) },
    { key: "ivaPagado", header: t("vatPaid"), align: "right", sortable: true, render: r => fmt(r.ivaPagado) },
  ];

  const footerRow: Record<string, React.ReactNode> = data ? {
    rfc: "",
    nombre: <span className="font-semibold">{tc("total")}</span>,
    tipoTercero: "",
    base: <span className="font-semibold text-foreground">{fmt(data.totalBase)}</span>,
    ivaPagado: <span className="font-semibold text-foreground">{fmt(data.totalIva)}</span>,
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
      >
        {data && data.proveedores.length > 0 && (
          <div className="flex items-end gap-2">
            <button
              onClick={exportTxt}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-foreground/80 bg-card border border-border-default rounded-md hover:bg-surface-1"
            >
              <Download className="w-3.5 h-3.5" />
              {t("exportTxt")}
            </button>
            <button
              onClick={exportExcel}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-foreground/80 bg-card border border-border-default rounded-md hover:bg-surface-1"
            >
              <Download className="w-3.5 h-3.5" />
              {t("exportExcel")}
            </button>
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
      {data && data.proveedores.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-sm font-medium">{tc("noData")}</p>
          <p className="text-xs mt-1">{tc("tryDifferentDates")}</p>
        </div>
      )}
      {data && data.proveedores.length > 0 && (
        <>
          <ReportKPICards cards={[
            { label: t("vatPaid"), value: fmt(data.totalIva), color: "blue" },
            { label: t("suppliers"), value: data.proveedores.length, color: "gray" },
            { label: t("base"), value: fmt(data.totalBase), color: "gray" },
          ]} />
          <ReportTable
            data={data.proveedores as unknown as Record<string, unknown>[]}
            columns={columns as unknown as ReportColumn<Record<string, unknown>>[]}
            footerRow={footerRow}
          />
        </>
      )}
    </div>
  );
}
