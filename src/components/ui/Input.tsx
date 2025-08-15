import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: React.ReactNode; // ← NUEVO
  id?: string; // ← para asociar el label
  wrapperClassName?: string; // ← contenedor (por si quieres controlar layout)
  hint?: React.ReactNode; // ← texto de ayuda opcional
  error?: React.ReactNode; // ← mensaje de error opcional
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, id, wrapperClassName, hint, error, ...props }, ref) => {
    const describedBy: string[] = [];
    if (hint) describedBy.push(`${id}-hint`);
    if (error) describedBy.push(`${id}-error`);

    return (
      <div className={cn('flex flex-col gap-1', wrapperClassName)}>
        {label ? (
          <label htmlFor={id} className="text-sm font-medium text-gray-700">
            {label}
          </label>
        ) : null}

        <input
          id={id}
          type={type}
          ref={ref}
          aria-describedby={describedBy.length ? describedBy.join(' ') : undefined}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
            'ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium',
            'placeholder:text-muted-foreground focus-visible:outline-none',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus-visible:ring-red-500',
            className
          )}
          {...props}
        />

        {hint && !error ? (
          <p id={`${id}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        ) : null}

        {error ? (
          <p id={`${id}-error`} className="text-xs text-red-600">
            {error}
          </p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
