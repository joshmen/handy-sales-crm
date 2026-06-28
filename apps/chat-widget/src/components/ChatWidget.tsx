'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  startConversation,
  sendMessage,
  subscribeReceive,
  requestHandoff,
  type ReceiveEvent,
  type ReceiveSubscription,
} from '@/lib/chatClient';

const BOT_PURPLE = '#9050E9';
const AGENT_BLUE = '#0176D3';

type Role = 'visitor' | 'bot' | 'agent' | 'system';
interface Msg {
  id: string;
  role: Role;
  text: string;
}

let _seq = 0;
const nextId = () => `m${++_seq}`;

export function ChatWidget({ embed = false }: { embed?: boolean } = {}) {
  const [open, setOpen] = useState(false);
  const [publicId, setPublicId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [agentJoined, setAgentJoined] = useState(false);
  const subRef = useRef<ReceiveSubscription | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  // Modo embed (iframe): avisa al loader del padre para redimensionar el iframe
  // segun abierto/cerrado. Solo se manda el booleano (sin datos sensibles).
  useEffect(() => {
    if (!embed || typeof window === 'undefined' || !window.parent) return;
    window.parent.postMessage({ source: 'handysuites-widget', open }, '*');
  }, [open, embed]);

  // Inicia la conversacion al abrir por primera vez.
  useEffect(() => {
    if (!open || publicId) return;
    let alive = true;
    startConversation()
      .then(({ publicId }) => {
        if (!alive) return;
        setPublicId(publicId);
        setMsgs([
          { id: nextId(), role: 'bot', text: 'Hola 👋 Soy el asistente de Handy Suites. ¿En que te ayudo?' },
        ]);
      })
      .catch(() => {
        if (alive) {
          setMsgs([{ id: nextId(), role: 'system', text: 'No se pudo conectar con el chat. Intenta de nuevo.' }]);
        }
      });
    return () => {
      alive = false;
    };
  }, [open, publicId]);

  // Suscripcion a mensajes entrantes (agente humano / sistema).
  useEffect(() => {
    if (!publicId) return;
    const sub = subscribeReceive(publicId, (ev: ReceiveEvent) => {
      if (ev.type === 'agent_message') {
        setAgentJoined(true);
        setMsgs((m) => [...m, { id: nextId(), role: 'agent', text: ev.text ?? '' }]);
      } else if (ev.type === 'bot_message') {
        setMsgs((m) => [...m, { id: nextId(), role: 'bot', text: ev.text ?? '' }]);
      } else if (ev.type === 'system') {
        if (ev.text?.toLowerCase().includes('asesor')) setAgentJoined(true);
        setMsgs((m) => [...m, { id: nextId(), role: 'system', text: ev.text ?? '' }]);
      } else if (ev.type === 'closed') {
        setMsgs((m) => [...m, { id: nextId(), role: 'system', text: 'La conversacion se cerro.' }]);
      }
    });
    subRef.current = sub;
    return () => {
      sub.close();
      subRef.current = null;
    };
  }, [publicId]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [msgs]);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || !publicId || sending) return;
    setDraft('');
    setMsgs((m) => [...m, { id: nextId(), role: 'visitor', text }]);
    setSending(true);
    const botId = nextId();
    setMsgs((m) => [...m, { id: botId, role: 'bot', text: '' }]);
    await sendMessage(publicId, text, {
      onToken: (delta) => setMsgs((m) => m.map((x) => (x.id === botId ? { ...x, text: x.text + delta } : x))),
      onDone: () => setSending(false),
      onError: () => {
        setMsgs((m) => m.map((x) => (x.id === botId ? { ...x, text: 'No se pudo responder. Intenta de nuevo.' } : x)));
        setSending(false);
      },
    });
  }, [draft, publicId, sending]);

  const askHuman = useCallback(async () => {
    if (!publicId) return;
    try {
      await requestHandoff(publicId);
      setMsgs((m) => [...m, { id: nextId(), role: 'system', text: 'Te estamos pasando con un asesor...' }]);
    } catch {
      setMsgs((m) => [...m, { id: nextId(), role: 'system', text: 'No se pudo solicitar un asesor.' }]);
    }
  }, [publicId]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full text-xl text-white shadow-lg"
        style={{ background: BOT_PURPLE }}
        aria-label={open ? 'Cerrar chat' : 'Abrir chat'}
      >
        {open ? '×' : '💬'}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[460px] w-[360px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center gap-2 px-4 py-3 text-white" style={{ background: BOT_PURPLE }}>
            <span className="font-semibold">Preguntale a Handy</span>
            {agentJoined && (
              <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 text-[11px]">Asesor en linea</span>
            )}
          </div>

          <div ref={bodyRef} className="flex-1 space-y-2 overflow-y-auto bg-slate-50 p-3">
            {msgs.map((m) =>
              m.role === 'system' ? (
                <div key={m.id} className="text-center text-[11px] italic text-slate-400">
                  {m.text}
                </div>
              ) : (
                <div key={m.id} className={m.role === 'visitor' ? 'flex justify-end' : 'flex justify-start'}>
                  <div
                    className="max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm"
                    style={
                      m.role === 'visitor'
                        ? { background: BOT_PURPLE, color: '#fff' }
                        : m.role === 'agent'
                          ? { background: AGENT_BLUE, color: '#fff' }
                          : { background: '#fff', color: '#0B1430', border: '1px solid #e2e8f0' }
                    }
                  >
                    {m.role === 'agent' && <div className="text-[10px] font-bold opacity-80">Asesor</div>}
                    {m.text || (m.role === 'bot' && sending ? '...' : '')}
                  </div>
                </div>
              )
            )}
          </div>

          <div className="border-t border-slate-200 p-2">
            {!agentJoined && (
              <button
                type="button"
                onClick={askHuman}
                className="mb-2 w-full rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Hablar con una persona
              </button>
            )}
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
                placeholder="Escribe tu mensaje..."
                className="flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400"
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={!draft.trim() || sending}
                className="h-9 rounded-lg px-3 text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: BOT_PURPLE }}
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
