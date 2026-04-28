import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';

/**
 * Producto suelto cargado en el camión para venta directa (junction RutasCarga
 * en backend). Read-only en mobile — admin define la carga desde web. Mobile
 * solo lo muestra para que el vendedor sepa qué inventario lleva disponible.
 *
 * Cantidades:
 * - cantidadEntrega: para entregar pedidos asignados (RutasPedidos)
 * - cantidadVenta: para venta directa libre durante la ruta
 * - cantidadTotal: suma de ambas (lo que físicamente sale al camión)
 */
export default class RutaCarga extends Model {
  static table = 'ruta_carga';

  static associations = {
    rutas: { type: 'belongs_to' as const, key: 'ruta_id' },
    productos: { type: 'belongs_to' as const, key: 'producto_id' },
  };

  @field('server_id') serverId!: number;
  @field('ruta_id') rutaId!: string;
  @field('producto_id') productoId!: string;
  @field('producto_server_id') productoServerId!: number;
  @field('cantidad_entrega') cantidadEntrega!: number;
  @field('cantidad_venta') cantidadVenta!: number;
  @field('cantidad_total') cantidadTotal!: number;
  @field('precio_unitario') precioUnitario!: number;
  @field('activo') activo!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @relation('rutas', 'ruta_id') ruta: any;
  @relation('productos', 'producto_id') producto: any;
}
