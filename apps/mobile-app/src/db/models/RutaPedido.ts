import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';

/**
 * Pedido cargado en el camión (junction RutasPedidos en backend). Read-only en
 * mobile — el admin desde web es quien asigna pedidos a la ruta. El vendedor
 * solo los visualiza para saber qué tiene que entregar.
 */
export default class RutaPedido extends Model {
  static table = 'ruta_pedidos';

  static associations = {
    rutas: { type: 'belongs_to' as const, key: 'ruta_id' },
    pedidos: { type: 'belongs_to' as const, key: 'pedido_id' },
  };

  @field('server_id') serverId!: number;
  @field('ruta_id') rutaId!: string;
  @field('pedido_id') pedidoId!: string;
  @field('pedido_server_id') pedidoServerId!: number;
  @field('estado') estado!: number; // 0=Asignado, 1=Entregado, 2=Devuelto
  @field('activo') activo!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @relation('rutas', 'ruta_id') ruta: any;
  @relation('pedidos', 'pedido_id') pedido: any;
}
