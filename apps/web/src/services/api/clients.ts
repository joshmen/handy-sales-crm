import { api, handleApiError } from '@/lib/api';
import { Client, ClientType } from '@/types';

// Backend DTOs (Spanish)
interface ClienteListaDto {
  id: number;
  nombre: string;
  rfc: string;
  correo: string;
  telefono: string;
  zonaNombre?: string;
  categoriaNombre?: string;
  activo: boolean;
}

interface ClienteDto {
  id: number;
  nombre: string;
  rfc: string;
  correo: string;
  telefono: string;
  direccion: string;
  idZona: number;
  categoriaClienteId: number;
  latitud?: number;
  longitud?: number;
  activo: boolean;
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
  idZona: number;
  categoriaClienteId: number;
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
    zoneName: dto.zonaNombre,
    categoryName: dto.categoriaNombre,
    type: ClientType.MINORISTA,
    isActive: dto.activo,
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
    latitude: dto.latitud,
    longitude: dto.longitud,
    zoneId: dto.idZona,
    categoryId: dto.categoriaClienteId,
    type: ClientType.MINORISTA,
    isActive: dto.activo,
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

  async deleteClient(id: string | number): Promise<void> {
    try {
      await api.delete(`${this.basePath}/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async searchClients(query: string): Promise<Client[]> {
    const response = await this.getClients({ search: query, limit: 50 });
    return response.clients;
  }
}

export const clientService = new ClientService();
export default clientService;
