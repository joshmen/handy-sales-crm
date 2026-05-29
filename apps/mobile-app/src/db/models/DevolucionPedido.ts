import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, children } from '@nozbe/watermelondb/decorators';
import type { Query } from '@nozbe/watermelondb';
import type DetalleDevolucion from './DetalleDevolucion';

/**
 * Devolucion de un Pedido entregado. Parent de DetalleDevolucion (CASCADE).
 * TipoReembolso=SaldoFavor (0) genera credito al cliente; =Efectivo (1) sale del corte de caja.
 * Foto evidencia opcional via attachments (event_type='devolucion').
 * Sync push hacia backend SyncRepository.UpsertDevolucionAsync (parent + children atomico).
 */
export default class DevolucionPedido extends Model {
  static table = 'devoluciones_pedido';
  static associations = {
    detalle_devoluciones: { type: 'has_many' as const, foreignKey: 'devolucion_id' },
  };

  @field('server_id') serverId!: number | null;
  @field('pedido_id') pedidoId!: string;
  @field('pedido_server_id') pedidoServerId!: number | null;
  @field('cliente_id') clienteId!: string;
  @field('cliente_server_id') clienteServerId!: number | null;
  @field('usuario_id') usuarioId!: number;
  @field('ruta_id') rutaId!: string | null;
  @field('ruta_server_id') rutaServerId!: number | null;
  @date('fecha_devolucion') fechaDevolucion!: Date;
  @field('motivo') motivo!: number; // MotivoDevolucion enum
  @text('notas') notas!: string | null;
  @field('tipo_reembolso') tipoReembolso!: number; // 0=SaldoFavor, 1=Efectivo
  @field('monto_total') montoTotal!: number;
  @text('foto_evidencia_url') fotoEvidenciaUrl!: string | null;
  @field('estado') estado!: number; // 0=Activa, 1=Anulada
  @field('activo') activo!: boolean;
  @field('version') version!: number;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @children('detalle_devoluciones') detalles!: Query<DetalleDevolucion>;
}
