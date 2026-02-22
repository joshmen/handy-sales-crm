export interface MobilePedido {
  id: number;
  numeroPedido: string;
  clienteId: number;
  clienteNombre: string;
  usuarioId: number;
  usuarioNombre: string;
  fechaPedido: string;
  fechaEntregaEstimada?: string;
  fechaEntregaReal?: string;
  estado: number;
  estadoNombre: string;
  subtotal: number;
  descuento: number;
  impuestos: number;
  total: number;
  notas?: string;
  direccionEntrega?: string;
  latitud?: number;
  longitud?: number;
  listaPrecioId?: number;
  listaPrecioNombre?: string;
  detalles: MobileDetallePedido[];
  creadoEn: string;
  actualizadoEn?: string;
}

export interface MobileDetallePedido {
  id: number;
  productoId: number;
  productoNombre: string;
  productoSku?: string;
  productoImagen?: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  porcentajeDescuento: number;
  subtotal: number;
  impuesto: number;
  total: number;
  notas?: string;
}

export interface PedidoCreateRequest {
  clienteId: number;
  fechaEntregaEstimada?: string;
  notas?: string;
  direccionEntrega?: string;
  latitud?: number;
  longitud?: number;
  listaPrecioId?: number;
  detalles: DetallePedidoCreateRequest[];
}

export interface DetallePedidoCreateRequest {
  productoId: number;
  cantidad: number;
  precioUnitario?: number;
  descuento?: number;
  porcentajeDescuento?: number;
  notas?: string;
}
