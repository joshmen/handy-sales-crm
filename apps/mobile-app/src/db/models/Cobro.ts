import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export default class Cobro extends Model {
  static table = 'cobros';

  @field('server_id') serverId!: number | null;
  @field('cliente_id') clienteId!: string;
  @field('cliente_server_id') clienteServerId!: number | null;
  @field('usuario_id') usuarioId!: number;
  @field('pedido_id') pedidoId!: string | null;
  @field('monto') monto!: number;
  @field('metodo_pago') metodoPago!: number;
  @text('referencia') referencia!: string | null;
  @text('notas') notas!: string | null;
  @field('activo') activo!: boolean;
  @field('version') version!: number;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
