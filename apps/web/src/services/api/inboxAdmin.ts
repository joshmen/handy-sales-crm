import axios, { AxiosInstance } from 'axios';
import { getSession } from 'next-auth/react';
import { getApiAccessToken } from '@/lib/api';

/**
 * Cliente de la Bandeja del bot. Apunta al servicio chatbot autonomo (puerto 1054),
 * NO al Main API. Reutiliza el mismo JWT de NextAuth (secreto compartido) que el
 * chatbot valida con RequireRole("SUPER_ADMIN").
 */
export const CHATBOT_URL = (process.env.NEXT_PUBLIC_CHATBOT_URL || 'http://localhost:1054').replace(/\/+$/, '');

const chatbotApi: AxiosInstance = axios.create({
  baseURL: CHATBOT_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

chatbotApi.interceptors.request.use(async (config) => {
  let token = getApiAccessToken();
  if (!token) {
    try {
      const session = await getSession();
      token = session?.accessToken ?? null;
    } catch {
      /* sin token: la peticion fallara 401, se maneja arriba */
    }
  }
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─────────────────────────── Tipos (espejo de los DTOs del chatbot) ───────────────────────────

export type InboxStatus = 'waiting' | 'bot' | 'active' | 'closed';
export type InboxMode = 'bot' | 'human';
export type InboxRole = 'visitor' | 'bot' | 'agent' | 'system';
export type InboxTab = 'waiting' | 'active' | 'closed' | 'all';

export interface InboxItem {
  id: number;
  publicId: string;
  status: InboxStatus;
  mode: InboxMode;
  taken: boolean;
  visitorName: string | null;
  originPage: string | null;
  device: string | null;
  location: string | null;
  unreadForAgent: number;
  lastMessage: string | null;
  lastVisitorAt: string | null;
  creadoEn: string;
  hasLead: boolean;
}

export interface InboxCounts {
  waiting: number;
  active: number;
  closed: number;
  all: number;
}

export interface InboxKpis {
  hoy: number;
  esperan: number;
  activas: number;
  resueltasBotPct: number;
}

export interface InboxListResponse {
  items: InboxItem[];
  counts: InboxCounts;
  kpis: InboxKpis;
}

export interface ThreadMessage {
  id: number;
  role: InboxRole;
  content: string;
  creadoEn: string;
  confidence: number | null;
  agentId: string | null;
}

export interface InboxLead {
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  companySize: string | null;
  intent: string | null;
  reason: string | null;
  consent: boolean;
}

export interface ThreadResponse {
  id: number;
  publicId: string;
  status: InboxStatus;
  mode: InboxMode;
  taken: boolean;
  assignedAgentId: string | null;
  visitorName: string | null;
  visitorEmail: string | null;
  originPage: string | null;
  device: string | null;
  location: string | null;
  creadoEn: string;
  messages: ThreadMessage[];
  lead: InboxLead | null;
}

export interface InboxBadges {
  inboxWaiting: number;
}

// ─────────────────────────── Servicio ───────────────────────────

class InboxAdminService {
  async list(tab: InboxTab = 'all'): Promise<InboxListResponse> {
    const res = await chatbotApi.get<InboxListResponse>('/agent/conversations', { params: { tab } });
    return res.data;
  }

  async getThread(id: number): Promise<ThreadResponse> {
    const res = await chatbotApi.get<ThreadResponse>(`/agent/conversations/${id}`);
    return res.data;
  }

  async take(id: number): Promise<ThreadResponse> {
    const res = await chatbotApi.post<ThreadResponse>(`/agent/conversations/${id}/take`);
    return res.data;
  }

  async send(id: number, message: string): Promise<void> {
    await chatbotApi.post(`/agent/conversations/${id}/messages`, { message });
  }

  async close(id: number): Promise<void> {
    await chatbotApi.post(`/agent/conversations/${id}/close`);
  }

  async badges(): Promise<InboxBadges> {
    const res = await chatbotApi.get<InboxBadges>('/agent/badges');
    return res.data;
  }
}

export const inboxAdminService = new InboxAdminService();
