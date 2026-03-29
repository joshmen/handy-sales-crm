import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, relation, writer } from '@nozbe/watermelondb/decorators';

export default class RutaDetalle extends Model {
  static table = 'ruta_detalles';

  static associations = {
    rutas: { type: 'belongs_to' as const, key: 'ruta_id' },
  };

  @field('server_id') serverId!: number | null;
  @field('ruta_id') rutaId!: string;
  @field('cliente_id') clienteId!: string;
  @field('cliente_server_id') clienteServerId!: number | null;
  @field('orden') orden!: number;
  @field('pedido_id') pedidoId!: string | null;
  @field('estado') estado!: number;
  @date('hora_llegada') horaLlegada!: Date | null;
  @date('hora_salida') horaSalida!: Date | null;
  @field('latitud_llegada') latitudLlegada!: number | null;
  @field('longitud_llegada') longitudLlegada!: number | null;
  @text('notas') notas!: string | null;
  @field('version') version!: number;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @relation('rutas', 'ruta_id') ruta: any;

  @writer async arrive(lat: number, lng: number) {
    await this.update((record: any) => {
      record.estado = 1; // EnVisita
      record.horaLlegada = new Date();
      record.latitudLlegada = lat;
      record.longitudLlegada = lng;
    });
  }

  @writer async depart() {
    await this.update((record: any) => {
      record.estado = 2; // Completada
      record.horaSalida = new Date();
    });
  }

  @writer async skip(notas?: string) {
    await this.update((record: any) => {
      record.estado = 3; // Omitida
      if (notas) record.notas = notas;
    });
  }
}
