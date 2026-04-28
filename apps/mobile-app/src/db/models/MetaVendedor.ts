import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export default class MetaVendedor extends Model {
  static table = 'metas_vendedor';

  @field('server_id') serverId!: number;
  @field('tenant_id') tenantId!: number;
  @field('usuario_id') usuarioId!: number;
  @text('tipo') tipo!: string;
  @text('periodo') periodo!: string;
  @field('monto') monto!: number;
  @date('fecha_inicio') fechaInicio!: Date;
  @date('fecha_fin') fechaFin!: Date;
  @field('activo') activo!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
