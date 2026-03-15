"use client";

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
  return (
    <>
      {/* Past due */}
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

      {/* Expired */}
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

      {/* Cancellation scheduled */}
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
            onClick={onReactivate}
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

      {/* Trial */}
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
                ? "Tarjeta registrada \u2014 tu trial continúa"
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
              onClick={onTrialCheckout}
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
    </>
  );
}
