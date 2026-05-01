import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

/**
 * Ping GPS del vendedor pendiente de sincronizar al backend.
 * v19 schema (2026-05-01).
 *
 * `capturadoEn` es el timestamp del fix GPS en el device (NO ms-since-epoch
 * del momento de creación de la fila — eso es `createdAt`). Crítico para
 * preservar orden cronológico cuando un batch sube tras horas offline.
 *
 * `sincronizado=false` lo marca como pendiente. El sync engine consulta
 * por ese flag, manda batch a /api/mobile/tracking/batch y marca true.
 */
export default class UbicacionVendedor extends Model {
  static table = 'ubicaciones_vendedor';

  @field('usuario_id') usuarioId!: number;
  @field('latitud') latitud!: number;
  @field('longitud') longitud!: number;
  @field('precision_metros') precisionMetros!: number | null;
  @field('tipo') tipo!: number; // enum int (0=Venta, 5=Checkpoint, etc)
  @date('capturado_en') capturadoEn!: Date;
  @field('referencia_id') referenciaId!: number | null;
  @field('sincronizado') sincronizado!: boolean;
  @readonly @date('created_at') createdAt!: Date;
}
