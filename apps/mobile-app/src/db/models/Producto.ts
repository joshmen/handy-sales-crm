import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export default class Producto extends Model {
  static table = 'productos';

  @field('server_id') serverId!: number | null;
  @text('nombre') nombre!: string;
  @text('descripcion') descripcion!: string | null;
  @text('sku') sku!: string | null;
  @text('codigo_barras') codigoBarras!: string | null;
  @field('precio') precio!: number;
  @field('categoria_id') categoriaId!: number | null;
  @field('familia_id') familiaId!: number | null;
  @field('unidad_medida_id') unidadMedidaId!: number | null;
  @text('unidad_medida_nombre') unidadMedidaNombre!: string | null;
  @field('stock_disponible') stockDisponible!: number;
  @field('stock_minimo') stockMinimo!: number;
  @text('imagen_url') imagenUrl!: string | null;
  @field('activo') activo!: boolean;
  @field('version') version!: number;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  /// v16 (2026-04-29): catálogo de impuestos
  /// Si true (default), `precio` ya incluye IVA — es lo que el cliente paga.
  @field('precio_incluye_iva') precioIncluyeIva!: boolean;
  /// FK al server_id de TasaImpuesto. Null = usa default tenant.
  @field('tasa_impuesto_id') tasaImpuestoId!: number | null;
  /// Tasa decimal denormalizada (0.16 = 16%). Resuelta en backend.
  @field('tasa') tasa!: number;
}
