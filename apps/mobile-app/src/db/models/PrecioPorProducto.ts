import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export default class PrecioPorProducto extends Model {
  static table = 'precios_por_producto';

  @field('server_id') serverId!: number;
  @field('producto_server_id') productoServerId!: number;
  @field('lista_precio_id') listaPrecioId!: number;
  @field('precio') precio!: number;
  @field('activo') activo!: boolean;
  @field('version') version!: number;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
