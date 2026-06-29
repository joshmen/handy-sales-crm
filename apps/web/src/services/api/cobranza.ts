import { api, handleApiError } from '@/lib/api';

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

/**
 * 2026-06-08: modo explicito de cobro (plan eager-drifting cobros 3 modos).
 * Espeja Domain.Entities.ModoCobro + Application.DTOs.ModoCobroDto.
 * Valores numericos del enum backend — usar ModoCobro.PorPedido en lugar de 0.
 */
export enum ModoCobro {
  PorPedido = 0,
  AbonoFifo = 1,
  Anticipo = 2,
}

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
  /** 2026-06-08: modo del cobro. Default PorPedido para cobros pre-feature. */
  modo?: ModoCobro;
  /** 2026-06-08: true si el cobro genera saldoFavor (modo Anticipo). */
  esAnticipo?: boolean;
}

export interface CobroCreateDto {
  pedidoId: number | null;
  clienteId: number;
  monto: number;
  metodoPago: number;
  fechaCobro?: string;
  referencia?: string;
  notas?: string;
  /**
   * 2026-06-08: modo explicito del cobro. Opcional para retrocompat —
   * si se omite, backend asume PorPedido (default), que requiere pedidoId.
   * Web siempre debe enviar este campo a partir de PR 3 del plan eager-drifting.
   */
  modo?: ModoCobro;
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

/**
 * 2026-06-09 PR 6 plan eager-drifting cobros (FIFO preview).
 * Resultado del endpoint /cobros/fifo-preview — calculo SIN persistir.
 * `cobroId` siempre es 0 en preview (no se ha creado).
 */
export interface FifoAplicacion {
  cobroId: number;
  pedidoId: number;
  numeroPedido: string;
  montoAplicado: number;
}

// ═══════════════════════════════════════════════════════
// METODO PAGO OPTIONS
// ═══════════════════════════════════════════════════════

export const METODO_PAGO_OPTIONS = [
  { value: 0, labelKey: 'cash' },
  { value: 1, labelKey: 'transfer' },
  { value: 2, labelKey: 'check' },
  { value: 3, labelKey: 'creditCard' },
  { value: 4, labelKey: 'debitCard' },
  { value: 5, labelKey: 'other' },
];

// ═══════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════

/**
 * 2026-06: agregado del PERIODO que el backend devuelve junto al list de cobros.
 * CobradoTotal = SUM(monto) y count = COUNT sobre el set FILTRADO COMPLETO
 * (rango tz-correcto sobre fechaCobro + clienteId + usuarioId), no la pagina.
 * Distinto de ResumenCartera (cartera = snapshot global de saldos pendientes).
 */
export interface CobroPeriodoResumen {
  cobradoTotal: number;
  count: number;
}

/**
 * El backend ahora responde `{ items, resumen }`. Para no romper los callers
 * que tratan getCobros como un array (p.ej. cobranza/page.tsx hace
 * setCobros(await getCobros(...))), retornamos el array de items con `resumen`
 * adjunto como propiedad — sigue siendo asignable a Cobro[].
 */
export type CobrosResult = Cobro[] & { resumen?: CobroPeriodoResumen };

interface CobrosListResponse {
  items: Cobro[];
  resumen?: CobroPeriodoResumen;
}

export async function getCobros(params?: {
  clienteId?: number;
  desde?: string;
  hasta?: string;
  usuarioId?: number;
}): Promise<CobrosResult> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.clienteId) searchParams.append('clienteId', String(params.clienteId));
    if (params?.desde) searchParams.append('desde', params.desde);
    if (params?.hasta) searchParams.append('hasta', params.hasta);
    if (params?.usuarioId) searchParams.append('usuarioId', String(params.usuarioId));
    const qs = searchParams.toString();
    const res = await api.get<CobrosListResponse>(`/cobros${qs ? `?${qs}` : ''}`);
    const items = (res.data?.items ?? []) as CobrosResult;
    items.resumen = res.data?.resumen;
    return items;
  } catch (error) {
    throw handleApiError(error);
  }
}

export async function getCobroById(id: number): Promise<Cobro> {
  try {
    const res = await api.get<Cobro>(`/cobros/${id}`);
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

export async function createCobro(dto: CobroCreateDto): Promise<{ id: number }> {
  try {
    const res = await api.post<{ id: number }>('/cobros', dto);
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

export async function updateCobro(id: number, dto: CobroUpdateDto): Promise<void> {
  try {
    await api.put(`/cobros/${id}`, dto);
  } catch (error) {
    throw handleApiError(error);
  }
}

export async function deleteCobro(id: number): Promise<void> {
  try {
    await api.delete(`/cobros/${id}`);
  } catch (error) {
    throw handleApiError(error);
  }
}

export async function getSaldos(clienteId?: number): Promise<SaldoCliente[]> {
  try {
    const qs = clienteId ? `?clienteId=${clienteId}` : '';
    const res = await api.get<SaldoCliente[]>(`/cobros/saldos${qs}`);
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

export async function getResumenCartera(): Promise<ResumenCartera> {
  try {
    const res = await api.get<ResumenCartera>('/cobros/saldos/resumen');
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

export async function getEstadoCuenta(clienteId: number, historico = false): Promise<EstadoCuenta> {
  try {
    const qs = historico ? '?historico=true' : '';
    const res = await api.get<EstadoCuenta>(`/cobros/cliente/${clienteId}/estado-cuenta${qs}`);
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * 2026-06-09 PR 6: preview de la distribución FIFO sin persistir.
 * Llama a POST /cobros/fifo-preview con { clienteId, monto } y retorna
 * la lista de aplicaciones (PED-XXX → $monto) que se generarían si el
 * usuario hiciera submit del cobro en modo AbonoFifo.
 *
 * Throws (con mensaje del backend) si el cliente no tiene pedidos
 * abiertos o si el monto excede el saldo total pendiente.
 */
export async function getFifoPreview(clienteId: number, monto: number): Promise<FifoAplicacion[]> {
  try {
    const res = await api.post<FifoAplicacion[]>('/cobros/fifo-preview', { clienteId, monto });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
}
