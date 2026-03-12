"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { toast } from "@/hooks/useToast";
import { useRequireAdmin } from "@/hooks/usePermissions";
import { integrationService } from "@/services/api/integrations";
import type { IntegrationCatalog } from "@/types/integration";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Loader2,
  Check,
  Clock,
  Zap,
  Receipt,
  MessageSquare,
  MapPin,
  CreditCard,
} from "lucide-react";

const categoryLabels: Record<string, string> = {
  facturacion: "Facturación",
  comunicacion: "Comunicación",
  mapas: "Mapas",
  pagos: "Pagos",
};

const estadoBadge: Record<string, { label: string; className: string }> = {
  DISPONIBLE: { label: "Disponible", className: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  PROXIMO: { label: "Próximamente", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  DESCONTINUADO: { label: "Descontinuado", className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400" },
};

const iconMap: Record<string, React.ReactNode> = {
  receipt: <Receipt className="h-6 w-6" />,
  "message-square": <MessageSquare className="h-6 w-6" />,
  "map-pin": <MapPin className="h-6 w-6" />,
  "credit-card": <CreditCard className="h-6 w-6" />,
};

function IntegrationCard({
  integration,
  onActivate,
  onDeactivate,
  loading,
}: {
  integration: IntegrationCatalog;
  onActivate: (slug: string) => void;
  onDeactivate: (slug: string) => void;
  loading: boolean;
}) {
  const badge = estadoBadge[integration.estado] || estadoBadge.DISPONIBLE;
  const isAvailable = integration.estado === "DISPONIBLE";
  const icon = iconMap[integration.icono || ""] || <Zap className="h-6 w-6" />;

  return (
    <Card className="group hover:shadow-md transition-all duration-200 border-gray-200 dark:border-gray-700">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${
            integration.isActivated
              ? "bg-green-100 dark:bg-green-900/30 text-green-600"
              : isAvailable
                ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                : "bg-blue-50 dark:bg-blue-900/20 text-blue-500"
          }`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 dark:text-white">{integration.nombre}</h3>
              <Badge className={badge.className}>{badge.label}</Badge>
              {integration.isActivated && (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                  <Check className="h-3 w-3 mr-1" /> Activa
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {integration.descripcion}
            </p>
            <div className="flex items-center gap-3 mt-3">
              <span className="text-xs text-muted-foreground uppercase font-medium">
                {categoryLabels[integration.categoria] || integration.categoria}
              </span>
              {integration.precioMXN > 0 && (
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  ${integration.precioMXN.toLocaleString("es-MX")} MXN
                  {integration.tipoPrecio === "MENSUAL" ? "/mes" : ""}
                </span>
              )}
              {integration.precioMXN === 0 && (
                <span className="text-xs font-semibold text-green-600">Gratis</span>
              )}
            </div>
          </div>
          <div className="flex-shrink-0">
            {integration.isActivated ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDeactivate(integration.slug)}
                disabled={loading}
                className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30"
              >
                Desactivar
              </Button>
            ) : isAvailable ? (
              <Button
                size="sm"
                onClick={() => onActivate(integration.slug)}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activar"}
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled className="opacity-50">
                <Clock className="h-4 w-4 mr-1" /> Próximamente
              </Button>
            )}
          </div>
        </div>

        {integration.isActivated && integration.fechaActivacion && (
          <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            Activada el {new Date(integration.fechaActivacion).toLocaleDateString("es-MX")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function IntegrationsPage() {
  useRequireAdmin();
  const [integrations, setIntegrations] = useState<IntegrationCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "available">("all");

  const fetchData = useCallback(async () => {
    try {
      const data = await integrationService.getCatalog();
      setIntegrations(data);
    } catch {
      toast.error("Error al cargar integraciones");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleActivate = async (slug: string) => {
    setActionLoading(slug);
    try {
      await integrationService.activate(slug);
      toast({ title: "Integración activada" });
      await fetchData();
    } catch {
      toast.error("Error al activar integración");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeactivate = async (slug: string) => {
    if (!confirm("¿Deseas desactivar esta integración?")) return;
    setActionLoading(slug);
    try {
      await integrationService.deactivate(slug);
      toast({ title: "Integración desactivada" });
      await fetchData();
    } catch {
      toast.error("Error al desactivar integración");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = integrations.filter((i) => {
    if (filter === "active") return i.isActivated;
    if (filter === "available") return i.estado === "DISPONIBLE" && !i.isActivated;
    return true;
  });

  const activeCount = integrations.filter((i) => i.isActivated).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <PageHeader
      breadcrumbs={[
        { label: "Inicio", href: "/dashboard" },
        { label: "Integraciones" },
      ]}
      title="Integraciones"
      subtitle={`${activeCount} activa${activeCount !== 1 ? "s" : ""} de ${integrations.length} disponibles`}
    >
      <div className="space-y-4">
        {/* Filter tabs */}
        <div className="flex gap-2">
          {(["all", "active", "available"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                filter === f
                  ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {f === "all" ? "Todas" : f === "active" ? "Activas" : "Disponibles"}
            </button>
          ))}
        </div>

        {/* Integration cards */}
        <div className="grid grid-cols-1 gap-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No hay integraciones en esta categoría.
            </div>
          ) : (
            filtered.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onActivate={handleActivate}
                onDeactivate={handleDeactivate}
                loading={actionLoading === integration.slug}
              />
            ))
          )}
        </div>
      </div>
    </PageHeader>
  );
}
