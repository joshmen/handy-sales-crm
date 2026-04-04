import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, children, writer } from '@nozbe/watermelondb/decorators';

export default class Cliente extends Model {
  static table = 'clientes';

  static associations = {
    pedidos: { type: 'has_many' as const, foreignKey: 'cliente_id' },
    visitas: { type: 'has_many' as const, foreignKey: 'cliente_id' },
    cobros: { type: 'has_many' as const, foreignKey: 'cliente_id' },
    ruta_detalles: { type: 'has_many' as const, foreignKey: 'cliente_id' },
  };

  @field('server_id') serverId!: number | null;
  @text('nombre') nombre!: string;
  @text('nombre_comercial') nombreComercial!: string | null;
  @text('rfc') rfc!: string | null;
  @text('telefono') telefono!: string | null;
  @text('email') email!: string | null;
  @text('direccion') direccion!: string | null;
  @text('ciudad') ciudad!: string | null;
  @text('estado') estado!: string | null;
  @text('codigo_postal') codigoPostal!: string | null;
  @field('latitud') latitud!: number | null;
  @field('longitud') longitud!: number | null;
  @field('zona_id') zonaId!: number | null;
  @field('categoria_id') categoriaId!: number | null;
  @field('vendedor_id') vendedorId!: number | null;
  @field('limite_credito') limiteCredito!: number;
  @field('dias_credito') diasCredito!: number;
  @text('notas') notas!: string | null;
  @field('lista_precios_id') listaPreciosId!: number | null;
  @field('es_prospecto') esProspecto!: boolean;
  @text('rfc_fiscal') rfcFiscal!: string | null;
  @text('razon_social') razonSocial!: string | null;
  @text('regimen_fiscal') regimenFiscal!: string | null;
  @text('uso_cfdi') usoCfdi!: string | null;
  @text('cp_fiscal') cpFiscal!: string | null;
  @field('requiere_factura') requiereFactura!: boolean;
  @field('activo') activo!: boolean;
  @field('version') version!: number;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @children('pedidos') pedidos: any;
  @children('visitas') visitas: any;
  @children('cobros') cobros: any;

  @writer async updateFields(fields: Partial<Record<string, any>>) {
    await this.update((record: any) => {
      Object.entries(fields).forEach(([key, value]) => {
        record[key] = value;
      });
    });
  }
}
