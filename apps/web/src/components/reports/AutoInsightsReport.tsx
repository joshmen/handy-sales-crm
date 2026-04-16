"use client";

import React, { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { ReportFilters } from "./ReportFilters";
import { getInsights, InsightsResponse, Insight } from "@/services/api/reports";
import { toast } from "@/hooks/useToast";
import { Package, MapPin, Users, Eye, ShoppingCart, Lightbulb, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useChartTheme } from "@/hooks/useChartTheme";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

function defaultDates() {
  const h = new Date();
  const d = new Date(h);
  d.setMonth(d.getMonth() - 1);
  return { desde: d.toISOString().slice(0, 10), hasta: h.toISOString().slice(0, 10) };
}

const TIPO_ICONS: Record<string, React.ElementType> = {
  ventas: ShoppingCart, zona: MapPin, inventario: Package,
  visitas: Eye, producto: Package, clientes: Users,
};

const TIPO_COLORS: Record<string, { bar: string; bg: string; text: string; chart: string }> = {
  ventas:     { bar: "from-emerald-500 to-emerald-400", bg: "bg-emerald-50", text: "text-emerald-600", chart: "#10b981" },
  zona:       { bar: "from-blue-500 to-blue-400",      bg: "bg-blue-50",    text: "text-blue-600",    chart: "#3b82f6" },
  inventario: { bar: "from-red-500 to-red-400",        bg: "bg-red-50",     text: "text-red-500",     chart: "#ef4444" },
  visitas:    { bar: "from-violet-500 to-violet-400",   bg: "bg-violet-50",  text: "text-violet-600",  chart: "#8b5cf6" },
  producto:   { bar: "from-amber-500 to-amber-400",     bg: "bg-amber-50",   text: "text-amber-600",   chart: "#f59e0b" },
  clientes:   { bar: "from-teal-500 to-teal-400",       bg: "bg-teal-50",    text: "text-teal-600",    chart: "#14b8a6" },
};

/** Translate backend-generated insight texts (Spanish→locale) */
function translateInsight(text: string): string {
  let lang = 'es';
  try { const s = JSON.parse(localStorage.getItem('company_settings') || '{}'); lang = s.language || 'es'; } catch { /* */ }
  if (lang === 'es') return text;
  const rules: [RegExp, string][] = [
    [/^(\d+) productos con stock critico$/, '$1 products with critical stock'],
    [/^(\d+) nuevos clientes$/, '$1 new clients'],
    [/^Efectividad de visitas: (.+)$/, 'Visit effectiveness: $1'],
    [/^Mejor zona: (.+)$/, 'Best zone: $1'],
    [/^Zona con oportunidad: (.+)$/, 'Opportunity zone: $1'],
    [/^Producto destacado: (.+)$/, 'Featured product: $1'],
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
  for (const [re, rep] of rules) { if (re.test(text)) return text.replace(re, rep); }
  return text;
}

function InsightCard({ insight, index }: { insight: Insight; index: number }) {
  const chartColors = useChartTheme();
  const Icon = TIPO_ICONS[insight.tipo] || Lightbulb;
  const colors = TIPO_COLORS[insight.tipo] || { bar: "from-gray-400 to-gray-300", bg: "bg-surface-1", text: "text-muted-foreground", chart: "#9ca3af" };
  const isUp = insight.tendencia === "up";
  const isDown = insight.tendencia === "down";
  const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const trendColor = isUp ? "text-emerald-600" : isDown ? "text-red-500" : "text-muted-foreground";

  // Mini sparkline for each card
  const sparkOptions: ApexCharts.ApexOptions = {
    chart: { type: "area", sparkline: { enabled: true }, animations: { enabled: true, speed: 800 } },
    stroke: { curve: "smooth", width: 2 },
    fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.05 } },
    colors: [colors.chart],
    tooltip: { enabled: false },
  };
  // Generate a simple trend line based on the value
  const base = Math.max(Math.abs(insight.valor), 10);
  const sparkData = isUp
    ? [base * 0.3, base * 0.4, base * 0.5, base * 0.6, base * 0.8, base]
    : isDown
    ? [base, base * 0.9, base * 0.7, base * 0.5, base * 0.4, base * 0.3]
    : [base * 0.5, base * 0.6, base * 0.5, base * 0.55, base * 0.5, base * 0.52];

  return (
    <div
      className="relative overflow-hidden bg-surface-2 border border-border-subtle rounded-xl shadow-elevation-1 hover:shadow-elevation-2 transition-all duration-300 motion-safe:opacity-0 motion-safe:animate-card-enter"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Gradient top bar */}
      <div className={`h-1 bg-gradient-to-r ${colors.bar}`} />

      <div className="p-5">
        {/* Header: icon + trend */}
        <div className="flex items-start justify-between mb-4">
          <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${colors.bg}`}>
            <Icon className={`w-5 h-5 ${colors.text}`} />
          </div>
          {insight.valor !== undefined && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
              isUp ? "bg-emerald-50 text-emerald-700" : isDown ? "bg-red-50 text-red-600" : "bg-surface-3 text-muted-foreground"
            }`}>
              <TrendIcon className="w-3.5 h-3.5" />
              {Math.abs(insight.valor)}%
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-foreground mb-1 leading-snug">
          {translateInsight(insight.titulo)}
        </h3>

        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
          {translateInsight(insight.descripcion)}
        </p>

        {/* Mini sparkline chart */}
        <div className="-mx-2 -mb-2">
          <Chart key={chartColors.isDark ? 'dark' : 'light'} type="area" options={sparkOptions} series={[{ data: sparkData }]} height={50} />
        </div>
      </div>
    </div>
  );
}

export function AutoInsightsReport() {
  const chartColors = useChartTheme();
  const t = useTranslations("reports.autoInsights");
  const tc = useTranslations("reports.common");
  const [dates, setDates] = useState(defaultDates);
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setData(await getInsights(dates));
    } catch {
      toast.error(tc("errorLoadingInsights"));
    } finally {
      setLoading(false);
    }
  }, [dates]);

  // Summary chart data
  const chartInsights = data?.insights.filter(i => i.valor !== undefined) || [];
  const summaryOptions: ApexCharts.ApexOptions = {
    chart: { type: "bar", toolbar: { show: false }, animations: { enabled: true, speed: 800 } },
    plotOptions: { bar: { borderRadius: 8, columnWidth: "55%", distributed: true } },
    colors: chartInsights.map(i => TIPO_COLORS[i.tipo]?.chart || "#9ca3af"),
    grid: { borderColor: "hsl(var(--border-subtle))", strokeDashArray: 3, padding: { bottom: -8 } },
    dataLabels: { enabled: true, formatter: (v) => `${v}%`, style: { fontSize: "11px", fontWeight: "bold" }, offsetY: -4 },
    xaxis: {
      categories: chartInsights.map(i => translateInsight(i.titulo).split(":")[0].substring(0, 20)),
      labels: { style: { fontSize: "10px", colors: "hsl(var(--muted-foreground))" }, trim: true, maxHeight: 50 },
    },
    yaxis: { labels: { style: { fontSize: "10px", colors: "hsl(var(--muted-foreground))" }, formatter: (v) => `${v}%` } },
    tooltip: { y: { formatter: (v) => `${v}%` } },
    legend: { show: false },
  };

  return (
    <div className="space-y-5">
      <ReportFilters
        desde={dates.desde}
        hasta={dates.hasta}
        onDesdeChange={(v) => setDates((d) => ({ ...d, desde: v }))}
        onHastaChange={(v) => setDates((d) => ({ ...d, hasta: v }))}
        onApply={fetch}
        loading={loading}
      />

      {!data && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Lightbulb className="w-10 h-10 mb-3 text-muted-foreground/40" />
          <p className="text-sm">{tc("clickApply")}</p>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {data && data.insights.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Lightbulb className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium">{t("noInsights")}</p>
          <p className="text-xs mt-1">{t("tryWiderRange")}</p>
        </div>
      )}

      {data && data.insights.length > 0 && (
        <>
          {/* Insight cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.insights.map((insight, i) => (
              <InsightCard key={i} insight={insight} index={i} />
            ))}
          </div>

          {/* Summary bar chart */}
          {chartInsights.length > 1 && (
            <div className="bg-surface-2 border border-border-subtle rounded-xl shadow-elevation-1 p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">{t("summaryChart")}</h3>
              <Chart
                key={chartColors.isDark ? 'dark' : 'light'}
                type="bar"
                options={summaryOptions}
                series={[{ name: "%", data: chartInsights.map(i => i.valor) }]}
                height={280}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
