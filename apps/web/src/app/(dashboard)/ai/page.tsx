'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { toast } from '@/hooks/useToast';
import {
  Atom, Sparkle, FileText, ChartBar, TrendUp, ChatCircle,
  Lightning, Question, PaperPlaneTilt,
  User as UserIcon, Users, MagnifyingGlass, Target,
  CalendarPlus, CurrencyDollar, MapPin, Package, CheckCircle, Warning,
} from '@phosphor-icons/react';
import { Loader2 } from 'lucide-react';
import {
  SbClients, SbBarChart, SbLightbulb, SbTrendingUp, SbSearch, SbGoals,
} from '@/components/layout/DashboardIcons';
import { queryAi, getAiCredits, getAiUsageStats, executeAiAction } from '@/services/api/ai';
import type { AiCreditBalance, AiUsageStats, AiSuggestedAction } from '@/services/api/ai';

// ─── Action type config ──────────────────────────────────────────
const ACTION_TYPES = [
  { value: 'resumen', labelKey: 'actionTypes.resumen', icon: FileText, cost: 1, color: 'emerald', descKey: 'actionTypes.resumenDesc' },
  { value: 'insight', labelKey: 'actionTypes.insight', icon: ChartBar, cost: 2, color: 'violet', descKey: 'actionTypes.insightDesc' },
  { value: 'pregunta', labelKey: 'actionTypes.pregunta', icon: ChatCircle, cost: 3, color: 'sky', descKey: 'actionTypes.preguntaDesc' },
  { value: 'pronostico', labelKey: 'actionTypes.pronostico', icon: TrendUp, cost: 5, color: 'amber', descKey: 'actionTypes.pronosticoDesc' },
] as const;

type ActionType = typeof ACTION_TYPES[number]['value'];

// ─── Suggestion chips — grouped by category ─────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SUGGESTIONS: { textKey: string; action: ActionType; icon3d: any }[] = [
  { textKey: 'suggestions.topClients', action: 'pregunta', icon3d: SbClients },
  { textKey: 'suggestions.weeklySales', action: 'resumen', icon3d: SbBarChart },
  { textKey: 'suggestions.bestMargin', action: 'insight', icon3d: SbLightbulb },
  { textKey: 'suggestions.forecast', action: 'pronostico', icon3d: SbTrendingUp },
  { textKey: 'suggestions.inactiveClients', action: 'pregunta', icon3d: SbSearch },
  { textKey: 'suggestions.vendorEffectiveness', action: 'insight', icon3d: SbGoals },
];

// ─── Message types ───────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tipoAccion?: ActionType;
  creditosUsados?: number;
  latenciaMs?: number;
  timestamp: Date;
  accionesSugeridas?: AiSuggestedAction[];
}

// ─── AI Hero icon ──
function AiHeroGem() {
  return (
    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-violet-600 dark:bg-violet-700 flex items-center justify-center">
      <Atom size={28} weight="duotone" className="text-white sm:hidden" />
      <Atom size={32} weight="duotone" className="text-white hidden sm:block" />
    </div>
  );
}

// ─── Small AI avatar for chat bubbles ────────────────────────────
function AiChatAvatar() {
  return (
    <div className="w-8 h-8 rounded-lg bg-violet-600 dark:bg-violet-700 flex items-center justify-center shrink-0 mt-1">
      <Sparkle size={14} weight="fill" className="text-white" />
    </div>
  );
}

// ─── Help tooltip ────────────────────────────────────────────────
function HelpTooltip() {
  const t = useTranslations('ai');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
    violet: 'text-violet-500 bg-violet-50 dark:bg-violet-500/10',
    sky: 'text-sky-500 bg-sky-50 dark:bg-sky-500/10',
    amber: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10',
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-violet-500 hover:border-violet-300 dark:hover:border-violet-600 transition-all duration-200 hover:shadow-sm"
        aria-label={t('helpTitle')}
      >
        <Question size={15} weight="bold" />
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl shadow-2xl shadow-black/10 p-5 text-sm animate-ai-fade-up">
          <p className="font-semibold text-gray-900 dark:text-white mb-4 text-base">{t('helpTitle')}</p>
          <div className="space-y-3">
            {ACTION_TYPES.map((a) => {
              const Icon = a.icon;
              return (
                <div key={a.value} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorMap[a.color]}`}>
                    <Icon size={16} weight="fill" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800 dark:text-gray-100">{t(a.labelKey)}</span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">{a.cost} cr</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t(a.descKey)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Welcome state — hero with animated orb + smart suggestions ─
function WelcomeState({
  onSelectSuggestion,
}: {
  onSelectSuggestion: (text: string, action: ActionType) => void;
}) {
  const t = useTranslations('ai');
  const actionColorMap: Record<string, string> = {
    resumen: 'group-hover:border-emerald-300 dark:group-hover:border-emerald-700 group-hover:shadow-emerald-500/5',
    insight: 'group-hover:border-violet-300 dark:group-hover:border-violet-700 group-hover:shadow-violet-500/5',
    pregunta: 'group-hover:border-sky-300 dark:group-hover:border-sky-700 group-hover:shadow-sky-500/5',
    pronostico: 'group-hover:border-amber-300 dark:group-hover:border-amber-700 group-hover:shadow-amber-500/5',
  };

  const actionBadgeColor: Record<string, string> = {
    resumen: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    insight: 'bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400',
    pregunta: 'bg-sky-100 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400',
    pronostico: 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-start px-3 sm:px-4 py-4 sm:py-6 relative overflow-y-auto overflow-x-hidden">
      {/* Hero icon */}
      <div className="mb-3 sm:mb-4 opacity-0 animate-ai-fade-up" style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}>
        <AiHeroGem />
      </div>

      {/* Heading */}
      <div className="text-center mb-4 sm:mb-8 opacity-0 animate-ai-fade-up" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">
          {t('howCanIHelp')}
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto px-2">
          {t('welcomeDesc')}
        </p>
      </div>

      {/* Suggestion grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 max-w-3xl w-full">
        {SUGGESTIONS.map((s, i) => {
          const actionConfig = ACTION_TYPES.find(a => a.value === s.action)!;
          const suggestionText = t(s.textKey);
          return (
            <button
              key={s.textKey}
              onClick={() => onSelectSuggestion(suggestionText, s.action)}
              className={`group text-left p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 opacity-0 animate-ai-fade-up ${actionColorMap[s.action]}`}
              style={{ animationDelay: `${200 + i * 80}ms`, animationFillMode: 'forwards' }}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-visible">
                  {React.createElement(s.icon3d, { size: 24 })}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white transition-colors line-clamp-2 leading-snug">
                    {suggestionText}
                  </span>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${actionBadgeColor[s.action]}`}>
                      {React.createElement(actionConfig.icon, { size: 10, weight: 'fill' as const })}
                      {t(actionConfig.labelKey)}
                    </span>
                    <span className="text-[10px] text-gray-400">{actionConfig.cost} cr</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── No plan gate ────────────────────────────────────────────────
function NoPlanGate() {
  const t = useTranslations('ai');
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="relative mb-8 opacity-0 animate-ai-fade-up" style={{ animationFillMode: 'forwards' }}>
        <div className="w-16 h-16 rounded-2xl bg-amber-500 dark:bg-amber-600 flex items-center justify-center">
          <Lightning size={32} weight="fill" className="text-white" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 opacity-0 animate-ai-fade-up" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
        {t('notAvailable')}
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-8 opacity-0 animate-ai-fade-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
        {t('notAvailableDesc')}
      </p>
      <div className="opacity-0 animate-ai-fade-up" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
        <Button
          onClick={() => window.location.href = '/subscription'}
          className="!rounded-xl !px-6 !py-3 !bg-violet-600 hover:!bg-violet-700 !border-0"
        >
          <Sparkle size={18} weight="fill" className="mr-2" />
          {t('viewPlans')}
        </Button>
      </div>
    </div>
  );
}

// ─── Action icon map ─────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ACTION_ICON_MAP: Record<string, any> = {
  calendar: CalendarPlus,
  money: CurrencyDollar,
  target: Target,
  route: MapPin,
  package: Package,
};

// ─── Action buttons for AI suggestions ───────────────────────────
function ActionButtons({
  actions,
  onExecute,
  executing,
}: {
  actions: AiSuggestedAction[];
  onExecute: (action: AiSuggestedAction) => void;
  executing: string | null;
}) {
  const t = useTranslations('ai');
  const [confirming, setConfirming] = useState<string | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const handleClick = (action: AiSuggestedAction) => {
    if (executing) return;

    if (confirming === action.actionId) {
      // Second click — execute
      setConfirming(null);
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      onExecute(action);
    } else {
      // First click — show confirmation
      setConfirming(action.actionId);
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirming(null), 5000);
    }
  };

  useEffect(() => {
    return () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    };
  }, []);

  return (
    <div className="flex flex-col gap-2 mt-3">
      <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">{t('suggestedActions')}</p>
      {actions.map((action) => {
        const Icon = ACTION_ICON_MAP[action.icon] || Lightning;
        const isConfirming = confirming === action.actionId;
        const isExecuting = executing === action.actionId;

        return (
          <button
            key={action.actionId}
            onClick={() => handleClick(action)}
            disabled={!!executing}
            className={`group flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg border transition-all duration-200 ${
              isConfirming
                ? 'border-amber-500 dark:border-amber-500 bg-amber-50 dark:bg-amber-950/40 ring-1 ring-amber-500/30'
                : isExecuting
                  ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 cursor-wait'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
            } ${executing && !isExecuting ? 'opacity-40 cursor-not-allowed' : ''}`}
            style={!isConfirming && !isExecuting ? {
              borderLeftWidth: '3px',
              borderLeftColor: 'var(--company-primary-color, #16A34A)',
            } : undefined}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                isConfirming ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' : ''
              }`}
              style={!isConfirming ? {
                backgroundColor: 'color-mix(in srgb, var(--company-primary-color, #16A34A) 12%, transparent)',
                color: 'var(--company-primary-color, #16A34A)',
              } : undefined}
            >
              {isExecuting ? (
                <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
              ) : isConfirming ? (
                <Warning size={16} weight="fill" />
              ) : (
                <Icon size={16} weight="duotone" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {isConfirming ? t('confirmAction') : action.label}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {isConfirming ? t('clickToExecute', { cost: action.creditCost }) : action.description}
              </div>
            </div>
            {!isConfirming && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 shrink-0">
                {action.creditCost} cr
              </span>
            )}
            {isConfirming && (
              <span className="text-[10px] font-bold px-2 py-1 rounded bg-amber-500 text-white shrink-0 animate-pulse">
                {t('confirmLabel')}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Chat message bubble ─────────────────────────────────────────
function MessageBubble({ message, isLatest, onActionExecute, executingAction }: { message: ChatMessage; isLatest: boolean; onActionExecute: (action: AiSuggestedAction) => void; executingAction: string | null }) {
  const t = useTranslations('ai');
  const isUser = message.role === 'user';
  const actionConfig = message.tipoAccion
    ? ACTION_TYPES.find((a) => a.value === message.tipoAccion)
    : null;

  const actionBadgeColor: Record<string, string> = {
    resumen: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    insight: 'bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400',
    pregunta: 'bg-sky-100 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400',
    pronostico: 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} ${isLatest ? 'animate-ai-fade-up' : ''}`}>
      {/* Assistant avatar */}
      {!isUser && <AiChatAvatar />}

      <div className={`max-w-[85%] sm:max-w-[75%] min-w-0 ${isUser ? 'order-first' : ''}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'bg-violet-600 text-white rounded-br-md shadow-sm'
              : 'bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/60 text-gray-800 dark:text-gray-200 rounded-bl-md shadow-sm'
          }`}
        >
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
        </div>

        {/* Metadata line for assistant messages */}
        {!isUser && (actionConfig || message.latenciaMs) && (
          <div className="flex items-center gap-2 mt-1.5 px-1">
            {actionConfig && message.tipoAccion && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${actionBadgeColor[message.tipoAccion]}`}>
                {React.createElement(actionConfig.icon, { size: 10, weight: 'fill' as const })}
                {t(actionConfig.labelKey)}
              </span>
            )}
            {message.creditosUsados != null && (
              <span className="text-[10px] text-gray-400 font-medium">
                {message.creditosUsados} cr
              </span>
            )}
            {message.latenciaMs != null && (
              <span className="text-[10px] text-gray-400">
                {(message.latenciaMs / 1000).toFixed(1)}s
              </span>
            )}
          </div>
        )}

        {/* AI suggested actions */}
        {!isUser && message.accionesSugeridas && message.accionesSugeridas.length > 0 && (
          <ActionButtons
            actions={message.accionesSugeridas}
            onExecute={onActionExecute}
            executing={executingAction}
          />
        )}

        {/* Timestamp for user messages */}
        {isUser && (
          <div className="text-right mt-1 px-1">
            <span className="text-[10px] text-gray-400">
              {message.timestamp.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center shrink-0 mt-1 shadow-sm">
          <UserIcon size={15} weight="fill" className="text-gray-500 dark:text-gray-300" />
        </div>
      )}
    </div>
  );
}

// ─── Typing indicator ────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex gap-3 justify-start animate-ai-fade-up">
      <AiChatAvatar />
      <div className="bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/60 rounded-2xl rounded-bl-md px-5 py-3.5 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-violet-400 dark:bg-violet-500 animate-ai-dot-pulse" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-blue-400 dark:bg-blue-500 animate-ai-dot-pulse" style={{ animationDelay: '200ms' }} />
          <span className="w-2 h-2 rounded-full bg-cyan-400 dark:bg-cyan-500 animate-ai-dot-pulse" style={{ animationDelay: '400ms' }} />
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════
export default function AiPage() {
  const t = useTranslations('ai');
  const tc = useTranslations('common');
  const [credits, setCredits] = useState<AiCreditBalance | null>(null);
  const [, setStats] = useState<AiUsageStats | null>(null);
  const [selectedAction, setSelectedAction] = useState<ActionType>('pregunta');
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCredits, setLoadingCredits] = useState(true);
  const [inputFocused, setInputFocused] = useState(false);
  const [executingAction, setExecutingAction] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Load credits ───────────────────────────────────────────────
  const loadCredits = useCallback(async () => {
    try {
      const [balance, usageStats] = await Promise.all([getAiCredits(), getAiUsageStats()]);
      setCredits(balance);
      setStats(usageStats);
    } catch { /* non-PRO tenants */ }
    finally { setLoadingCredits(false); }
  }, []);

  useEffect(() => { loadCredits(); }, [loadCredits]);

  // ── Auto-scroll to bottom ─────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ── Auto-resize textarea ──────────────────────────────────────
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
    }
  }, [prompt]);

  // ── Submit message ────────────────────────────────────────────
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = prompt.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      tipoAccion: selectedAction,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setPrompt('');
    setLoading(true);

    try {
      const result = await queryAi({
        tipoAccion: selectedAction,
        prompt: text,
      });

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.respuesta,
        tipoAccion: selectedAction,
        creditosUsados: result.creditosUsados,
        latenciaMs: result.latenciaMs,
        timestamp: new Date(),
        accionesSugeridas: result.accionesSugeridas,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setCredits((prev) =>
        prev
          ? { ...prev, disponibles: result.creditosRestantes, usados: prev.usados + result.creditosUsados }
          : prev
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('errorProcessing'));
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: t('errorMessage'),
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ── Handle action execute ────────────────────────────────────
  const handleActionExecute = async (action: AiSuggestedAction) => {
    setExecutingAction(action.actionId);
    try {
      const result = await executeAiAction({
        actionId: action.actionId,
        actionType: action.actionType,
      });

      const resultMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.message,
        creditosUsados: result.creditosUsados,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, resultMsg]);

      if (result.creditosRestantes > 0) {
        setCredits((prev) =>
          prev
            ? { ...prev, disponibles: result.creditosRestantes, usados: prev.usados + result.creditosUsados }
            : prev
        );
      }

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('errorExecuting'));
    } finally {
      setExecutingAction(null);
    }
  };

  // ── Handle suggestion click ───────────────────────────────────
  const handleSuggestion = (text: string, action: ActionType) => {
    setSelectedAction(action);
    setPrompt(text);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  // ── Handle keyboard shortcut ──────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // ── Derived state ─────────────────────────────────────────────
  const selectedActionConfig = ACTION_TYPES.find((a) => a.value === selectedAction)!;
  const hasCredits = credits && credits.disponibles > 0;
  const noPlan = !loadingCredits && credits && (credits.plan === 'free' || credits.plan === 'basico');
  const hasMessages = messages.length > 0;

  const actionPillColors: Record<string, { active: string; inactive: string }> = {
    resumen: {
      active: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-300 dark:ring-emerald-700 shadow-sm shadow-emerald-500/10',
      inactive: 'bg-gray-50 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/5 hover:text-emerald-600 dark:hover:text-emerald-400',
    },
    insight: {
      active: 'bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 ring-1 ring-violet-300 dark:ring-violet-700 shadow-sm shadow-violet-500/10',
      inactive: 'bg-gray-50 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 hover:bg-violet-50 dark:hover:bg-violet-500/5 hover:text-violet-600 dark:hover:text-violet-400',
    },
    pregunta: {
      active: 'bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 ring-1 ring-sky-300 dark:ring-sky-700 shadow-sm shadow-sky-500/10',
      inactive: 'bg-gray-50 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 hover:bg-sky-50 dark:hover:bg-sky-500/5 hover:text-sky-600 dark:hover:text-sky-400',
    },
    pronostico: {
      active: 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-1 ring-amber-300 dark:ring-amber-700 shadow-sm shadow-amber-500/10',
      inactive: 'bg-gray-50 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 hover:bg-amber-50 dark:hover:bg-amber-500/5 hover:text-amber-600 dark:hover:text-amber-400',
    },
  };

  return (
    <PageHeader
      breadcrumbs={[
        { label: tc('home'), href: '/dashboard' },
        { label: t('title') },
      ]}
      title={t('title')}
      subtitle={t('subtitle')}
    >
      {/* Container — full height chat layout */}
      <div className="flex flex-col h-[calc(100vh-180px)] sm:h-[calc(100vh-220px)] min-h-[400px] sm:min-h-[500px]">

        {/* ── Top bar: Credit pill + Help ─────────────────────── */}
        {!noPlan && (
          <div className="flex items-center justify-end gap-2.5 pb-3">
            {!loadingCredits && credits && (
              <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/60 dark:border-gray-700/60 text-sm shadow-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center">
                    <Lightning size={11} weight="fill" className="text-white" />
                  </div>
                  <span className="font-bold text-gray-900 dark:text-white tabular-nums">
                    {credits.disponibles}
                  </span>
                  <span className="text-gray-400 text-xs">{t('credits')}</span>
                </div>
                <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
                <span className="text-xs font-medium text-violet-600 dark:text-violet-400 capitalize">{credits.plan}</span>
              </div>
            )}
            <HelpTooltip />
          </div>
        )}

        {/* ── Main content area ───────────────────────────────── */}
        {loadingCredits ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-violet-200 dark:border-violet-800 border-t-violet-500 animate-spin" />
            </div>
            <p className="text-sm text-gray-400">{t('loadingAssistant')}</p>
          </div>
        ) : noPlan ? (
          <NoPlanGate />
        ) : !hasMessages ? (
          <WelcomeState onSelectSuggestion={handleSuggestion} />
        ) : (
          /* ── Chat messages ──────────────────────────────────── */
          <div className="flex-1 overflow-y-auto px-1 pb-4 space-y-4 scroll-smooth">
            {messages.map((msg, idx) => (
              <MessageBubble key={msg.id} message={msg} isLatest={idx >= messages.length - 2} onActionExecute={handleActionExecute} executingAction={executingAction} />
            ))}
            {loading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* ── Input bar ───────────────────────────────────────── */}
        {!noPlan && !loadingCredits && (
          <div className="mt-auto pt-3">
            {/* Action type pills */}
            <div className="flex items-center gap-1 sm:gap-1.5 mb-2 sm:mb-3 flex-wrap">
              {ACTION_TYPES.map((action) => {
                const Icon = action.icon;
                const isSelected = selectedAction === action.value;
                return (
                  <button
                    key={action.value}
                    onClick={() => setSelectedAction(action.value)}
                    className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold transition-all duration-200 ${
                      isSelected
                        ? actionPillColors[action.value].active
                        : actionPillColors[action.value].inactive
                    }`}
                  >
                    <Icon size={13} weight={isSelected ? 'fill' : 'regular'} />
                    {t(action.labelKey)}
                    <span className="text-[10px] opacity-60">{action.cost}cr</span>
                  </button>
                );
              })}
            </div>

            {/* Input row with gradient border effect */}
            <form onSubmit={handleSubmit} className="relative">
              <div className={`relative rounded-2xl transition-all duration-300 ${
                inputFocused
                  ? 'shadow-lg shadow-violet-500/10 ring-2 ring-violet-400/30 dark:ring-violet-500/20'
                  : 'shadow-sm'
              }`}>
                {/* (focus ring handled by parent shadow) */}
                <div className="relative flex items-end gap-1.5 sm:gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-1.5 sm:p-2 pl-3 sm:pl-4">
                  <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    placeholder={t(`placeholders.${selectedAction}`)}
                    rows={1}
                    maxLength={2000}
                    className="flex-1 py-2 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none resize-none text-sm leading-relaxed"
                  />
                  <Button
                    type="submit"
                    disabled={!prompt.trim() || loading || !hasCredits}
                    className={`!rounded-xl !p-2.5 shrink-0 transition-all duration-200 ${
                      prompt.trim() && !loading
                        ? '!bg-violet-600 hover:!bg-violet-700 !border-0 !shadow-sm'
                        : ''
                    }`}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <PaperPlaneTilt size={18} weight="fill" />
                    )}
                  </Button>
                </div>
              </div>
            </form>

            {/* Cost hint */}
            <div className="flex items-center justify-between mt-1.5 sm:mt-2 px-1 sm:px-2">
              <p className="text-[10px] sm:text-[11px] text-gray-400">
                <span className="inline-flex items-center gap-1">
                  {React.createElement(selectedActionConfig.icon, { size: 10, weight: 'fill' as const })}
                  {selectedActionConfig.cost} cr
                </span>
                {credits && (
                  <span className="ml-1">· {credits.disponibles} {t('available')}</span>
                )}
              </p>
              <p className="text-[10px] sm:text-[11px] text-gray-400 hidden sm:block">
                <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[10px] font-mono">Enter</kbd>
                <span className="ml-1">{t('send')}</span>
                <span className="hidden lg:inline ml-2">
                  <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[10px] font-mono">Shift+Enter</kbd>
                  <span className="ml-1">{t('newLine')}</span>
                </span>
              </p>
            </div>
          </div>
        )}
      </div>
    </PageHeader>
  );
}
