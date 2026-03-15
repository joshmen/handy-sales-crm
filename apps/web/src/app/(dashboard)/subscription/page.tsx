"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { toast } from "@/hooks/useToast";
import { useRequireAdmin } from "@/hooks/usePermissions";
import { subscriptionService } from "@/services/api/subscriptions";
import type { SubscriptionPlan, SubscriptionStatus, StripeInvoice, StripePaymentMethod, TimbreBalance } from "@/types/subscription";
import { PageHeader } from "@/components/layout/PageHeader";
import { ArrowLeft, Loader2 } from "lucide-react";

import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";

import { AlertBanners } from "./components/AlertBanners";
import { PlanHeroCard } from "./components/PlanHeroCard";
import { ConsumoSection } from "./components/ConsumoSection";
import { PlanComparisonPage, QuickPlanComparison } from "./components/PlanComparison";
import { PaymentMethods } from "./components/PaymentMethods";
import { InvoiceHistory } from "./components/InvoiceHistory";
import { CancelSection } from "./components/CancelSection";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;


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
  const [invoices, setInvoices] = useState<StripeInvoice[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<StripePaymentMethod[]>([]);
  const [billingLoading, setBillingLoading] = useState(false);
  const [timbres, setTimbres] = useState<TimbreBalance | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [plansData, subData] = await Promise.all([
        subscriptionService.getPlans(),
        subscriptionService.getCurrentSubscription(),
      ]);
      setPlans(plansData);
      setSubscription(subData);

      // Fetch timbres balance (may fail if plan doesn't include it)
      subscriptionService.getTimbres().then(setTimbres).catch(() => {});

      // Fetch billing data in background if has Stripe
      if (subData.hasStripe) {
        setBillingLoading(true);
        Promise.all([
          subscriptionService.getInvoices(),
          subscriptionService.getPaymentMethods(),
        ]).then(([inv, pm]) => {
          setInvoices(inv);
          setPaymentMethods(pm);
        }).catch(() => {
          // Silently fail — billing section just stays empty
        }).finally(() => setBillingLoading(false));
      }
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

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!subscription) return null;

  // ── Embedded Checkout view ──
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

  // ── Plan comparison full-page view ──
  if (showPlans) {
    return (
      <PlanComparisonPage
        plans={plans}
        subscription={subscription}
        billingInterval={billingInterval}
        setBillingInterval={setBillingInterval}
        processing={processing}
        onUpgrade={handleUpgrade}
        onBack={() => setShowPlans(false)}
      />
    );
  }

  // ── Main subscription dashboard ──
  const currentPlan = plans.find(p => p.codigo === subscription.planTipo?.toUpperCase());

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

        <AlertBanners
          subscription={subscription}
          processing={processing}
          trialCheckoutLoading={trialCheckoutLoading}
          onReactivate={handleReactivate}
          onTrialCheckout={handleTrialCheckout}
        />

        <PlanHeroCard
          subscription={subscription}
          currentPlan={currentPlan}
          onChangePlan={() => setShowPlans(true)}
        />

        <ConsumoSection timbres={timbres} />

        {plans.length > 0 && (
          <QuickPlanComparison
            plans={plans}
            subscription={subscription}
            processing={processing}
            onUpgrade={handleUpgrade}
            onShowFullComparison={() => setShowPlans(true)}
          />
        )}

        {subscription.hasStripe && (
          <PaymentMethods
            paymentMethods={paymentMethods}
            billingLoading={billingLoading}
            processing={processing}
            onManageBilling={handleManageBilling}
          />
        )}

        {subscription.hasStripe && (
          <InvoiceHistory
            invoices={invoices}
            billingLoading={billingLoading}
          />
        )}

        <CancelSection
          subscription={subscription}
          currentPlan={currentPlan}
          processing={processing}
          showCancelDialog={showCancelDialog}
          onShowCancelDialog={setShowCancelDialog}
          onCancel={handleCancel}
        />

      </div>
    </PageHeader>
  );
}
