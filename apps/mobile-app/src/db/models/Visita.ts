import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, writer } from '@nozbe/watermelondb/decorators';

export default class Visita extends Model {
  static table = 'visitas';

  @field('server_id') serverId!: number | null;
  @field('cliente_id') clienteId!: string;
  @field('cliente_server_id') clienteServerId!: number | null;
  @field('usuario_id') usuarioId!: number;
  @field('ruta_id') rutaId!: string | null;
  @field('tipo') tipo!: number;
  @field('resultado') resultado!: number;
  @date('check_in_at') checkInAt!: Date | null;
  @date('check_out_at') checkOutAt!: Date | null;
  @field('latitud_check_in') latitudCheckIn!: number | null;
  @field('longitud_check_in') longitudCheckIn!: number | null;
  @field('distancia_check_in') distanciaCheckIn!: number | null;
  @text('notas') notas!: string | null;
  @field('activo') activo!: boolean;
  @field('version') version!: number;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @writer async checkIn(lat: number, lng: number, distancia: number) {
    await this.update((record: any) => {
      record.checkInAt = new Date();
      record.latitudCheckIn = lat;
      record.longitudCheckIn = lng;
      record.distanciaCheckIn = distancia;
      record.resultado = 1; // EnProgreso
    });
  }

  @writer async checkOut(resultado: number, notas?: string) {
    await this.update((record: any) => {
      record.checkOutAt = new Date();
      record.resultado = resultado;
      if (notas) record.notas = notas;
    });
  }
}
