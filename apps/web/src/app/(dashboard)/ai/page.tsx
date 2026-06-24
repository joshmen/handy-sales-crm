'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { toast } from '@/hooks/useToast';
import {
  Loader2,
  Atom, Sparkles, FileText, BarChart3, TrendingUp, MessageCircle,
  Zap, CircleHelp, Send,
  User as UserIcon, Target,
  CalendarPlus, DollarSign, MapPin, Package, AlertTriangle,
  Wallet, Users, ShoppingCart, Plus, MessageSquare,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  SbClients, SbBarChart, SbLightbulb, SbTrendingUp, SbSearch, SbGoals,
} from '@/components/layout/DashboardIcons';
import { queryAi, getAiCredits, getAiUsageStats, executeAiAction } from '@/services/api/ai';
import type { AiCreditBalance, AiUsageStats, AiSuggestedAction } from '@/services/api/ai';
import { matchLocal, AI_INSIGHTS, type MatchListItem, type MatchNavAction, type AiInsight } from './_matcher';

// ─── Action type config ──────────────────────────────────────────
const ACTION_TYPES = [
  { value: 'resumen', labelKey: 'actionTypes.resumen', icon: FileText, cost: 1, color: 'emerald', descKey: 'actionTypes.resumenDesc' },
  { value: 'insight', labelKey: 'actionTypes.insight', icon: BarChart3, cost: 2, color: 'violet', descKey: 'actionTypes.insightDesc' },
  { value: 'pregunta', labelKey: 'actionTypes.pregunta', icon: MessageCircle, cost: 3, color: 'sky', descKey: 'actionTypes.preguntaDesc' },
  { value: 'pronostico', labelKey: 'actionTypes.pronostico', icon: TrendingUp, cost: 5, color: 'amber', descKey: 'actionTypes.pronosticoDesc' },
] as const;

type ActionType = typeof ACTION_TYPES[number]['value'];

// ─── Suggestion chips — grouped by category ─────────────────────
const SUGGESTIONS: { textKey: string; action: ActionType; icon3d: React.ComponentType<{ size?: number; className?: string }> }[] = [
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
  list?: MatchListItem[];
  navActions?: MatchNavAction[];
}

// ─── AI Hero icon ──
function AiHeroGem() {
  return (
    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary flex items-center justify-center">
      <Atom size={28} className="text-primary-foreground sm:hidden" />
      <Atom size={32} className="text-primary-foreground hidden sm:block" />
    </div>
  );
}

// ─── Small AI avatar for chat bubbles ────────────────────────────
function AiChatAvatar() {
  return (
    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 mt-1">
      <Sparkles size={14} className="text-primary-foreground" />
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
    emerald: 'text-primary bg-primary/10',
    violet: 'text-violet-500 bg-violet-50 dark:bg-violet-500/10',
    sky: 'text-sky-500 bg-sky-50 dark:bg-sky-500/10',
    amber: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10',
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-8 h-8 rounded-full border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-all duration-200 hover:shadow-sm"
        aria-label={t('helpTitle')}
      >
        <CircleHelp size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl shadow-black/10 p-5 text-sm animate-ai-fade-up">
          <p className="font-semibold text-foreground dark:text-white mb-4 text-base">{t('helpTitle')}</p>
          <div className="space-y-3">
            {ACTION_TYPES.map((a) => {
              const Icon = a.icon;
              return (
                <div key={a.value} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorMap[a.color]}`}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground dark:text-gray-100">{t(a.labelKey)}</span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-surface-3 dark:bg-gray-800 text-muted-foreground dark:text-muted-foreground">{a.cost} {t('creditUnit')}</span>
                    </div>
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-0.5">{t(a.descKey)}</p>
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
    resumen: 'group-hover:border-primary/40 group-hover:shadow-primary/5',
    insight: 'group-hover:border-violet-300 dark:group-hover:border-violet-700 group-hover:shadow-violet-500/5',
    pregunta: 'group-hover:border-sky-300 dark:group-hover:border-sky-700 group-hover:shadow-sky-500/5',
    pronostico: 'group-hover:border-amber-300 dark:group-hover:border-amber-700 group-hover:shadow-amber-500/5',
  };

  const actionBadgeColor: Record<string, string> = {
    resumen: 'bg-primary/10 text-primary',
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
        <h2 className="text-xl sm:text-2xl font-bold text-foreground dark:text-white mb-1 sm:mb-2">
          {t('howCanIHelp')}
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground dark:text-muted-foreground max-w-md mx-auto px-2">
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
              className={`group text-left p-3 sm:p-4 rounded-2xl border border-border bg-card hover:bg-surface-1 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 opacity-0 animate-ai-fade-up ${actionColorMap[s.action]}`}
              style={{ animationDelay: `${200 + i * 80}ms`, animationFillMode: 'forwards' }}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-visible">
                  {React.createElement(s.icon3d, { size: 24 })}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-foreground/80 dark:text-gray-300 group-hover:text-foreground dark:group-hover:text-white transition-colors line-clamp-2 leading-snug">
                    {suggestionText}
                  </span>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${actionBadgeColor[s.action]}`}>
                      {React.createElement(actionConfig.icon, { size: 10 })}
                      {t(actionConfig.labelKey)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{actionConfig.cost} {t('creditUnit')}</span>
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

// ─── Action icon map ─────────────────────────────────────────────
const ACTION_ICON_MAP: Record<string, LucideIcon> = {
  calendar: CalendarPlus,
  money: DollarSign,
  target: Target,
  route: MapPin,
  package: Package,
};

// ─── Nav action icon map (local matcher) ─────────────────────────
const NAV_ICONS: Record<string, LucideIcon> = {
  wallet: Wallet,
  package: Package,
  users: Users,
  route: MapPin,
  chart: BarChart3,
  cart: ShoppingCart,
};

// ─── Insight tone config (local matcher) ─────────────────────────
const INSIGHT_TONE: Record<AiInsight['tone'], string> = {
  primary: '#0176D3',
  warning: '#D97706',
  danger: '#EF4444',
};

const INSIGHT_ICONS: Record<AiInsight['icon'], LucideIcon> = {
  users: Users,
  trending: TrendingUp,
  package: Package,
};

// Initials from a name: "Carlos Mendoza" → "CM"
function initialsOf(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

// ─── Proactive insight cards ─────────────────────────────────────
function InsightsRow({ onAsk }: { onAsk: (question: string) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
      {AI_INSIGHTS.map((insight) => {
        const Icon = INSIGHT_ICONS[insight.icon];
        const color = INSIGHT_TONE[insight.tone];
        return (
          <button
            key={insight.id}
            onClick={() => onAsk(insight.question)}
            className="group text-left bg-card border border-border rounded-2xl p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            style={{ borderLeftWidth: 3, borderLeftColor: color }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
                  color,
                }}
              >
                <Icon size={17} />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm text-foreground dark:text-white">{insight.title}</div>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-0.5">{insight.desc}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

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
      <p className="text-[11px] font-semibold text-muted-foreground dark:text-muted-foreground">{t('suggestedActions')}</p>
      {actions.map((action) => {
        const Icon = ACTION_ICON_MAP[action.icon] || Zap;
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
                  ? 'border-border bg-surface-1 cursor-wait'
                  : 'border-border bg-card hover:border-primary/40 hover:shadow-sm'
            } ${executing && !isExecuting ? 'opacity-40 cursor-not-allowed' : ''}`}
            style={!isConfirming && !isExecuting ? {
              borderLeftWidth: '3px',
              borderLeftColor: 'var(--company-primary-color, #0176D3)',
            } : undefined}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                isConfirming ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' : ''
              }`}
              style={!isConfirming ? {
                backgroundColor: 'color-mix(in srgb, var(--company-primary-color, #0176D3) 12%, transparent)',
                color: 'var(--company-primary-color, #0176D3)',
              } : undefined}
            >
              {isExecuting ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : isConfirming ? (
                <AlertTriangle size={16} />
              ) : (
                <Icon size={16} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground dark:text-gray-300">
                {isConfirming ? t('confirmAction') : action.label}
              </div>
              <div className="text-xs text-muted-foreground dark:text-muted-foreground truncate">
                {isConfirming ? t('clickToExecute', { cost: action.creditCost }) : action.description}
              </div>
            </div>
            {!isConfirming && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-surface-3 dark:bg-gray-800 text-muted-foreground dark:text-muted-foreground shrink-0">
                {action.creditCost} {t('creditUnit')}
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
function MessageBubble({ message, isLatest, onActionExecute, executingAction, onNavigate }: { message: ChatMessage; isLatest: boolean; onActionExecute: (action: AiSuggestedAction) => void; executingAction: string | null; onNavigate: (href: string) => void }) {
  const t = useTranslations('ai');
  const locale = useLocale();
  const isUser = message.role === 'user';
  const actionConfig = message.tipoAccion
    ? ACTION_TYPES.find((a) => a.value === message.tipoAccion)
    : null;

  const actionBadgeColor: Record<string, string> = {
    resumen: 'bg-primary/10 text-primary',
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
              ? 'bg-primary text-primary-foreground rounded-br-md shadow-sm'
              : 'bg-card border border-border text-foreground rounded-bl-md shadow-sm'
          }`}
        >
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
        </div>

        {/* Local matcher list (assistant only) */}
        {!isUser && message.list && message.list.length > 0 && (
          <div className="mt-2 rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden shadow-sm">
            {message.list.map((item, i) => (
              <div key={`${item.name}-${i}`} className="flex items-center gap-3 px-3 py-2.5">
                <div className="w-8 h-8 rounded-full bg-surface-2 text-muted-foreground flex items-center justify-center shrink-0 text-[11px] font-semibold">
                  {initialsOf(item.name)}
                </div>
                <span className="flex-1 min-w-0 text-sm font-medium text-foreground dark:text-gray-200 truncate">
                  {item.name}
                </span>
                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold text-foreground dark:text-white tabular-nums">{item.value}</div>
                  {item.sub && (
                    <div className="text-[10px] text-muted-foreground dark:text-muted-foreground">{item.sub}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Local matcher nav actions (assistant only) */}
        {!isUser && message.navActions && message.navActions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            {message.navActions.map((action, i) => {
              const Icon = action.icon ? NAV_ICONS[action.icon] || Sparkles : Sparkles;
              return (
                <Button
                  key={`${action.href}-${i}`}
                  variant="wbOutline"
                  size="sm"
                  onClick={() => onNavigate(action.href)}
                >
                  <Icon size={14} className="mr-1.5" />
                  {action.label}
                </Button>
              );
            })}
          </div>
        )}

        {/* Metadata line for assistant messages */}
        {!isUser && (actionConfig || message.latenciaMs) && (
          <div className="flex items-center gap-2 mt-1.5 px-1">
            {actionConfig && message.tipoAccion && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${actionBadgeColor[message.tipoAccion]}`}>
                {React.createElement(actionConfig.icon, { size: 10 })}
                {t(actionConfig.labelKey)}
              </span>
            )}
            {message.creditosUsados != null && (
              <span className="text-[10px] text-muted-foreground font-medium">
                {message.creditosUsados} {t('creditUnit')}
              </span>
            )}
            {message.latenciaMs != null && (
              <span className="text-[10px] text-muted-foreground">
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
            <span className="text-[10px] text-muted-foreground">
              {message.timestamp.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center shrink-0 mt-1 shadow-sm">
          <UserIcon size={15} className="text-muted-foreground dark:text-muted-foreground/60" />
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
      <div className="bg-card border border-border rounded-2xl rounded-bl-md px-5 py-3.5 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary animate-ai-dot-pulse" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-primary/70 animate-ai-dot-pulse" style={{ animationDelay: '200ms' }} />
          <span className="w-2 h-2 rounded-full bg-primary/40 animate-ai-dot-pulse" style={{ animationDelay: '400ms' }} />
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
  const router = useRouter();
  const [credits, setCredits] = useState<AiCreditBalance | null>(null);
  const [, setStats] = useState<AiUsageStats | null>(null);
  const [selectedAction, setSelectedAction] = useState<ActionType>('pregunta');
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<{ id: string; title: string }[]>([]);
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

  // ── Derived: does this tenant lack an AI plan? (local demo mode) ─
  const isNoPlan = !loadingCredits && !!credits && (credits.plan === 'free' || credits.plan === 'basico');

  // ── Submit message (hybrid: local matcher OR real backend) ─────
  const submitPrompt = async (text: string, action: ActionType) => {
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      tipoAccion: action,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    // ── Local demo mode (no AI plan): keyword matcher, no credits ──
    if (isNoPlan) {
      setTimeout(() => {
        const match = matchLocal(text);
        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: match.content,
          list: match.list,
          navActions: match.actions,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setLoading(false);
      }, 600);
      return;
    }

    // ── Real backend path (unchanged) ────────────────────────────
    try {
      const result = await queryAi({
        tipoAccion: action,
        prompt: text,
      });

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.respuesta,
        tipoAccion: action,
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

  // ── Submit handler (form / Enter) ─────────────────────────────
  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = prompt.trim();
    if (!text || loading) return;
    setPrompt('');
    submitPrompt(text, selectedAction);
  };

  // ── Start a new conversation (presentation-only history) ──────
  const newConversation = () => {
    const firstUser = messages.find((m) => m.role === 'user');
    if (firstUser) {
      setConversations((prev) => [{ id: crypto.randomUUID(), title: firstUser.content }, ...prev]);
    }
    setMessages([]);
    setPrompt('');
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

  // ── Handle suggestion click (immediately asks + answers) ──────
  const handleSuggestion = (text: string, action: ActionType) => {
    setSelectedAction(action);
    submitPrompt(text, action);
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
  const noPlan = isNoPlan;
  const hasMessages = messages.length > 0;

  const actionPillColors: Record<string, { active: string; inactive: string }> = {
    resumen: {
      active: 'bg-primary/10 text-primary ring-1 ring-primary/30 shadow-sm shadow-primary/10',
      inactive: 'bg-surface-1 text-muted-foreground hover:bg-primary/5 hover:text-primary',
    },
    insight: {
      active: 'bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 ring-1 ring-violet-300 dark:ring-violet-700 shadow-sm shadow-violet-500/10',
      inactive: 'bg-surface-1 dark:bg-gray-800 text-muted-foreground dark:text-muted-foreground hover:bg-violet-50 dark:hover:bg-violet-500/5 hover:text-violet-600 dark:hover:text-violet-400',
    },
    pregunta: {
      active: 'bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 ring-1 ring-sky-300 dark:ring-sky-700 shadow-sm shadow-sky-500/10',
      inactive: 'bg-surface-1 dark:bg-gray-800 text-muted-foreground dark:text-muted-foreground hover:bg-sky-50 dark:hover:bg-sky-500/5 hover:text-sky-600 dark:hover:text-sky-400',
    },
    pronostico: {
      active: 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-1 ring-amber-300 dark:ring-amber-700 shadow-sm shadow-amber-500/10',
      inactive: 'bg-surface-1 dark:bg-gray-800 text-muted-foreground dark:text-muted-foreground hover:bg-amber-50 dark:hover:bg-amber-500/5 hover:text-amber-600 dark:hover:text-amber-400',
    },
  };

  return (
    <PageHeader
      section="herramientas"
      icon={Sparkles}
      breadcrumbs={[
        { label: tc('home'), href: '/dashboard' },
        { label: t('title') },
      ]}
      title={t('title')}
      subtitle={t('subtitle')}
    >
      {/* Container — full height chat layout (rail + chat column) */}
      <div className="flex gap-4 h-[calc(100vh-180px)] sm:h-[calc(100vh-220px)] min-h-[400px] sm:min-h-[500px]">

        {/* ── Conversations rail (desktop) ────────────────────── */}
        <aside className="hidden lg:flex flex-col lg:w-[230px] shrink-0 gap-3">
          <Button variant="wbPrimary" size="sm" onClick={newConversation} className="w-full justify-center">
            <Plus size={15} className="mr-1.5" />
            {t('newConversation')}
          </Button>
          {conversations.length > 0 && (
            <div className="flex-1 overflow-y-auto space-y-1">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setMessages([])}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-surface-1 hover:text-foreground transition-colors"
                >
                  <MessageSquare size={14} className="shrink-0" />
                  <span className="truncate">{conv.title}</span>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* ── Chat column ─────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">

        {/* ── Top bar: Credit pill (plan) or demo badge + Help ── */}
        <div className="flex items-center justify-end gap-2.5 pb-3">
          {noPlan && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold border border-amber-200 dark:border-amber-500/30">
              <Sparkles size={12} />
              {t('demoMode')}
            </span>
          )}
          {!noPlan && !loadingCredits && credits && (
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-card border border-border text-sm shadow-sm">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center">
                  <Zap size={11} className="text-white" />
                </div>
                <span className="font-bold text-foreground tabular-nums">
                  {credits.disponibles}
                </span>
                <span className="text-muted-foreground text-xs">{t('credits')}</span>
              </div>
              <div className="w-px h-4 bg-border" />
              <span className="text-xs font-medium text-primary capitalize">{credits.plan}</span>
            </div>
          )}
          <HelpTooltip />
        </div>

        {/* ── Main content area ───────────────────────────────── */}
        {loadingCredits ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            </div>
            <p className="text-sm text-muted-foreground">{t('loadingAssistant')}</p>
          </div>
        ) : (
          /* ── Insights + welcome/messages ────────────────────── */
          <div className="flex-1 overflow-y-auto px-1 pb-4 scroll-smooth flex flex-col">
            <InsightsRow onAsk={(q) => submitPrompt(q, 'pregunta')} />
            {!hasMessages ? (
              <WelcomeState onSelectSuggestion={handleSuggestion} />
            ) : (
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isLatest={idx >= messages.length - 2}
                    onActionExecute={handleActionExecute}
                    executingAction={executingAction}
                    onNavigate={(href) => router.push(href)}
                  />
                ))}
                {loading && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        )}

        {/* ── Input bar ───────────────────────────────────────── */}
        {!loadingCredits && (
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
                    <Icon size={13} />
                    {t(action.labelKey)}
                    {!noPlan && <span className="text-[10px] opacity-60">{action.cost}{t('creditUnit')}</span>}
                  </button>
                );
              })}
            </div>

            {/* Input row with gradient border effect */}
            <form onSubmit={handleSubmit} className="relative">
              <div className={`relative rounded-2xl transition-all duration-300 ${
                inputFocused
                  ? 'shadow-lg shadow-primary/10 ring-2 ring-primary/30'
                  : 'shadow-sm'
              }`}>
                {/* (focus ring handled by parent shadow) */}
                <div className="relative flex items-end gap-1.5 sm:gap-2 bg-card border border-border rounded-2xl p-1.5 sm:p-2 pl-3 sm:pl-4">
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
                    className="flex-1 py-2 bg-transparent text-foreground placeholder-muted-foreground focus:outline-none focus:ring-0 border-none resize-none text-sm leading-relaxed"
                  />
                  <Button
                    type="submit"
                    disabled={!prompt.trim() || loading || (!noPlan && !hasCredits)}
                    className={`!rounded-xl !p-2.5 shrink-0 transition-all duration-200 ${
                      prompt.trim() && !loading
                        ? '!bg-primary hover:!bg-primary/90 !text-primary-foreground !border-0 !shadow-sm'
                        : ''
                    }`}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send size={18} />
                    )}
                  </Button>
                </div>
              </div>
            </form>

            {/* Cost hint */}
            <div className="flex items-center justify-between mt-1.5 sm:mt-2 px-1 sm:px-2">
              <p className="text-[10px] sm:text-[11px] text-muted-foreground">
                {!noPlan && (
                  <span className="inline-flex items-center gap-1">
                    {React.createElement(selectedActionConfig.icon, { size: 10 })}
                    {selectedActionConfig.cost} {t('creditUnit')}
                  </span>
                )}
                {!noPlan && credits && (
                  <span className="ml-1">· {credits.disponibles} {t('available')}</span>
                )}
              </p>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground hidden sm:block">
                <kbd className="px-1.5 py-0.5 rounded bg-surface-3 dark:bg-surface-3 text-[10px] font-mono">Enter</kbd>
                <span className="ml-1">{t('send')}</span>
                <span className="hidden lg:inline ml-2">
                  <kbd className="px-1.5 py-0.5 rounded bg-surface-3 dark:bg-surface-3 text-[10px] font-mono">Shift+Enter</kbd>
                  <span className="ml-1">{t('newLine')}</span>
                </span>
              </p>
            </div>
          </div>
        )}
        </div>
      </div>
    </PageHeader>
  );
}
