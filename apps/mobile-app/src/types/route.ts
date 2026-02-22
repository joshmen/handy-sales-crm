export interface MobileRuta {
  id: number;
  usuarioId: number;
  usuarioNombre: string;
  zonaId?: number;
  zonaNombre?: string;
  nombre: string;
  descripcion?: string;
  fecha: string;
  horaInicioEstimada?: string;
  horaFinEstimada?: string;
  horaInicioReal?: string;
  horaFinReal?: string;
  estado: number;
  estadoNombre: string;
  kilometrosEstimados?: number;
  kilometrosReales?: number;
  notas?: string;
  efectivoInicial?: number;
  totalParadas: number;
  paradasCompletadas: number;
  paradasPendientes: number;
  detalles: MobileRutaDetalle[];
  creadoEn: string;
}

export interface MobileRutaDetalle {
  id: number;
  rutaId: number;
  clienteId: number;
  clienteNombre: string;
  clienteDireccion?: string;
  clienteLatitud?: number;
  clienteLongitud?: number;
  ordenVisita: number;
  horaEstimadaLlegada?: string;
  duracionEstimadaMinutos?: number;
  horaLlegadaReal?: string;
  horaSalidaReal?: string;
  estado: number;
  estadoNombre: string;
  visitaId?: number;
  pedidoId?: number;
  notas?: string;
  razonOmision?: string;
  distanciaDesdeAnterior?: number;
}
