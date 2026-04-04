import { api } from './client';

export interface CreateFacturaRequest {
  rfcReceptor: string;
  nombreReceptor: string;
  regimenFiscalReceptor: string;
  usoCfdiReceptor: string;
  cpReceptor: string;
}

export interface FacturaResult {
  facturaId: number;
  uuid: string;
  selloCfdi: string;
  selloSat: string;
  cadenaOriginal: string;
  noCertificadoEmisor: string;
  noCertificadoSat: string;
  fechaTimbrado: string;
  qrSatUrl: string;
  pdfUrl: string;
  estado: string;
}

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

export const facturasApi = {
  createFromOrder: async (pedidoId: number, data: CreateFacturaRequest): Promise<FacturaResult> => {
    const res = await api.post<any>(`/api/mobile/facturas/from-order/${pedidoId}`, data);
    return res.data?.data ?? res.data;
  },

  list: async (): Promise<FacturaListItem[]> => {
    const res = await api.get<any>('/api/mobile/facturas');
    return res.data?.data ?? res.data ?? [];
  },

  getById: async (id: number): Promise<any> => {
    const res = await api.get<any>(`/api/mobile/facturas/${id}`);
    return res.data?.data ?? res.data;
  },

  getPdfUrl: async (id: number): Promise<string> => {
    const res = await api.get<any>(`/api/mobile/facturas/${id}/pdf`);
    return res.data?.url ?? res.data;
  },

  enviar: async (id: number): Promise<void> => {
    await api.post(`/api/mobile/facturas/${id}/enviar`);
  },
};
