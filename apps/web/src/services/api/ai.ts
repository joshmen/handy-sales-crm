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

export interface AiSuggestedAction {
  actionId: string;
  actionType: string;
  label: string;
  description: string;
  icon: string;
  creditCost: number;
  parameters: unknown;
}

export interface AiResponse {
  respuesta: string;
  creditosUsados: number;
  creditosRestantes: number;
  latenciaMs: number;
  accionesSugeridas?: AiSuggestedAction[];
}

export interface AiActionExecuteRequest {
  actionId: string;
  actionType: string;
}

export interface AiActionExecuteResult {
  success: boolean;
  message: string;
  creditosUsados: number;
  creditosRestantes: number;
  createdIds?: number[];
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

export async function executeAiAction(request: AiActionExecuteRequest): Promise<AiActionExecuteResult> {
  const { data } = await api.post<AiActionExecuteResult>('/api/ai/actions/execute', request);
  return data;
}

// ═══════════════════════════════════════════════════════
// SUGGESTED PRODUCTS
// ═══════════════════════════════════════════════════════

export interface SuggestedProduct {
  productoId: number;
  nombre: string;
  codigoBarra: string;
  precioBase: number;
  imagenUrl?: string;
  frecuencia: number;
  cantidadTotal: number;
  ultimaCompra: string;
}

export interface SuggestedProductsResponse {
  clienteId: number;
  total: number;
  items: SuggestedProduct[];
}

export async function getSuggestedProducts(clienteId: number, limit = 10, days = 90): Promise<SuggestedProductsResponse> {
  const { data } = await api.get<SuggestedProductsResponse>(`/api/ai/client/${clienteId}/suggested-products`, {
    params: { limit, days },
  });
  return data;
}

// ═══════════════════════════════════════════════════════
// COLLECTIONS PRIORITY
// ═══════════════════════════════════════════════════════

export interface CollectionPriorityItem {
  clienteId: number;
  clienteNombre: string;
  saldoPendiente: number;
  limiteCredito: number;
  diasVencido: number;
  diasSinCobro: number;
  pedidosPendientes: number;
  urgencyScore: number;
  razon: string;
}

export interface CollectionsPriorityResponse {
  total: number;
  items: CollectionPriorityItem[];
}

export async function getCollectionsPriority(limit = 20): Promise<CollectionsPriorityResponse> {
  const { data } = await api.get<CollectionsPriorityResponse>('/api/ai/collections-priority', {
    params: { limit },
  });
  return data;
}

// ═══════════════════════════════════════════════════════
// ROUTE AI SUMMARY
// ═══════════════════════════════════════════════════════

export interface RouteAiSummaryResponse {
  resumen: string | null;
  mensaje?: string;
}

export async function getRouteAiSummary(rutaId: number): Promise<RouteAiSummaryResponse> {
  const { data } = await api.get<RouteAiSummaryResponse>(`/rutas/${rutaId}/cierre/resumen-ai`);
  return data;
}
