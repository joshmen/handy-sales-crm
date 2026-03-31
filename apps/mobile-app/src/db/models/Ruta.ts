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

  @children('ruta_detalles') detalles: any;

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
