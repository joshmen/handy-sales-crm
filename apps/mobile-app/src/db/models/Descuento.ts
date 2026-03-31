import { Model } from '@nozbe/watermelondb';
import { field, text, readonly, date } from '@nozbe/watermelondb/decorators';

export default class Descuento extends Model {
  static table = 'descuentos';

  @field('server_id') serverId!: number;
  @field('producto_server_id') productoServerId!: number | null;
  @field('cantidad_minima') cantidadMinima!: number;
  @field('descuento_porcentaje') descuentoPorcentaje!: number;
  @text('tipo_aplicacion') tipoAplicacion!: string; // 'Global' | 'Producto'
  @field('activo') activo!: boolean;
  @field('version') version!: number;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
