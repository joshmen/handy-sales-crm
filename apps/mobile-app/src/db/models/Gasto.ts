import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

/**
 * Gasto del vendedor (combustible, peajes, comida, etc.).
 * Auto-aprobado al crearse. Foto del ticket opcional via attachments
 * (event_type='gasto', event_local_id=this.id).
 * Sync push hacia backend SyncRepository.UpsertGastoAsync.
 * comprobante_url es stampeado server-side post-upload del attachment.
 */
export default class Gasto extends Model {
  static table = 'gastos';

  @field('server_id') serverId!: number | null;
  @field('ruta_id') rutaId!: string | null;
  @field('ruta_server_id') rutaServerId!: number | null;
  @field('usuario_id') usuarioId!: number;
  @date('fecha_gasto') fechaGasto!: Date;
  @field('monto') monto!: number;
  @field('tipo_gasto') tipoGasto!: number; // TipoGasto enum (0=Combustible..99=Otro)
  @text('concepto') concepto!: string;
  @text('notas') notas!: string | null;
  @text('comprobante_url') comprobanteUrl!: string | null;
  @text('moneda') moneda!: string;
  @field('estado') estado!: number; // 0=Activo, 1=Invalidado
  @field('activo') activo!: boolean;
  @field('version') version!: number;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
