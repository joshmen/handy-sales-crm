import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export default class Usuario extends Model {
  static table = 'usuarios';

  @field('server_id') serverId!: number;
  @field('tenant_id') tenantId!: number;
  @text('nombre') nombre!: string;
  @text('email') email!: string;
  @text('rol') rol!: string | null;
  @text('avatar_url') avatarUrl!: string | null;
  @field('activo') activo!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
