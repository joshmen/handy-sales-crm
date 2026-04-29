import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

/**
 * Catálogo de tasas de impuesto sincronizado desde web admin (read-only en mobile).
 * v16 schema (2026-04-29). El cálculo de tickets en revision.tsx usa la `tasa`
 * denormalizada en `productos.tasa` directamente — esta tabla es para mostrar
 * el catálogo si en el futuro se requiere UI de selección en mobile.
 */
export default class TasaImpuesto extends Model {
  static table = 'tasas_impuesto';

  @field('server_id') serverId!: number;
  @field('tenant_id') tenantId!: number;
  @text('nombre') nombre!: string;
  @field('tasa') tasa!: number;
  @text('clave_sat') claveSat!: string;
  @text('tipo_impuesto') tipoImpuesto!: string;
  @field('es_default') esDefault!: boolean;
  @field('activo') activo!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
