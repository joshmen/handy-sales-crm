export interface MobileVisita {
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
  tipoVisita: number;
  tipoVisitaNombre: string;
  resultado: number;
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

export interface VisitaCreateRequest {
  clienteId: number;
  fechaProgramada?: string;
  tipoVisita?: number;
  notas?: string;
}

export interface CheckInRequest {
  latitud: number;
  longitud: number;
  notas?: string;
}

export interface CheckOutRequest {
  latitud?: number;
  longitud?: number;
  resultado: number;
  notas?: string;
  notasPrivadas?: string;
  fotos?: string[];
  pedidoId?: number;
}

export interface ResumenDiario {
  fecha: string;
  totalVisitas: number;
  visitasCompletadas: number;
  visitasConVenta: number;
  visitasPendientes: number;
  visitasCanceladas: number;
  tasaConversion: number;
}

export interface ResumenSemanal {
  fechaInicio: string;
  fechaFin: string;
  totalVisitas: number;
  visitasCompletadas: number;
  visitasConVenta: number;
  tasaConversion: number;
  promedioVisitasDiarias: number;
}
