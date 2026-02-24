import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, children, writer } from '@nozbe/watermelondb/decorators';

export default class Pedido extends Model {
  static table = 'pedidos';

  static associations = {
    detalle_pedidos: { type: 'has_many' as const, foreignKey: 'pedido_id' },
  };

  @field('server_id') serverId!: number | null;
  @field('cliente_id') clienteId!: string;
  @field('cliente_server_id') clienteServerId!: number | null;
  @field('usuario_id') usuarioId!: number;
  @text('numero_pedido') numeroPedido!: string | null;
  @date('fecha_pedido') fechaPedido!: Date | null;
  @field('estado') estado!: number;
  @field('subtotal') subtotal!: number;
  @field('descuento') descuento!: number;
  @field('impuesto') impuesto!: number;
  @field('total') total!: number;
  @text('notas') notas!: string | null;
  @field('activo') activo!: boolean;
  @field('version') version!: number;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @children('detalle_pedidos') detalles: any;

  @writer async updateStatus(estado: number) {
    await this.update((record: any) => {
      record.estado = estado;
    });
  }

  @writer async recalculateTotals(subtotal: number, impuesto: number) {
    await this.update((record: any) => {
      record.subtotal = subtotal;
      record.impuesto = impuesto;
      record.total = subtotal + impuesto;
    });
  }
}
