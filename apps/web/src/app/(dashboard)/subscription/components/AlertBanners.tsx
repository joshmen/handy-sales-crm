"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import type { SubscriptionStatus } from "@/types/subscription";
import { AlertTriangle, CreditCard, Sparkles, Loader2, RotateCcw } from "lucide-react";

interface AlertBannersProps {
  subscription: SubscriptionStatus;
  processing: boolean;
  trialCheckoutLoading: boolean;
  onReactivate: () => void;
  onTrialCheckout: () => void;
}

export function AlertBanners({
  subscription, processing, trialCheckoutLoading,
  onReactivate, onTrialCheckout,
}: AlertBannersProps) {
  const t = useTranslations('subscription.alerts');

  return (
    <>
      {/* Past due */}
      {subscription.subscriptionStatus === "PastDue" && (
        <div role="alert" className="flex items-start gap-3 p-4 bg-muted/40 dark:bg-muted/30 border-l-4 border-l-amber-500 border border-border rounded-lg">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-300">{t('pastDueTitle')}</p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
              {t('pastDueDesc')}
              {subscription.gracePeriodEnd && (
                <> {t('pastDueGrace', { date: new Date(subscription.gracePeriodEnd).toLocaleDateString() })}</>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Expired */}
      {subscription.subscriptionStatus === "Expired" && (
        <div role="alert" className="flex items-start gap-3 p-4 bg-muted/40 dark:bg-muted/30 border-l-4 border-l-red-500 border border-border rounded-lg">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-800 dark:text-red-300">{t('expiredTitle')}</p>
            <p className="text-sm text-red-700 dark:text-red-400 mt-1">
              {t('expiredDesc')}
            </p>
          </div>
        </div>
      )}

      {/* Cancellation scheduled */}
      {subscription.cancellationScheduledFor && subscription.subscriptionStatus !== "Cancelled" && (
        <div role="alert" className="flex items-start gap-3 p-4 bg-muted/40 dark:bg-muted/30 border-l-4 border-l-amber-500 border border-border rounded-lg">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-amber-800 dark:text-amber-300">{t('cancellationTitle')}</p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
              {t('cancellationDesc', { date: new Date(subscription.cancellationScheduledFor).toLocaleDateString() })}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onReactivate}
            disabled={processing}
            className="border-border text-amber-700 hover:bg-muted/40 dark:border-border dark:text-amber-300 dark:hover:bg-muted/30 flex-shrink-0"
          >
            {processing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <RotateCcw className="h-4 w-4 mr-1.5" />
                {t('resumeSubscription')}
              </>
            )}
          </Button>
        </div>
      )}

      {/* Trial */}
      {subscription.subscriptionStatus === "Trial" && subscription.daysRemaining !== null && (
        <div className={`flex items-start gap-3 p-4 rounded-lg border border-border bg-muted/40 dark:bg-muted/30 border-l-4 ${
          subscription.trialCardCollected
            ? "border-l-green-500"
            : subscription.daysRemaining > 7
              ? "border-l-blue-500"
              : subscription.daysRemaining > 3
                ? "border-l-amber-500"
                : "border-l-red-500"
        }`}>
          <div className="p-1.5 rounded-lg bg-muted dark:bg-muted/60">
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
                ? t('trialCardCollected')
                : t('trialEndsIn', {
                    days: subscription.daysRemaining,
                    dayLabel: subscription.daysRemaining !== 1 ? t('trialDays') : t('trialDay'),
                  })}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {subscription.trialCardCollected
                ? (subscription.trialEndsAt
                    ? t('trialChargeAuto', { date: new Date(subscription.trialEndsAt).toLocaleDateString() })
                    : t('trialChargeAutoNoDate'))
                : t('trialAddPayment')}
            </p>
          </div>
          {!subscription.trialCardCollected && (
            <Button
              size="sm"
              onClick={onTrialCheckout}
              disabled={trialCheckoutLoading}
              className="bg-success hover:bg-success/90 text-white flex-shrink-0"
            >
              {trialCheckoutLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-1.5" />
                  {t('addPaymentMethod')}
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </>
  );
}
