"use client";

import React, { useState, useCallback } from "react";
import { Package, Download, Check, Loader2 } from "lucide-react";
import { ReportFilters } from "./ReportFilters";
import { descargarPaqueteContador } from "@/services/api/reports";
import { downloadBlob } from "@/services/api/billing";
import { toast } from "@/hooks/useToast";
import { useTranslations } from "next-intl";

function defaultDates() {
  const h = new Date();
  const d = new Date(h);
  d.setDate(1);
  return { desde: d.toISOString().slice(0, 10), hasta: h.toISOString().slice(0, 10) };
}

export function PaqueteContadorReport() {
  const t = useTranslations("reports.paqueteContador");
  const tc = useTranslations("reports.common");

  const [dates, setDates] = useState(defaultDates);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    try {
      setDownloading(true);
      const blob = await descargarPaqueteContador(dates);
      downloadBlob(blob, `Paquete_Contador_${dates.desde}_${dates.hasta}.zip`);
      toast.success(t("downloaded"));
    } catch {
      toast.error(tc("errorLoading"));
    } finally {
      setDownloading(false);
    }
  }, [dates, t, tc]);

  const INCLUDES = ["edoResultados", "balanceGeneral", "balanza", "iva", "diot", "contaElec"];

  return (
    <div className="space-y-4">
      {/* Solo selector de rango (sin botón Consultar: la acción es descargar). */}
      <ReportFilters
        desde={dates.desde}
        hasta={dates.hasta}
        onDesdeChange={v => setDates(d => ({ ...d, desde: v }))}
        onHastaChange={v => setDates(d => ({ ...d, hasta: v }))}
        onApply={handleDownload}
        loading={downloading}
      />

      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-foreground">{t("title")}</h3>
            <p className="text-[12.5px] text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>

        <p className="text-[12.5px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">{t("includes")}</p>
        <ul className="space-y-1.5 mb-6">
          {INCLUDES.map(key => (
            <li key={key} className="flex items-center gap-2 text-[13.5px] text-foreground/80">
              <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
              {t(`items.${key}`)}
            </li>
          ))}
        </ul>

        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {downloading ? t("downloading") : t("downloadZip")}
        </button>
      </div>
    </div>
  );
}
