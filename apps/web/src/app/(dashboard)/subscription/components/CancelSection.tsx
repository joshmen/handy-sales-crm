"use client";

import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import { SbAlert } from "@/components/layout/DashboardIcons";
import type { SubscriptionPlan, SubscriptionStatus } from "@/types/subscription";
import { X, Loader2, ShieldAlert } from "lucide-react";

interface CancelSectionProps {
  subscription: SubscriptionStatus;
  currentPlan: SubscriptionPlan | undefined;
  processing: boolean;
  showCancelDialog: boolean;
  onShowCancelDialog: (show: boolean) => void;
  onCancel: () => void;
}

export function CancelSection({
  subscription, currentPlan, processing,
  showCancelDialog, onShowCancelDialog, onCancel,
}: CancelSectionProps) {
  const showBanner = subscription.hasStripe
    && subscription.subscriptionStatus !== "Cancelled"
    && !subscription.cancellationScheduledFor;

  return (
    <>
      {/* Danger zone banner */}
      {showBanner && (
        <div className="page-animate-delay-2">
          <div className="flex items-center justify-between p-4 border border-red-200 dark:border-red-900/50 rounded-xl bg-red-50/50 dark:bg-red-950/20">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-4 w-4 text-red-500 dark:text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-300">Cancelar suscripción</p>
                <p className="text-xs text-red-600/70 dark:text-red-400/60">Mantendrás acceso hasta el final del período pagado</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShowCancelDialog(true)}
              className="border-red-300 text-red-600 hover:text-red-700 hover:bg-red-100 hover:border-red-400 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/50 dark:hover:border-red-700"
            >
              Cancelar plan
            </Button>
          </div>
        </div>
      )}

      {/* Cancellation confirmation dialog */}
      <Dialog open={showCancelDialog} onOpenChange={onShowCancelDialog}>
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
              onClick={() => onShowCancelDialog(false)}
              className="sm:flex-1"
            >
              Conservar mi plan
            </Button>
            <Button
              variant="destructive"
              onClick={onCancel}
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
    </>
  );
}
