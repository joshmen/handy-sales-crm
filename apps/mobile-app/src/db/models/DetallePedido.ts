import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, relation } from '@nozbe/watermelondb/decorators';

export default class DetallePedido extends Model {
  static table = 'detalle_pedidos';

  static associations = {
    pedidos: { type: 'belongs_to' as const, key: 'pedido_id' },
  };

  @field('server_id') serverId!: number | null;
  @field('pedido_id') pedidoId!: string;
  @field('producto_id') productoId!: string;
  @field('producto_server_id') productoServerId!: number | null;
  @text('producto_nombre') productoNombre!: string;
  @field('cantidad') cantidad!: number;
  @field('precio_unitario') precioUnitario!: number;
  @field('descuento') descuento!: number;
  @field('subtotal') subtotal!: number;
  @field('version') version!: number;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  // v18 BOGO
  @field('cantidad_bonificada') cantidadBonificada!: number;
  @field('promocion_id') promocionId!: number | null;

  @relation('pedidos', 'pedido_id') pedido: any;
}
