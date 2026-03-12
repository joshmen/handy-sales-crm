"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Separator } from "@/components/ui/Separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import { toast } from "@/hooks/useToast";
import { useRequireAdmin } from "@/hooks/usePermissions";
import { subscriptionService } from "@/services/api/subscriptions";
import type { SubscriptionPlan, SubscriptionStatus } from "@/types/subscription";
import { PageHeader } from "@/components/layout/PageHeader";
import { SbSubscription, SbAlert } from "@/components/layout/DashboardIcons";
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
  RotateCcw,
  Package,
  UserCheck,
  BarChart3,
  Headphones,
  ShieldAlert,
  ArrowUpRight,
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
  const [trialCheckoutLoading, setTrialCheckoutLoading] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showPlans, setShowPlans] = useState(false);

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

  const handleTrialCheckout = async () => {
    setTrialCheckoutLoading(true);
    try {
      const { clientSecret } = await subscriptionService.createTrialCheckoutSession(
        "PRO",
        billingInterval,
        `${window.location.origin}/subscription`
      );
      setCheckoutClientSecret(clientSecret);
      setCheckoutPlan("PRO");
    } catch (err) {
      console.error("Error creating trial checkout:", err);
      toast.error("Error al iniciar la captura de tarjeta");
    } finally {
      setTrialCheckoutLoading(false);
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
    setProcessing(true);
    try {
      await subscriptionService.cancelSubscription();
      toast({ title: "Cancelación programada", description: "Tu suscripción se cancelará al final del período actual. Puedes reactivarla en cualquier momento." });
      setShowCancelDialog(false);
      await fetchData();
    } catch (err) {
      console.error("Error cancelling:", err);
      toast.error("Error al cancelar la suscripción");
    } finally {
      setProcessing(false);
    }
  };

  const handleReactivate = async () => {
    setProcessing(true);
    try {
      await subscriptionService.reactivateSubscription();
      toast({ title: "Suscripción reactivada", description: "Tu suscripción continuará renovándose normalmente." });
      await fetchData();
    } catch (err) {
      console.error("Error reactivating:", err);
      toast.error("Error al reactivar la suscripción");
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
            Volver
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

  // Plan comparison expanded view
  if (showPlans) {
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
          <Button variant="outline" size="sm" onClick={() => setShowPlans(false)}>
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
                  onUpgrade={() => handleUpgrade(plan.codigo)}
                />
              );
            })}
          </div>
        </div>
      </PageHeader>
    );
  }

  const currentPlan = plans.find(p => p.codigo === subscription.planTipo?.toUpperCase());
  const statusInfo = statusLabels[subscription.subscriptionStatus] || statusLabels.Trial;
  const daysLeft = subscription.fechaExpiracion
    ? Math.max(0, Math.ceil((new Date(subscription.fechaExpiracion).getTime() - Date.now()) / 86400000))
    : null;

  const usersPercent = Math.min((subscription.activeUsuarios / subscription.maxUsuarios) * 100, 100);
  const usersOver = subscription.activeUsuarios > subscription.maxUsuarios;

  return (
    <PageHeader
      breadcrumbs={[
        { label: "Inicio", href: "/dashboard" },
        { label: "Suscripción" },
      ]}
      title="Suscripción"
      subtitle="Administra tu plan y método de pago"
    >
      <div className="space-y-6 page-animate">

      {/* ── Alert banners ─────────────────────────── */}

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

      {subscription.cancellationScheduledFor && subscription.subscriptionStatus !== "Cancelled" && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-amber-800 dark:text-amber-300">Cancelación programada</p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
              Tu suscripción se cancelará el <strong>{new Date(subscription.cancellationScheduledFor).toLocaleDateString("es-MX")}</strong>. Mantendrás acceso completo hasta esa fecha.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleReactivate}
            disabled={processing}
            className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/40 flex-shrink-0"
          >
            {processing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <RotateCcw className="h-4 w-4 mr-1.5" />
                Reanudar suscripción
              </>
            )}
          </Button>
        </div>
      )}

      {subscription.subscriptionStatus === "Trial" && subscription.daysRemaining !== null && (
        <div className={`flex items-start gap-3 p-4 rounded-lg border ${
          subscription.trialCardCollected
            ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
            : subscription.daysRemaining > 7
              ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
              : subscription.daysRemaining > 3
                ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
                : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
        }`}>
          <div className={`p-1.5 rounded-lg ${
            subscription.trialCardCollected
              ? "bg-green-100 dark:bg-green-900/40"
              : subscription.daysRemaining > 7
                ? "bg-blue-100 dark:bg-blue-900/40"
                : subscription.daysRemaining > 3
                  ? "bg-amber-100 dark:bg-amber-900/40"
                  : "bg-red-100 dark:bg-red-900/40"
          }`}>
            {subscription.trialCardCollected ? (
              <CreditCard className="h-5 w-5 text-green-600" />
            ) : (
              <Sparkles className="h-5 w-5 text-blue-600" />
            )}
          </div>
          <div className="flex-1">
            <p className={`font-semibold ${
              subscription.trialCardCollected
                ? "text-green-800 dark:text-green-300"
                : subscription.daysRemaining > 7
                  ? "text-blue-800 dark:text-blue-300"
                  : subscription.daysRemaining > 3
                    ? "text-amber-800 dark:text-amber-300"
                    : "text-red-800 dark:text-red-300"
            }`}>
              {subscription.trialCardCollected
                ? "Tarjeta registrada — tu trial continúa"
                : `Tu periodo de prueba termina en ${subscription.daysRemaining} día${subscription.daysRemaining !== 1 ? "s" : ""}`}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {subscription.trialCardCollected
                ? `Se cobrará automáticamente cuando termine tu trial${subscription.trialEndsAt ? ` el ${new Date(subscription.trialEndsAt).toLocaleDateString("es-MX")}` : ""}.`
                : "Agrega un método de pago para no perder acceso a las funciones PRO."}
            </p>
          </div>
          {!subscription.trialCardCollected && (
            <Button
              size="sm"
              onClick={handleTrialCheckout}
              disabled={trialCheckoutLoading}
              className="bg-green-600 hover:bg-green-700 text-white flex-shrink-0"
            >
              {trialCheckoutLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-1.5" />
                  Agregar método de pago
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* ── Current plan hero ─────────────────────── */}
      <Card className="border-2 border-green-200 dark:border-green-800/40 bg-gradient-to-br from-green-50/80 via-emerald-50/50 to-white dark:from-green-950/30 dark:via-emerald-950/20 dark:to-background overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-background rounded-xl shadow-sm border border-green-100 dark:border-green-900">
                <SbSubscription size={32} />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold text-foreground">
                    Plan {currentPlan?.nombre || subscription.planTipo || "Sin plan"}
                  </h2>
                  <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{subscription.nombreEmpresa}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {subscription.hasStripe && (
                <Button size="sm" variant="outline" onClick={handleManageBilling} disabled={processing}>
                  <CreditCard className="h-4 w-4 mr-1.5" />
                  Pagos
                  <ExternalLink className="h-3 w-3 ml-1 opacity-50" />
                </Button>
              )}
              <Button size="sm" onClick={() => setShowPlans(true)} className="bg-green-600 hover:bg-green-700 text-white">
                <ArrowUpRight className="h-4 w-4 mr-1.5" />
                Cambiar plan
              </Button>
            </div>
          </div>

          {/* Usage grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Users */}
            <div className="bg-background/80 backdrop-blur-sm rounded-xl p-4 border border-border/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Usuarios</span>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  usersOver
                    ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                    : usersPercent >= 80
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                      : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                }`}>
                  {subscription.activeUsuarios}/{subscription.maxUsuarios}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    usersOver ? "bg-red-500" : usersPercent >= 80 ? "bg-amber-500" : "bg-green-500"
                  }`}
                  style={{ width: `${usersPercent}%` }}
                />
              </div>
              {usersOver && (
                <p className="text-[11px] text-red-600 dark:text-red-400 mt-2 font-medium">Límite excedido</p>
              )}
            </div>

            {/* Expiration */}
            <div className="bg-background/80 backdrop-blur-sm rounded-xl p-4 border border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vencimiento</span>
              </div>
              <p className="text-lg font-bold text-foreground">
                {subscription.fechaExpiracion
                  ? new Date(subscription.fechaExpiracion).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })
                  : "Sin fecha"}
              </p>
              {daysLeft !== null && daysLeft <= 30 && (
                <p className={`text-[11px] mt-1 font-medium ${daysLeft <= 7 ? "text-red-600" : daysLeft <= 14 ? "text-amber-600" : "text-muted-foreground"}`}>
                  {daysLeft === 0 ? "Vence hoy" : `${daysLeft} día${daysLeft !== 1 ? "s" : ""} restante${daysLeft !== 1 ? "s" : ""}`}
                </p>
              )}
            </div>

            {/* Products */}
            {currentPlan && (
              <div className="bg-background/80 backdrop-blur-sm rounded-xl p-4 border border-border/50">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Productos</span>
                </div>
                <p className="text-lg font-bold text-foreground">
                  {currentPlan.maxProductos.toLocaleString()}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">máximo permitido</p>
              </div>
            )}

            {/* Features */}
            {currentPlan && (
              <div className="bg-background/80 backdrop-blur-sm rounded-xl p-4 border border-border/50">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Funciones</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    {currentPlan.incluyeReportes ? (
                      <Check className="h-3.5 w-3.5 text-green-500" strokeWidth={2.5} />
                    ) : (
                      <X className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />
                    )}
                    <span className={`text-xs ${currentPlan.incluyeReportes ? "text-foreground" : "text-muted-foreground"}`}>Reportes</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {currentPlan.incluyeSoportePrioritario ? (
                      <Check className="h-3.5 w-3.5 text-green-500" strokeWidth={2.5} />
                    ) : (
                      <X className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />
                    )}
                    <span className={`text-xs ${currentPlan.incluyeSoportePrioritario ? "text-foreground" : "text-muted-foreground"}`}>Soporte prioritario</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Quick plan comparison ─────────────────── */}
      {plans.length > 0 && !showPlans && (
        <div className="page-animate-delay-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Planes disponibles</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowPlans(true)} className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30">
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
                      ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20"
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
                      onClick={() => handleUpgrade(plan.codigo)}
                      disabled={processing}
                      className={downgrade.isDowngrade ? "" : "bg-green-600 hover:bg-green-700 text-white"}
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
        </div>
      )}

      {/* ── Danger zone ───────────────────────────── */}
      {subscription.hasStripe && subscription.subscriptionStatus !== "Cancelled" && !subscription.cancellationScheduledFor && (
        <div className="page-animate-delay-2 pt-4">
          <Separator className="mb-6" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cancelar suscripción</p>
                <p className="text-xs text-muted-foreground/70">Mantendrás acceso hasta el final del período pagado</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCancelDialog(true)}
              className="text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              Cancelar plan
            </Button>
          </div>
        </div>
      )}

      </div>

      {/* ── Cancellation confirmation dialog ──────── */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2">
              <SbAlert size={48} />
            </div>
            <DialogTitle className="text-center">Cancelar suscripción</DialogTitle>
            <DialogDescription className="text-center">
              Tu suscripción seguirá activa hasta el final del período actual
              {subscription.fechaExpiracion && (
                <> (<strong>{new Date(subscription.fechaExpiracion).toLocaleDateString("es-MX")}</strong>)</>
              )}.
              Después de esa fecha perderás acceso a las funciones de tu plan.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm">
            <p className="font-medium mb-2 text-foreground">Lo que perderás:</p>
            <ul className="space-y-1.5 text-muted-foreground">
              {currentPlan && currentPlan.maxUsuarios > 2 && (
                <li className="flex items-center gap-2">
                  <X className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                  Hasta {currentPlan.maxUsuarios} usuarios (baja a 2)
                </li>
              )}
              {currentPlan?.incluyeReportes && (
                <li className="flex items-center gap-2">
                  <X className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                  Reportes avanzados
                </li>
              )}
              {currentPlan?.incluyeSoportePrioritario && (
                <li className="flex items-center gap-2">
                  <X className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                  Soporte prioritario
                </li>
              )}
            </ul>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              className="sm:flex-1"
            >
              Conservar mi plan
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={processing}
              className="sm:flex-1"
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Confirmar cancelación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </PageHeader>
  );
}


// ─── Plan Card (full comparison view) ──────────────────────
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
          {isPopular && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
              <span className="bg-green-600 text-white text-[11px] font-semibold uppercase tracking-wider px-4 py-1 rounded-full shadow-md shadow-green-600/20 flex items-center gap-1">
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

      <div
        className="absolute -bottom-2 left-6 right-6 h-6 rounded-full blur-xl transition-all duration-500 -z-10"
        style={{ backgroundColor: isHovered ? (isPopular ? "rgba(22, 163, 74, 0.12)" : "rgba(99, 102, 241, 0.08)") : "transparent" }}
      />
    </div>
  );
}
