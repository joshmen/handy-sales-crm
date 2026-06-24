"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/hooks/useToast";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { SoftBadge } from "@/components/ui/SoftBadge";
import { TabBar } from "@/components/ui/TabBar";
import { EmptyState } from "@/components/common/EmptyState";
import { getSectionAccent } from "@/lib/sectionAccent";
import { downloadTextFile } from "@/lib/download";
import {
  getMockIntegration,
  getIntegrationDetail,
  type ActivityEvent,
} from "../_mock";
import {
  Plug,
  Receipt,
  Map as MapIcon,
  CreditCard,
  MessageCircle,
  BookOpen,
  Mail,
  Zap,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Download,
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

type Tab = "resumen" | "credenciales" | "actividad";

/** Estilo del ícono de actividad por tono. */
const ACTIVITY_STYLE: Record<
  ActivityEvent["tone"],
  { Icon: React.ComponentType<{ size?: number; className?: string }>; tile: string; color: string }
> = {
  success: { Icon: CheckCircle2, tile: "bg-green-50 dark:bg-green-500/15", color: "text-green-600 dark:text-green-300" },
  danger: { Icon: AlertTriangle, tile: "bg-red-50 dark:bg-red-500/15", color: "text-red-600 dark:text-red-300" },
  info: { Icon: Info, tile: "bg-blue-50 dark:bg-blue-500/15", color: "text-blue-600 dark:text-blue-300" },
  warning: { Icon: Clock, tile: "bg-amber-50 dark:bg-amber-500/15", color: "text-amber-600 dark:text-amber-300" },
};

/** Campo de credencial con botón de revelar para secretos. */
function CredentialInput({
  label,
  placeholder,
  defaultValue,
  secret,
}: {
  label: string;
  placeholder?: string;
  defaultValue?: string;
  secret?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);

  if (!secret) {
    return <Input label={label} placeholder={placeholder} defaultValue={defaultValue} />;
  }

  return (
    <div className="relative">
      <Input
        label={label}
        type={revealed ? "text" : "password"}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setRevealed((v) => !v)}
        aria-label={revealed ? "Ocultar" : "Mostrar"}
        className="absolute right-2.5 top-[34px] text-muted-foreground hover:text-foreground transition-colors"
      >
        {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export default function IntegrationDetailPage() {
  const t = useTranslations("integrations");
  const router = useRouter();
  const params = useParams();
  const slug = String(params?.slug ?? "");
  const integ = getMockIntegration(slug);

  // Estado de conexión local (presentación). PENDIENTE BACKEND: cablear a
  // integrationService.activate/deactivate cuando el catálogo real exista.
  const [connected, setConnected] = useState<boolean>(integ?.connected ?? false);
  const [tab, setTab] = useState<Tab>("resumen");

  // Integración inexistente → cabecera + estado vacío con regreso al catálogo.
  if (!integ) {
    return (
      <PageHeader
        section="herramientas"
        icon={Plug}
        eyebrow="Integración"
        breadcrumbs={[
          { label: "Inicio", href: "/dashboard" },
          { label: "Integraciones", href: "/integrations" },
          { label: "No encontrada" },
        ]}
        title="Integración no encontrada"
      >
        <EmptyState
          icon={Plug}
          title="Integración no encontrada"
          description="No existe una integración con ese identificador. Vuelve al catálogo para elegir otra."
          action={{ label: "Volver a Integraciones", onClick: () => router.push("/integrations") }}
        />
      </PageHeader>
    );
  }

  const Icon = ICONS[integ.icon] ?? Plug;
  const detail = getIntegrationDetail(slug);

  const handleToggleConnection = () => {
    const next = !connected;
    setConnected(next);
    toast.success(next ? `${integ.nombre} conectada` : `${integ.nombre} desconectada`);
  };

  const handleExportLog = () => {
    const lines = detail.activity.map((a) => {
      const detailPart = a.detail ? ` · ${a.detail}` : "";
      return `[${a.when}] ${a.title}${detailPart}`;
    });
    const text = `Actividad reciente: ${integ.nombre}\n\n${lines.join("\n")}\n`;
    downloadTextFile(text, `${slug}-actividad.txt`, "text/plain;charset=utf-8;");
  };

  // Chip de salud según estado de conexión.
  const healthChip = !connected ? (
    <SoftBadge tone="default">Sin conectar</SoftBadge>
  ) : integ.health === "error" ? (
    <SoftBadge tone="danger">Error de conexión</SoftBadge>
  ) : (
    <SoftBadge tone="success">Conexión operativa</SoftBadge>
  );

  const tabs = [
    { id: "resumen", label: "Resumen" },
    { id: "credenciales", label: "Credenciales" },
    { id: "actividad", label: "Actividad", count: detail.activity.length },
  ];

  return (
    <PageHeader
      section="herramientas"
      icon={Icon}
      eyebrow="Integración"
      breadcrumbs={[
        { label: "Inicio", href: "/dashboard" },
        { label: "Integraciones", href: "/integrations" },
        { label: integ.nombre },
      ]}
      title={integ.nombre}
      subtitle={integ.descripcion}
      actions={
        connected ? (
          <Button variant="wbSoft" size="sm" className="text-red-600" onClick={handleToggleConnection}>
            Desconectar
          </Button>
        ) : (
          <Button variant="wbPrimary" size="sm" onClick={handleToggleConnection}>
            Conectar
          </Button>
        )
      }
    >
      <div className="space-y-5">
        {/* Chips de estado */}
        <div className="flex flex-wrap items-center gap-2.5">
          {healthChip}
          {integ.pac && <SoftBadge tone="info" dot={false}>PAC</SoftBadge>}
          {integ.official && <SoftBadge tone="primary" dot={false}>Oficial</SoftBadge>}
          <span className="text-xs font-medium text-muted-foreground">{integ.categoria}</span>
        </div>

        <TabBar items={tabs} value={tab} onChange={(id) => setTab(id as Tab)} accent={ACCENT} />

        {/* ── Resumen ── */}
        {tab === "resumen" && (
          <div className="space-y-5">
            {/* Banner de salud */}
            {!connected ? (
              <div className="flex gap-3 rounded-2xl border border-border bg-muted/40 p-4">
                <Plug className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="text-sm">
                  <p className="font-semibold text-foreground">Sin conectar</p>
                  <p className="mt-1 text-muted-foreground">
                    Conecta esta integración para ver su estado y métricas.
                  </p>
                </div>
              </div>
            ) : integ.health === "error" ? (
              <div className="flex items-start gap-3 rounded-2xl border border-red-300 bg-red-50 p-4 dark:border-red-700 dark:bg-red-950/30">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                <div className="flex-1 text-sm text-red-900 dark:text-red-200">
                  <p className="font-semibold">Error de conexión</p>
                  <p className="mt-1">Revisa las credenciales para restablecer el servicio.</p>
                </div>
                <Button variant="wbPrimary" size="sm" onClick={() => setTab("credenciales")}>
                  Renovar conexión
                </Button>
              </div>
            ) : (
              <div className="flex gap-3 rounded-2xl border border-green-300 bg-green-50 p-4 dark:border-green-700 dark:bg-green-950/30">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                <div className="text-sm text-green-900 dark:text-green-200">
                  <p className="font-semibold">Conexión operativa</p>
                  <p className="mt-1">La integración funciona correctamente.</p>
                </div>
              </div>
            )}

            {/* Métricas */}
            <div className="grid gap-4 sm:grid-cols-3">
              {detail.metrics.map((m) => (
                <StatCard key={m.label} label={m.label} value={m.value} tone={m.tone} />
              ))}
            </div>

            {/* Conexión */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">Conexión</h3>
              <dl className="mt-3 divide-y divide-border">
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-sm text-muted-foreground">Cuenta</dt>
                  <dd className="text-sm font-medium text-foreground">{integ.cuenta ?? "—"}</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-sm text-muted-foreground">Entorno</dt>
                  <dd className="text-sm font-medium text-foreground">{integ.entorno ?? "—"}</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-sm text-muted-foreground">Última sincronización</dt>
                  <dd className="text-sm font-medium text-foreground">{integ.lastSync ?? "—"}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {/* ── Credenciales ── */}
        {tab === "credenciales" && (
          <div>
            {!connected ? (
              <EmptyState
                icon={KeyRound}
                title="Sin conectar"
                description="Conecta esta integración para configurar sus credenciales."
                action={{ label: "Conectar", onClick: () => setConnected(true) }}
              />
            ) : (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-foreground">Credenciales</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Las claves se guardan cifradas. No las compartas con terceros.
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {detail.credentials.map((cred) => (
                    <CredentialInput
                      key={cred.key}
                      label={cred.label}
                      placeholder={cred.placeholder}
                      defaultValue={cred.value}
                      secret={cred.secret}
                    />
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                  <Button
                    variant="wbOutline"
                    size="sm"
                    onClick={() => toast.success(t("connectionSuccess"))}
                  >
                    Probar conexión
                  </Button>
                  <Button
                    variant="wbPrimary"
                    size="sm"
                    onClick={() => toast.success(t("credentialsSaved"))}
                  >
                    Guardar credenciales
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Actividad ── */}
        {tab === "actividad" && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">Actividad reciente</h3>
              {detail.activity.length > 0 && (
                <Button
                  variant="wbOutline"
                  size="sm"
                  className="inline-flex items-center gap-1.5"
                  onClick={handleExportLog}
                >
                  <Download size={14} /> Exportar log
                </Button>
              )}
            </div>

            {detail.activity.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="Sin actividad"
                description="Aún no hay eventos registrados para esta integración."
                size="sm"
              />
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {detail.activity.map((a) => {
                  const s = ACTIVITY_STYLE[a.tone];
                  return (
                    <li key={a.id} className="flex items-start gap-3 py-3">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${s.tile}`}
                      >
                        <s.Icon size={16} className={s.color} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{a.title}</p>
                        {a.detail && <p className="mt-0.5 text-xs text-muted-foreground">{a.detail}</p>}
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{a.when}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </PageHeader>
  );
}
