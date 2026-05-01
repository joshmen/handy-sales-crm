import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export default class Promocion extends Model {
  static table = 'promociones';

  @field('server_id') serverId!: number;
  @text('nombre') nombre!: string;
  @field('descuento_porcentaje') descuentoPorcentaje!: number;
  @date('fecha_inicio') fechaInicio!: Date;
  @date('fecha_fin') fechaFin!: Date;
  @text('producto_ids') productoIdsJson!: string; // JSON array: "[1,2,3]"
  @field('activo') activo!: boolean;
  @field('version') version!: number;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  // v18 BOGO
  @field('tipo_promocion') tipoPromocion!: number; // 0=Porcentaje, 1=Regalo
  @field('cantidad_compra') cantidadCompra!: number | null;
  @field('cantidad_bonificada') cantidadBonificada!: number | null;
  @field('producto_bonificado_id') productoBonificadoId!: number | null;

  get productoIds(): number[] {
    try { return JSON.parse(this.productoIdsJson || '[]'); }
    catch { return []; }
  }

  /** True si la promo es BOGO (compra N regala M). */
  get esRegalo(): boolean {
    return this.tipoPromocion === 1;
  }
}
