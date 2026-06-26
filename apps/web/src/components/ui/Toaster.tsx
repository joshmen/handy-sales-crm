'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  useToastStore,
  dismissToast,
  getToastDismissLabel,
  type ToastItem,
  type ToastType,
} from '@/hooks/useToast';

/**
 * Renderer del sistema de toasts "con acción". Suscribe al store, portea al
 * marco de la app ([data-dashboard]) con fallback a <body>, y dibuja cada card
 * con barra de progreso + pausa al hover. El estilo vive en globals.css
 * (#web-toasts / .web-toast*). Paleta verde semántica scoped al contenedor.
 */

const ICON_PATHS: Record<ToastType, ReactNode> = {
  success: <path d="M5 12l4 4L19 6" />,
  error: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v.01M11 12h1v5" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3l10 18H2L12 3z" />
      <path d="M12 10v4M12 17v.01" />
    </>
  ),
  loading: <path d="M21 12a9 9 0 11-6.2-8.5" />,
};

function ToastIcon({ type }: { type: ToastType }) {
  return (
    <svg
      className={type === 'loading' ? 'spin' : undefined}
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICON_PATHS[type]}
    </svg>
  );
}

function ToastCard({ item }: { item: ToastItem }) {
  const progRef = useRef<HTMLDivElement | null>(null);
  const finite = Number.isFinite(item.duration) && item.type !== 'loading';

  // Barra de progreso + auto-cierre con pausa al hover (preserva tiempo restante exacto).
  useEffect(() => {
    if (!finite || item.closing) return;
    let raf = 0;
    let start = performance.now();
    let remaining = item.duration;
    let paused = false;

    const tick = (now: number) => {
      if (paused) return;
      const left = Math.max(0, remaining - (now - start));
      if (progRef.current) progRef.current.style.transform = `scaleX(${left / item.duration})`;
      if (left <= 0) {
        dismissToast(item.id);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const el = progRef.current?.closest('.web-toast') as HTMLElement | null;
    const onEnter = () => {
      paused = true;
      remaining = Math.max(0, remaining - (performance.now() - start));
      cancelAnimationFrame(raf);
    };
    const onLeave = () => {
      paused = false;
      start = performance.now();
      raf = requestAnimationFrame(tick);
    };
    el?.addEventListener('mouseenter', onEnter);
    el?.addEventListener('mouseleave', onLeave);

    return () => {
      cancelAnimationFrame(raf);
      el?.removeEventListener('mouseenter', onEnter);
      el?.removeEventListener('mouseleave', onLeave);
    };
  }, [finite, item.id, item.duration, item.closing]);

  const act = item.action;
  const onAct = () => {
    act?.onAct();
    dismissToast(item.id);
  };

  return (
    <div className={`web-toast action ${item.type}${item.closing ? ' out' : ''}`} role="status">
      <div className="web-toast-body">
        <div className="web-toast-ic">
          <ToastIcon type={item.type} />
        </div>
        <div className="web-toast-main">
          <div className="web-toast-title">{item.title}</div>
          {item.desc ? <div className="web-toast-desc">{item.desc}</div> : null}
          {act ? (
            <div className="web-toast-actions">
              <button type="button" className="wta wta-primary" onClick={onAct}>
                {act.label}
              </button>
              {act.kind === 'view' ? (
                <button type="button" className="wta wta-ghost" onClick={() => dismissToast(item.id)}>
                  {getToastDismissLabel()}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        <button type="button" className="web-toast-x" aria-label="Cerrar" onClick={() => dismissToast(item.id)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      {finite ? <div ref={progRef} className="web-toast-prog" /> : null}
    </div>
  );
}

export function Toaster() {
  const toasts = useToastStore(s => s.toasts);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  // Hidratar el historial de toasts desde localStorage una vez (cliente). Asi el
  // historial persiste entre refrescos y esta listo para la vista en /notifications.
  useEffect(() => {
    useToastStore.getState().hydrateHistory();
  }, []);

  // El marco [data-dashboard] puede no existir en el primer render (o en páginas
  // fuera del dashboard como login). Resolver tras montar; fallback a <body>.
  useEffect(() => {
    setContainer((document.querySelector('[data-dashboard]') as HTMLElement) || document.body);
  }, []);

  if (!container) return null;

  return createPortal(
    <div id="web-toasts">
      {toasts.map(t => (
        <ToastCard key={t.id} item={t} />
      ))}
    </div>,
    container
  );
}
