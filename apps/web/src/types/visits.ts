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
}

// DTO para listados (versión simplificada)
export interface ClienteVisitaListaDto {
  id: number;
  clienteId: number;
  clienteNombre: string;
  clienteDireccion?: string;
  fechaProgramada?: string;
  fechaHoraInicio?: string;
  fechaHoraFin?: string;
  tipoVisita: TipoVisita;
  tipoVisitaNombre: string;
  resultado: ResultadoVisita;
  resultadoNombre: string;
  duracionMinutos?: number;
  tienePedido: boolean;
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

// Respuesta paginada
export interface VisitasPaginatedResult {
  items: ClienteVisitaListaDto[];
  totalItems: number;
  pagina: number;
  tamanoPagina: number;
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
