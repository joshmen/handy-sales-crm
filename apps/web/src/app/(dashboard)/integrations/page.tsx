"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { toast } from "@/hooks/useToast";
import { useRequireAdmin } from "@/hooks/usePermissions";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { SoftBadge } from "@/components/ui/SoftBadge";
import { TabBar } from "@/components/ui/TabBar";
import { SearchBar } from "@/components/common/SearchBar";
import { getSectionAccent, accentTileBg } from "@/lib/sectionAccent";
import { MOCK_INTEGRATIONS, type MockIntegration } from "./_mock";
import {
  Plug,
  Receipt,
  Map as MapIcon,
  CreditCard,
  MessageCircle,
  BookOpen,
  Mail,
  Zap,
  Settings,
  Code,
  Clock,
} from "lucide-react";

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  receipt: Receipt,
  map: MapIcon,
  card: CreditCard,
  message: MessageCircle,
  book: BookOpen,
  mail: Mail,
  zap: Zap,
  plug: Plug,
};

const ACCENT = getSectionAccent("herramientas");

function IntegrationCard({
  integration,
  connected,
  onOpen,
  onToggle,
}: {
  integration: MockIntegration;
  connected: boolean;
  onOpen: (slug: string) => void;
  onToggle: (slug: string, next: boolean) => void;
}) {
  const Icon = ICONS[integration.icon] ?? Plug;
  const open = () => onOpen(integration.slug);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      className="group block cursor-pointer rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:border-border-strong hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex items-start gap-4">
        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ background: accentTileBg(ACCENT), color: ACCENT }}
        >
          <Icon size={22} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-foreground">{integration.nombre}</h3>
            {integration.pac && <SoftBadge tone="info" dot={false}>PAC</SoftBadge>}
            {integration.official && <SoftBadge tone="primary" dot={false}>Oficial</SoftBadge>}
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{integration.descripcion}</p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">{integration.categoria}</span>
            {connected ? (
              integration.health === "error" ? (
                <SoftBadge tone="danger">Error</SoftBadge>
              ) : (
                <SoftBadge tone="success">Operativa</SoftBadge>
              )
            ) : (
              <span className="text-xs font-medium text-muted-foreground/70">Sin conectar</span>
            )}
            {connected && integration.lastSync && (
              <span className="text-xs text-muted-foreground/70">Última sync: {integration.lastSync}</span>
            )}
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <Button
            variant="wbOutline"
            size="sm"
            className="inline-flex items-center gap-1.5"
            onClick={(e) => {
              e.stopPropagation();
              open();
            }}
          >
            <Settings size={14} /> Configurar
          </Button>
          {connected ? (
            <Button
              variant="wbSoft"
              size="sm"
              className="text-red-600"
              onClick={(e) => {
                e.stopPropagation();
                onToggle(integration.slug, false);
              }}
            >
              Desconectar
            </Button>
          ) : (
            <Button
              variant="wbPrimary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onToggle(integration.slug, true);
              }}
            >
              Conectar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

type Tab = "all" | "connected" | "official" | "marketplace";

export default function IntegrationsPage() {
  useRequireAdmin();
  const router = useRouter();

  // Estado de conexión local (presentación). PENDIENTE BACKEND: cablear a
  // integrationService.activate/deactivate cuando el catálogo real coincida.
  const [connected, setConnected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(MOCK_INTEGRATIONS.map((i) => [i.slug, i.connected])),
  );
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("all");

  const handleToggle = (slug: string, next: boolean) => {
    setConnected((prev) => ({ ...prev, [slug]: next }));
    const nombre = MOCK_INTEGRATIONS.find((i) => i.slug === slug)?.nombre ?? "Integración";
    toast.success(next ? `${nombre} conectada` : `${nombre} desconectada`);
  };

  const counts = useMemo(() => {
    const conectadas = MOCK_INTEGRATIONS.filter((i) => connected[i.slug]).length;
    const atencion = MOCK_INTEGRATIONS.filter((i) => connected[i.slug] && i.health === "error").length;
    return { conectadas, atencion, disponibles: MOCK_INTEGRATIONS.length };
  }, [connected]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MOCK_INTEGRATIONS.filter((i) => {
      if (tab === "connected" && !connected[i.slug]) return false;
      if (tab === "official" && !i.official) return false;
      if (tab === "marketplace" && !i.marketplace) return false;
      if (!q) return true;
      return (
        i.nombre.toLowerCase().includes(q) ||
        i.categoria.toLowerCase().includes(q) ||
        i.descripcion.toLowerCase().includes(q)
      );
    });
  }, [search, tab, connected]);

  const tabs = [
    { id: "all", label: "Todas" },
    { id: "connected", label: "Conectadas", count: counts.conectadas },
    { id: "official", label: "Oficiales" },
    { id: "marketplace", label: "Marketplace" },
  ];

  return (
    <PageHeader
      section="herramientas"
      icon={Plug}
      breadcrumbs={[
        { label: "Inicio", href: "/dashboard" },
        { label: "Integraciones" },
      ]}
      title="Integraciones"
      subtitle="Conecta Handy Sales con tus servicios de facturación, pagos, mapas y más."
      actions={
        <Button
          variant="wbOutline"
          size="sm"
          className="inline-flex items-center gap-1.5"
          onClick={() => router.push("/integrations/api")}
        >
          <Code size={14} /> API y Webhooks
        </Button>
      }
    >
      <div className="space-y-5">
        {/* Aviso de honestidad: módulo en preview, sin efecto real todavía. */}
        <div className="flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/30">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-sm text-amber-900 dark:text-amber-200">
            <p className="font-semibold">Próximamente</p>
            <p className="mt-1">
              Vista previa del catálogo de integraciones. Conectar o desconectar aquí aún no produce un efecto real.
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Conectadas" value={counts.conectadas} tone="primary" icon={Plug} />
          <StatCard label="Requieren atención" value={counts.atencion} tone={counts.atencion ? "danger" : "default"} icon={Clock} />
          <StatCard label="Disponibles" value={counts.disponibles} icon={Zap} />
        </div>

        {/* Buscador + tabs */}
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar integración" className="w-full sm:w-72" />
        <TabBar items={tabs} value={tab} onChange={(id) => setTab(id as Tab)} accent={ACCENT} />

        {/* Tarjetas */}
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No se encontraron integraciones con ese filtro.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filtered.map((integration) => (
              <IntegrationCard
                key={integration.slug}
                integration={integration}
                connected={!!connected[integration.slug]}
                onOpen={(slug) => router.push(`/integrations/${slug}`)}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}
      </div>
    </PageHeader>
  );
}
