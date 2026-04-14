"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SbSubscription } from "@/components/layout/DashboardIcons";
import type { SubscriptionPlan, SubscriptionStatus } from "@/types/subscription";
import {
  Users,
  Check,
  X,
  Calendar,
  Sparkles,
  Package,
  ArrowUpRight,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  Trial: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  Active: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  PastDue: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  Cancelled: "bg-surface-3 text-foreground dark:bg-foreground dark:text-muted-foreground/60",
  Expired: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const STATUS_KEYS: Record<string, string> = {
  Trial: "statusTrial",
  Active: "statusActive",
  PastDue: "statusPastDue",
  Cancelled: "statusCancelled",
  Expired: "statusExpired",
};

interface PlanHeroCardProps {
  subscription: SubscriptionStatus;
  currentPlan: SubscriptionPlan | undefined;
  onChangePlan: () => void;
}

export function PlanHeroCard({ subscription, currentPlan, onChangePlan }: PlanHeroCardProps) {
  const t = useTranslations('subscription.plan');
  const statusKey = STATUS_KEYS[subscription.subscriptionStatus] || "statusTrial";
  const statusColor = STATUS_COLORS[subscription.subscriptionStatus] || STATUS_COLORS.Trial;
  const daysLeft = subscription.fechaExpiracion
    ? Math.max(0, Math.ceil((new Date(subscription.fechaExpiracion).getTime() - Date.now()) / 86400000))
    : null;
  const usersPercent = Math.min((subscription.activeUsuarios / subscription.maxUsuarios) * 100, 100);
  const usersOver = subscription.activeUsuarios > subscription.maxUsuarios;

  return (
    <Card className="border-l-4 border-l-green-600 bg-card overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-background rounded-xl shadow-sm border border-border">
              <SbSubscription size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-foreground">
                  {t('planTitle', { name: currentPlan?.nombre || subscription.planTipo || t('noPlan') })}
                </h2>
                <Badge className={statusColor}>{t(statusKey)}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{subscription.nombreEmpresa}</p>
            </div>
          </div>

          <Button size="sm" onClick={onChangePlan} className="bg-success hover:bg-success/90 text-white">
            <ArrowUpRight className="h-4 w-4 mr-1.5" />
            {t('changePlan')}
          </Button>
        </div>

        {/* Usage grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Users */}
          <div className="bg-background/80 backdrop-blur-sm rounded-xl p-4 border border-border/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">{t('users')}</span>
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
            <div
              role="progressbar"
              aria-valuenow={subscription.activeUsuarios}
              aria-valuemin={0}
              aria-valuemax={subscription.maxUsuarios}
              aria-label={t('usersLabel', { active: subscription.activeUsuarios, max: subscription.maxUsuarios })}
              className="w-full bg-muted rounded-full h-2"
            >
              <div
                aria-hidden="true"
                className={`h-2 rounded-full transition-all duration-500 ${
                  usersOver ? "bg-red-500" : usersPercent >= 80 ? "bg-amber-500" : "bg-green-500"
                }`}
                style={{ width: `${usersPercent}%` }}
              />
            </div>
            {usersOver && (
              <p className="text-[11px] text-red-600 dark:text-red-400 mt-2 font-medium">{t('limitExceeded')}</p>
            )}
          </div>

          {/* Expiration */}
          <div className="bg-background/80 backdrop-blur-sm rounded-xl p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">{t('expiration')}</span>
            </div>
            <p className="text-lg font-bold text-foreground">
              {subscription.fechaExpiracion
                ? new Date(subscription.fechaExpiracion).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
                : t('noDate')}
            </p>
            {daysLeft !== null && daysLeft <= 30 && (
              <p className={`text-[11px] mt-1 font-medium ${daysLeft <= 7 ? "text-red-600" : daysLeft <= 14 ? "text-amber-600" : "text-muted-foreground"}`}>
                {daysLeft === 0
                  ? t('expiresToday')
                  : daysLeft === 1
                    ? t('daysRemaining', { days: daysLeft })
                    : t('daysRemainingPlural', { days: daysLeft })}
              </p>
            )}
          </div>

          {/* Products */}
          {currentPlan && (
            <div className="bg-background/80 backdrop-blur-sm rounded-xl p-4 border border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">{t('products')}</span>
              </div>
              <p className="text-lg font-bold text-foreground">
                {currentPlan.maxProductos.toLocaleString()}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">{t('maxAllowed')}</p>
            </div>
          )}

          {/* Features */}
          {currentPlan && (
            <div className="bg-background/80 backdrop-blur-sm rounded-xl p-4 border border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">{t('features')}</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  {currentPlan.incluyeReportes ? (
                    <Check className="h-3.5 w-3.5 text-green-500" strokeWidth={2.5} />
                  ) : (
                    <X className="h-3.5 w-3.5 text-muted-foreground/60 dark:text-foreground/70" />
                  )}
                  <span className={`text-xs ${currentPlan.incluyeReportes ? "text-foreground" : "text-muted-foreground"}`}>{t('reports')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {currentPlan.incluyeSoportePrioritario ? (
                    <Check className="h-3.5 w-3.5 text-green-500" strokeWidth={2.5} />
                  ) : (
                    <X className="h-3.5 w-3.5 text-muted-foreground/60 dark:text-foreground/70" />
                  )}
                  <span className={`text-xs ${currentPlan.incluyeSoportePrioritario ? "text-foreground" : "text-muted-foreground"}`}>{t('prioritySupport')}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
