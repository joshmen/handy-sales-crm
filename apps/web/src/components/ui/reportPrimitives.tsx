import * as React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Primitivos locales que reemplazan a @tremor/react en los reportes
 * (components/reports/*). Replican la API que esos archivos usaban de Tremor
 * (Card con decoration, Metric, Text, Flex, BadgeDelta) sobre los tokens del
 * design system, para poder eliminar la dependencia @tremor/react del bundle
 * sin reescribir cada reporte. Ver tasks/todo.md (WS-B / Plan 017).
 */

type DecorationColor =
  | 'emerald'
  | 'green'
  | 'blue'
  | 'cyan'
  | 'violet'
  | 'rose'
  | 'amber'
  | 'red'
  | 'gray';

const decorationTopBorder: Record<DecorationColor, string> = {
  emerald: 'border-t-emerald-500',
  green: 'border-t-green-500',
  blue: 'border-t-blue-500',
  cyan: 'border-t-cyan-500',
  violet: 'border-t-violet-500',
  rose: 'border-t-rose-500',
  amber: 'border-t-amber-500',
  red: 'border-t-red-500',
  gray: 'border-t-gray-400',
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  decoration?: 'top';
  decorationColor?: DecorationColor;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, decoration, decorationColor = 'gray', children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'w-full max-w-full overflow-hidden rounded-xl border border-border-subtle bg-surface-2 p-6 text-card-foreground shadow-elevation-1',
        decoration === 'top' && cn('border-t-4', decorationTopBorder[decorationColor]),
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
Card.displayName = 'ReportCard';

export function Metric({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-3xl font-semibold tracking-tight text-foreground', className)} {...props} />;
}

export function Text({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

type FlexJustify = 'start' | 'end' | 'center' | 'between' | 'around';
type FlexAlign = 'start' | 'end' | 'center' | 'baseline' | 'stretch';

const justifyMap: Record<FlexJustify, string> = {
  start: 'justify-start',
  end: 'justify-end',
  center: 'justify-center',
  between: 'justify-between',
  around: 'justify-around',
};
const alignMap: Record<FlexAlign, string> = {
  start: 'items-start',
  end: 'items-end',
  center: 'items-center',
  baseline: 'items-baseline',
  stretch: 'items-stretch',
};

export interface FlexProps extends React.HTMLAttributes<HTMLDivElement> {
  justifyContent?: FlexJustify;
  alignItems?: FlexAlign;
}

export function Flex({
  className,
  justifyContent = 'between',
  alignItems = 'center',
  ...props
}: FlexProps) {
  return (
    <div
      className={cn('flex w-full', justifyMap[justifyContent], alignMap[alignItems], className)}
      {...props}
    />
  );
}

export interface BadgeDeltaProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  deltaType?: 'increase' | 'moderateIncrease' | 'decrease' | 'moderateDecrease' | 'unchanged';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  children?: React.ReactNode;
}

const badgeSizeMap: Record<NonNullable<BadgeDeltaProps['size']>, string> = {
  xs: 'text-xs px-2 py-0.5',
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1',
  xl: 'text-lg px-3.5 py-1.5',
};

export function BadgeDelta({
  className,
  deltaType = 'increase',
  size = 'sm',
  children,
  ...props
}: BadgeDeltaProps) {
  const isDown = deltaType === 'decrease' || deltaType === 'moderateDecrease';
  const Icon = isDown ? TrendingDown : TrendingUp;
  const iconClass = size === 'lg' || size === 'xl' ? 'w-4 h-4' : 'w-3 h-3';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        isDown
          ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400'
          : 'bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary',
        badgeSizeMap[size],
        className
      )}
      {...props}
    >
      <Icon className={iconClass} />
      {children}
    </span>
  );
}
