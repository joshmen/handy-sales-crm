import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

/**
 * Linea individual de una DevolucionPedido. CASCADE on parent.
 * Cantidad y precio congelados al momento de la devolucion (no se recalculan).
 */
export default class DetalleDevolucion extends Model {
  static table = 'detalle_devoluciones';

  @field('server_id') serverId!: number | null;
  @field('devolucion_id') devolucionId!: string;
  @field('devolucion_server_id') devolucionServerId!: number | null;
  @field('detalle_pedido_id') detallePedidoId!: string | null;
  @field('detalle_pedido_server_id') detallePedidoServerId!: number | null;
  @field('producto_id') productoId!: string;
  @field('producto_server_id') productoServerId!: number | null;
  @field('cantidad') cantidad!: number;
  @field('precio_unitario') precioUnitario!: number;
  @field('subtotal') subtotal!: number;
  @field('impuesto') impuesto!: number;
  @field('total') total!: number;
  @field('version') version!: number;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
