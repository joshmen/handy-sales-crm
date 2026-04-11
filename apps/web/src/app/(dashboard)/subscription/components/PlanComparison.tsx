"use client";

import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { SubscriptionPlan, SubscriptionStatus } from "@/types/subscription";
import {
  Check,
  X,
  ChevronRight,
  Sparkles,
  Loader2,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

// Plan hierarchy for downgrade detection
const PLAN_HIERARCHY: Record<string, number> = { FREE: 0, BASIC: 1, PRO: 2 };

// Legacy plan codes -> canonical codes
const PLAN_CODE_MAP: Record<string, string> = {
  PROFESIONAL: "PRO", PROFESSIONAL: "PRO", BASICO: "BASIC", STARTER: "BASIC",
};

export const normalizePlanCode = (code: string | null | undefined): string => {
  if (!code) return "FREE";
  const upper = code.toUpperCase();
  if (upper === "TRIAL") return "FREE";
  return PLAN_CODE_MAP[upper] || upper;
};

export interface DowngradeWarning {
  isDowngrade: boolean;
  violations: string[];
  isFreeBlocked: boolean;
}

export function getDowngradeInfo(
  plan: SubscriptionPlan,
  currentPlanCode: string | null,
  subscription: SubscriptionStatus | null
): DowngradeWarning {
  const effectiveCurrent = normalizePlanCode(currentPlanCode);
  const targetCode = normalizePlanCode(plan.codigo);
  const currentRank = PLAN_HIERARCHY[effectiveCurrent] ?? 0;
  const targetRank = PLAN_HIERARCHY[targetCode] ?? 0;
  const isDowngrade = targetRank < currentRank;
  const isFreeBlocked = targetCode === "FREE" && !!subscription?.hasStripe;

  const violations: string[] = [];
  if (isDowngrade && subscription) {
    if (subscription.activeUsuarios > plan.maxUsuarios)
      violations.push(`${subscription.activeUsuarios} usuarios activos (máx. ${plan.maxUsuarios})`);
    if (subscription.activeProductos > plan.maxProductos)
      violations.push(`${subscription.activeProductos} productos activos (máx. ${plan.maxProductos})`);
    if (subscription.activeClientes > plan.maxClientesPorMes)
      violations.push(`${subscription.activeClientes} clientes activos (máx. ${plan.maxClientesPorMes})`);
  }

  return { isDowngrade, violations, isFreeBlocked };
}

// ── Full-page plan comparison view ──

interface PlanComparisonPageProps {
  plans: SubscriptionPlan[];
  subscription: SubscriptionStatus;
  billingInterval: "month" | "year";
  setBillingInterval: (v: "month" | "year") => void;
  processing: boolean;
  onUpgrade: (planCode: string) => void;
  onBack: () => void;
}

export function PlanComparisonPage({
  plans, subscription, billingInterval, setBillingInterval,
  processing, onUpgrade, onBack,
}: PlanComparisonPageProps) {
  return (
    <PageHeader
      breadcrumbs={[
        { label: "Inicio", href: "/dashboard" },
        { label: "Suscripción", href: "/subscription" },
        { label: "Cambiar plan" },
      ]}
      title="Cambiar plan"
      subtitle="Compara planes y elige el que mejor se adapte a tu negocio"
      actions={
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Billing interval toggle */}
        <div className="flex items-center justify-center gap-3">
          <span className={`text-sm font-medium transition-colors duration-300 ${billingInterval === "month" ? "text-foreground" : "text-muted-foreground"}`}>Mensual</span>
          <button
            role="switch"
            aria-checked={billingInterval === "year"}
            aria-label="Facturación anual"
            onClick={() => setBillingInterval(billingInterval === "month" ? "year" : "month")}
            className="relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
            style={{ backgroundColor: billingInterval === "year" ? "#16A34A" : "hsl(var(--muted-foreground) / 0.3)" }}
          >
            <div
              className="absolute top-[3px] w-[22px] h-[22px] bg-surface-2 rounded-full shadow-md transition-all duration-300"
              style={{ left: billingInterval === "year" ? "calc(100% - 25px)" : "3px" }}
            />
          </button>
          <span className={`text-sm font-medium transition-colors duration-300 ${billingInterval === "year" ? "text-foreground" : "text-muted-foreground"}`}>
            Anual
          </span>
          {billingInterval === "year" && (
            <span className="text-xs font-bold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2.5 py-0.5 rounded-full animate-[subFadeIn_0.3s_ease-out]">
              -17%
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((plan) => {
            const effectivePlan = normalizePlanCode(subscription.planTipo);
            const isCurrent = normalizePlanCode(plan.codigo) === effectivePlan;
            const isPopular = plan.codigo === "PRO";
            const price = billingInterval === "year" ? plan.precioAnual : plan.precioMensual;
            const monthlyEquivalent = billingInterval === "year" ? Math.round(plan.precioAnual / 12) : plan.precioMensual;
            const downgrade = getDowngradeInfo(plan, subscription.planTipo ?? null, subscription);
            const isBlocked = downgrade.isFreeBlocked || downgrade.violations.length > 0;
            const isDisabled = isCurrent || processing || plan.codigo === "FREE" || isBlocked;

            return (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrent={isCurrent}
                isPopular={isPopular}
                price={price}
                monthlyEquivalent={monthlyEquivalent}
                billingInterval={billingInterval}
                processing={processing}
                isBlocked={isBlocked}
                isDisabled={isDisabled}
                downgrade={downgrade}
                onUpgrade={() => onUpgrade(plan.codigo)}
              />
            );
          })}
        </div>
      </div>
    </PageHeader>
  );
}

// ── Quick plan comparison (inline card) ──

interface QuickPlanComparisonProps {
  plans: SubscriptionPlan[];
  subscription: SubscriptionStatus;
  processing: boolean;
  onUpgrade: (planCode: string) => void;
  onShowFullComparison: () => void;
}

export function QuickPlanComparison({
  plans, subscription, processing, onUpgrade, onShowFullComparison,
}: QuickPlanComparisonProps) {
  return (
    <Card className="page-animate-delay-1">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Planes disponibles</h3>
          <Button variant="ghost" size="sm" onClick={onShowFullComparison} className="text-green-600 hover:text-green-700 hover:bg-muted/40 dark:hover:bg-muted/30">
            Ver comparativa completa
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {plans.map((plan) => {
            const effectivePlan = normalizePlanCode(subscription.planTipo);
            const isCurrent = normalizePlanCode(plan.codigo) === effectivePlan;
            const price = plan.precioMensual;
            const downgrade = getDowngradeInfo(plan, subscription.planTipo ?? null, subscription);
            const isBlocked = downgrade.isFreeBlocked || downgrade.violations.length > 0;

            return (
              <div
                key={plan.id}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                  isCurrent
                    ? "border-green-200 dark:border-green-800 bg-muted/30 dark:bg-muted/20"
                    : "border-border hover:border-green-200 dark:hover:border-green-800 hover:bg-accent/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{plan.nombre}</span>
                      {isCurrent && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400">
                          Actual
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {price === 0 ? "Gratis" : `$${price.toLocaleString("es-MX")} MXN/mes`}
                      {" · "}{plan.maxUsuarios} usuarios · {plan.maxProductos.toLocaleString()} productos
                    </span>
                  </div>
                </div>
                {!isCurrent && !isBlocked && plan.codigo !== "FREE" && (
                  <Button
                    size="sm"
                    variant={downgrade.isDowngrade ? "outline" : "default"}
                    onClick={() => onUpgrade(plan.codigo)}
                    disabled={processing}
                    className={downgrade.isDowngrade ? "" : "bg-success hover:bg-success/90 text-white"}
                  >
                    {downgrade.isDowngrade ? "Cambiar" : "Actualizar"}
                  </Button>
                )}
                {isBlocked && !isCurrent && (
                  <span className="text-xs text-muted-foreground">No disponible</span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── PlanCard (used in full comparison view) ──

function PlanCard({
  plan, isCurrent, isPopular, price, monthlyEquivalent, billingInterval, processing, isBlocked, isDisabled, downgrade, onUpgrade,
}: {
  plan: SubscriptionPlan;
  isCurrent: boolean;
  isPopular: boolean;
  price: number;
  monthlyEquivalent: number;
  billingInterval: "month" | "year";
  processing: boolean;
  isBlocked: boolean;
  isDisabled: boolean;
  downgrade: DowngradeWarning;
  onUpgrade: () => void;
}) {
  return (
    <div className="relative">
      <div
        className={`group relative rounded-2xl transition-all duration-300 ease-out hover:-translate-y-1 ${
          isPopular
            ? "border-2 border-green-500 dark:border-green-400 shadow-lg"
            : "border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600"
        } ${isCurrent ? "ring-2 ring-green-500/30" : ""}`}
      >
        <div className="relative bg-card rounded-2xl p-6 h-full flex flex-col min-h-[420px]">
          {isPopular && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
              <span className="bg-success text-success-foreground text-[11px] font-semibold px-4 py-1 rounded-full shadow-sm flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Más popular
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{plan.nombre}</h3>
            {isCurrent && (
              <span className="text-[11px] font-semibold uppercase tracking-wider px-3 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400">
                Plan actual
              </span>
            )}
          </div>

          <div className="mt-4 mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-baseline gap-1">
              <span
                key={`${plan.codigo}-${billingInterval}`}
                className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight animate-[subPricePop_0.4s_cubic-bezier(0.34,1.56,0.64,1)]"
              >
                {price === 0 ? "Gratis" : `$${monthlyEquivalent.toLocaleString("es-MX")}`}
              </span>
              {price > 0 && (
                <span className="text-sm text-gray-400 dark:text-gray-500 font-medium">MXN/mes</span>
              )}
            </div>
            {price > 0 && billingInterval === "year" && (
              <p className="text-xs text-green-600 dark:text-green-400 font-medium mt-1.5 animate-[subFadeIn_0.3s_ease-out]">
                Facturado ${price.toLocaleString("es-MX")} MXN/año
              </p>
            )}
          </div>

          <ul className="space-y-2.5 flex-1">
            <li className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-300">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" strokeWidth={2.5} />
              {plan.maxUsuarios} usuarios
            </li>
            <li className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-300">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" strokeWidth={2.5} />
              {plan.maxProductos.toLocaleString()} productos
            </li>
            <li className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-300">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" strokeWidth={2.5} />
              {plan.maxClientesPorMes} clientes/mes
            </li>
            <li className={`flex items-center gap-2.5 text-sm ${plan.incluyeReportes ? "text-gray-600 dark:text-gray-300" : "text-gray-400 dark:text-gray-600"}`}>
              {plan.incluyeReportes ? (
                <Check className="h-4 w-4 text-green-500 flex-shrink-0" strokeWidth={2.5} />
              ) : (
                <X className="h-4 w-4 text-gray-300 dark:text-gray-700 flex-shrink-0" />
              )}
              Reportes avanzados
            </li>
            <li className={`flex items-center gap-2.5 text-sm ${plan.incluyeSoportePrioritario ? "text-gray-600 dark:text-gray-300" : "text-gray-400 dark:text-gray-600"}`}>
              {plan.incluyeSoportePrioritario ? (
                <Check className="h-4 w-4 text-green-500 flex-shrink-0" strokeWidth={2.5} />
              ) : (
                <X className="h-4 w-4 text-gray-300 dark:text-gray-700 flex-shrink-0" />
              )}
              Soporte prioritario
            </li>
          </ul>

          {isBlocked && !isCurrent && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mt-auto ${
              downgrade.isFreeBlocked
                ? "bg-gray-100 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700"
                : "bg-muted/40 dark:bg-muted/30 border border-amber-200/60 dark:border-amber-800/40"
            }`}>
              <AlertTriangle className={`h-3.5 w-3.5 flex-shrink-0 ${
                downgrade.isFreeBlocked ? "text-gray-400" : "text-amber-500"
              }`} />
              <span className={`text-[11px] font-medium leading-tight ${
                downgrade.isFreeBlocked
                  ? "text-gray-500 dark:text-gray-400"
                  : "text-amber-700 dark:text-amber-400"
              }`}>
                {downgrade.isFreeBlocked
                  ? "No disponible con historial de pago"
                  : `Excedes límites: ${downgrade.violations.map(v => v.split(" (")[0]).join(", ")}`}
              </span>
            </div>
          )}

          <button
            className={`group/btn flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${isBlocked || isCurrent ? "mt-3" : "mt-5"} ${
              isCurrent
                ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-default"
                : isDisabled
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60"
                  : downgrade.isDowngrade
                    ? "bg-amber-500 text-white hover:bg-amber-600 shadow-md"
                    : isPopular
                      ? "bg-success text-success-foreground hover:bg-success/90 shadow-md"
                      : "bg-gray-900 dark:bg-surface-2 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100"
            }`}
            disabled={isDisabled}
            onClick={onUpgrade}
          >
            {processing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isCurrent ? (
              "Plan actual"
            ) : isBlocked ? (
              downgrade.isFreeBlocked ? "No disponible" : "Límites excedidos"
            ) : downgrade.isDowngrade ? (
              <>
                Cambiar plan
                <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
              </>
            ) : (
              <>
                Actualizar
                <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
