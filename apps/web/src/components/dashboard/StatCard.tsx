import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

/**
 * StatCard — tarjeta KPI canónica, calco del diseño Claude Design (web-components.jsx).
 * Tile de ícono neutro + valor grande (Figtree 800, 28px, con color por tono) + chip de delta.
 *
 * Paleta = "azul de marca" (rebrand): los valores positivos/primarios van en AZUL, no verde.
 * Los deltas de tendencia (↑/↓) sí usan verde/rojo (convención data-viz).
 */

export type StatTone = 'default' | 'primary' | 'success' | 'warning' | 'danger';
export type StatDeltaTone = 'success' | 'danger' | 'neutral';

export interface StatCardProps {
  label: string;
  value: string | number;
  /** Color del VALUE. `success` se mapea a azul (rebrand), no verde. */
  tone?: StatTone;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  /** Alternativa a `icon`: un nodo ya renderizado (ej. un <Icon/> con props). */
  iconNode?: React.ReactNode;
  /** Texto del delta, ej. "12%". Si se omite, se muestra `sub` (si existe). */
  delta?: string;
  deltaTone?: StatDeltaTone;
  /** Sufijo del delta, ej. "vs período anterior" (lo provee el caller con i18n). */
  deltaLabel?: string;
  /** Línea secundaria cuando no hay delta, ej. "de 500". */
  sub?: string;
  loading?: boolean;
  className?: string;
}

/** Color del VALUE por tono (azul de marca: success = azul, sin verde). */
const TONE_VALUE: Record<StatTone, string> = {
  default: 'text-foreground',
  primary: 'text-primary',
  success: 'text-primary',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-red-600 dark:text-red-400',
};

/** Color del chip de delta (data-viz: verde positivo, rojo negativo). */
const DELTA_COLOR: Record<StatDeltaTone, string> = {
  success: 'text-emerald-600 dark:text-emerald-400',
  danger: 'text-red-600 dark:text-red-400',
  neutral: 'text-muted-foreground',
};

export function StatCard({
  label,
  value,
  tone = 'default',
  icon: Icon,
  iconNode,
  delta,
  deltaTone = 'neutral',
  deltaLabel,
  sub,
  loading = false,
  className = '',
}: StatCardProps) {
  return (
    <div className={`bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-semibold text-muted-foreground">{label}</span>
        {(Icon || iconNode) && (
          <div className="w-[34px] h-[34px] rounded-[10px] bg-muted text-muted-foreground flex items-center justify-center flex-shrink-0">
            {Icon ? <Icon size={18} /> : iconNode}
          </div>
        )}
      </div>

      {loading ? (
        <div className="mt-2.5 h-7 w-20 rounded-md bg-muted animate-pulse" />
      ) : (
        <div className={`mt-2.5 text-[28px] font-extrabold tracking-tight tabular-nums leading-none ${TONE_VALUE[tone]}`}>
          {value}
        </div>
      )}

      {delta ? (
        <div className="mt-2 flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${DELTA_COLOR[deltaTone]}`}>
            {deltaTone === 'success' ? (
              <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
            ) : deltaTone === 'danger' ? (
              <TrendingDown className="w-3.5 h-3.5" aria-hidden="true" />
            ) : null}
            {delta}
          </span>
          {deltaLabel && <span className="text-xs text-muted-foreground/70">{deltaLabel}</span>}
        </div>
      ) : sub ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>
      ) : null}
    </div>
  );
}

export default StatCard;
