"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
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

const estadoBadgeStyles: Record<string, string> = {
  DISPONIBLE: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  PROXIMO: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  DESCONTINUADO: "bg-surface-3 text-foreground dark:bg-surface-3 dark:text-muted-foreground",
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
  t,
}: {
  integration: IntegrationCatalog;
  onActivate: (slug: string) => void;
  onDeactivate: (slug: string) => void;
  loading: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, values?: any) => string;
}) {
  const estadoLabelMap: Record<string, string> = {
    DISPONIBLE: t("statusAvailable"),
    PROXIMO: t("statusComingSoon"),
    DESCONTINUADO: t("statusDiscontinued"),
  };
  const categoryLabelMap: Record<string, string> = {
    facturacion: t("categoryBilling"),
    comunicacion: t("categoryCommunication"),
    mapas: t("categoryMaps"),
    pagos: t("categoryPayments"),
  };
  const badgeClassName = estadoBadgeStyles[integration.estado] || estadoBadgeStyles.DISPONIBLE;
  const badgeLabel = estadoLabelMap[integration.estado] || estadoLabelMap.DISPONIBLE;
  const isAvailable = integration.estado === "DISPONIBLE";
  const icon = iconMap[integration.icono || ""] || <Zap className="h-6 w-6" />;

  return (
    <Card className="group hover:shadow-md transition-all duration-200 border-border-subtle dark:border-border-strong">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${
            integration.isActivated
              ? "bg-green-100 dark:bg-green-900/30 text-green-600"
              : isAvailable
                ? "bg-surface-3 dark:bg-surface-3 text-foreground/70 dark:text-muted-foreground"
                : "bg-blue-50 dark:bg-blue-900/20 text-blue-500"
          }`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground dark:text-white">{integration.nombre}</h3>
              <Badge className={badgeClassName}>{badgeLabel}</Badge>
              {integration.isActivated && (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                  <Check className="h-3 w-3 mr-1" /> {t("activeLabel")}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {integration.descripcion}
            </p>
            <div className="flex items-center gap-3 mt-3">
              <span className="text-xs text-muted-foreground font-medium">
                {categoryLabelMap[integration.categoria] || integration.categoria}
              </span>
              {integration.precioMXN > 0 && (
                <span className="text-xs font-semibold text-foreground/80 dark:text-muted-foreground/60">
                  ${integration.precioMXN.toLocaleString("es-MX")} MXN
                  {integration.tipoPrecio === "MENSUAL" ? t("perMonth") : ""}
                </span>
              )}
              {integration.precioMXN === 0 && (
                <span className="text-xs font-semibold text-green-600">{t("free")}</span>
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
                {t("deactivate")}
              </Button>
            ) : isAvailable ? (
              <Button
                size="sm"
                onClick={() => onActivate(integration.slug)}
                disabled={loading}
                className="bg-success hover:bg-success/90 text-white"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("activate")}
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled className="opacity-50">
                <Clock className="h-4 w-4 mr-1" /> {t("comingSoon")}
              </Button>
            )}
          </div>
        </div>

        {integration.isActivated && integration.fechaActivacion && (
          <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border-subtle dark:border-gray-800">
            {t("activatedOn", { date: new Date(integration.fechaActivacion).toLocaleDateString() })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function IntegrationsPage() {
  useRequireAdmin();
  const t = useTranslations("integrations");
  const tc = useTranslations("common");
  const [integrations, setIntegrations] = useState<IntegrationCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "available">("all");

  const fetchData = useCallback(async () => {
    try {
      const data = await integrationService.getCatalog();
      setIntegrations(data);
    } catch {
      toast.error(t("errorLoading"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleActivate = async (slug: string) => {
    setActionLoading(slug);
    try {
      await integrationService.activate(slug);
      toast({ title: t("activated") });
      await fetchData();
    } catch {
      toast.error(t("errorActivating"));
    } finally {
      setActionLoading(null);
    }
  };

  const [deactivateSlug, setDeactivateSlug] = useState<string | null>(null);

  const handleDeactivate = (slug: string) => {
    setDeactivateSlug(slug);
  };

  const confirmDeactivate = async () => {
    if (!deactivateSlug) return;
    const slug = deactivateSlug;
    setDeactivateSlug(null);
    setActionLoading(slug);
    try {
      await integrationService.deactivate(slug);
      toast({ title: t("deactivated") });
      await fetchData();
    } catch {
      toast.error(t("errorDeactivating"));
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
      <div role="status" className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" aria-hidden="true" />
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  return (
    <PageHeader
      breadcrumbs={[
        { label: tc("home"), href: "/dashboard" },
        { label: t("breadcrumbIntegrations") },
      ]}
      title={t("title")}
      subtitle={activeCount !== 1 ? t("subtitlePlural", { active: activeCount, total: integrations.length }) : t("subtitle", { active: activeCount, total: integrations.length })}
    >
      <div className="space-y-4">
        {/* Filter tabs */}
        <div className="flex gap-2">
          {(["all", "active", "available"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                filter === f
                  ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {f === "all" ? t("filterAll") : f === "active" ? t("filterActive") : t("filterAvailable")}
            </button>
          ))}
        </div>

        {/* Integration cards */}
        <div className="grid grid-cols-1 gap-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {t("emptyCategory")}
            </div>
          ) : (
            filtered.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onActivate={handleActivate}
                onDeactivate={handleDeactivate}
                loading={actionLoading === integration.slug}
                t={t}
              />
            ))
          )}
        </div>
      </div>

      {/* Deactivate Confirmation Dialog */}
      {deactivateSlug && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setDeactivateSlug(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="deactivate-dialog-title"
            className="bg-card rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 text-center"
            onClick={e => e.stopPropagation()}
          >
            <h3 id="deactivate-dialog-title" className="text-lg font-semibold text-foreground mb-2">
              {t("deactivateTitle")}
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              {t("deactivateDesc")}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeactivateSlug(null)}>
                {tc("cancel")}
              </Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={confirmDeactivate}>
                {t("deactivate")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageHeader>
  );
}
