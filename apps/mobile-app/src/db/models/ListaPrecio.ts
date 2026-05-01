import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export default class ListaPrecio extends Model {
  static table = 'listas_precio';

  @field('server_id') serverId!: number;
  @field('tenant_id') tenantId!: number;
  @text('nombre') nombre!: string;
  @text('descripcion') descripcion!: string | null;
  @field('activo') activo!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
