"use client";

import React, { useState, useCallback } from "react";
import { ReportFilters } from "./ReportFilters";
import { getInsights, InsightsResponse, Insight } from "@/services/api/reports";
import { toast } from "@/hooks/useToast";
import { TrendingUp, TrendingDown, Minus, Package, MapPin, Users, Eye, ShoppingCart, Lightbulb } from "lucide-react";

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

const TIPO_COLORS: Record<string, { bg: string; border: string; icon: string }> = {
  ventas: { bg: "bg-green-50", border: "border-green-200", icon: "text-green-600" },
  zona: { bg: "bg-blue-50", border: "border-blue-200", icon: "text-blue-600" },
  inventario: { bg: "bg-red-50", border: "border-red-200", icon: "text-red-600" },
  visitas: { bg: "bg-purple-50", border: "border-purple-200", icon: "text-purple-600" },
  producto: { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-600" },
  clientes: { bg: "bg-teal-50", border: "border-teal-200", icon: "text-teal-600" },
};

function InsightCard({ insight }: { insight: Insight }) {
  const Icon = TIPO_ICONS[insight.tipo] || Lightbulb;
  const colors = TIPO_COLORS[insight.tipo] || { bg: "bg-gray-50", border: "border-gray-200", icon: "text-gray-600" };
  const TrendIcon =
    insight.tendencia === "up" ? TrendingUp : insight.tendencia === "down" ? TrendingDown : Minus;
  const trendColor =
    insight.tendencia === "up" ? "text-green-600" : insight.tendencia === "down" ? "text-red-600" : "text-gray-500";

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-xl p-5 transition-all hover:shadow-sm`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`flex items-center justify-center w-10 h-10 rounded-lg bg-white/60 ${colors.icon}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className={`flex items-center gap-1 ${trendColor}`}>
          <TrendIcon className="w-4 h-4" />
          <span className="text-sm font-semibold">{insight.valor}%</span>
        </div>
      </div>
      <h3 className="text-sm font-semibold text-gray-900 mb-1">{insight.titulo}</h3>
      <p className="text-xs text-gray-600 leading-relaxed">{insight.descripcion}</p>
    </div>
  );
}

export function AutoInsightsReport() {
  const [dates, setDates] = useState(defaultDates);
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getInsights(dates);
      setData(res);
    } catch {
      toast.error("Error al cargar insights");
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
            <div className="text-center py-12 text-gray-500">
              <Lightbulb className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No se encontraron insights para este período.</p>
              <p className="text-xs mt-1">Intenta con un rango de fechas más amplio.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.insights.map((insight, i) => (
                <InsightCard key={i} insight={insight} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
