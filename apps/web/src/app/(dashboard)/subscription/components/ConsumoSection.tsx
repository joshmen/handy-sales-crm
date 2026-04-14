"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/Card";
import { SbBilling, SbAI } from "@/components/layout/DashboardIcons";
import type { TimbreBalance } from "@/types/subscription";
import Link from "next/link";

interface ConsumoSectionProps {
  timbres: TimbreBalance | null;
}

export function ConsumoSection({ timbres }: ConsumoSectionProps) {
  const t = useTranslations('subscription.consumo');

  return (
    <div className="mt-2 page-animate-delay-1">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3">{t('title')}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Timbres CFDI */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 flex items-center justify-center"><SbBilling size={32} /></div>
              <div>
                <h4 className="font-semibold text-sm">{t('timbresCfdi')}</h4>
                <p className="text-xs text-muted-foreground">{t('electronicBilling')}</p>
              </div>
            </div>
            {timbres ? (
              <>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-2xl font-bold tabular-nums">{timbres.disponibles}</span>
                  <span className="text-xs text-muted-foreground">
                    {timbres.extras > 0
                      ? t('usedWithExtras', { used: timbres.usados, max: timbres.maximo, extras: timbres.extras })
                      : t('used', { used: timbres.usados, max: timbres.maximo })}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={timbres.usados}
                  aria-valuemin={0}
                  aria-valuemax={timbres.maximo + timbres.extras}
                  aria-label={t('stampsUsed', { used: timbres.usados, max: timbres.maximo + timbres.extras })}
                  className="w-full h-2 bg-muted rounded-full overflow-hidden mb-4"
                >
                  <div
                    aria-hidden="true"
                    className={`h-full rounded-full transition-all ${
                      (timbres.maximo + timbres.extras) > 0
                        ? timbres.usados / (timbres.maximo + timbres.extras) > 0.9 ? 'bg-red-500'
                        : timbres.usados / (timbres.maximo + timbres.extras) > 0.6 ? 'bg-amber-500'
                        : 'bg-green-500'
                        : 'bg-muted-foreground/30'
                    }`}
                    style={{ width: `${(timbres.maximo + timbres.extras) > 0 ? Math.min(100, (timbres.usados / (timbres.maximo + timbres.extras)) * 100) : 0}%` }}
                  />
                </div>
                <Link
                  href="/subscription/buy-timbres"
                  className="block w-full py-2 px-4 text-sm font-medium text-center text-green-600 dark:text-green-400 hover:underline rounded-lg transition-colors"
                >
                  {t('buyStamps')}
                </Link>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t('noBillingPlan')}</p>
            )}
          </CardContent>
        </Card>

        {/* Créditos IA */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 flex items-center justify-center"><SbAI size={32} /></div>
              <div>
                <h4 className="font-semibold text-sm">{t('aiCredits')}</h4>
                <p className="text-xs text-muted-foreground">{t('aiAssistant')}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{t('aiAvailable')}</p>
            <Link
              href="/ai"
              className="block w-full py-2 px-4 text-sm font-medium text-center text-violet-600 dark:text-violet-400 hover:underline rounded-lg transition-colors"
            >
              {t('viewAiCredits')}
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
