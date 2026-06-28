'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import {
  Bot,
  Send,
  Inbox,
  Clock,
  Activity,
  Sparkles,
  RefreshCw,
  User,
  Mail,
  Phone,
  Building2,
  Globe,
  CheckCircle2,
  Hand,
  MessageSquare,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import {
  inboxAdminService,
  CHATBOT_URL,
  type InboxItem,
  type InboxListResponse,
  type ThreadResponse,
  type ThreadMessage,
  type InboxTab,
  type InboxStatus,
} from '@/services/api/inboxAdmin';

const BOT_PURPLE = '#9050E9';

// ─────────────────────────── Tabs ───────────────────────────

const TABS: { key: InboxTab; label: string; countKey: 'waiting' | 'active' | 'closed' | 'all' }[] = [
  { key: 'waiting', label: 'Esperan agente', countKey: 'waiting' },
  { key: 'active', label: 'Activas', countKey: 'active' },
  { key: 'all', label: 'Todas', countKey: 'all' },
  { key: 'closed', label: 'Cerradas', countKey: 'closed' },
];

const STATUS_LABEL: Record<InboxStatus, string> = {
  waiting: 'Espera asesor',
  bot: 'Con el bot',
  active: 'En vivo',
  closed: 'Cerrada',
};

const STATUS_VARIANT: Record<InboxStatus, 'warning' | 'secondary' | 'success' | 'info'> = {
  waiting: 'warning',
  bot: 'secondary',
  active: 'success',
  closed: 'secondary',
};

// ─────────────────────────── Helpers ───────────────────────────

function formatTime(value: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function formatRelative(value: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}

// ═══════════════════════════ Pagina ═══════════════════════════

export default function BotInboxPage() {
  const { data: session } = useSession();
  const { toast } = useToast();

  const [tab, setTab] = useState<InboxTab>('waiting');
  const [data, setData] = useState<InboxListResponse | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [thread, setThread] = useState<ThreadResponse | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);

  // ── carga de lista ──
  const loadList = useCallback(async () => {
    try {
      setListError(null);
      const res = await inboxAdminService.list(tab);
      setData(res);
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'No se pudo cargar la bandeja.');
    } finally {
      setLoadingList(false);
    }
  }, [tab]);

  // ── carga de hilo ──
  const loadThread = useCallback(async (id: number) => {
    try {
      setLoadingThread(true);
      const res = await inboxAdminService.getThread(id);
      setThread(res);
    } catch {
      /* el hilo puede fallar sin tumbar la lista */
    } finally {
      setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    setLoadingList(true);
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (selectedId != null) void loadThread(selectedId);
    else setThread(null);
  }, [selectedId, loadThread]);

  // ── refs para callbacks frescos en SignalR ──
  const loadListRef = useRef(loadList);
  const loadThreadRef = useRef(loadThread);
  const selectedIdRef = useRef(selectedId);
  loadListRef.current = loadList;
  loadThreadRef.current = loadThread;
  selectedIdRef.current = selectedId;

  // ── SignalR: hub del chatbot (cliente propio, no el del Main API) ──
  const connRef = useRef<HubConnection | null>(null);
  useEffect(() => {
    const token = session?.accessToken;
    if (!token || token.startsWith('mock-')) return;

    const conn = new HubConnectionBuilder()
      .withUrl(`${CHATBOT_URL}/hubs/inbox`, { accessTokenFactory: () => token })
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .configureLogging(LogLevel.Warning)
      .build();

    const refreshList = () => { void loadListRef.current(); };
    const refreshIfOpen = (payload: unknown) => {
      const id = (payload as { conversationId?: number })?.conversationId;
      if (id != null && id === selectedIdRef.current) void loadThreadRef.current(id);
      void loadListRef.current();
    };

    conn.on('InboxWaiting', refreshList);
    conn.on('InboxActivity', refreshIfOpen);
    conn.on('VisitorMessage', refreshIfOpen);
    conn.on('InboxTaken', refreshList);
    conn.on('InboxClosed', refreshList);
    conn.on('ConversationResumed', refreshList);

    conn.start().catch(() => { /* reconnect se encarga */ });
    connRef.current = conn;

    return () => {
      conn.stop().catch(() => {});
      connRef.current = null;
    };
  }, [session?.accessToken]);

  // unirse al grupo de la conversacion abierta (para recibir VisitorMessage en vivo)
  useEffect(() => {
    const conn = connRef.current;
    if (!conn || selectedId == null) return;
    conn.invoke('JoinConversation', selectedId).catch(() => {});
    return () => {
      conn.invoke('LeaveConversation', selectedId).catch(() => {});
    };
  }, [selectedId]);

  // ── polling de respaldo (por si el hub no esta conectado) ──
  useEffect(() => {
    const t = setInterval(() => {
      void loadListRef.current();
      const id = selectedIdRef.current;
      if (id != null) void loadThreadRef.current(id);
    }, 15000);
    return () => clearInterval(t);
  }, []);

  // ── acciones ──
  const handleTake = useCallback(async () => {
    if (selectedId == null) return;
    try {
      const updated = await inboxAdminService.take(selectedId);
      setThread(updated);
      void loadList();
      toast.success('Tomaste la conversacion', { desc: 'El bot quedo en silencio mientras atiendes.' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo tomar la conversacion.');
    }
  }, [selectedId, loadList, toast]);

  const handleSend = useCallback(async (text: string) => {
    if (selectedId == null) return;
    const id = selectedId;
    try {
      await inboxAdminService.send(id, text);
      await loadThread(id);
      void loadList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo enviar el mensaje.');
      throw err;
    }
  }, [selectedId, loadThread, loadList, toast]);

  const handleClose = useCallback(async () => {
    if (selectedId == null) return;
    try {
      await inboxAdminService.close(selectedId);
      await loadThread(selectedId);
      void loadList();
      toast.success('Conversacion cerrada');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cerrar.');
    }
  }, [selectedId, loadThread, loadList, toast]);

  const kpis = data?.kpis;
  const counts = data?.counts;

  return (
    <PageHeader
      section="equipo"
      icon={Bot}
      eyebrow="Plataforma"
      title="Bandeja del bot"
      subtitle="Conversaciones de Preguntale a Handy desde la landing."
      actions={
        <Button variant="wbSoft" size="sm" onClick={() => loadList()} loading={loadingList}>
          <RefreshCw size={15} className="mr-1.5" />
          Actualizar
        </Button>
      }
    >
      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Esperan agente" value={kpis?.esperan ?? 0} tone="warning" icon={Clock} loading={loadingList} />
        <StatCard label="Activas" value={kpis?.activas ?? 0} tone="primary" icon={Activity} loading={loadingList} />
        <StatCard label="Resueltas por el bot" value={`${kpis?.resueltasBotPct ?? 0}%`} tone="success" icon={Sparkles} loading={loadingList} />
        <StatCard label="Conversaciones hoy" value={kpis?.hoy ?? 0} tone="default" icon={MessageSquare} loading={loadingList} />
      </div>

      {/* Tabs */}
      <div className="mt-4 flex items-center gap-1 flex-wrap">
        {TABS.map((t) => {
          const count = counts ? counts[t.countKey] : undefined;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => { setTab(t.key); setLoadingList(true); }}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-colors ${
                active ? 'text-white' : 'bg-surface-2 text-muted-foreground hover:bg-surface-3'
              }`}
              style={active ? { background: BOT_PURPLE } : undefined}
            >
              {t.label}
              {count != null && count > 0 && (
                <span className={`ml-1.5 ${active ? 'opacity-90' : 'text-muted-foreground'}`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3 paneles */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-[320px_1fr_300px] gap-4 min-h-[60vh]">
        {/* Panel 1: lista */}
        <ConversationList
          items={data?.items ?? []}
          loading={loadingList}
          error={listError}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onRetry={loadList}
        />

        {/* Panel 2: hilo */}
        <MessageThread
          thread={thread}
          loading={loadingThread}
          onTake={handleTake}
          onSend={handleSend}
          onClose={handleClose}
        />

        {/* Panel 3: ficha del lead/contexto */}
        <LeadPanel thread={thread} />
      </div>
    </PageHeader>
  );
}

// ═══════════════════════════ Panel 1: lista ═══════════════════════════

function ConversationList({
  items, loading, error, selectedId, onSelect, onRetry,
}: {
  items: InboxItem[];
  loading: boolean;
  error: string | null;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-border-subtle text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
        Conversaciones
      </div>
      <div className="flex-1 overflow-y-auto max-h-[64vh]">
        {loading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {error}
            <button onClick={onRetry} className="mt-2 block mx-auto text-primary font-semibold">Reintentar</button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-14 px-4">
            <Inbox className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No hay conversaciones en este filtro.</p>
          </div>
        ) : (
          <ul>
            {items.map((it) => {
              const selected = it.id === selectedId;
              return (
                <li key={it.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(it.id)}
                    className={`w-full text-left px-4 py-3 border-b border-border-subtle transition-colors ${
                      selected ? 'bg-surface-2' : 'hover:bg-surface-2/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0"
                        style={{ background: it.mode === 'human' ? '#0176D3' : BOT_PURPLE }}
                      >
                        {it.mode === 'human' ? <User size={16} /> : <Bot size={16} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13.5px] font-semibold text-foreground truncate">
                            {it.visitorName || `Visitante #${it.id}`}
                          </span>
                          {it.unreadForAgent > 0 && (
                            <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                              {it.unreadForAgent}
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-muted-foreground truncate">
                          {it.lastMessage || 'Sin mensajes'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge variant={STATUS_VARIANT[it.status]}>{STATUS_LABEL[it.status]}</Badge>
                          <span className="text-[10.5px] text-muted-foreground ml-auto">
                            {formatRelative(it.lastVisitorAt || it.creadoEn)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════ Panel 2: hilo ═══════════════════════════

function MessageThread({
  thread, loading, onTake, onSend, onClose,
}: {
  thread: ThreadResponse | null;
  loading: boolean;
  onTake: () => void;
  onSend: (text: string) => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [thread?.messages.length, thread?.id]);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await onSend(text);
      setDraft('');
    } catch {
      /* el toast lo maneja el padre */
    } finally {
      setSending(false);
    }
  }, [draft, sending, onSend]);

  if (!thread) {
    return (
      <div className="rounded-2xl border border-border bg-card flex flex-col items-center justify-center text-center p-10">
        <MessageSquare className="h-12 w-12 text-muted-foreground mb-3" />
        <h3 className="text-base font-semibold text-foreground">Selecciona una conversacion</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Elige una conversacion de la izquierda para ver el hilo y responder.
        </p>
      </div>
    );
  }

  const closed = thread.status === 'closed';
  const isHuman = thread.mode === 'human';

  return (
    <div className="rounded-2xl border border-border bg-card flex flex-col overflow-hidden">
      {/* encabezado */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0"
          style={{ background: isHuman ? '#0176D3' : BOT_PURPLE }}
        >
          {isHuman ? <User size={16} /> : <Bot size={16} />}
        </div>
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-foreground truncate">
            {thread.visitorName || `Visitante #${thread.id}`}
          </div>
          <div className="text-[11.5px] text-muted-foreground flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[thread.status]}>{STATUS_LABEL[thread.status]}</Badge>
            {isHuman && <span>Bot en silencio</span>}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {!closed && !isHuman && (
            <Button size="sm" onClick={onTake} style={{ background: BOT_PURPLE }} className="text-white">
              <Hand size={15} className="mr-1.5" />
              Tomar
            </Button>
          )}
          {!closed && (
            <Button variant="wbOutline" size="sm" onClick={onClose}>
              <CheckCircle2 size={15} className="mr-1.5" />
              Cerrar
            </Button>
          )}
        </div>
      </div>

      {/* cuerpo */}
      <div ref={bodyRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-1 max-h-[52vh]">
        {loading && !thread.messages.length ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-muted animate-pulse w-2/3" />
            ))}
          </div>
        ) : (
          thread.messages.map((m) => <Bubble key={m.id} m={m} />)
        )}
      </div>

      {/* composer */}
      <div className="border-t border-border p-3">
        {closed ? (
          <p className="text-center text-[12.5px] text-muted-foreground py-2">
            Esta conversacion esta cerrada.
          </p>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              placeholder={isHuman ? 'Escribe tu respuesta...' : 'Toma la conversacion para responder en vivo...'}
              className="flex-1 resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring max-h-32"
            />
            <Button
              size="sm"
              onClick={() => void send()}
              loading={sending}
              disabled={!draft.trim()}
              style={{ background: BOT_PURPLE }}
              className="text-white"
            >
              <Send size={15} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Bubble({ m }: { m: ThreadMessage }) {
  if (m.role === 'system') {
    return (
      <div className="text-center text-[11px] italic text-muted-foreground py-1">{m.content}</div>
    );
  }
  const isAgent = m.role === 'agent';
  const isBot = m.role === 'bot';
  return (
    <div className={isAgent ? 'flex justify-end' : 'flex justify-start'}>
      <div
        className="max-w-[78%] rounded-2xl px-3 py-2 text-[13px] whitespace-pre-wrap break-words"
        style={
          isAgent
            ? { background: '#0176D3', color: '#fff' }
            : isBot
              ? { background: 'rgba(144,80,233,0.10)', color: 'var(--foreground)', border: '1px solid rgba(144,80,233,0.30)' }
              : { background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)' }
        }
      >
        {(isBot || isAgent) && (
          <div className="text-[10px] font-bold mb-0.5 flex items-center gap-1" style={isAgent ? { color: '#fff' } : { color: BOT_PURPLE }}>
            {isBot ? <><Bot size={11} /> Bot</> : 'Asesor'}
          </div>
        )}
        {m.content}
        <div className={`text-[9.5px] mt-1 ${isAgent ? 'text-white/70' : 'text-muted-foreground'}`}>
          {formatTime(m.creadoEn)}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════ Panel 3: ficha del lead ═══════════════════════════

function LeadPanel({ thread }: { thread: ThreadResponse | null }) {
  const meta = useMemo(() => {
    if (!thread) return [];
    return [
      { icon: Globe, label: 'Origen', value: thread.originPage },
      { icon: User, label: 'Visitante', value: thread.visitorName },
      { icon: Mail, label: 'Correo', value: thread.visitorEmail },
    ].filter((x) => x.value);
  }, [thread]);

  if (!thread) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-center text-sm text-muted-foreground">
        Sin conversacion seleccionada.
      </div>
    );
  }

  const lead = thread.lead;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border-subtle text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
        Contexto
      </div>
      <div className="p-4 space-y-4">
        {/* meta */}
        <div className="space-y-2">
          {meta.length === 0 && <p className="text-[12.5px] text-muted-foreground">Sin datos del visitante.</p>}
          {meta.map((x) => (
            <div key={x.label} className="flex items-start gap-2 text-[12.5px]">
              <x.icon size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-muted-foreground">{x.label}</div>
                <div className="text-foreground font-medium break-words">{x.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* lead */}
        <div className="pt-3 border-t border-border-subtle">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} style={{ color: BOT_PURPLE }} />
            <h4 className="text-[13px] font-bold text-foreground">Lead</h4>
            {lead && (
              <Badge variant={lead.consent ? 'success' : 'secondary'}>
                {lead.consent ? 'Con consentimiento' : 'Sin consentimiento'}
              </Badge>
            )}
          </div>
          {!lead ? (
            <p className="text-[12.5px] text-muted-foreground">Aun no se ha capturado un lead.</p>
          ) : (
            <div className="space-y-2 text-[12.5px]">
              {lead.name && <LeadRow icon={User} label="Nombre" value={lead.name} />}
              {lead.email && <LeadRow icon={Mail} label="Correo" value={lead.email} />}
              {lead.phone && <LeadRow icon={Phone} label="Telefono" value={lead.phone} />}
              {lead.company && <LeadRow icon={Building2} label="Empresa" value={lead.company} />}
              {lead.intent && <LeadRow icon={Sparkles} label="Intencion" value={lead.intent} />}
              {lead.reason && <LeadRow icon={Hand} label="Motivo" value={lead.reason} />}
              {!lead.name && !lead.email && !lead.phone && !lead.company && (
                <p className="text-muted-foreground">
                  Sin datos de contacto {lead.consent ? '' : '(falta consentimiento del visitante)'}.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LeadRow({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <div className="text-muted-foreground">{label}</div>
        <div className="text-foreground font-medium break-words">{value}</div>
      </div>
    </div>
  );
}
