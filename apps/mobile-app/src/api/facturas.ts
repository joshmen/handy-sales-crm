import { api } from './client';

// NOTA: el móvil NO timbra facturas. El timbrado (CFDI 4.0 → PAC → SAT) ocurre
// SIEMPRE desde el backoffice web. El móvil solo lista, ve detalle, imprime
// ticket 80mm y reenvía PDF/XML por correo de facturas ya TIMBRADAS.

export interface FacturaListItem {
  id: number;
  uuid: string;
  serie?: string;
  folio?: string;
  receptorNombre: string;
  receptorRfc: string;
  total: number;
  estado: string;
  fechaEmision: string;
  pedidoId?: number;
}

export interface FacturaTicketImpuesto {
  tipo: string;            // TRASLADO | RETENCION
  impuesto: string;        // 001=ISR, 002=IVA, 003=IEPS
  tipoFactor: string;      // Tasa | Cuota | Exento
  tasaOCuota?: number | null;
  base: number;
  importe?: number | null;
}

/** Payload completo para la representación impresa 80mm del CFDI (ver backend FacturaTicketDataDto). */
export interface FacturaTicketData {
  emisorRfc: string;
  emisorNombre: string;
  emisorRegimenFiscal?: string | null;
  emisorDireccion?: string | null;
  lugarExpedicion: string;

  receptorRfc: string;
  receptorNombre: string;
  receptorRegimenFiscal?: string | null;
  receptorUsoCfdi?: string | null;
  receptorDomicilioFiscal?: string | null;

  serie?: string | null;
  folio: number;
  fechaEmision: string;
  tipoComprobante: string;       // I/E/T/N/P
  metodoPago?: string | null;
  formaPago?: string | null;
  tipoExportacion: string;

  items: Array<{
    numeroLinea: number;
    claveProdServ: string;
    claveUnidad?: string | null;
    unidad?: string | null;
    descripcion: string;
    cantidad: number;
    valorUnitario: number;
    importe: number;
    descuento: number;
    objetoImp: string;
    impuestos: FacturaTicketImpuesto[];
  }>;

  subtotal: number;
  descuento: number;
  totalImpuestosTrasladados: number;
  totalImpuestosRetenidos: number;
  total: number;
  moneda: string;
  tipoCambio: number;

  uuid: string;
  fechaTimbrado: string;
  fechaCertificacion?: string | null;
  noCertificadoEmisor: string;
  noCertificadoSat: string;
  rfcPac: string;
  selloCfdi: string;
  selloSat: string;
  cadenaOriginalSat: string;

  estado: string;
}

export const facturasApi = {
  list: async (page = 1, pageSize = 50, estado?: string): Promise<FacturaListItem[]> => {
    const qs = new URLSearchParams();
    qs.append('page', String(page));
    qs.append('pageSize', String(pageSize));
    if (estado) qs.append('estado', estado);
    const res = await api.get<any>(`/api/mobile/facturas?${qs.toString()}`);
    // Backend wraps como { success, data: billingArrayOrPagedObj }. El billing devuelve
    // un array plano de FacturaListDto.
    const payload = res.data?.data ?? res.data;
    return Array.isArray(payload) ? payload : (payload?.items ?? []);
  },

  getById: async (id: number): Promise<any> => {
    const res = await api.get<any>(`/api/mobile/facturas/${id}`);
    return res.data?.data ?? res.data;
  },

  getPdfUrl: async (id: number): Promise<string> => {
    const res = await api.get<any>(`/api/mobile/facturas/${id}/pdf`);
    return res.data?.url ?? res.data;
  },

  getTicketData: async (id: number): Promise<FacturaTicketData> => {
    const res = await api.get<any>(`/api/mobile/facturas/${id}/ticket-data`);
    // Mobile API envuelve como { success, data }; billing directo devuelve plano.
    return (res.data?.data ?? res.data) as FacturaTicketData;
  },

  enviar: async (id: number): Promise<void> => {
    await api.post(`/api/mobile/facturas/${id}/enviar`);
  },
};
