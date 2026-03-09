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

// ═══════════════════════════════════════════════════════
// COLLECTIONS MESSAGE (WhatsApp)
// ═══════════════════════════════════════════════════════

export interface CollectionsMessageRequest {
  clienteId: number;
  tono?: 'amable' | 'firme' | 'urgente';
}

export interface CollectionsMessageResponse {
  mensaje: string;
  clienteNombre: string;
  saldo: number;
  telefono?: string;
  creditosUsados: number;
  creditosRestantes: number;
}

export async function generateCollectionsMessage(request: CollectionsMessageRequest): Promise<CollectionsMessageResponse> {
  const { data } = await api.post<CollectionsMessageResponse>('/api/ai/collections-message', request);
  return data;
}

// ═══════════════════════════════════════════════════════
// ORDER ANOMALY DETECTION
// ═══════════════════════════════════════════════════════

export interface OrderAnomaly {
  tipo: 'producto_nuevo' | 'cantidad_alta' | 'precio_anomalo' | 'total_alto';
  severidad: 'info' | 'warning';
  productoId?: number;
  productoNombre?: string;
  mensaje: string;
}

export interface OrderAnomaliesResponse {
  pedidoId: number;
  totalAnomalias: number;
  tieneAnomalias: boolean;
  items: OrderAnomaly[];
}

export async function getOrderAnomalies(pedidoId: number): Promise<OrderAnomaliesResponse> {
  const { data } = await api.get<OrderAnomaliesResponse>(`/api/ai/orders/${pedidoId}/anomalies`);
  return data;
}

// ═══════════════════════════════════════════════════════
// SMART DISCOUNT
// ═══════════════════════════════════════════════════════

export interface SmartDiscountFactor {
  tipo: 'lealtad' | 'volumen' | 'historial_producto' | 'riesgo_credito';
  porcentaje: number;
  razon: string;
  basadoEn: string;
}

export interface SmartDiscountResponse {
  clienteId: number;
  clienteNombre: string;
  descuentoActual: number;
  descuentoRecomendado: number;
  maxDescuento: number;
  factores: SmartDiscountFactor[];
}

export async function getSmartDiscount(clienteId: number, productoId?: number, cantidad = 1): Promise<SmartDiscountResponse> {
  const { data } = await api.get<SmartDiscountResponse>(`/api/ai/client/${clienteId}/smart-discount`, {
    params: { productoId, cantidad },
  });
  return data;
}

// ═══════════════════════════════════════════════════════
// RECOMMENDATIONS FOR TOMORROW
// ═══════════════════════════════════════════════════════

export interface Recommendation {
  tipo: 'visitar' | 'cobrar' | 'reabastecer';
  prioridad: 'alta' | 'media' | 'baja';
  clienteId?: number;
  productoId?: number;
  mensaje: string;
}

export interface RecommendationsResponse {
  fecha: string;
  total: number;
  items: Recommendation[];
}

export async function getRecommendationsTomorrow(): Promise<RecommendationsResponse> {
  const { data } = await api.get<RecommendationsResponse>('/api/ai/recommendations/tomorrow');
  return data;
}

// ═══════════════════════════════════════════════════════
// STOP DURATION PREDICTIONS
// ═══════════════════════════════════════════════════════

export interface StopDurationPrediction {
  paradaId: number;
  clienteId: number;
  clienteNombre: string;
  ordenVisita: number;
  duracionEstimadaMinutos: number;
  confianza: number;
  basadoEn: string;
}

export interface StopDurationsResponse {
  rutaId: number;
  totalParadas: number;
  duracionTotalEstimadaMinutos: number;
  horaFinEstimada?: string;
  items: StopDurationPrediction[];
}

export async function getStopDurations(rutaId: number): Promise<StopDurationsResponse> {
  const { data } = await api.get<StopDurationsResponse>(`/api/ai/routes/${rutaId}/stop-durations`);
  return data;
}

// ═══════════════════════════════════════════════════════
// DEMAND FORECAST (P3-11)
// ═══════════════════════════════════════════════════════

export interface DemandForecastItem {
  productoId: number;
  productoNombre: string;
  demandaSemanalEstimada: number;
  promedioSimple: number;
  rangoSemanal: { min: number; max: number };
  tendencia: 'creciente' | 'decreciente' | 'estable' | 'sin datos';
  tendenciaCambio: number | null;
  confianza: 'alta' | 'media' | 'baja';
  semanasConDatos: number;
  avgClientesPorSemana: number;
}

export interface DemandForecastResponse {
  total: number;
  items: DemandForecastItem[];
}

export async function getDemandForecast(productoId?: number, limit = 20): Promise<DemandForecastResponse> {
  const { data } = await api.get<DemandForecastResponse>('/api/ai/demand-forecast', {
    params: { productoId, limit },
  });
  return data;
}

// ═══════════════════════════════════════════════════════
// PAYMENT RISK (P3-12)
// ═══════════════════════════════════════════════════════

export interface PaymentRiskMetrics {
  cobros6Meses: number;
  pedidos6Meses: number;
  avgDiasEntreCobros: number;
  ratioPagoPct: number;
}

export interface PaymentRiskResponse {
  clienteId: number;
  clienteNombre: string;
  saldoActual: number;
  limiteCredito: number;
  metricas: PaymentRiskMetrics;
  riskScore: number;
  nivelRiesgo: 'critico' | 'alto' | 'sin_historial' | 'irregular' | 'bajo';
  razon: string;
}

export async function getPaymentRisk(clienteId: number): Promise<PaymentRiskResponse> {
  const { data } = await api.get<PaymentRiskResponse>(`/api/ai/client/${clienteId}/payment-risk`);
  return data;
}

// ═══════════════════════════════════════════════════════
// GPS ANOMALY DETECTION (P3-13)
// ═══════════════════════════════════════════════════════

export interface GpsAnomaly {
  tipo: 'ubicacion_lejana' | 'sin_gps' | 'visita_corta' | 'visita_larga';
  severidad: 'info' | 'warning' | 'critico';
  distanciaMetros?: number;
  mensaje: string;
  ubicacionVisita?: { lat: number; lng: number } | null;
  ubicacionCliente?: { lat: number; lng: number } | null;
}

export interface GpsAnomalyResponse {
  visitaId: number;
  clienteId: number;
  clienteNombre: string;
  clienteDireccion: string;
  totalAnomalias: number;
  tieneAnomalias: boolean;
  items: GpsAnomaly[];
}

export async function getGpsAnomaly(visitaId: number): Promise<GpsAnomalyResponse> {
  const { data } = await api.get<GpsAnomalyResponse>(`/api/ai/visits/${visitaId}/gps-anomaly`);
  return data;
}

// ═══════════════════════════════════════════════════════
// ADMIN: REFRESH MATERIALIZED VIEWS
// ═══════════════════════════════════════════════════════

export interface RefreshViewsResponse {
  message: string;
  refreshedAt: string;
}

export async function refreshAiViews(): Promise<RefreshViewsResponse> {
  const { data } = await api.post<RefreshViewsResponse>('/api/ai/admin/refresh-views');
  return data;
}
