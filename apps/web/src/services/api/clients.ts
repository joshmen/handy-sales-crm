import { api, handleApiError } from '@/lib/api';
import { Client, ClientType } from '@/types';

// Backend DTOs (Spanish)
interface ClienteListaDto {
  id: number;
  nombre: string;
  rfc: string;
  correo: string;
  telefono: string;
  /** ID de zona del cliente — agregado para que UI agrupe paradas por zona en routes/[id]. 2026-04-27 */
  idZona?: number;
  zonaNombre?: string;
  categoriaNombre?: string;
  activo: boolean;
  esProspecto: boolean;
}

interface ClienteDto {
  id: number;
  nombre: string;
  rfc: string;
  correo: string;
  telefono: string;
  direccion: string;
  numeroExterior?: string;
  idZona: number;
  categoriaClienteId: number;
  latitud?: number;
  longitud?: number;
  vendedorId?: number;
  activo: boolean;
  // Campos adicionales
  esProspecto: boolean;
  comentarios?: string;
  listaPreciosId?: number;
  descuento: number;
  saldo: number;
  limiteCredito: number;
  ventaMinimaEfectiva: number;
  tiposPagoPermitidos: string;
  tipoPagoPredeterminado: string;
  diasCredito: number;
  // Dirección desglosada
  ciudad?: string;
  colonia?: string;
  codigoPostal?: string;
  // Contacto
  encargado?: string;
  // Datos fiscales
  facturable: boolean;
  razonSocial?: string;
  codigoPostalFiscal?: string;
  regimenFiscal?: string;
  usoCFDIPredeterminado?: string;
}

interface ClientePaginatedResult {
  items: ClienteListaDto[];
  totalItems: number;
  pagina: number;
  tamanoPagina: number;
  totalPaginas: number;
}

// Frontend interfaces
export interface ClientsListParams {
  page?: number;
  limit?: number;
  search?: string;
  zoneId?: number;
  categoryId?: number;
  isActive?: boolean;
  esProspecto?: boolean;
}

export interface ClientsListResponse {
  clients: Client[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateClientRequest {
  nombre: string;
  rfc: string;
  correo: string;
  telefono: string;
  direccion: string;
  numeroExterior: string;
  idZona: number;
  categoriaClienteId: number;
  // Campos adicionales
  esProspecto: boolean;
  comentarios?: string | null;
  listaPreciosId?: number | null;
  descuento: number;
  saldo: number;
  limiteCredito: number;
  ventaMinimaEfectiva: number;
  tiposPagoPermitidos: string;
  tipoPagoPredeterminado: string;
  diasCredito: number;
  // Dirección desglosada
  ciudad?: string | null;
  colonia?: string | null;
  codigoPostal?: string | null;
  // Contacto
  encargado?: string | null;
  // Geolocalización
  latitud?: number | null;
  longitud?: number | null;
  // Datos fiscales
  facturable: boolean;
  razonSocial?: string | null;
  codigoPostalFiscal?: string | null;
  regimenFiscal?: string | null;
  usoCFDIPredeterminado?: string | null;
}

export interface UpdateClientRequest extends Partial<CreateClientRequest> {
  id: number;
}

// Map backend DTO to frontend Client type
function mapClienteToClient(dto: ClienteListaDto): Client {
  return {
    id: dto.id.toString(),
    code: dto.rfc,
    name: dto.nombre,
    email: dto.correo,
    phone: dto.telefono,
    address: '',
    zoneId: dto.idZona,
    zoneName: dto.zonaNombre,
    categoryName: dto.categoriaNombre,
    type: ClientType.MINORISTA,
    isActive: dto.activo,
    esProspecto: dto.esProspecto,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function mapClienteDtoToClient(dto: ClienteDto): Client {
  return {
    id: dto.id.toString(),
    code: dto.rfc,
    name: dto.nombre,
    email: dto.correo,
    phone: dto.telefono,
    address: dto.direccion,
    exteriorNumber: dto.numeroExterior,
    latitude: dto.latitud,
    longitude: dto.longitud,
    zoneId: dto.idZona,
    categoryId: dto.categoriaClienteId,
    vendedorId: dto.vendedorId,
    type: ClientType.MINORISTA,
    isActive: dto.activo,
    // Campos adicionales
    esProspecto: dto.esProspecto,
    comentarios: dto.comentarios,
    listaPreciosId: dto.listaPreciosId,
    descuento: dto.descuento,
    saldo: dto.saldo,
    limiteCredito: dto.limiteCredito,
    ventaMinimaEfectiva: dto.ventaMinimaEfectiva,
    tiposPagoPermitidos: dto.tiposPagoPermitidos,
    tipoPagoPredeterminado: dto.tipoPagoPredeterminado,
    diasCredito: dto.diasCredito,
    // Dirección desglosada
    ciudad: dto.ciudad,
    colonia: dto.colonia,
    codigoPostal: dto.codigoPostal,
    // Contacto
    encargado: dto.encargado,
    // Datos fiscales
    facturable: dto.facturable,
    razonSocial: dto.razonSocial,
    codigoPostalFiscal: dto.codigoPostalFiscal,
    regimenFiscal: dto.regimenFiscal,
    usoCFDIPredeterminado: dto.usoCFDIPredeterminado,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

class ClientService {
  private readonly basePath = '/clientes';

  async getClients(params: ClientsListParams = {}): Promise<ClientsListResponse> {
    try {
      const queryParams = new URLSearchParams();

      queryParams.append('pagina', (params.page || 1).toString());
      queryParams.append('tamanoPagina', (params.limit || 20).toString());
      if (params.search) queryParams.append('busqueda', params.search);
      if (params.zoneId) queryParams.append('zonaId', params.zoneId.toString());
      if (params.categoryId) queryParams.append('categoriaClienteId', params.categoryId.toString());
      if (params.isActive !== undefined) queryParams.append('activo', params.isActive.toString());
      if (params.esProspecto !== undefined) queryParams.append('esProspecto', params.esProspecto.toString());

      const response = await api.get<ClientePaginatedResult>(
        `${this.basePath}?${queryParams.toString()}`
      );

      const data = response.data;
      return {
        clients: data.items.map(mapClienteToClient),
        total: data.totalItems,
        page: data.pagina,
        limit: data.tamanoPagina,
        totalPages: data.totalPaginas,
      };
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getClientById(id: string | number): Promise<Client> {
    try {
      const response = await api.get<ClienteDto>(`${this.basePath}/${id}`);
      return mapClienteDtoToClient(response.data);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async createClient(clientData: CreateClientRequest): Promise<{ id: number }> {
    try {
      const response = await api.post<{ id: number }>(this.basePath, clientData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async updateClient(id: number, clientData: Partial<CreateClientRequest>): Promise<void> {
    try {
      await api.put(`${this.basePath}/${id}`, clientData);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async deleteClient(id: string | number, forzar = false): Promise<void> {
    try {
      const url = forzar
        ? `${this.basePath}/${id}?forzar=true`
        : `${this.basePath}/${id}`;
      await api.delete(url);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async searchClients(query: string): Promise<Client[]> {
    const response = await this.getClients({ search: query, limit: 50 });
    return response.clients;
  }

  async aprobarProspecto(id: number): Promise<void> {
    try {
      await api.post(`${this.basePath}/${id}/aprobar-prospecto`);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async rechazarProspecto(id: number): Promise<void> {
    try {
      await api.post(`${this.basePath}/${id}/rechazar-prospecto`);
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const clientService = new ClientService();
export default clientService;
