"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Separator } from "@/components/ui/Separator";
import { toast } from "@/hooks/useToast";
import { useRequireAdmin } from "@/hooks/usePermissions";
import { subscriptionService } from "@/services/api/subscriptions";
import type { SubscriptionPlan, SubscriptionStatus } from "@/types/subscription";
import { PageHeader } from "@/components/layout/PageHeader";
import { SbSubscription } from "@/components/layout/DashboardIcons";
import {
  Users,
  Check,
  X,
  Calendar,
  CreditCard,
  ChevronRight,
  Sparkles,
  Loader2,
  AlertTriangle,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

// Plan hierarchy for downgrade detection
const PLAN_HIERARCHY: Record<string, number> = { FREE: 0, BASIC: 1, PRO: 2 };

// Legacy plan codes → canonical codes (old seed data had PROFESIONAL/BASICO/STARTER)
const PLAN_CODE_MAP: Record<string, string> = {
  PROFESIONAL: "PRO", PROFESSIONAL: "PRO", BASICO: "BASIC", STARTER: "BASIC",
};
const normalizePlanCode = (code: string | null | undefined): string => {
  if (!code) return "FREE";
  const upper = code.toUpperCase();
  if (upper === "TRIAL") return "FREE";
  return PLAN_CODE_MAP[upper] || upper;
};

interface DowngradeWarning {
  isDowngrade: boolean;
  violations: string[];
  isFreeBlocked: boolean;
}

function getDowngradeInfo(
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

// ─── Premium Plan Card (matching landing page effects) ──────────
function PlanCard({
  plan, isCurrent, isPopular, price, monthlyEquivalent, billingInterval, processing, onUpgrade, subscription,
}: {
  plan: SubscriptionPlan;
  isCurrent: boolean;
  isPopular: boolean;
  price: number;
  monthlyEquivalent: number;
  billingInterval: "month" | "year";
  processing: boolean;
  onUpgrade: () => void;
  subscription: SubscriptionStatus | null;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }, []);

  const downgrade = getDowngradeInfo(plan, subscription?.planTipo ?? null, subscription);
  const isBlocked = downgrade.isFreeBlocked || downgrade.violations.length > 0;
  const isDisabled = isCurrent || processing || plan.codigo === "FREE" || isBlocked;

  return (
    <div className="relative">
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); setMousePos({ x: 50, y: 50 }); }}
        className={`group relative rounded-2xl transition-all duration-500 ease-out ${
          isPopular
            ? "border-2 border-green-500 dark:border-green-400 shadow-xl shadow-green-600/10"
            : "border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600"
        } ${isCurrent ? "ring-2 ring-green-500/30" : ""}`}
        style={{
          transform: isHovered
            ? `perspective(800px) rotateY(${(mousePos.x - 50) * 0.04}deg) rotateX(${(mousePos.y - 50) * -0.04}deg) translateY(-4px) scale(1.01)`
            : "perspective(800px) rotateY(0deg) rotateX(0deg) translateY(0px) scale(1)",
        }}
      >
        {/* Mouse-follow glow */}
        <div
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, ${isPopular ? "rgba(22, 163, 74, 0.08)" : "rgba(99, 102, 241, 0.06)"} 0%, transparent 50%)`,
          }}
        />

        <div className="relative bg-white dark:bg-gray-900 rounded-2xl p-6 h-full flex flex-col min-h-[420px]">
          {/* Popular floating tag */}
          {isPopular && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
              <span className="bg-green-600 text-white text-[11px] font-semibold uppercase tracking-wider px-4 py-1 rounded-full shadow-md shadow-green-600/20 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Más popular
              </span>
            </div>
          )}

          {/* Plan name + current badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{plan.nombre}</h3>
            {isCurrent && (
              <span className="text-[11px] font-semibold uppercase tracking-wider px-3 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400">
                Plan actual
              </span>
            )}
          </div>

          {/* Price */}
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

          {/* Features */}
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

          {/* Compact downgrade notice */}
          {isBlocked && !isCurrent && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mt-auto ${
              downgrade.isFreeBlocked
                ? "bg-gray-100 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700"
                : "bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40"
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

          {/* CTA */}
          <button
            className={`group/btn flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${isBlocked || isCurrent ? "mt-3" : "mt-5"} ${
              isCurrent
                ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-default"
                : isDisabled
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60"
                  : downgrade.isDowngrade
                    ? "bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-500/20"
                    : isPopular
                      ? "bg-green-600 text-white hover:bg-green-700 shadow-md shadow-green-600/20"
                      : "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100"
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

      {/* Hover shadow underneath */}
      <div
        className="absolute -bottom-2 left-6 right-6 h-6 rounded-full blur-xl transition-all duration-500 -z-10"
        style={{ backgroundColor: isHovered ? (isPopular ? "rgba(22, 163, 74, 0.12)" : "rgba(99, 102, 241, 0.08)") : "transparent" }}
      />
    </div>
  );
}

const statusLabels: Record<string, { label: string; color: string }> = {
  Trial: { label: "Prueba", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  Active: { label: "Activo", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  PastDue: { label: "Pago pendiente", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  Cancelled: { label: "Cancelado", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
  Expired: { label: "Expirado", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
};


export default function SubscriptionPage() {
  useRequireAdmin();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const [checkoutClientSecret, setCheckoutClientSecret] = useState<string | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [plansData, subData] = await Promise.all([
        subscriptionService.getPlans(),
        subscriptionService.getCurrentSubscription(),
      ]);
      setPlans(plansData);
      setSubscription(subData);
    } catch (err) {
      console.error("Error loading subscription data:", err);
      toast.error("Error al cargar datos de suscripción");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpgrade = async (planCode: string) => {
    setProcessing(true);
    try {
      const { clientSecret } = await subscriptionService.createCheckoutSession(
        planCode,
        billingInterval,
        `${window.location.origin}/subscription`
      );
      setCheckoutClientSecret(clientSecret);
      setCheckoutPlan(planCode);
    } catch (err) {
      console.error("Error creating checkout:", err);
      toast.error("Error al iniciar el proceso de pago. Verifica la configuración de Stripe.");
      setProcessing(false);
    }
  };

  const handleManageBilling = async () => {
    setProcessing(true);
    try {
      const { url } = await subscriptionService.createPortalSession(
        `${window.location.origin}/subscription`
      );
      window.open(url, "_blank");
    } catch (err) {
      console.error("Error creating portal:", err);
      toast.error("Error al abrir el portal de pagos");
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("¿Estás seguro de que deseas cancelar tu suscripción? Se cancelará al final del período actual."))
      return;

    setProcessing(true);
    try {
      await subscriptionService.cancelSubscription();
      toast({ title: "Suscripción cancelada", description: "Tu suscripción se cancelará al final del período actual." });
      await fetchData();
    } catch (err) {
      console.error("Error cancelling:", err);
      toast.error("Error al cancelar la suscripción");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!subscription) return null;

  // Embedded Checkout view
  if (checkoutClientSecret) {
    const selectedPlan = plans.find(p => p.codigo === checkoutPlan);
    const checkoutSubtitle = selectedPlan
      ? `Plan ${selectedPlan.nombre} — $${billingInterval === "year"
          ? selectedPlan.precioAnual.toLocaleString("es-MX") + "/año"
          : selectedPlan.precioMensual.toLocaleString("es-MX") + "/mes"}`
      : "Ingresa tus datos de pago";
    return (
      <PageHeader
        breadcrumbs={[
          { label: "Inicio", href: "/dashboard" },
          { label: "Suscripción", href: "/subscription" },
          { label: "Pago" },
        ]}
        title="Completar suscripción"
        subtitle={checkoutSubtitle}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCheckoutClientSecret(null);
              setCheckoutPlan(null);
              setProcessing(false);
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a planes
          </Button>
        }
      >
        <div className="overflow-hidden">
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{ clientSecret: checkoutClientSecret }}
          >
            <EmbeddedCheckout className="min-h-[500px]" />
          </EmbeddedCheckoutProvider>
        </div>
      </PageHeader>
    );
  }

  const currentPlan = plans.find(p => p.codigo === subscription.planTipo?.toUpperCase());
  const statusInfo = statusLabels[subscription.subscriptionStatus] || statusLabels.Trial;
  const daysLeft = subscription.fechaExpiracion
    ? Math.max(0, Math.ceil((new Date(subscription.fechaExpiracion).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <PageHeader
      breadcrumbs={[
        { label: "Inicio", href: "/dashboard" },
        { label: "Suscripción" },
      ]}
      title="Suscripción"
      subtitle="Administra tu plan y método de pago"
    >
      <div className="space-y-6">
      {/* Warning banners */}
      {subscription.subscriptionStatus === "PastDue" && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-300">Pago pendiente</p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
              No pudimos procesar tu último pago. Actualiza tu método de pago para evitar la suspensión del servicio.
              {subscription.gracePeriodEnd && (
                <> Tienes hasta el <strong>{new Date(subscription.gracePeriodEnd).toLocaleDateString("es-MX")}</strong>.</>
              )}
            </p>
          </div>
        </div>
      )}

      {subscription.subscriptionStatus === "Expired" && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-800">Suscripción expirada</p>
            <p className="text-sm text-red-700 dark:text-red-400 mt-1">
              Tu suscripción ha expirado. Renueva para continuar usando todas las funciones.
            </p>
          </div>
        </div>
      )}

      {/* Current Plan Overview */}
      <Card className="border-2 border-green-200 dark:border-green-800/40 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-background rounded-lg shadow-sm">
                <SbSubscription size={28} />
              </div>
              <div>
                <CardTitle className="text-lg">
                  Plan {currentPlan?.nombre || subscription.planTipo || "Sin plan"}
                </CardTitle>
                <p className="text-sm text-gray-500">
                  {subscription.nombreEmpresa}
                </p>
              </div>
            </div>
            <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase font-medium">Usuarios</p>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{subscription.activeUsuarios} / {subscription.maxUsuarios}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${subscription.activeUsuarios > subscription.maxUsuarios ? "bg-red-500" : "bg-green-500"}`}
                  style={{ width: `${Math.min((subscription.activeUsuarios / subscription.maxUsuarios) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase font-medium">Vencimiento</p>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">
                  {subscription.fechaExpiracion
                    ? new Date(subscription.fechaExpiracion).toLocaleDateString("es-MX")
                    : "Sin fecha"}
                </span>
              </div>
              {daysLeft !== null && daysLeft <= 30 && (
                <p className={`text-xs ${daysLeft <= 7 ? "text-red-600 font-medium" : "text-amber-600"}`}>
                  {daysLeft === 0 ? "Vence hoy" : `${daysLeft} día${daysLeft !== 1 ? "s" : ""} restante${daysLeft !== 1 ? "s" : ""}`}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase font-medium">Acciones</p>
              {subscription.hasStripe ? (
                <Button size="sm" variant="outline" onClick={handleManageBilling} disabled={processing}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Gestionar pagos
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">Sin método de pago configurado</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plans">Planes disponibles</TabsTrigger>
          <TabsTrigger value="usage">Uso actual</TabsTrigger>
        </TabsList>

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-6">
          {/* Billing interval toggle — polished */}
          <div className="flex items-center justify-center gap-3">
            <span className={`text-sm font-medium transition-colors duration-300 ${billingInterval === "month" ? "text-foreground" : "text-muted-foreground"}`}>Mensual</span>
            <button
              onClick={() => setBillingInterval(prev => prev === "month" ? "year" : "month")}
              className="relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
              style={{ backgroundColor: billingInterval === "year" ? "#16A34A" : "hsl(var(--muted-foreground) / 0.3)" }}
            >
              <div
                className="absolute top-[3px] w-[22px] h-[22px] bg-white rounded-full shadow-md transition-all duration-300"
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
                  onUpgrade={() => handleUpgrade(plan.codigo)}
                  subscription={subscription}
                />
              );
            })}
          </div>
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Usuarios activos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Uso actual</span>
                      <span className="text-sm font-medium">{subscription.activeUsuarios} de {subscription.maxUsuarios}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all"
                        style={{ width: `${Math.min((subscription.activeUsuarios / subscription.maxUsuarios) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  {subscription.activeUsuarios >= subscription.maxUsuarios && (
                    <>
                      <Separator />
                      <div className="flex items-center gap-2 text-amber-600 text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Has alcanzado el límite de usuarios. Considera actualizar tu plan.</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detalles del plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Plan</span>
                    <span className="font-medium">{currentPlan?.nombre || subscription.planTipo}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Estado</span>
                    <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Máx. usuarios</span>
                    <span className="font-medium">{subscription.maxUsuarios}</span>
                  </div>
                  {currentPlan && (
                    <>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Máx. productos</span>
                        <span className="font-medium">{currentPlan.maxProductos.toLocaleString()}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Reportes</span>
                        <span className="font-medium">{currentPlan.incluyeReportes ? "Sí" : "No"}</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cancel subscription */}
          {subscription.hasStripe && subscription.subscriptionStatus !== "Cancelled" && (
            <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-red-800 dark:text-red-300">Cancelar suscripción</p>
                    <p className="text-sm text-red-600 dark:text-red-400">Se cancelará al final del período actual</p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={handleCancel} disabled={processing}>
                    Cancelar suscripción
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      </div>
    </PageHeader>
  );
}
