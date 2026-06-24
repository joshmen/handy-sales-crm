"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { toast } from "@/hooks/useToast";
import { useRequireAdmin } from "@/hooks/usePermissions";
import { PageHeader } from "@/components/layout/PageHeader";
import { SoftBadge } from "@/components/ui/SoftBadge";
import { TabBar } from "@/components/ui/TabBar";
import { getSectionAccent } from "@/lib/sectionAccent";
import {
  MOCK_API_KEYS,
  MOCK_WEBHOOKS,
  MOCK_DELIVERIES,
  type WebhookMock,
} from "../_mock";
import { Code, Eye, EyeOff, Copy, Plus } from "lucide-react";

const ACCENT = getSectionAccent("herramientas");

type Tab = "keys" | "webhooks" | "entregas";

/** "hs_live_4f0a9c2b7e3d" → "hs_live_••••7e3d" cuando está oculta. */
function maskKey(key: string): string {
  return `${key.slice(0, 8)}••••${key.slice(-4)}`;
}

/** Formatea latencia: ms o s si >= 1000ms. */
function formatLatency(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`;
}

// ── API Key row ──────────────────────────────────────────────────────────
function ApiKeyRow({ apiKey }: { apiKey: (typeof MOCK_API_KEYS)[number] }) {
  const t = useTranslations("integrations");
  const [revealed, setRevealed] = useState(false);

  const copy = () => {
    void navigator.clipboard?.writeText(apiKey.key);
    toast.success(t("copiedToClipboard"));
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-foreground">{apiKey.label}</h3>
            <SoftBadge tone="info" dot={false}>{apiKey.scope}</SoftBadge>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="rounded-md bg-muted px-2.5 py-1 font-mono text-[13px] text-foreground">
              {revealed ? apiKey.key : maskKey(apiKey.key)}
            </code>
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              aria-label={revealed ? "Ocultar" : "Mostrar"}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button
              type="button"
              onClick={copy}
              aria-label="Copiar"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <Copy size={16} />
            </button>
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            Creada {apiKey.created} · Último uso {apiKey.lastUsed}
          </p>
        </div>

        <Button
          variant="wbSoft"
          size="sm"
          className="text-red-600"
          onClick={() => toast.success(t("apiKeyRevoked"))}
        >
          Revocar
        </Button>
      </div>
    </div>
  );
}

// ── Webhook row ──────────────────────────────────────────────────────────
function WebhookRow({ webhook }: { webhook: WebhookMock }) {
  const t = useTranslations("integrations");
  const [active, setActive] = useState(webhook.active);

  const statusChip =
    webhook.lastStatus === "ok" ? (
      <SoftBadge tone="success">200</SoftBadge>
    ) : webhook.lastStatus === "retrying" ? (
      <SoftBadge tone="warning">Reintentando</SoftBadge>
    ) : (
      <SoftBadge tone="danger">{String(webhook.lastCode)}</SoftBadge>
    );

  const handleToggle = (next: boolean) => {
    setActive(next);
    toast.success(next ? t("webhookEnabled") : t("webhookDisabled"));
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="break-all font-mono text-sm font-semibold text-foreground">{webhook.url}</p>

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {webhook.events.map((ev) => (
              <SoftBadge key={ev} tone="default" dot={false}>{ev}</SoftBadge>
            ))}
          </div>

          <div className="mt-2.5 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Último intento:</span>
            {statusChip}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {active ? "Activo" : "Inactivo"}
          </span>
          <Switch checked={active} onCheckedChange={handleToggle} />
        </div>
      </div>
    </div>
  );
}

export default function ApiWebhooksPage() {
  useRequireAdmin();
  const t = useTranslations("integrations");
  const [tab, setTab] = useState<Tab>("keys");

  const tabs = [
    { id: "keys", label: "API Keys", count: MOCK_API_KEYS.length },
    { id: "webhooks", label: "Webhooks", count: MOCK_WEBHOOKS.length },
    { id: "entregas", label: "Entregas", count: MOCK_DELIVERIES.length },
  ];

  return (
    <PageHeader
      section="herramientas"
      icon={Code}
      eyebrow="Integraciones"
      breadcrumbs={[
        { label: "Inicio", href: "/dashboard" },
        { label: "Integraciones", href: "/integrations" },
        { label: "API y Webhooks" },
      ]}
      title="API y Webhooks"
      subtitle="Llaves de API, webhooks y registro de entregas."
    >
      <div className="space-y-5">
        <TabBar items={tabs} value={tab} onChange={(id) => setTab(id as Tab)} accent={ACCENT} />

        {/* ── API Keys ── */}
        {tab === "keys" && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button
                variant="wbPrimary"
                size="sm"
                className="inline-flex items-center gap-1.5"
                onClick={() => toast.success(t("apiKeyGenerated"))}
              >
                <Plus size={14} /> Generar API key
              </Button>
            </div>
            {MOCK_API_KEYS.map((k) => (
              <ApiKeyRow key={k.id} apiKey={k} />
            ))}
          </div>
        )}

        {/* ── Webhooks ── */}
        {tab === "webhooks" && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button
                variant="wbPrimary"
                size="sm"
                className="inline-flex items-center gap-1.5"
                onClick={() => toast.success(t("webhookAdded"))}
              >
                <Plus size={14} /> Agregar webhook
              </Button>
            </div>
            {MOCK_WEBHOOKS.map((w) => (
              <WebhookRow key={w.id} webhook={w} />
            ))}
          </div>
        )}

        {/* ── Entregas ── */}
        {tab === "entregas" && (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="divide-y divide-border">
              {/* Encabezado */}
              <div className="hidden grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 bg-muted/40 px-5 py-2.5 text-xs font-semibold text-muted-foreground sm:grid">
                <span>Evento</span>
                <span>Código</span>
                <span>Latencia</span>
                <span>Cuándo</span>
                <span />
              </div>

              {MOCK_DELIVERIES.map((d) => {
                const codeTone = d.code < 300 ? "success" : d.code >= 500 ? "danger" : "warning";
                return (
                  <div
                    key={d.id}
                    className="grid grid-cols-2 items-center gap-3 px-5 py-3 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:gap-4"
                  >
                    <code className="break-all font-mono text-[13px] text-foreground">{d.event}</code>
                    <SoftBadge tone={codeTone} dot={false}>{String(d.code)}</SoftBadge>
                    <span className="text-sm text-foreground tabular-nums">{formatLatency(d.latencyMs)}</span>
                    <span className="text-xs text-muted-foreground">{d.when}</span>
                    <div className="flex justify-end">
                      {d.code >= 400 && (
                        <Button
                          variant="wbOutline"
                          size="sm"
                          onClick={() => toast.success(t("retryQueued"))}
                        >
                          Reintentar
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PageHeader>
  );
}
