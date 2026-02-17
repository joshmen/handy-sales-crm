import { api } from '@/lib/api';

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

export interface VentasPeriodoResponse {
  periodos: VentaPeriodo[];
  totales: {
    totalVentas: number;
    cantidadPedidos: number;
    ticketPromedio: number;
  };
}

export interface VentaPeriodo {
  fecha: string;
  totalVentas: number;
  cantidadPedidos: number;
  ticketPromedio: number;
}

export interface VentasVendedorResponse {
  vendedores: VentaVendedor[];
}

export interface VentaVendedor {
  usuarioId: number;
  nombre: string;
  email: string;
  totalVentas: number;
  cantidadPedidos: number;
  ticketPromedio: number;
  totalVisitas: number;
  visitasConVenta: number;
  efectividadVisitas: number;
  primerPedido: string | null;
  ultimoPedido: string | null;
}

export interface VentasProductoResponse {
  masVendidos: VentaProducto[];
  mayorVenta: VentaProducto[];
  sinVenta: { productoId: number; nombre: string }[];
  totalGeneral: number;
}

export interface VentaProducto {
  productoId: number;
  nombre: string;
  cantidadVendida: number;
  totalVentas: number;
  porcentajeDelTotal: number;
}

export interface VentasZonaResponse {
  zonas: VentaZona[];
  totales: {
    totalClientes: number;
    totalPedidos: number;
    totalVentas: number;
  };
}

export interface VentaZona {
  zonaId: number;
  nombre: string;
  totalClientes: number;
  pedidos: number;
  ventasTotales: number;
}

export interface ActividadClientesResponse {
  clientes: ActividadCliente[];
  total: number;
  page: number;
  limit: number;
}

export interface ActividadCliente {
  clienteId: number;
  nombre: string;
  zona: string;
  pedidos: number;
  ventasTotales: number;
  visitas: number;
  ultimaVisita: string | null;
  ultimoPedido: string | null;
}

export interface NuevosClientesResponse {
  clientes: NuevoCliente[];
  total: number;
  porMes: { mes: string; cantidad: number }[];
}

export interface NuevoCliente {
  clienteId: number;
  nombre: string;
  zona: string;
  correo: string;
  telefono: string;
  fechaCreacion: string;
  creadoPor: string;
}

export interface InventarioResponse {
  productos: InventarioProducto[];
  resumen: {
    total: number;
    sinStock: number;
    bajo: number;
    normal: number;
    exceso: number;
  };
}

export interface InventarioProducto {
  productoId: number;
  nombre: string;
  codigoBarra: string;
  stockActual: number;
  stockMinimo: number;
  stockMaximo: number;
  estado: 'sin_stock' | 'bajo' | 'normal' | 'exceso';
}

export interface DashboardEjecutivoResponse {
  ventas: {
    total: number;
    pedidos: number;
    ticketPromedio: number;
    crecimientoPct: number;
    ventasPeriodoAnterior: number;
  };
  visitas: {
    total: number;
    conVenta: number;
    sinVenta: number;
    efectividadPct: number;
  };
  nuevosClientes: number;
  topVendedor: { nombre: string; totalVentas: number } | null;
  topProducto: { nombre: string; totalVentas: number; cantidadVendida: number } | null;
  alertas: {
    inventarioBajo: number;
  };
}

// ═══════════════════════════════════════════════════════
// DATE HELPERS
// ═══════════════════════════════════════════════════════

function formatParams(params: { desde?: string; hasta?: string; [key: string]: string | number | undefined }) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== '') searchParams.set(key, String(val));
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

// ═══════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════

export async function getVentasPeriodo(params: {
  desde?: string;
  hasta?: string;
  agrupacion?: 'dia' | 'semana' | 'mes';
}): Promise<VentasPeriodoResponse> {
  const res = await api.get<VentasPeriodoResponse>(`/api/reports/ventas-periodo${formatParams(params)}`);
  return res.data;
}

export async function getVentasVendedor(params: {
  desde?: string;
  hasta?: string;
}): Promise<VentasVendedorResponse> {
  const res = await api.get<VentasVendedorResponse>(`/api/reports/ventas-vendedor${formatParams(params)}`);
  return res.data;
}

export async function getVentasProducto(params: {
  desde?: string;
  hasta?: string;
  top?: number;
}): Promise<VentasProductoResponse> {
  const res = await api.get<VentasProductoResponse>(`/api/reports/ventas-producto${formatParams(params)}`);
  return res.data;
}

export async function getVentasZona(params: {
  desde?: string;
  hasta?: string;
}): Promise<VentasZonaResponse> {
  const res = await api.get<VentasZonaResponse>(`/api/reports/ventas-zona${formatParams(params)}`);
  return res.data;
}

export async function getActividadClientes(params: {
  desde?: string;
  hasta?: string;
  zonaId?: number;
  page?: number;
  limit?: number;
}): Promise<ActividadClientesResponse> {
  const res = await api.get<ActividadClientesResponse>(`/api/reports/actividad-clientes${formatParams(params)}`);
  return res.data;
}

export async function getNuevosClientes(params: {
  desde?: string;
  hasta?: string;
  zonaId?: number;
}): Promise<NuevosClientesResponse> {
  const res = await api.get<NuevosClientesResponse>(`/api/reports/nuevos-clientes${formatParams(params)}`);
  return res.data;
}

export async function getInventario(): Promise<InventarioResponse> {
  const res = await api.get<InventarioResponse>('/api/reports/inventario');
  return res.data;
}

export async function getDashboardEjecutivo(params: {
  periodo?: 'semana' | 'mes' | 'trimestre';
}): Promise<DashboardEjecutivoResponse> {
  const res = await api.get<DashboardEjecutivoResponse>(`/api/reports/ejecutivo${formatParams(params)}`);
  return res.data;
}
