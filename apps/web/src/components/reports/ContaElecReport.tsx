"use client";

import React, { useState, useCallback } from "react";
import { FileCode, Download } from "lucide-react";
import { ReportFilters } from "./ReportFilters";
import { getContabilidadElectronica, ContabilidadElectronicaResponse } from "@/services/api/reports";
import { downloadBlob } from "@/services/api/billing";
import { toast } from "@/hooks/useToast";
import { useTranslations } from "next-intl";

function defaultDates() {
  const h = new Date();
  const d = new Date(h);
  d.setDate(1);
  return { desde: d.toISOString().slice(0, 10), hasta: h.toISOString().slice(0, 10) };
}

type XmlKind = "catalogo" | "balanza" | "polizas";

export function ContaElecReport() {
  const t = useTranslations("reports.contaElec");
  const tc = useTranslations("reports.common");

  const [dates, setDates] = useState(defaultDates);
  const [data, setData] = useState<ContabilidadElectronicaResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setData(await getContabilidadElectronica(dates));
    } catch {
      toast.error(tc("errorLoading"));
    } finally {
      setLoading(false);
    }
  }, [dates, tc]);

  const downloadXml = (kind: XmlKind) => {
    if (!data) return;
    const map: Record<XmlKind, { xml: string; prefix: string }> = {
      catalogo: { xml: data.catalogoXml, prefix: "CT" },
      balanza: { xml: data.balanzaXml, prefix: "BN" },
      polizas: { xml: data.polizasXml, prefix: "PL" },
    };
    const { xml, prefix } = map[kind];
    downloadBlob(new Blob([xml], { type: "application/xml;charset=utf-8" }), `${prefix}_${data.periodo}.xml`);
  };

  const downloadAll = () => {
    (["catalogo", "balanza", "polizas"] as XmlKind[]).forEach(downloadXml);
  };

  const CARDS: { kind: XmlKind; code: string; titleKey: string; descKey: string }[] = [
    { kind: "catalogo", code: "CT", titleKey: "catalogTitle", descKey: "catalogDesc" },
    { kind: "balanza", code: "BN", titleKey: "balanceTitle", descKey: "balanceDesc" },
    { kind: "polizas", code: "PL", titleKey: "journalTitle", descKey: "journalDesc" },
  ];

  return (
    <div className="space-y-4">
      <ReportFilters
        desde={dates.desde}
        hasta={dates.hasta}
        onDesdeChange={v => setDates(d => ({ ...d, desde: v }))}
        onHastaChange={v => setDates(d => ({ ...d, hasta: v }))}
        onApply={loadData}
        loading={loading}
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {CARDS.map(card => (
              <div key={card.kind} className="bg-card border border-border rounded-2xl p-5 flex flex-col">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <FileCode className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{card.code}</span>
                </div>
                <h3 className="text-[14px] font-bold text-foreground">{t(card.titleKey)}</h3>
                <p className="text-[12.5px] text-muted-foreground mt-1 flex-1">{t(card.descKey)}</p>
                <button
                  onClick={() => downloadXml(card.kind)}
                  className="mt-4 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90"
                >
                  <Download className="w-3.5 h-3.5" />
                  {t("generateXml")}
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              onClick={downloadAll}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-foreground border border-border-strong bg-card rounded-md hover:bg-surface-1"
            >
              <Download className="w-3.5 h-3.5" />
              {t("generateAll")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
