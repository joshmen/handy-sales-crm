import { api } from '@/lib/api';

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

export interface AiCreditBalance {
  asignados: number;
  usados: number;
  extras: number;
  disponibles: number;
  plan: string;
  mes: number;
  anio: number;
}

export interface AiRequest {
  tipoAccion: 'resumen' | 'insight' | 'pregunta' | 'pronostico';
  prompt: string;
  contexto?: string;
}

export interface AiResponse {
  respuesta: string;
  creditosUsados: number;
  creditosRestantes: number;
  latenciaMs: number;
}

export interface AiUsageItem {
  id: number;
  tipoAccion: string;
  creditosCobrados: number;
  promptResumen: string;
  latenciaMs: number;
  exitoso: boolean;
  creadoEn: string;
  nombreUsuario?: string;
}

export interface AiUsageStats {
  totalRequests: number;
  totalCreditos: number;
  porTipoAccion: Record<string, number>;
  ultimosUsos: AiUsageItem[];
}

export interface AiUsageResponse {
  items: AiUsageItem[];
  total: number;
  page: number;
  pageSize: number;
}

// ═══════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════

export async function queryAi(request: AiRequest): Promise<AiResponse> {
  const { data } = await api.post<AiResponse>('/api/ai/query', request);
  return data;
}

export async function getAiCredits(): Promise<AiCreditBalance> {
  const { data } = await api.get<AiCreditBalance>('/api/ai/credits');
  return data;
}

export async function getAiUsage(page = 1, pageSize = 20): Promise<AiUsageResponse> {
  const { data } = await api.get<AiUsageResponse>('/api/ai/usage', {
    params: { page, pageSize },
  });
  return data;
}

export async function getAiUsageStats(): Promise<AiUsageStats> {
  const { data } = await api.get<AiUsageStats>('/api/ai/usage/stats');
  return data;
}
