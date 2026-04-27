import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, children, writer } from '@nozbe/watermelondb/decorators';

export default class Ruta extends Model {
  static table = 'rutas';

  static associations = {
    ruta_detalles: { type: 'has_many' as const, foreignKey: 'ruta_id' },
  };

  @field('server_id') serverId!: number | null;
  @text('nombre') nombre!: string;
  @date('fecha') fecha!: Date;
  @field('usuario_id') usuarioId!: number;
  @field('estado') estado!: number;
  @field('km_recorridos') kmRecorridos!: number | null;
  @date('hora_inicio') horaInicio!: Date | null;
  @date('hora_fin') horaFin!: Date | null;
  @text('hora_inicio_estimada') horaInicioEstimada!: string | null;
  @text('hora_fin_estimada') horaFinEstimada!: string | null;
  @text('notas') notas!: string | null;
  @field('activo') activo!: boolean;
  @field('version') version!: number;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  /// Multi-zona: JSON array de IDs de zonas que cubre la ruta. Read-only en
  /// mobile (admin define desde web). v13 schema (2026-04-27).
  @text('zonas_json') zonasJson!: string | null;

  @children('ruta_detalles') detalles: any;

  /**
   * Parser de la columna `zonas_json` a array de números. Si la columna está
   * vacía o el JSON es inválido, retorna []. Caller usa esto en UI para
   * mostrar chips de zonas.
   */
  get zonaIds(): number[] {
    if (!this.zonasJson) return [];
    try {
      const parsed = JSON.parse(this.zonasJson);
      return Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'number') : [];
    } catch {
      return [];
    }
  }

  @writer async updateEstado(estado: number) {
    await this.update((record: any) => {
      record.estado = estado;
    });
  }

  @writer async startRoute() {
    await this.update((record: any) => {
      record.estado = 1; // EnProgreso
      record.horaInicio = new Date();
    });
  }

  @writer async completeRoute(kmRecorridos?: number) {
    await this.update((record: any) => {
      record.estado = 2; // Completada
      record.horaFin = new Date();
      if (kmRecorridos != null) record.kmRecorridos = kmRecorridos;
    });
  }
}
