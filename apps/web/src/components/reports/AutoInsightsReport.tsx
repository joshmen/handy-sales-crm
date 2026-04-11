"use client";

import React, { useState, useCallback } from "react";
import { ReportFilters } from "./ReportFilters";
import { getInsights, InsightsResponse, Insight } from "@/services/api/reports";
import { toast } from "@/hooks/useToast";
import { TrendingUp, TrendingDown, Minus, Package, MapPin, Users, Eye, ShoppingCart, Lightbulb } from "lucide-react";
import { useTranslations } from "next-intl";

function defaultDates() {
  const h = new Date();
  const d = new Date(h);
  d.setMonth(d.getMonth() - 1);
  return { desde: d.toISOString().slice(0, 10), hasta: h.toISOString().slice(0, 10) };
}

const TIPO_ICONS: Record<string, React.ElementType> = {
  ventas: ShoppingCart,
  zona: MapPin,
  inventario: Package,
  visitas: Eye,
  producto: Package,
  clientes: Users,
};

const TIPO_ACCENTS: Record<string, { bar: string; iconBg: string; icon: string }> = {
  ventas: { bar: "bg-emerald-500", iconBg: "bg-emerald-50", icon: "text-emerald-600" },
  zona: { bar: "bg-blue-500", iconBg: "bg-blue-50", icon: "text-blue-600" },
  inventario: { bar: "bg-red-400", iconBg: "bg-red-50", icon: "text-red-500" },
  visitas: { bar: "bg-violet-500", iconBg: "bg-violet-50", icon: "text-violet-600" },
  producto: { bar: "bg-amber-400", iconBg: "bg-amber-50", icon: "text-amber-600" },
  clientes: { bar: "bg-teal-500", iconBg: "bg-teal-50", icon: "text-teal-600" },
};

/** Translate backend-generated insight texts (Spanish→locale) */
function translateInsight(text: string): string {
  let lang = 'es';
  try { const s = JSON.parse(localStorage.getItem('company_settings') || '{}'); lang = s.language || 'es'; } catch { /* */ }
  if (lang === 'es') return text;
  // Title patterns
  const titleRules: [RegExp, string][] = [
    [/^(\d+) productos con stock critico$/, '$1 products with critical stock'],
    [/^(\d+) nuevos clientes$/, '$1 new clients'],
    [/^Efectividad de visitas: (.+)$/, 'Visit effectiveness: $1'],
    [/^Mejor zona: (.+)$/, 'Best zone: $1'],
    [/^Zona con oportunidad: (.+)$/, 'Opportunity zone: $1'],
    [/^Producto destacado: (.+)$/, 'Featured product: $1'],
  ];
  // Description patterns
  const descRules: [RegExp, string][] = [
    [/^Productos sin stock o por debajo del minimo que requieren reabastecimiento\.$/, 'Products out of stock or below minimum that need restocking.'],
    [/^(\d+) de (\d+) visitas resultaron en venta\.$/, '$1 of $2 visits resulted in a sale.'],
    [/^Aumento de (.+)% vs periodo anterior\.$/, 'Increase of $1% vs prior period.'],
    [/^Disminucion de (.+)% vs periodo anterior\.$/, 'Decrease of $1% vs prior period.'],
    [/^Nuevos clientes registrados en este periodo\.$/, 'New clients registered in this period.'],
    [/^Crecio (.+)% en ventas este periodo\.$/, 'Grew $1% in sales this period.'],
    [/^Cayo (.+)% en ventas\. Revisar cobertura\.$/, 'Dropped $1% in sales. Review coverage.'],
    [/^Crecio (.+)% en ventas\.$/, 'Grew $1% in sales.'],
    [/^Cayo (.+)% en ventas\.$/, 'Dropped $1% in sales.'],
  ];
  for (const [re, rep] of titleRules) { if (re.test(text)) return text.replace(re, rep); }
  for (const [re, rep] of descRules) { if (re.test(text)) return text.replace(re, rep); }
  return text;
}

function InsightCard({ insight, index }: { insight: Insight; index: number }) {
  const Icon = TIPO_ICONS[insight.tipo] || Lightbulb;
  const accent = TIPO_ACCENTS[insight.tipo] || { bar: "bg-surface-3", iconBg: "bg-surface-1", icon: "text-muted-foreground" };
  const TrendIcon =
    insight.tendencia === "up" ? TrendingUp : insight.tendencia === "down" ? TrendingDown : Minus;
  const trendColor =
    insight.tendencia === "up" ? "text-emerald-600" : insight.tendencia === "down" ? "text-red-500" : "text-muted-foreground";

  return (
    <div
      className="relative overflow-hidden bg-white border border-border-subtle rounded-xl p-5 motion-safe:opacity-0 motion-safe:animate-card-enter hover:shadow-lg transition-shadow duration-300"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className={`absolute top-0 left-0 right-0 h-1 ${accent.bar}`} />
      <div className="flex items-start justify-between mb-3 pt-1">
        <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${accent.iconBg}`}>
          <Icon className={`w-4 h-4 ${accent.icon}`} />
        </div>
        {insight.valor !== undefined && (
          <div className={`flex items-center gap-1 ${trendColor}`}>
            <TrendIcon className="w-4 h-4" />
            <span className="text-sm font-semibold">{insight.valor}%</span>
          </div>
        )}
      </div>
      <h3 className="text-[13px] font-semibold text-foreground mb-1">{translateInsight(insight.titulo)}</h3>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{translateInsight(insight.descripcion)}</p>
    </div>
  );
}

export function AutoInsightsReport() {
  const t = useTranslations("reports.autoInsights");
  const tc = useTranslations("reports.common");
  const [dates, setDates] = useState(defaultDates);
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getInsights(dates);
      setData(res);
    } catch {
      toast.error(tc("errorLoadingInsights"));
    } finally {
      setLoading(false);
    }
  }, [dates]);

  return (
    <div className="space-y-4">
      <ReportFilters
        desde={dates.desde}
        hasta={dates.hasta}
        onDesdeChange={(v) => setDates((d) => ({ ...d, desde: v }))}
        onHastaChange={(v) => setDates((d) => ({ ...d, hasta: v }))}
        onApply={fetch}
        loading={loading}
      />

      {data && (
        <>
          {data.insights.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Lightbulb className="w-12 h-12 mx-auto mb-3 text-muted-foreground/60" />
              <p className="text-sm">{t("noInsights")}</p>
              <p className="text-xs mt-1">{t("tryWiderRange")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.insights.map((insight, i) => (
                <InsightCard key={i} insight={insight} index={i} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
