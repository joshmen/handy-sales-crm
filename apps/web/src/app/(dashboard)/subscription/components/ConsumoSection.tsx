"use client";

import { Card, CardContent } from "@/components/ui/Card";
import { SbBilling, SbAI } from "@/components/layout/DashboardIcons";
import type { TimbreBalance } from "@/types/subscription";
import Link from "next/link";

interface ConsumoSectionProps {
  timbres: TimbreBalance | null;
}

export function ConsumoSection({ timbres }: ConsumoSectionProps) {
  return (
    <div className="mt-2 page-animate-delay-1">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3">Consumo</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Timbres CFDI */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 flex items-center justify-center"><SbBilling size={32} /></div>
              <div>
                <h4 className="font-semibold text-sm">Timbres CFDI</h4>
                <p className="text-xs text-muted-foreground">Facturación electrónica</p>
              </div>
            </div>
            {timbres ? (
              <>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-2xl font-bold tabular-nums">{timbres.disponibles}</span>
                  <span className="text-xs text-muted-foreground">
                    {timbres.usados}/{timbres.maximo} usados{timbres.extras > 0 && ` + ${timbres.extras} extras`}
                  </span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-4">
                  <div
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
                <Link href="/subscription/buy-timbres">
                  <button className="w-full py-2 px-4 text-sm font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors">
                    Comprar timbres &rarr;
                  </button>
                </Link>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Tu plan no incluye facturación</p>
            )}
          </CardContent>
        </Card>

        {/* Créditos IA */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 flex items-center justify-center"><SbAI size={32} /></div>
              <div>
                <h4 className="font-semibold text-sm">Créditos IA</h4>
                <p className="text-xs text-muted-foreground">Asistente inteligente</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Disponible en la sección de Asistente IA</p>
            <Link href="/ai">
              <button className="w-full py-2 px-4 text-sm font-medium text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded-lg transition-colors">
                Ver créditos IA &rarr;
              </button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
