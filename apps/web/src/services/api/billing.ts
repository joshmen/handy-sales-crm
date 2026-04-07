import api from '@/lib/api';
import { billingApi } from '@/lib/billingApi';
import type {
  FacturaListItem,
  FacturaDetail,
  CreateFacturaRequest,
  CreateFacturaFromOrderRequest,
  CancelarFacturaRequest,
  EnviarFacturaRequest,
  ConfiguracionFiscal,
  CatalogosResponse,
  BillingDashboard,
  TimbradoResponse,
  TimbresBalance,
  PaginatedFacturas,
  AuditoriaEntry,
  VentasPorPeriodo,
  EstadoFacturaResumen,
  PreFacturaDto,
  CatalogoProdServItem,
  CatalogoUnidadItem,
  PaginatedMapeos,
  PaginatedUnmapped,
  UpsertMapeoFiscalRequest,
  DefaultsFiscalesTenant,
  NumeracionDocumento,
} from '@/types/billing';

// ─── Invoiced Orders lookup ───

export interface InvoicedOrder {
  facturaId: number;
  folio: string;
  estado: string;
  uuid: string | null;
}

export async function getInvoicedOrders(): Promise<Record<number, InvoicedOrder>> {
  const { data } = await billingApi.get<Record<number, InvoicedOrder>>('/api/facturas/invoiced-orders');
  return data;
}

// ─── Facturas ───

export interface GetFacturasParams {
  desde?: string;
  hasta?: string;
  estado?: string;
  receptorRfc?: string;
  page?: number;
  pageSize?: number;
}

export async function getFacturas(params: GetFacturasParams = {}): Promise<PaginatedFacturas> {
  const { data } = await billingApi.get<PaginatedFacturas>('/api/facturas', { params });
  return data;
}

export async function getFactura(id: number): Promise<FacturaDetail> {
  const { data } = await billingApi.get<FacturaDetail>(`/api/facturas/${id}`);
  return data;
}

export async function createFactura(request: CreateFacturaRequest): Promise<FacturaDetail> {
  const { data } = await billingApi.post<FacturaDetail>('/api/facturas', request);
  return data;
}

export async function timbrarFactura(id: number): Promise<TimbradoResponse> {
  const { data } = await billingApi.post<TimbradoResponse>(`/api/facturas/${id}/timbrar`);
  return data;
}

export async function cancelarFactura(id: number, request: CancelarFacturaRequest): Promise<{ estado: string; mensaje?: string }> {
  const { data } = await billingApi.post<{ estado: string; mensaje?: string }>(`/api/facturas/${id}/cancelar`, request);
  return data;
}

export async function getFacturaPdf(id: number): Promise<Blob> {
  const { data } = await billingApi.get<Blob>(`/api/facturas/${id}/pdf`, {
    responseType: 'blob',
  });
  return data;
}

export async function getFacturaXml(id: number): Promise<Blob> {
  const { data } = await billingApi.get<Blob>(`/api/facturas/${id}/xml`, {
    responseType: 'blob',
  });
  return data;
}

export async function createFacturaFromOrder(request: CreateFacturaFromOrderRequest): Promise<FacturaDetail> {
  const { data } = await billingApi.post<FacturaDetail>('/api/facturas/from-order', request);
  return data;
}

export async function enviarFactura(id: number, request: EnviarFacturaRequest): Promise<void> {
  await billingApi.post(`/api/facturas/${id}/enviar`, request);
}

export async function previewFacturaFromOrder(pedidoId: number): Promise<PreFacturaDto> {
  const { data } = await billingApi.post<PreFacturaDto>('/api/facturas/preview-from-order', { pedidoId });
  return data;
}

// ─── SAT Catalog Search ───

export async function searchCatalogoProdServ(q: string, limit = 20): Promise<CatalogoProdServItem[]> {
  const { data } = await billingApi.get<CatalogoProdServItem[]>('/api/catalogos/prod-serv', {
    params: { q, limit },
  });
  return data;
}

export async function searchCatalogoUnidad(q: string, limit = 20): Promise<CatalogoUnidadItem[]> {
  const { data } = await billingApi.get<CatalogoUnidadItem[]>('/api/catalogos/unidades', {
    params: { q, limit },
  });
  return data;
}

// ─── Fiscal Mapping ───

export async function getFiscalMappings(page = 1, pageSize = 50): Promise<PaginatedMapeos> {
  const { data } = await billingApi.get<PaginatedMapeos>('/api/mapeo-fiscal', {
    params: { page, pageSize },
  });
  return data;
}

export async function getUnmappedProducts(page = 1, pageSize = 50): Promise<PaginatedUnmapped> {
  const { data } = await billingApi.get<PaginatedUnmapped>('/api/mapeo-fiscal/unmapped', {
    params: { page, pageSize },
  });
  return data;
}

export async function upsertFiscalMapping(request: UpsertMapeoFiscalRequest): Promise<void> {
  await billingApi.post('/api/mapeo-fiscal', request);
}

export async function batchUpsertFiscalMappings(mappings: UpsertMapeoFiscalRequest[]): Promise<void> {
  await billingApi.post('/api/mapeo-fiscal/batch', { mappings });
}

export async function deleteFiscalMapping(productoId: number): Promise<void> {
  await billingApi.delete(`/api/mapeo-fiscal/${productoId}`);
}

export async function getFiscalDefaults(): Promise<DefaultsFiscalesTenant> {
  const { data } = await billingApi.get<DefaultsFiscalesTenant>('/api/mapeo-fiscal/defaults');
  return data;
}

export async function setFiscalDefaults(defaults: DefaultsFiscalesTenant): Promise<void> {
  await billingApi.put('/api/mapeo-fiscal/defaults', defaults);
}

// ─── Dashboard / Reportes ───

export interface GetDashboardParams {
  desde?: string;
  hasta?: string;
}

export async function getDashboard(params: GetDashboardParams = {}): Promise<BillingDashboard> {
  const { data } = await billingApi.get<BillingDashboard>('/api/reportes/dashboard', { params });
  return data;
}

export async function getVentasPorPeriodo(params: GetDashboardParams = {}): Promise<VentasPorPeriodo[]> {
  const { data } = await billingApi.get<VentasPorPeriodo[]>('/api/reportes/ventas-por-periodo', { params });
  return data;
}

export async function getEstadoFacturas(params: GetDashboardParams = {}): Promise<EstadoFacturaResumen[]> {
  const { data } = await billingApi.get<EstadoFacturaResumen[]>('/api/reportes/estado-facturas', { params });
  return data;
}

export async function getAuditoria(params: { page?: number; pageSize?: number } = {}): Promise<AuditoriaEntry[]> {
  const { data } = await billingApi.get<AuditoriaEntry[]>('/api/reportes/auditoria', { params });
  return data;
}

// ─── Catálogos SAT ───

export async function getCatalogos(): Promise<CatalogosResponse> {
  const [tipos, metodos, formas, usos] = await Promise.all([
    billingApi.get<CatalogosResponse['tiposComprobante']>('/api/catalogos/tipos-comprobante'),
    billingApi.get<CatalogosResponse['metodosPago']>('/api/catalogos/metodos-pago'),
    billingApi.get<CatalogosResponse['formasPago']>('/api/catalogos/formas-pago'),
    billingApi.get<CatalogosResponse['usosCfdi']>('/api/catalogos/usos-cfdi'),
  ]);
  return {
    tiposComprobante: tipos.data,
    metodosPago: metodos.data,
    formasPago: formas.data,
    usosCfdi: usos.data,
  };
}

// ─── Configuración Fiscal ───

export async function getConfigFiscal(): Promise<ConfiguracionFiscal> {
  const { data } = await billingApi.get<ConfiguracionFiscal>('/api/catalogos/configuracion-fiscal');
  return data;
}

export async function saveConfigFiscal(config: Partial<ConfiguracionFiscal>): Promise<ConfiguracionFiscal> {
  if (config.id) {
    const { data } = await billingApi.put<ConfiguracionFiscal>(
      `/api/catalogos/configuracion-fiscal/${config.id}`,
      config
    );
    return data;
  }
  const { data } = await billingApi.post<ConfiguracionFiscal>('/api/catalogos/configuracion-fiscal', config);
  return data;
}

export async function uploadCertificado(configId: number, formData: FormData): Promise<void> {
  await billingApi.post(`/api/catalogos/configuracion-fiscal/${configId}/certificado`, formData);
}

// ─── Numeración / Series ───

export async function getNumeraciones(incluirInactivos = false): Promise<NumeracionDocumento[]> {
  const { data } = await billingApi.get<NumeracionDocumento[]>('/api/catalogos/numeracion', {
    params: incluirInactivos ? { incluirInactivos: true } : undefined,
  });
  return data;
}

export async function createNumeracion(req: { tipoDocumento: string; serie: string; folioInicial: number; folioFinal?: number }): Promise<NumeracionDocumento> {
  const { data } = await billingApi.post<NumeracionDocumento>('/api/catalogos/numeracion', req);
  return data;
}

export async function toggleNumeracion(id: number, activo: boolean): Promise<NumeracionDocumento> {
  const { data } = await billingApi.patch<NumeracionDocumento>(`/api/catalogos/numeracion/${id}/activo`, { activo });
  return data;
}

export async function deleteNumeracion(id: number): Promise<void> {
  await billingApi.delete(`/api/catalogos/numeracion/${id}`);
}

// ─── Timbres (Main API) ───

export async function getTimbres(): Promise<TimbresBalance> {
  const { data } = await api.get<TimbresBalance>('/api/subscription/timbres');
  return data;
}

// ─── Helpers ───

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadFacturaPdf(id: number, folio: string, emisorRfc?: string): Promise<void> {
  const blob = await getFacturaPdf(id);
  const prefix = emisorRfc ? `${emisorRfc}_` : '';
  downloadBlob(blob, `${prefix}Factura_${folio}.pdf`);
}

export async function downloadFacturaXml(id: number, folio: string, emisorRfc?: string): Promise<void> {
  const blob = await getFacturaXml(id);
  const prefix = emisorRfc ? `${emisorRfc}_` : '';
  downloadBlob(blob, `${prefix}Factura_${folio}.xml`);
}
