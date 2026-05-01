import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export default class DatosEmpresa extends Model {
  static table = 'datos_empresa';

  @field('server_id') serverId!: number;
  @field('tenant_id') tenantId!: number;
  @text('razon_social') razonSocial!: string | null;
  @text('identificador_fiscal') identificadorFiscal!: string | null;
  @text('tipo_identificador_fiscal') tipoIdentificadorFiscal!: string;
  @text('telefono') telefono!: string | null;
  @text('email') email!: string | null;
  @text('contacto') contacto!: string | null;
  @text('direccion') direccion!: string | null;
  @text('ciudad') ciudad!: string | null;
  @text('estado') estado!: string | null;
  @text('codigo_postal') codigoPostal!: string | null;
  @text('sitio_web') sitioWeb!: string | null;
  @text('descripcion') descripcion!: string | null;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
