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
  clientesActivos: number;
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

// ═══════════════════════════════════════════════════════
// R9-R12 TYPES
// ═══════════════════════════════════════════════════════

export interface CarteraVencidaResponse {
  clientes: CarteraCliente[];
  buckets: {
    corriente: { count: number; total: number };
    d31_60: { count: number; total: number };
    d61_90: { count: number; total: number };
    d90plus: { count: number; total: number };
  };
  totalCartera: number;
  totalClientes: number;
}

export interface CarteraCliente {
  clienteId: number;
  nombre: string;
  saldo: number;
  diasVencido: number;
  bucket: 'corriente' | '31-60' | '61-90' | '90+';
  diasCredito: number;
  ultimoPago: string | null;
}

export interface CumplimientoMetasResponse {
  metas: MetaCumplimiento[];
  resumen: {
    totalMetas: number;
    cumplidas: number;
    noCumplidas: number;
    promedioCumplimiento: number;
  };
}

export interface MetaCumplimiento {
  metaId: number;
  usuarioId: number;
  vendedor: string;
  tipo: string;
  periodo: string;
  meta: number;
  actual: number;
  porcentajeCumplimiento: number;
  cumplida: boolean;
  fechaInicio: string;
  fechaFin: string;
}

export interface ComparativoResponse {
  periodo1: ComparativoPeriodo;
  periodo2: ComparativoPeriodo;
  deltas: Record<string, { valor1: number; valor2: number; diferencia: number; porcentajeCambio: number }>;
}

export interface ComparativoPeriodo {
  label: string;
  desde: string;
  hasta: string;
  totalVentas: number;
  cantidadPedidos: number;
  ticketPromedio: number;
  clientesUnicos: number;
  totalVisitas: number;
  nuevosClientes: number;
  totalCobros: number;
}

export interface InsightsResponse {
  insights: Insight[];
  periodo: { desde: string; hasta: string };
}

export interface Insight {
  tipo: string;
  titulo: string;
  descripcion: string;
  valor: number;
  tendencia: 'up' | 'down' | 'stable';
}

// ═══════════════════════════════════════════════════════
// R9-R12 API FUNCTIONS
// ═══════════════════════════════════════════════════════

export async function getCarteraVencida(params: {
  desde?: string;
  hasta?: string;
}): Promise<CarteraVencidaResponse> {
  const res = await api.get<CarteraVencidaResponse>(`/api/reports/cartera-vencida${formatParams(params)}`);
  return res.data;
}

export async function getCumplimientoMetas(params: {
  desde?: string;
  hasta?: string;
  usuarioId?: number;
}): Promise<CumplimientoMetasResponse> {
  const res = await api.get<CumplimientoMetasResponse>(`/api/reports/cumplimiento-metas${formatParams(params)}`);
  return res.data;
}

export async function getComparativo(params: {
  periodo1Desde: string;
  periodo1Hasta: string;
  periodo2Desde: string;
  periodo2Hasta: string;
}): Promise<ComparativoResponse> {
  const res = await api.get<ComparativoResponse>(`/api/reports/comparativo${formatParams(params)}`);
  return res.data;
}

export async function getInsights(params: {
  desde?: string;
  hasta?: string;
}): Promise<InsightsResponse> {
  const res = await api.get<InsightsResponse>(`/api/reports/insights${formatParams(params)}`);
  return res.data;
}

// ═══════════════════════════════════════════════════════
// REPORT TIER INFO
// ═══════════════════════════════════════════════════════

export interface ReportTierInfo {
  currentTier: string;
  allowedReports: string[];
  maxDateRangeDays: number | null;
}

export async function getReportTierInfo(): Promise<ReportTierInfo> {
  const res = await api.get<ReportTierInfo>('/api/reports/tier-info');
  return res.data;
}

// ═══════════════════════════════════════════════════════
// R13-R16 TYPES
// ═══════════════════════════════════════════════════════

export interface EfectividadVisitasResponse {
  vendedores: EfectividadVendedor[];
  heatmap: { dia: number; hora: number; cantidad: number }[];
  resumen: { totalVisitas: number; totalConVenta: number; tasaConversionGeneral: number };
}

export interface EfectividadVendedor {
  usuarioId: number;
  nombre: string;
  totalVisitas: number;
  visitasConVenta: number;
  tasaConversion: number;
  duracionPromedio: number;
}

export interface ComisionesResponse {
  vendedores: ComisionVendedor[];
  totalComisiones: number;
  totalVentas: number;
  porcentajeAplicado: number;
}

export interface ComisionVendedor {
  usuarioId: number;
  nombre: string;
  totalVentas: number;
  cantidadPedidos: number;
  porcentajeComision: number;
  comision: number;
}

export interface RentabilidadClienteResponse {
  clientes: RentabilidadCliente[];
  total: number;
}

export interface RentabilidadCliente {
  clienteId: number;
  nombre: string;
  totalVentas: number;
  cantidadPedidos: number;
  ticketPromedio: number;
  diasEntrePedidos: number;
  primerPedido: string | null;
  ultimoPedido: string | null;
}

export interface AnalisisABCResponse {
  tipo: string;
  items: ABCItem[];
  resumen: { claseA: number; claseB: number; claseC: number; totalGeneral: number };
}

export interface ABCItem {
  id: number;
  nombre: string;
  totalVentas: number;
  porcentaje: number;
  porcentajeAcumulado: number;
  clase: 'A' | 'B' | 'C';
}

// ═══════════════════════════════════════════════════════
// R13-R16 API FUNCTIONS
// ═══════════════════════════════════════════════════════

export async function getEfectividadVisitas(params: {
  desde?: string;
  hasta?: string;
}): Promise<EfectividadVisitasResponse> {
  const res = await api.get<EfectividadVisitasResponse>(`/api/reports/efectividad-visitas${formatParams(params)}`);
  return res.data;
}

export async function getComisiones(params: {
  desde?: string;
  hasta?: string;
  porcentaje?: number;
}): Promise<ComisionesResponse> {
  const res = await api.get<ComisionesResponse>(`/api/reports/comisiones${formatParams(params)}`);
  return res.data;
}

export async function getRentabilidadCliente(params: {
  desde?: string;
  hasta?: string;
  top?: number;
}): Promise<RentabilidadClienteResponse> {
  const res = await api.get<RentabilidadClienteResponse>(`/api/reports/rentabilidad-cliente${formatParams(params)}`);
  return res.data;
}

export async function getAnalisisABC(params: {
  desde?: string;
  hasta?: string;
  tipo?: 'clientes' | 'productos';
}): Promise<AnalisisABCResponse> {
  const res = await api.get<AnalisisABCResponse>(`/api/reports/analisis-abc${formatParams(params)}`);
  return res.data;
}
