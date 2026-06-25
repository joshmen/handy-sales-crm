import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  /** Título del error (default: "No se pudo cargar"). */
  title?: string;
  /** Mensaje descriptivo (default genérico de conexión). */
  message?: string;
  /** Callback de reintento; si se pasa, muestra botón "Reintentar". */
  onRetry?: () => void;
  /** Padding reducido para usar dentro de tarjetas/tablas. */
  compact?: boolean;
}

/**
 * Placeholder consistente para fallos de carga, con reintento. Fiel al
 * ErrorState del Claude Design (tile danger + mensaje + botón "Reintentar").
 */
export function ErrorState({
  title = 'No se pudo cargar',
  message = 'Ocurrió un problema al traer la información. Revisa tu conexión e inténtalo de nuevo.',
  onRetry,
  compact = false,
}: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center px-6 ${compact ? 'py-14' : 'py-[76px]'}`}>
      <div className="w-[60px] h-[60px] rounded-[18px] bg-destructive/10 text-destructive flex items-center justify-center mb-[18px]">
        <AlertTriangle size={28} />
      </div>
      <div className="text-[17px] font-bold tracking-tight text-foreground mb-1.5">{title}</div>
      <div className="text-[13.5px] text-muted-foreground max-w-[340px] leading-relaxed">{message}</div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-card text-foreground border border-border-strong px-4 py-2 text-[13px] font-semibold hover:bg-surface-2 transition-colors"
        >
          <RefreshCw size={15} /> Reintentar
        </button>
      )}
    </div>
  );
}
