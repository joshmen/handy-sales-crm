import { api } from '@/lib/api';

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

export interface Cobro {
  id: number;
  pedidoId: number;
  numeroPedido: string;
  clienteId: number;
  clienteNombre: string;
  usuarioId: number;
  usuarioNombre: string;
  monto: number;
  metodoPago: number;
  metodoPagoNombre: string;
  fechaCobro: string;
  referencia: string | null;
  notas: string | null;
  activo: boolean;
  creadoEn: string;
}

export interface CobroCreateDto {
  pedidoId: number;
  clienteId: number;
  monto: number;
  metodoPago: number;
  fechaCobro?: string;
  referencia?: string;
  notas?: string;
}

export interface CobroUpdateDto {
  monto: number;
  metodoPago: number;
  fechaCobro?: string;
  referencia?: string;
  notas?: string;
}

export interface SaldoCliente {
  clienteId: number;
  clienteNombre: string;
  totalFacturado: number;
  totalCobrado: number;
  saldoPendiente: number;
  pedidosPendientes: number;
}

export interface ResumenCartera {
  totalFacturado: number;
  totalCobrado: number;
  totalPendiente: number;
  clientesConSaldo: number;
}

export interface EstadoCuenta {
  clienteId: number;
  clienteNombre: string;
  totalFacturado: number;
  totalCobrado: number;
  saldoPendiente: number;
  pedidos: EstadoCuentaPedido[];
}

export interface EstadoCuentaPedido {
  pedidoId: number;
  numeroPedido: string;
  fechaPedido: string;
  total: number;
  cobrado: number;
  saldo: number;
  cobros: CobroResumen[];
}

export interface CobroResumen {
  id: number;
  monto: number;
  metodoPago: number;
  metodoPagoNombre: string;
  fechaCobro: string;
  referencia: string | null;
}

// ═══════════════════════════════════════════════════════
// METODO PAGO OPTIONS
// ═══════════════════════════════════════════════════════

export const METODO_PAGO_OPTIONS = [
  { value: 0, label: 'Efectivo' },
  { value: 1, label: 'Transferencia' },
  { value: 2, label: 'Cheque' },
  { value: 3, label: 'Tarjeta de Crédito' },
  { value: 4, label: 'Tarjeta de Débito' },
  { value: 5, label: 'Otro' },
];

// ═══════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════

export async function getCobros(params?: {
  clienteId?: number;
  desde?: string;
  hasta?: string;
  usuarioId?: number;
}): Promise<Cobro[]> {
  const searchParams = new URLSearchParams();
  if (params?.clienteId) searchParams.append('clienteId', String(params.clienteId));
  if (params?.desde) searchParams.append('desde', params.desde);
  if (params?.hasta) searchParams.append('hasta', params.hasta);
  if (params?.usuarioId) searchParams.append('usuarioId', String(params.usuarioId));
  const qs = searchParams.toString();
  const res = await api.get<Cobro[]>(`/cobros${qs ? `?${qs}` : ''}`);
  return res.data;
}

export async function getCobroById(id: number): Promise<Cobro> {
  const res = await api.get<Cobro>(`/cobros/${id}`);
  return res.data;
}

export async function createCobro(dto: CobroCreateDto): Promise<{ id: number }> {
  const res = await api.post<{ id: number }>('/cobros', dto);
  return res.data;
}

export async function updateCobro(id: number, dto: CobroUpdateDto): Promise<void> {
  await api.put(`/cobros/${id}`, dto);
}

export async function deleteCobro(id: number): Promise<void> {
  await api.delete(`/cobros/${id}`);
}

export async function getSaldos(clienteId?: number): Promise<SaldoCliente[]> {
  const qs = clienteId ? `?clienteId=${clienteId}` : '';
  const res = await api.get<SaldoCliente[]>(`/cobros/saldos${qs}`);
  return res.data;
}

export async function getResumenCartera(): Promise<ResumenCartera> {
  const res = await api.get<ResumenCartera>('/cobros/saldos/resumen');
  return res.data;
}

export async function getEstadoCuenta(clienteId: number): Promise<EstadoCuenta> {
  const res = await api.get<EstadoCuenta>(`/cobros/cliente/${clienteId}/estado-cuenta`);
  return res.data;
}
