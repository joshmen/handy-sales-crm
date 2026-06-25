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

export interface VentaCategoria {
  categoria: string;
  totalVentas: number;
  porcentajeDelTotal: number;
}
export interface VentasCategoriaResponse {
  categorias: VentaCategoria[];
  totalGeneral: number;
}

/** Ventas agrupadas por categoría de producto (donut del dashboard de Reportes). */
export async function getVentasCategoria(params: {
  desde?: string;
  hasta?: string;
}): Promise<VentasCategoriaResponse> {
  const res = await api.get<VentasCategoriaResponse>(`/api/reports/ventas-categoria${formatParams(params)}`);
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
  /** Rango libre (YYYY-MM-DD, días tenant). Si se envían, tienen prioridad sobre `periodo`. */
  desde?: string;
  hasta?: string;
}): Promise<DashboardEjecutivoResponse> {
  const res = await api.get<DashboardEjecutivoResponse>(`/api/reports/ejecutivo${formatParams(params)}`);
  return res.data;
}

// ═══════════════════════════════════════════════════════
// R9-R12 TYPES
// ═══════════════════════════════════════════════════════

/** Fila de antigüedad de saldos (agrupada por cliente o vendedor). */
export interface CarteraFila {
  nombre: string;
  porVencer: number;
  b0_30: number;
  b1_31_60: number;
  b2_61_90: number;
  b3_mas90: number;
  total: number;
}

export interface CarteraTotalesBucket {
  porVencer: number;
  b0_30: number;
  b1_31_60: number;
  b2_61_90: number;
  b3_mas90: number;
  total: number;
}

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
  // Antigüedad de saldos (vista mejorada — buckets por fila + totales por bucket).
  filas: CarteraFila[];
  totalesPorBucket: CarteraTotalesBucket;
  agrupar: string;
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
  agrupar?: 'cliente' | 'vendedor';
}): Promise<CarteraVencidaResponse> {
  const res = await api.get<CarteraVencidaResponse>(`/api/reports/cartera-vencida${formatParams(params)}`);
  return res.data;
}

// ═══════════════════════════════════════════════════════
// COBRANZA (CxC) — estado-cuenta / cobranza-periodo / por-vencer
// ═══════════════════════════════════════════════════════

export interface EstadoCuentaClienteOption {
  id: number;
  nombre: string;
}

export interface EstadoCuentaMovimiento {
  fecha: string;
  concepto: string;
  cargo: number;
  abono: number;
  saldo: number;
}

export interface EstadoCuentaResponse {
  clientes: EstadoCuentaClienteOption[];
  clienteId: number;
  clienteNombre: string;
  clienteRfc: string;
  movimientos: EstadoCuentaMovimiento[];
  cargosTotal: number;
  abonosTotal: number;
  saldoActual: number;
}

export async function getEstadoCuenta(params: {
  clienteId?: number;
  desde?: string;
  hasta?: string;
}): Promise<EstadoCuentaResponse> {
  const res = await api.get<EstadoCuentaResponse>(`/api/reports/estado-cuenta${formatParams(params)}`);
  return res.data;
}

export interface CobranzaCobro {
  fecha: string;
  cliente: string;
  vendedor: string;
  formaPago: string;
  monto: number;
}

export interface CobranzaPorForma {
  forma: string;
  monto: number;
  porcentaje: number;
}

export interface CobranzaPeriodoResponse {
  cobros: CobranzaCobro[];
  total: number;
  count: number;
  porForma: CobranzaPorForma[];
}

export async function getCobranzaPeriodo(params: {
  desde?: string;
  hasta?: string;
}): Promise<CobranzaPeriodoResponse> {
  const res = await api.get<CobranzaPeriodoResponse>(`/api/reports/cobranza-periodo${formatParams(params)}`);
  return res.data;
}

export interface PorVencerDocumento {
  cliente: string;
  folio: string;
  vence: string;
  dias: number;
  monto: number;
}

export interface PorVencerResponse {
  documentos: PorVencerDocumento[];
  totalPorVencer: number;
  dso: number;
  count: number;
}

export async function getPorVencer(params: {
  dias?: number;
}): Promise<PorVencerResponse> {
  const res = await api.get<PorVencerResponse>(`/api/reports/por-vencer${formatParams(params)}`);
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

/**
 * Mini-tendencias reales por reporte (clave = reportId del catálogo) para los
 * sparklines de las filas. Solo incluye reportes con agregado barato disponible;
 * los reportes sin serie no aparecen y el front omite su sparkline (no inventa data).
 */
export async function getReportSparklines(): Promise<Record<string, number[]>> {
  const res = await api.get<Record<string, number[]>>('/api/reports/sparklines');
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

// ═══════════════════════════════════════════════════════
// COSTEO — inventario valorizado / margen / rotación
// ═══════════════════════════════════════════════════════

export interface InvValorizadoProducto {
  productoId: number;
  nombre: string;
  existencia: number;
  costo: number;
  valor: number;
}

export interface InvValorizadoResponse {
  productos: InvValorizadoProducto[];
  totalValorizado: number;
  totalSkus: number;
  totalUnidades: number;
}

/** Inventario valorizado (sin rango). Costo promedio ponderado por SKU. */
export async function getInventarioValorizado(): Promise<InvValorizadoResponse> {
  const res = await api.get<InvValorizadoResponse>('/api/reports/inventario-valorizado');
  return res.data;
}

export interface MargenProducto {
  nombre: string;
  precio: number;
  costo: number;
  margenUnitario: number;
  margenPct: number;
  utilidad: number;
}

export interface MargenResponse {
  productos: MargenProducto[];
  utilidadBruta: number;
  margenPromedio: number;
}

/** Margen / rentabilidad por producto en un rango de fechas. */
export async function getMargen(params: {
  desde?: string;
  hasta?: string;
}): Promise<MargenResponse> {
  const res = await api.get<MargenResponse>(`/api/reports/margen${formatParams(params)}`);
  return res.data;
}

export type RotacionEstado = 'Reordenar' | 'Exceso' | 'OK';

export interface RotacionProducto {
  nombre: string;
  existencia: number;
  minimo: number;
  rotacion: number;
  diasInv: number;
  estado: RotacionEstado;
}

export interface RotacionResponse {
  productos: RotacionProducto[];
}

/** Rotación de inventario y reorden en un rango de fechas. */
export async function getRotacion(params: {
  desde?: string;
  hasta?: string;
}): Promise<RotacionResponse> {
  const res = await api.get<RotacionResponse>(`/api/reports/rotacion${formatParams(params)}`);
  return res.data;
}

// ═══════════════════════════════════════════════════════
// FINANCIEROS / FISCALES (Contabilidad)
// ═══════════════════════════════════════════════════════

/** Balanza de comprobación: saldos deudores/acreedores por cuenta contable. */
export interface BalanzaFila {
  codigo: string;
  nombre: string;
  debe: number;
  haber: number;
}

export interface BalanzaResponse {
  filas: BalanzaFila[];
  totalDebe: number;
  totalHaber: number;
  cuadrada: boolean;
}

export async function getBalanza(params: {
  desde?: string;
  hasta?: string;
}): Promise<BalanzaResponse> {
  const res = await api.get<BalanzaResponse>(`/api/reports/balanza${formatParams(params)}`);
  return res.data;
}

/** Estado de resultados: ingresos, costos y utilidad del período. */
export interface EstadoResultadosGasto {
  categoria: string;
  monto: number;
}

export interface EstadoResultadosResponse {
  ventasNetas: number;
  costoVentas: number;
  utilidadBruta: number;
  gastos: EstadoResultadosGasto[];
  totalGastos: number;
  utilidadOperacion: number;
  utilidadNeta: number;
  vertical: {
    costoVentas: number;
    utilidadBruta: number;
    gastos: number;
    utilidadOperacion: number;
    utilidadNeta: number;
  };
}

export async function getEstadoResultados(params: {
  desde?: string;
  hasta?: string;
}): Promise<EstadoResultadosResponse> {
  const res = await api.get<EstadoResultadosResponse>(`/api/reports/estado-resultados${formatParams(params)}`);
  return res.data;
}

/** Balance general: activo, pasivo y capital a una fecha de corte. */
export interface BalanceGeneralCuenta {
  cuenta: string;
  nombre: string;
  monto: number;
}

export interface BalanceGeneralResponse {
  activo: BalanceGeneralCuenta[];
  totalActivo: number;
  pasivo: BalanceGeneralCuenta[];
  totalPasivo: number;
  capital: BalanceGeneralCuenta[];
  totalCapital: number;
  totalPasivoCapital: number;
  cuadrado: boolean;
}

export async function getBalanceGeneral(params: {
  hasta?: string;
}): Promise<BalanceGeneralResponse> {
  const res = await api.get<BalanceGeneralResponse>(`/api/reports/balance-general${formatParams(params)}`);
  return res.data;
}

/** Reporte de IVA: trasladado vs acreditable y saldo del período. */
export interface ReporteIvaResponse {
  trasladado: number;
  acreditable: number;
  saldo: number;
  aCargo: boolean;
  ventasGravadas: number;
  comprasGravadas: number;
}

export async function getReporteIva(params: {
  desde?: string;
  hasta?: string;
}): Promise<ReporteIvaResponse> {
  const res = await api.get<ReporteIvaResponse>(`/api/reports/reporte-iva${formatParams(params)}`);
  return res.data;
}

/** DIOT: declaración informativa de operaciones con terceros. */
export interface DiotProveedor {
  rfc: string;
  nombre: string;
  tipoTercero: string;
  base: number;
  ivaPagado: number;
}

export interface DiotResponse {
  proveedores: DiotProveedor[];
  totalBase: number;
  totalIva: number;
}

export async function getDiot(params: {
  desde?: string;
  hasta?: string;
}): Promise<DiotResponse> {
  const res = await api.get<DiotResponse>(`/api/reports/diot${formatParams(params)}`);
  return res.data;
}

/** Contabilidad electrónica: catálogo, balanza y pólizas en XML para el SAT. */
export interface ContabilidadElectronicaResponse {
  periodo: string;
  catalogoXml: string;
  balanzaXml: string;
  polizasXml: string;
}

export async function getContabilidadElectronica(params: {
  desde?: string;
  hasta?: string;
}): Promise<ContabilidadElectronicaResponse> {
  const res = await api.get<ContabilidadElectronicaResponse>(`/api/reports/contabilidad-electronica${formatParams(params)}`);
  return res.data;
}

/** Paquete para el contador: ZIP con todos los reportes financieros y fiscales del mes. */
export async function descargarPaqueteContador(params: {
  desde?: string;
  hasta?: string;
}): Promise<Blob> {
  const res = await api.get<Blob>(`/api/reports/paquete-contador${formatParams(params)}`, {
    responseType: 'blob',
  });
  return res.data;
}
