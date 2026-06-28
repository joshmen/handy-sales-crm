/**
 * chatClient.ts — Cliente SSE propio para el widget de chat (NO Vercel AI SDK).
 *
 * Habla con el backend del chatbot (NEXT_PUBLIC_CHATBOT_URL, default http://localhost:1054):
 *   POST   /public/conversations        -> inicia conversacion, devuelve { publicId }
 *   POST   /public/conversations/:id/chat   -> envia mensaje, responde stream SSE (data: {json})
 *   GET    /public/conversations/:id/stream  -> EventSource para mensajes de agente/sistema
 *   POST   /public/conversations/:id/handoff -> solicita handoff a humano
 *
 * El stream de /chat emite frames SSE de la forma:  data: {"delta":"texto"}\n\n
 * y un frame final con { done:true, sources?, handoff? } (o el campo [DONE]).
 */

const VISITOR_ID_KEY = "handy_chat_visitor_id";

function getBaseUrl(): string {
  const url =
    (typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_CHATBOT_URL) ||
    "http://localhost:1054";
  return url.replace(/\/+$/, "");
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface ChatSource {
  title?: string;
  url?: string;
  snippet?: string;
}

export interface ChatLead {
  nombre?: string;
  email?: string;
  telefono?: string;
  mensaje?: string;
}

export interface SendDoneInfo {
  sources?: ChatSource[];
  handoff?: boolean;
}

export interface SendCallbacks {
  onToken?: (delta: string) => void;
  onDone?: (info: SendDoneInfo) => void;
  onError?: (error: Error) => void;
}

export type ReceiveEventType =
  | "agent_message"
  | "system"
  | "bot_message"
  | "closed";

export interface ReceiveEvent {
  type: ReceiveEventType;
  text?: string;
  agentName?: string;
  [key: string]: unknown;
}

export interface StartConversationResult {
  publicId: string;
  visitorId: string;
}

export interface ReceiveSubscription {
  /** Cierra la conexion y detiene la reconexion. */
  close: () => void;
}

// ---------------------------------------------------------------------------
// Visitor id (localStorage)
// ---------------------------------------------------------------------------

function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") {
    return cryptoRandomId();
  }
  try {
    let id = window.localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = cryptoRandomId();
      window.localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch {
    return cryptoRandomId();
  }
}

function cryptoRandomId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `v_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2)}`;
}

// ---------------------------------------------------------------------------
// SSE frame parser
// ---------------------------------------------------------------------------

interface SseFrame {
  event?: string;
  data: string;
}

/**
 * Parser incremental de frames SSE. Devuelve frames completos y deja el resto
 * en el buffer pendiente.
 */
function parseSseChunks(buffer: string): { frames: SseFrame[]; rest: string } {
  const frames: SseFrame[] = [];
  // Los frames SSE se separan por linea en blanco (\n\n). Normalizamos CRLF.
  const normalized = buffer.replace(/\r\n/g, "\n");
  const parts = normalized.split("\n\n");
  // El ultimo segmento puede estar incompleto -> queda como rest.
  const rest = parts.pop() ?? "";

  for (const block of parts) {
    if (!block.trim()) continue;
    let event: string | undefined;
    const dataLines: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).replace(/^ /, ""));
      } else if (line.startsWith("event:")) {
        event = line.slice(6).trim();
      }
      // Ignoramos comentarios SSE (":...") y otros campos.
    }
    frames.push({ event, data: dataLines.join("\n") });
  }

  return { frames, rest };
}

/** Extrae el delta de texto de un payload de frame de chat. */
function extractDelta(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const obj = payload as Record<string, unknown>;
  if (typeof obj.delta === "string") return obj.delta;
  if (typeof obj.content === "string") return obj.content;
  if (typeof obj.text === "string") return obj.text;
  if (typeof obj.token === "string") return obj.token;
  return null;
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

/**
 * Inicia una conversacion publica. Persiste el visitorId en localStorage.
 */
export async function startConversation(): Promise<StartConversationResult> {
  const visitorId = getOrCreateVisitorId();
  const res = await fetch(`${getBaseUrl()}/public/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visitorId }),
  });

  if (!res.ok) {
    throw new Error(
      `No se pudo iniciar la conversacion (HTTP ${res.status})`
    );
  }

  const data = (await res.json()) as { publicId?: string; id?: string };
  const publicId = data.publicId ?? data.id;
  if (!publicId) {
    throw new Error("Respuesta invalida: falta publicId");
  }

  return { publicId, visitorId };
}

/**
 * Envia un mensaje y consume el stream SSE de la respuesta del bot.
 * Llama onToken por cada delta y onDone al cierre del stream.
 */
export async function sendMessage(
  publicId: string,
  text: string,
  callbacks: SendCallbacks = {}
): Promise<void> {
  const { onToken, onDone, onError } = callbacks;
  try {
    const res = await fetch(
      `${getBaseUrl()}/public/conversations/${encodeURIComponent(
        publicId
      )}/chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ message: text }),
      }
    );

    if (!res.ok || !res.body) {
      throw new Error(`Error al enviar mensaje (HTTP ${res.status})`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let doneInfo: SendDoneInfo = {};

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const { frames, rest } = parseSseChunks(buffer);
      buffer = rest;

      for (const frame of frames) {
        const raw = frame.data.trim();
        if (!raw) continue;
        if (raw === "[DONE]") {
          onDone?.(doneInfo);
          return;
        }

        let payload: unknown;
        try {
          payload = JSON.parse(raw);
        } catch {
          // Texto plano: lo tratamos como delta directo.
          onToken?.(raw);
          continue;
        }

        const obj = payload as Record<string, unknown>;
        const delta = extractDelta(payload);
        if (delta) onToken?.(delta);

        if (Array.isArray(obj.sources)) {
          doneInfo.sources = obj.sources as ChatSource[];
        }
        if (typeof obj.handoff === "boolean") {
          doneInfo.handoff = obj.handoff;
        }
        if (obj.done === true || obj.finished === true) {
          onDone?.(doneInfo);
          return;
        }
      }
    }

    // Stream cerrado sin frame [DONE]/done explicito.
    onDone?.(doneInfo);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    if (onError) onError(error);
    else throw error;
  }
}

/**
 * Suscripcion a mensajes entrantes (agente humano / sistema) via EventSource,
 * con reconexion automatica.
 */
export function subscribeReceive(
  publicId: string,
  onEvent: (event: ReceiveEvent) => void
): ReceiveSubscription {
  if (typeof window === "undefined" || typeof EventSource === "undefined") {
    // SSR / entorno sin EventSource: no-op.
    return { close: () => {} };
  }

  let source: EventSource | null = null;
  let closed = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const url = `${getBaseUrl()}/public/conversations/${encodeURIComponent(
    publicId
  )}/stream`;

  const handleMessage = (ev: MessageEvent) => {
    const raw = typeof ev.data === "string" ? ev.data.trim() : "";
    if (!raw || raw === "[DONE]") return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { type: "system", text: raw };
    }
    const obj = (parsed ?? {}) as Record<string, unknown>;
    const type = (obj.type as ReceiveEventType) ?? "system";
    onEvent({
      ...obj,
      type,
      text: typeof obj.text === "string" ? obj.text : undefined,
      agentName:
        typeof obj.agentName === "string" ? obj.agentName : undefined,
    });
  };

  const connect = () => {
    if (closed) return;
    source = new EventSource(url);
    source.onmessage = handleMessage;

    // Eventos SSE con nombre explicito.
    (["agent_message", "system", "bot_message", "closed"] as const).forEach(
      (name) => {
        source?.addEventListener(name, (ev) =>
          handleMessage(ev as MessageEvent)
        );
      }
    );

    source.onerror = () => {
      // EventSource reintenta solo, pero forzamos un reciclo controlado.
      source?.close();
      source = null;
      if (closed) return;
      reconnectTimer = setTimeout(connect, 3000);
    };
  };

  connect();

  return {
    close: () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      source?.close();
      source = null;
    },
  };
}

/**
 * Solicita handoff a un asesor humano. Opcionalmente envia datos del lead.
 */
export async function requestHandoff(
  publicId: string,
  lead?: ChatLead
): Promise<void> {
  const res = await fetch(
    `${getBaseUrl()}/public/conversations/${encodeURIComponent(
      publicId
    )}/handoff`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead: lead ?? null }),
    }
  );

  if (!res.ok) {
    throw new Error(`No se pudo solicitar el asesor (HTTP ${res.status})`);
  }
}
