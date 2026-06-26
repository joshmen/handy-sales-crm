'use client';

import { create } from 'zustand';
import { translateError } from '@/lib/translateError';

/**
 * Sistema de toasts "con acción" (estilo del diseño claude.ai/design).
 * Reemplaza Sonner. Motor propio: store Zustand + singleton `toast` + hook `useToast`.
 *
 * - Apilado abajo-derecha, anclado al marco de la app (ver Toaster.tsx), máx 4 visibles.
 * - Duración por tipo: loading/error persistentes; con acción 6s; resto 4.5s.
 * - Barra de progreso + pausa al hover (en Toaster.tsx).
 * - API nueva (success/error/info/warning/loading/undo/view) + back-compat con la
 *   firma anterior (`toast({title, description, variant})` y `toast.success(msg)`).
 */

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'loading';

export interface ToastAction {
  kind: 'undo' | 'view';
  label: string;
  onAct: () => void;
}

export interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  desc?: string;
  action?: ToastAction;
  /** ms; Infinity = persistente (no auto-cierra) */
  duration: number;
  /** marcado para animación de salida antes de remover */
  closing?: boolean;
}

/** Item del historial de toasts (persiste en localStorage para revisarlos luego). */
export interface ToastHistoryItem {
  id: number;
  type: ToastType;
  title: string;
  desc?: string;
  /** epoch ms */
  time: number;
}

const HISTORY_KEY = 'handy_toast_history';
const HISTORY_MAX = 50;

function loadHistory(): ToastHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveHistory(h: ToastHistoryItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
  } catch {
    /* localStorage no disponible */
  }
}

// Marca de tiempo de la ultima vez que el usuario reviso "Mensajes de la app".
// Los toasts con time > lastSeen cuentan como "no vistos" (badge de la campanita).
const LASTSEEN_KEY = 'handy_toast_last_seen';

function loadLastSeen(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const n = Number(localStorage.getItem(LASTSEEN_KEY));
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function saveLastSeen(t: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LASTSEEN_KEY, String(t));
  } catch {
    /* localStorage no disponible */
  }
}

const MAX_VISIBLE = 4;
const EXIT_MS = 320;

// ── Store ──────────────────────────────────────────────────────────────────
interface ToastStore {
  toasts: ToastItem[];
  history: ToastHistoryItem[];
  /** epoch ms de la ultima revision de "Mensajes de la app" (para el badge). */
  lastSeen: number;
  add: (item: ToastItem) => void;
  startClose: (id: number) => void;
  remove: (id: number) => void;
  pushHistory: (item: ToastHistoryItem) => void;
  clearHistory: () => void;
  hydrateHistory: () => void;
  markHistorySeen: () => void;
}

export const useToastStore = create<ToastStore>(set => ({
  toasts: [],
  history: [],
  lastSeen: 0,
  add: item =>
    set(s => {
      // Cap a MAX_VISIBLE: descartar los más viejos si se acumulan.
      const next = [...s.toasts, item];
      return { toasts: next.length > MAX_VISIBLE ? next.slice(next.length - MAX_VISIBLE) : next };
    }),
  startClose: id =>
    set(s => ({ toasts: s.toasts.map(t => (t.id === id ? { ...t, closing: true } : t)) })),
  remove: id => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
  // Historial persistente (localStorage): mas nuevo primero, cap a HISTORY_MAX.
  // Si el store aun no se hidrato, parte de lo que haya en localStorage para no
  // pisarlo (un toast podria dispararse antes de hydrateHistory).
  pushHistory: item =>
    set(s => {
      const base = s.history.length ? s.history : loadHistory();
      const next = [item, ...base].slice(0, HISTORY_MAX);
      saveHistory(next);
      return { history: next };
    }),
  clearHistory: () =>
    set(() => {
      saveHistory([]);
      return { history: [] };
    }),
  hydrateHistory: () => set(() => ({ history: loadHistory(), lastSeen: loadLastSeen() })),
  markHistorySeen: () =>
    set(() => {
      const t = Date.now();
      saveLastSeen(t);
      return { lastSeen: t };
    }),
}));

// ── Locale (misma fuente que CompanyContext) ────────────────────────────────
export function getToastLocale(): 'es' | 'en' {
  try {
    const settings = JSON.parse(localStorage.getItem('company_settings') || '{}');
    return settings.language === 'en' ? 'en' : 'es';
  } catch {
    return 'es';
  }
}

const DEFAULT_TITLES: Record<'es' | 'en', Record<ToastType, string>> = {
  es: {
    success: 'Listo',
    error: 'Algo salió mal',
    info: 'Información',
    warning: 'Atención',
    loading: 'Procesando…',
  },
  en: {
    success: 'Done',
    error: 'Something went wrong',
    info: 'Information',
    warning: 'Attention',
    loading: 'Processing…',
  },
};

const ACTION_LABELS: Record<'es' | 'en', { undo: string; view: string; dismiss: string }> = {
  es: { undo: 'Deshacer', view: 'Ver', dismiss: 'Descartar' },
  en: { undo: 'Undo', view: 'View', dismiss: 'Dismiss' },
};

export function getToastDismissLabel(): string {
  return ACTION_LABELS[getToastLocale()].dismiss;
}

// ── Core ────────────────────────────────────────────────────────────────────
let seq = 0;

function computeDuration(type: ToastType, hasAction: boolean, explicit?: number): number {
  if (explicit != null) return explicit;
  if (type === 'loading') return Infinity;   // placeholder: persiste hasta .resolve()
  if (type === 'error') return 8000;          // el error tambien auto-cierra, con mas tiempo de lectura
  if (hasAction) return 6000;
  return 4500;
}

function showToast(input: {
  type: ToastType;
  title?: string;
  desc?: string;
  action?: ToastAction;
  duration?: number;
}): number {
  const type = input.type;
  const title = input.title || DEFAULT_TITLES[getToastLocale()][type];
  const duration = computeDuration(type, !!input.action, input.duration);
  const id = ++seq;
  const store = useToastStore.getState();
  store.add({ id, type, title, desc: input.desc, action: input.action, duration });
  // Historial: registrar todos los tipos excepto loading (placeholder; su
  // resolucion success/error si entra). Date.now() es codigo de cliente.
  if (type !== 'loading') {
    store.pushHistory({ id, type, title, desc: input.desc, time: Date.now() });
  }
  return id;
}

/** Marca el toast para salida y lo remueve tras la animación. */
export function dismissToast(id: number): void {
  const store = useToastStore.getState();
  const t = store.toasts.find(x => x.id === id);
  if (!t || t.closing) return;
  store.startClose(id);
  setTimeout(() => useToastStore.getState().remove(id), EXIT_MS);
}

// ── API singleton ────────────────────────────────────────────────────────────
type ToastReturn = { id: number; dismiss: () => void };
type LoadingReturn = ToastReturn & {
  resolve: (type: ToastType, title?: string, desc?: string, opts?: HelperOpts) => void;
};

// Opts de helper: soporta la API nueva (desc/action/duration) y la vieja
// (title/description/variant) para back-compat. `label` para undo/view.
export interface HelperOpts {
  desc?: string;
  description?: string;
  action?: ToastAction;
  duration?: number;
  label?: string;
  title?: string;
  variant?: 'default' | 'destructive';
}

interface ToastInput extends HelperOpts {
  type?: ToastType;
}

function mkHandle(id: number): ToastReturn {
  return { id, dismiss: () => dismissToast(id) };
}

/** Normaliza `(descOrOpts?, opts?)`: si el 2º arg es objeto, es opts. */
function norm(descOrOpts?: string | HelperOpts, opts?: HelperOpts): { desc?: string; o: HelperOpts } {
  if (descOrOpts && typeof descOrOpts === 'object') {
    return { desc: descOrOpts.desc ?? descOrOpts.description, o: descOrOpts };
  }
  return { desc: descOrOpts, o: opts || {} };
}

// Base: acepta API nueva { type, title, desc, action, duration } y la vieja
// { title, description, variant: 'destructive' }.
function toastBase(opts: ToastInput): ToastReturn {
  const type: ToastType = opts.type || (opts.variant === 'destructive' ? 'error' : 'success');
  let desc = opts.desc ?? opts.description;
  if (type === 'error' && desc) desc = translateError(desc);
  return mkHandle(showToast({ type, title: opts.title, desc, action: opts.action, duration: opts.duration }));
}

type ToastAPI = typeof toastBase & {
  success: (title: string, descOrOpts?: string | HelperOpts, opts?: HelperOpts) => ToastReturn;
  error: (title: string, descOrOpts?: string | HelperOpts, opts?: HelperOpts) => ToastReturn;
  info: (title: string, descOrOpts?: string | HelperOpts, opts?: HelperOpts) => ToastReturn;
  warning: (title: string, descOrOpts?: string | HelperOpts, opts?: HelperOpts) => ToastReturn;
  loading: (title: string, descOrOpts?: string | HelperOpts, opts?: HelperOpts) => LoadingReturn;
  undo: (title: string, desc: string, onUndo: () => void, opts?: HelperOpts) => ToastReturn;
  view: (title: string, desc: string, label: string, onView: () => void, opts?: HelperOpts) => ToastReturn;
};

function makeSimple(type: ToastType) {
  return (title: string, descOrOpts?: string | HelperOpts, opts?: HelperOpts): ToastReturn => {
    const { desc, o } = norm(descOrOpts, opts);
    const text = type === 'error' ? translateError(title) : title;
    return mkHandle(showToast({ type, title: text, desc, action: o.action, duration: o.duration }));
  };
}

const toast = Object.assign(toastBase, {
  success: makeSimple('success'),
  error: makeSimple('error'),
  info: makeSimple('info'),
  warning: makeSimple('warning'),
  loading: (title: string, descOrOpts?: string | HelperOpts, opts?: HelperOpts): LoadingReturn => {
    const { desc, o } = norm(descOrOpts, opts);
    const id = showToast({ type: 'loading', title, desc, duration: o.duration });
    return {
      id,
      dismiss: () => dismissToast(id),
      resolve: (rtype, rtitle, rdesc, ropts) => {
        dismissToast(id);
        setTimeout(
          () => showToast({ type: rtype, title: rtitle, desc: rdesc, action: ropts?.action, duration: ropts?.duration }),
          200
        );
      },
    };
  },
  undo: (title: string, desc: string, onUndo: () => void, opts?: HelperOpts): ToastReturn => {
    const label = opts?.label || ACTION_LABELS[getToastLocale()].undo;
    return mkHandle(
      showToast({ type: 'warning', title, desc, action: { kind: 'undo', label, onAct: onUndo }, duration: opts?.duration })
    );
  },
  view: (title: string, desc: string, label: string, onView: () => void, opts?: HelperOpts): ToastReturn => {
    const lbl = label || ACTION_LABELS[getToastLocale()].view;
    return mkHandle(
      showToast({ type: 'success', title, desc, action: { kind: 'view', label: lbl, onAct: onView }, duration: opts?.duration })
    );
  },
}) as ToastAPI;

// ── Hook (back-compat: { toast, dismiss, toasts }) ───────────────────────────
function useToast() {
  const toasts = useToastStore(s => s.toasts);
  return {
    toast,
    dismiss: (id?: number) => {
      if (id != null) dismissToast(id);
      else useToastStore.getState().toasts.forEach(t => dismissToast(t.id));
    },
    toasts,
  };
}

export { useToast, toast };
