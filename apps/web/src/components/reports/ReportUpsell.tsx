'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Lock, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';

type UpsellTier = 'pro' | 'contabilidad';

interface ReportUpsellProps {
  /** Tier requerido por el reporte bloqueado. */
  tier: UpsellTier;
  /** Volver al catálogo de reportes. */
  onBack: () => void;
}

/**
 * Pantalla de upsell (no modal) que se muestra al abrir un reporte bloqueado.
 * Reusa el patrón visual de TimbresModal (icono centrado, titulo, descripcion,
 * CTA primario verde a /subscription) pero como vista embebida en el catalogo.
 *
 * El badge del tier define el color de acento: PRO en ambar, Contabilidad en
 * slate. Los beneficios son genericos por tier (4 bullets cada uno).
 */
export function ReportUpsell({ tier, onBack }: ReportUpsellProps) {
  const t = useTranslations('reports.upsell');

  // Acento por tier: PRO ambar, Contabilidad slate. Tints suaves via color-mix.
  const accent = tier === 'pro' ? '#D97706' : '#64748B';
  const accentTint = `color-mix(in srgb, ${accent} 14%, hsl(var(--card)))`;
  const tierLabel = t(`tier.${tier}`);

  // 4 beneficios genericos por tier (array i18n leido con raw, patron del codebase).
  const benefits = t.raw(`benefits.${tier}`) as string[];

  return (
    <div className="animate-fade-in">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('back')}
      </button>

      <div className="max-w-md mx-auto bg-card border border-border rounded-2xl p-8 text-center shadow-elevation-1">
        <div className="flex justify-center mb-5">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: accentTint }}
          >
            <Lock className="w-7 h-7" style={{ color: accent }} />
          </div>
        </div>

        <span
          className="inline-flex items-center py-[3px] px-2.5 rounded-md text-[10.5px] font-bold uppercase tracking-wide mb-3"
          style={{ background: accentTint, color: accent }}
        >
          {tierLabel}
        </span>

        <h3 className="text-xl font-bold text-foreground mb-2">
          {t('title', { tier: tierLabel })}
        </h3>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          {t(`description.${tier}`)}
        </p>

        <ul className="text-left space-y-2.5 mb-7">
          {benefits.map((benefit, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span
                className="w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 mt-[1px]"
                style={{ background: accentTint }}
              >
                <Check className="w-3 h-3" style={{ color: accent }} />
              </span>
              <span className="text-[13px] text-foreground leading-snug">{benefit}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2.5">
          <Link href="/subscription">
            <Button className="w-full h-11 bg-success hover:bg-success/90 text-white font-medium text-sm rounded-xl">
              {t('cta', { tier: tierLabel })}
            </Button>
          </Link>
          <Button variant="outline" className="w-full h-11 rounded-xl" onClick={onBack}>
            {t('back')}
          </Button>
        </div>
      </div>
    </div>
  );
}
