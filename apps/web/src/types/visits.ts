// Enums que coinciden con el backend (integers)
export enum TipoVisita {
  Rutina = 0,
  Cobranza = 1,
  Entrega = 2,
  Prospeccion = 3,
  Seguimiento = 4,
  Otro = 5,
}

export enum ResultadoVisita {
  Pendiente = 0,
  Venta = 1,
  SinVenta = 2,
  NoEncontrado = 3,
  Reprogramada = 4,
  Cancelada = 5,
}

// DTO completo de visita
export interface ClienteVisitaDto {
  id: number;
  clienteId: number;
  clienteNombre: string;
  clienteDireccion?: string;
  usuarioId: number;
  usuarioNombre: string;
  pedidoId?: number;
  numeroPedido?: string;
  fechaProgramada?: string;
  fechaHoraInicio?: string;
  fechaHoraFin?: string;
  tipoVisita: TipoVisita;
  tipoVisitaNombre: string;
  resultado: ResultadoVisita;
  resultadoNombre: string;
  latitudInicio?: number;
  longitudInicio?: number;
  latitudFin?: number;
  longitudFin?: number;
  distanciaCliente?: number;
  notas?: string;
  notasPrivadas?: string;
  fotos?: string[];
  duracionMinutos?: number;
  creadoEn: string;
  /** True si la visita fue planeada (tiene fechaProgramada); false si fue ad-hoc/en campo. */
  esProgramada?: boolean;
}

// DTO para listados (versión simplificada)
export interface ClienteVisitaListaDto {
  id: number;
  clienteId: number;
  clienteNombre: string;
  clienteDireccion?: string;
  /** Vendedor que registró la visita en campo. */
  vendedorNombre?: string;
  fechaProgramada?: string;
  fechaHoraInicio?: string;
  fechaHoraFin?: string;
  tipoVisita: TipoVisita;
  tipoVisitaNombre: string;
  resultado: ResultadoVisita;
  resultadoNombre: string;
  duracionMinutos?: number;
  tienePedido: boolean;
  /** Distancia (m) del check-in a la ubicación del cliente; null si no hubo GPS. */
  distanciaCliente?: number;
  /** Total del pedido vinculado; null si la visita no generó pedido. */
  monto?: number;
  /** True si la visita fue planeada (tiene fechaProgramada); false si fue ad-hoc/en campo. */
  esProgramada?: boolean;
}

// Cobertura por frecuencia — espejo de CoberturaClienteDto (GET /visitas/cobertura)
export interface CoberturaCliente {
  clienteId: number;
  clienteNombre: string;
  zonaNombre?: string;
  vendedorNombre?: string;
  ultimaVisita?: string;
  frecuencia: number;
  frecuenciaNombre: string;
  diasDesdeUltima?: number | null;
  diasVencido: number;
  estado: 'Vencida' | 'PorVisitar';
}

// DTO para crear visita
export interface ClienteVisitaCreateDto {
  clienteId: number;
  fechaProgramada?: string;
  tipoVisita?: TipoVisita;
  notas?: string;
}

// DTO para check-in
export interface CheckInDto {
  latitud: number;
  longitud: number;
  notas?: string;
}

// DTO para check-out
export interface CheckOutDto {
  latitud?: number;
  longitud?: number;
  resultado: ResultadoVisita;
  notas?: string;
  notasPrivadas?: string;
  fotos?: string[];
  pedidoId?: number;
}

// Filtros para buscar visitas
export interface ClienteVisitaFiltroDto {
  clienteId?: number;
  usuarioId?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  tipoVisita?: TipoVisita;
  resultado?: ResultadoVisita;
  soloPendientes?: boolean;
  pagina?: number;
  tamanoPagina?: number;
}

// Resumen diario
export interface VisitaResumenDiarioDto {
  fecha: string;
  totalVisitas: number;
  visitasCompletadas: number;
  visitasConVenta: number;
  visitasPendientes: number;
  visitasCanceladas: number;
  tasaConversion: number;
}

// Resumen (KPIs) del rango filtrado del list GET /visitas — espejo de VisitaResumenDto.
// Calculado en backend sobre TODO el set filtrado (no la página).
export interface VisitaResumen {
  total: number;
  completadas: number;
  conVenta: number;
  sinVenta: number;
  duracionPromedio: number;
}

// Respuesta paginada
export interface VisitasPaginatedResult {
  items: ClienteVisitaListaDto[];
  totalItems: number;
  pagina: number;
  tamanoPagina: number;
  /** KPIs del rango filtrado completo (no la página). Presente desde el list con resumen. */
  resumen?: VisitaResumen;
}

// Tipo para uso en componentes (mapeado desde API)
export interface Visit {
  id: string;
  clientId: string;
  clientName: string;
  clientAddress?: string;
  userId: string;
  userName: string;
  orderId?: string;
  orderNumber?: string;
  scheduledDate?: Date;
  startTime?: Date;
  endTime?: Date;
  visitType: TipoVisita;
  visitTypeName: string;
  result: ResultadoVisita;
  resultName: string;
  startLatitude?: number;
  startLongitude?: number;
  endLatitude?: number;
  endLongitude?: number;
  clientDistance?: number;
  notes?: string;
  privateNotes?: string;
  photos?: string[];
  durationMinutes?: number;
  hasOrder: boolean;
  createdAt: Date;
}

// Resumen para dashboard
export interface VisitSummary {
  totalVisits: number;
  completedVisits: number;
  visitsWithSale: number;
  pendingVisits: number;
  cancelledVisits: number;
  conversionRate: number;
}
