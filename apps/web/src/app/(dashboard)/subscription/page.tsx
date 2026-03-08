"use client";

import { useState, useEffect, useCallback } from "react";
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
import {
  Crown,
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

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

const statusLabels: Record<string, { label: string; color: string }> = {
  Trial: { label: "Prueba", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  Active: { label: "Activo", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  PastDue: { label: "Pago pendiente", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  Cancelled: { label: "Cancelado", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
  Expired: { label: "Expirado", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
};

const planColors: Record<string, string> = {
  FREE: "border-gray-200 dark:border-gray-700",
  BASIC: "border-blue-200 dark:border-blue-800",
  PRO: "border-purple-300 dark:border-purple-800",
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
      window.location.href = url;
    } catch (err) {
      console.error("Error creating portal:", err);
      toast.error("Error al abrir el portal de pagos");
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
              <div className="p-3 bg-background rounded-lg shadow-sm">
                <Crown className="h-6 w-6 text-green-600" />
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
                  className="bg-green-500 h-2 rounded-full transition-all"
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
        <TabsContent value="plans" className="space-y-4">
          {/* Billing interval toggle */}
          <div className="flex items-center justify-center gap-3">
            <span className={`text-sm ${billingInterval === "month" ? "font-semibold text-foreground" : "text-muted-foreground"}`}>Mensual</span>
            <button
              onClick={() => setBillingInterval(prev => prev === "month" ? "year" : "month")}
              className={`relative w-12 h-6 rounded-full transition-colors ${billingInterval === "year" ? "bg-green-500" : "bg-muted-foreground/30"}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${billingInterval === "year" ? "translate-x-7" : "translate-x-1"}`} />
            </button>
            <span className={`text-sm ${billingInterval === "year" ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
              Anual <Badge className="bg-green-100 text-green-800 ml-1">Ahorra 17%</Badge>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const isCurrent = plan.codigo === subscription.planTipo?.toUpperCase();
              const isPopular = plan.codigo === "PRO";
              const price = billingInterval === "year" ? plan.precioAnual : plan.precioMensual;
              const monthlyEquivalent = billingInterval === "year" ? Math.round(plan.precioAnual / 12) : plan.precioMensual;

              return (
                <Card
                  key={plan.id}
                  className={`relative min-h-[420px] flex flex-col ${isPopular ? "border-2 border-green-500 shadow-lg" : planColors[plan.codigo] || ""} ${isCurrent ? "bg-green-50 dark:bg-green-950/20" : ""}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-lg">{plan.nombre}</CardTitle>
                      {isPopular && (
                        <Badge className="bg-green-500 text-white">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Más popular
                        </Badge>
                      )}
                      {isCurrent && (
                        <Badge className="bg-green-600 text-white">Plan actual</Badge>
                      )}
                    </div>
                    <div className="mt-3">
                      {price === 0 ? (
                        <span className="text-3xl font-bold">Gratis</span>
                      ) : (
                        <>
                          <span className="text-3xl font-bold">${monthlyEquivalent.toLocaleString("es-MX")}</span>
                          <span className="text-gray-500 ml-1">/ mes</span>
                          {billingInterval === "year" && (
                            <p className="text-xs text-muted-foreground mt-1">Facturado ${price.toLocaleString("es-MX")} / año</p>
                          )}
                        </>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col">
                    <ul className="space-y-2 flex-1">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{plan.maxUsuarios} usuarios</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{plan.maxProductos.toLocaleString()} productos</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{plan.maxClientesPorMes} clientes/mes</span>
                      </li>
                      <li className="flex items-center gap-2">
                        {plan.incluyeReportes ? (
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                        )}
                        <span className={`text-sm ${!plan.incluyeReportes ? "text-muted-foreground" : ""}`}>Reportes avanzados</span>
                      </li>
                      <li className="flex items-center gap-2">
                        {plan.incluyeSoportePrioritario ? (
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                        )}
                        <span className={`text-sm ${!plan.incluyeSoportePrioritario ? "text-muted-foreground" : ""}`}>Soporte prioritario</span>
                      </li>
                    </ul>

                    <Button
                      className="w-full mt-4"
                      variant={isCurrent ? "outline" : isPopular ? "default" : "outline"}
                      disabled={isCurrent || processing || plan.codigo === "FREE"}
                      onClick={() => handleUpgrade(plan.codigo)}
                    >
                      {processing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isCurrent ? (
                        "Plan actual"
                      ) : plan.codigo === "FREE" ? (
                        "Incluido"
                      ) : (
                        <>
                          Actualizar
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
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
