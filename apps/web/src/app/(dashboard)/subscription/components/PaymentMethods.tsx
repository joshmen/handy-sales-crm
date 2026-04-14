"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SbPayments } from "@/components/layout/DashboardIcons";
import type { StripePaymentMethod } from "@/types/subscription";
import { CreditCard, Loader2, ExternalLink } from "lucide-react";

// ── Card brand SVG icons ──────────────────────────────────
function CardBrandIcon({ brand, className }: { brand: string | null; className?: string }) {
  const b = (brand || "").toLowerCase();
  if (b === "visa") return (
    <svg viewBox="0 0 60 40" className={className} fill="none">
      <rect width="60" height="40" rx="6" fill="#1A1F71" />
      <text x="30" y="25" textAnchor="middle" fill="#FFFFFF" fontFamily="Arial, Helvetica, sans-serif" fontSize="16" fontWeight="bold" fontStyle="italic" letterSpacing="1">VISA</text>
    </svg>
  );
  if (b === "mastercard") return (
    <svg viewBox="0 0 60 40" className={className} fill="none">
      <rect width="60" height="40" rx="6" fill="#1A1A2E" />
      <circle cx="23" cy="20" r="10" fill="#EB001B" />
      <circle cx="37" cy="20" r="10" fill="#F79E1B" />
      <path d="M30 12.7a10 10 0 010 14.6 10 10 0 000-14.6z" fill="#FF5F00" />
    </svg>
  );
  if (b === "amex" || b === "american_express") return (
    <svg viewBox="0 0 60 40" className={className} fill="none">
      <rect width="60" height="40" rx="6" fill="#2E77BC" />
      <text x="30" y="24" textAnchor="middle" fill="#FFFFFF" fontFamily="Arial, Helvetica, sans-serif" fontSize="11" fontWeight="bold" letterSpacing="0.5">AMEX</text>
    </svg>
  );
  // Default card icon for unknown brands
  return <CreditCard className={className} />;
}

interface PaymentMethodsProps {
  paymentMethods: StripePaymentMethod[];
  billingLoading: boolean;
  processing: boolean;
  onManageBilling: () => void;
}

export function PaymentMethods({ paymentMethods, billingLoading, processing, onManageBilling }: PaymentMethodsProps) {
  const t = useTranslations('subscription.paymentMethod');

  return (
    <Card className="page-animate-delay-1">
      <CardContent className="p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <SbPayments size={20} />
          <h3 className="text-sm font-semibold text-foreground">{t('title')}</h3>
        </div>
        {billingLoading ? (
          <div className="flex items-center gap-2 p-4 border border-border rounded-xl">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t('loading')}</span>
          </div>
        ) : paymentMethods.length > 0 ? (
          <div className="space-y-2">
            {paymentMethods.map((pm) => (
              <div
                key={pm.id}
                className="flex items-center justify-between p-4 border border-border rounded-xl bg-gradient-to-r from-background to-muted/20 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <CardBrandIcon brand={pm.cardBrand} className="h-8 w-12 rounded" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground capitalize">
                        {pm.cardBrand || t('card')}
                      </span>
                      <span className="text-muted-foreground font-mono">
                        <span aria-hidden="true">&bull;&bull;&bull;&bull; </span>
                        <span className="sr-only">{t('endingIn')} </span>
                        {pm.cardLast4}
                      </span>
                      {pm.isDefault && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400">
                          {t('default')}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {t('expires', { month: pm.cardExpMonth?.toString().padStart(2, "0") || "00", year: pm.cardExpYear || "00" })}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onManageBilling}
                  disabled={processing}
                >
                  {t('update')}
                  <ExternalLink className="h-3 w-3 ml-1 opacity-50" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 border border-dashed border-border rounded-xl">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t('noMethods')}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
