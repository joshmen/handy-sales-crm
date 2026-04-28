"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { toast } from "@/hooks/useToast";
import { useRequireAdmin } from "@/hooks/usePermissions";
import { subscriptionService } from "@/services/api/subscriptions";
import type { SubscriptionPlan, SubscriptionStatus, StripeInvoice, StripePaymentMethod, TimbreBalance, PaginatedStripeResult } from "@/types/subscription";
import { PageHeader } from "@/components/layout/PageHeader";
import { useTranslations } from "next-intl";
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
import { CuponRedeemCard } from "./components/CuponRedeemCard";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;


export default function SubscriptionPage() {
  const t = useTranslations('subscription');
  const tc = useTranslations('common');
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
  const [invoiceData, setInvoiceData] = useState<PaginatedStripeResult<StripeInvoice> | null>(null);
  const [pmData, setPmData] = useState<PaginatedStripeResult<StripePaymentMethod> | null>(null);
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

      // Fetch timbres balance (may fail if plan doesn't include it — non-critical).
      subscriptionService.getTimbres()
        .then(setTimbres)
        .catch((err) => console.warn('[Subscription] timbres unavailable for this plan:', err));

      // Fetch billing data in background if has Stripe
      if (subData.hasStripe) {
        setBillingLoading(true);
        Promise.all([
          subscriptionService.getInvoices(),
          subscriptionService.getPaymentMethods(),
        ]).then(([inv, pm]) => {
          setInvoiceData(inv);
          setPmData(pm);
        }).catch(() => {
          // Silently fail — billing section just stays empty
        }).finally(() => setBillingLoading(false));
      }
    } catch (err) {
      console.error("Error loading subscription data:", err);
      toast.error(t("errorLoading"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-show plans when subscription is expired or cancelled
  useEffect(() => {
    if (subscription && (subscription.subscriptionStatus === "Expired" || subscription.subscriptionStatus === "Cancelled")) {
      setShowPlans(true);
    }
  }, [subscription]);

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
      const apiMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(t("errorCheckout"), { description: apiMessage || undefined });
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
      toast.error(t("errorTrialCheckout"));
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
      window.location.assign(url);
    } catch (err) {
      console.error("Error creating portal:", err);
      toast.error(t("errorPortal"));
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    setProcessing(true);
    try {
      await subscriptionService.cancelSubscription();
      toast({ title: t("cancelScheduled"), description: t("cancelScheduledDesc") });
      setShowCancelDialog(false);
      await fetchData();
    } catch (err) {
      console.error("Error cancelling:", err);
      toast.error(t("errorCancelling"));
    } finally {
      setProcessing(false);
    }
  };

  const handleReactivate = async () => {
    setProcessing(true);
    try {
      await subscriptionService.reactivateSubscription();
      toast({ title: t("reactivated"), description: t("reactivatedDesc") });
      await fetchData();
    } catch (err) {
      console.error("Error reactivating:", err);
      toast.error(t("errorReactivating"));
    } finally {
      setProcessing(false);
    }
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div role="status" className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" aria-hidden="true" />
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  if (!subscription) return null;

  // ── Embedded Checkout view ──
  if (checkoutClientSecret) {
    const selectedPlan = plans.find(p => p.codigo === checkoutPlan);
    const checkoutSubtitle = selectedPlan
      ? t("planDetails", {
          name: selectedPlan.nombre,
          price: billingInterval === "year"
            ? selectedPlan.precioAnual.toLocaleString("es-MX")
            : selectedPlan.precioMensual.toLocaleString("es-MX"),
          interval: billingInterval === "year" ? t("perYear") : t("perMonth"),
        })
      : t("enterPaymentDetails");
    return (
      <PageHeader
        breadcrumbs={[
          { label: tc("home"), href: "/dashboard" },
          { label: t("title"), href: "/subscription" },
          { label: t("payment") },
        ]}
        title={t("completeSubscription")}
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
            {t("goBack")}
          </Button>
        }
      >
        <div className="overflow-hidden rounded-xl bg-white">
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
        { label: tc("home"), href: "/dashboard" },
        { label: t("title") },
      ]}
      title={t("title")}
      subtitle={t("subtitle")}
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

        <CuponRedeemCard onRedeemed={fetchData} />

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
            initialData={pmData}
            billingLoading={billingLoading}
            processing={processing}
            onManageBilling={handleManageBilling}
          />
        )}

        {subscription.hasStripe && (
          <InvoiceHistory
            initialData={invoiceData}
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
