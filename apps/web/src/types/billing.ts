// ─── Billing Module TypeScript Types ───
// Maps to: apps/billing/HandySales.Billing.Api/DTOs/FacturaDtos.cs
//          apps/billing/HandySales.Billing.Api/Models/Catalogos.cs
//          apps/billing/HandySales.Billing.Api/Controllers/ReportesController.cs

// ─── Factura (Invoice) ───

export interface FacturaListItem {
  id: number;
  uuid: string | null;
  serie: string | null;
  folio: number;
  fechaEmision: string;
  receptorRfc: string;
  receptorNombre: string;
  total: number;
  estado: FacturaEstado;
  tipoComprobante: string;
}

export interface FacturaDetail {
  id: number;
  uuid: string | null;
  serie: string | null;
  folio: number;
  fechaEmision: string;
  fechaTimbrado: string | null;
  tipoComprobante: string;
  metodoPago: string | null;
  formaPago: string | null;
  usoCfdi: string | null;
  emisorRfc: string;
  emisorNombre: string;
  emisorRegimenFiscal: string | null;
  receptorRfc: string;
  receptorNombre: string;
  receptorUsoCfdi: string | null;
  subtotal: number;
  descuento: number;
  totalImpuestosTrasladados: number;
  totalImpuestosRetenidos: number;
  total: number;
  moneda: string;
  tipoCambio: number;
  estado: FacturaEstado;
  detalles: DetalleFactura[] | null;
}

export interface DetalleFactura {
  id: number;
  numeroLinea: number;
  claveProdServ: string;
  noIdentificacion: string | null;
  descripcion: string;
  unidad: string | null;
  claveUnidad: string | null;
  cantidad: number;
  valorUnitario: number;
  importe: number;
  descuento: number;
}

export interface ImpuestoFactura {
  id: number;
  facturaId: number;
  detalleFacturaId: number | null;
  tipo: 'TRASLADO' | 'RETENCION';
  impuesto: '001' | '002' | '003'; // 001=ISR, 002=IVA, 003=IEPS
  tipoFactor: 'Tasa' | 'Cuota' | 'Exento';
  tasaOCuota: number | null;
  base: number;
  importe: number | null;
}

// ─── Create / Update Requests ───

export interface CreateFacturaRequest {
  tipoComprobante: string;
  serie?: string | null;
  fechaEmision?: string | null;
  metodoPago?: string;
  formaPago?: string;
  usoCfdi?: string;
  emisorRfc: string;
  emisorNombre: string;
  emisorRegimenFiscal?: string | null;
  receptorRfc: string;
  receptorNombre: string;
  receptorUsoCfdi?: string | null;
  receptorDomicilioFiscal?: string | null;
  subtotal: number;
  descuento?: number;
  totalImpuestosTrasladados?: number;
  totalImpuestosRetenidos?: number;
  total: number;
  moneda?: string | null;
  tipoCambio?: number | null;
  clienteId?: number | null;
  vendedorId?: number | null;
  pedidoId?: number | null;
  observaciones?: string | null;
  detalles?: CreateDetalleFacturaRequest[] | null;
}

export interface CreateDetalleFacturaRequest {
  numeroLinea: number;
  claveProdServ: string;
  noIdentificacion?: string | null;
  descripcion: string;
  unidad?: string | null;
  claveUnidad?: string | null;
  cantidad: number;
  valorUnitario: number;
  importe: number;
  descuento?: number;
  productoId?: number | null;
}

export interface CancelarFacturaRequest {
  motivoCancelacion: MotivoCancelacion;
  folioSustitucion?: string | null;
}

export interface EnviarFacturaRequest {
  email: string;
  mensaje?: string | null;
  incluirPdf?: boolean;
  incluirXml?: boolean;
}
export interface CreateFacturaFromOrderRequest {
  pedidoId: number;
  metodoPago?: string;
  formaPago?: string;
  usoCfdi?: string;
  observaciones?: string;
  timbrarInmediatamente?: boolean;
  overrides?: FiscalCodeOverride[];
}

export interface FiscalCodeOverride {
  productoId: number;
  claveProdServ?: string;
  claveUnidad?: string;
}

// ─── Pre-Factura (Preview) ───

export interface PreFacturaDto {
  emisorRfc: string;
  emisorNombre: string;
  emisorRegimenFiscal: string | null;
  receptorRfc: string;
  receptorNombre: string;
  receptorUsoCfdi: string | null;
  receptorDomicilioFiscal: string | null;
  receptorRegimenFiscal: string | null;
  metodoPago: string | null;
  formaPago: string | null;
  subtotal: number;
  descuento: number;
  impuestos: number;
  total: number;
  pedidoId: number;
  numeroPedido: string;
  hasUnmappedProducts: boolean;
  unmappedCount: number;
  detalles: PreFacturaLineDto[];
}

export interface PreFacturaLineDto {
  numeroLinea: number;
  productoId: number;
  productoNombre: string;
  codigoBarra: string | null;
  claveProdServ: string;
  claveUnidad: string | null;
  unidad: string | null;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  descuento: number;
  total: number;
  isMapped: boolean;
  mappingSource: 'mapping' | 'producto' | 'default' | 'fallback';
}

// ─── Fiscal Catalog Search ───

export interface CatalogoProdServItem {
  clave: string;
  descripcion: string;
}

export interface CatalogoUnidadItem {
  clave: string;
  nombre: string;
}

// ─── Fiscal Mapping ───

export interface MapeoFiscalProducto {
  id: number;
  productoId: number;
  claveProdServ: string;
  claveUnidad: string;
  descripcionFiscal: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UnmappedProduct {
  productoId: number;
  nombre: string;
  codigoBarra: string | null;
  claveSatActual: string | null;
  unidadNombre: string;
  unidadAbreviatura: string | null;
  unidadClaveSat: string | null;
}

export interface UpsertMapeoFiscalRequest {
  productoId: number;
  claveProdServ: string;
  claveUnidad: string;
  descripcionFiscal?: string;
}

export interface DefaultsFiscalesTenant {
  claveProdServDefault: string;
  claveUnidadDefault: string;
}

export interface PaginatedMapeos {
  items: MapeoFiscalProducto[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface PaginatedUnmapped {
  items: UnmappedProduct[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// ─── Configuración Fiscal ───

export interface ConfiguracionFiscal {
  id: number;
  tenantId: string;
  empresaId: number;
  regimenFiscal: string | null;
  rfc: string | null;
  razonSocial: string | null;
  direccionFiscal: string | null;
  codigoPostal: string | null;
  pais: string;
  moneda: string;
  serieFactura: string | null;
  folioActual: number;
  certificadoSat: string | null;
  llavePrivada: string | null;
  passwordCertificado: string | null;
  logoUrl: string | null;
  pacUsuario: string | null;
  pacPassword: string | null;
  pacAmbiente: 'sandbox' | 'production';
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Catálogos SAT ───

export interface CatalogoItem {
  id: number;
  codigo: string;
  descripcion: string;
  activo: boolean;
}

export interface UsoCfdiItem extends CatalogoItem {
  aplicaPersonaFisica: boolean;
  aplicaPersonaMoral: boolean;
}

export interface MetodoPagoItem extends CatalogoItem {
  requiereBanco: boolean;
}

export interface CatalogosResponse {
  tiposComprobante: CatalogoItem[];
  metodosPago: MetodoPagoItem[];
  formasPago: CatalogoItem[];
  usosCfdi: UsoCfdiItem[];
}

// ─── Dashboard / Reportes ───

export interface BillingDashboard {
  totalFacturas: number;
  facturasTimbradas: number;
  facturasPendientes: number;
  facturasCanceladas: number;
  montoTotal: number;
  montoSubtotal: number;
  montoIva: number;
  facturasPorDia: FacturasPorDia[];
  topClientes: ClienteFacturacion[];
}

export interface FacturasPorDia {
  fecha: string;
  cantidad: number;
  monto: number;
}

export interface ClienteFacturacion {
  rfc: string;
  nombre: string;
  totalFacturas: number;
  montoTotal: number;
  ultimaFactura: string | null;
}

export interface VentasPorPeriodo {
  periodo: string;
  cantidad: number;
  subtotal: number;
  impuestos: number;
  total: number;
}

export interface EstadoFacturaResumen {
  estado: string;
  cantidad: number;
  montoTotal: number;
}

export interface AuditoriaEntry {
  id: number;
  facturaId: number | null;
  accion: string;
  descripcion: string | null;
  usuarioId: number | null;
  ipAddress: string | null;
  fechaHora: string;
}

// ─── Timbres Balance ───

export interface TimbresBalance {
  usados: number;
  maximo: number;
  disponibles: number;
  allowed: boolean;
  message: string | null;
}

// ─── Timbrado Response ───

export interface TimbradoResponse {
  id: number;
  uuid: string;
  estado: FacturaEstado;
  fechaTimbrado: string;
}

// ─── Enums / Literals ───

export type FacturaEstado = 'PENDIENTE' | 'TIMBRADA' | 'CANCELADA' | 'ERROR';

export type MotivoCancelacion = '01' | '02' | '03' | '04';
// 01 = Comprobante emitido con errores con relación
// 02 = Comprobante emitido con errores sin relación
// 03 = No se llevó a cabo la operación
// 04 = Operación nominativa relacionada en una factura global

export type TipoComprobante = 'I' | 'E' | 'T' | 'N' | 'P';
// I = Ingreso, E = Egreso, T = Traslado, N = Nómina, P = Pago

// ─── Paginated Response ───

export interface PaginatedFacturas {
  items: FacturaListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}
