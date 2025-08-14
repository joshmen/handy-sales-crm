import { api, handleApiResponse, handleApiError, ApiResponse } from '@/lib/api'
import { Client } from '@/types'

export interface ClientsListParams {
  page?: number
  limit?: number
  search?: string
  type?: string
  zone?: string
  isActive?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface ClientsListResponse {
  clients: Client[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CreateClientRequest {
  name: string
  email?: string
  phone?: string
  address: string
  zone: string
  type: 'mayorista' | 'medio-mayorista' | 'minorista' | 'vip'
  isActive?: boolean
}

export interface UpdateClientRequest extends Partial<CreateClientRequest> {
  id: string
}

class ClientService {
  private readonly basePath = '/clients'

  async getClients(params: ClientsListParams = {}): Promise<ClientsListResponse> {
    try {
      const queryParams = new URLSearchParams()
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString())
        }
      })

      const response = await api.get<ApiResponse<ClientsListResponse>>(
        `${this.basePath}?${queryParams.toString()}`
      )
      return handleApiResponse(response)
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async getClientById(id: string): Promise<Client> {
    try {
      const response = await api.get<ApiResponse<Client>>(`${this.basePath}/${id}`)
      return handleApiResponse(response)
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async createClient(clientData: CreateClientRequest): Promise<Client> {
    try {
      const response = await api.post<ApiResponse<Client>>(
        this.basePath,
        clientData
      )
      return handleApiResponse(response)
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async updateClient(clientData: UpdateClientRequest): Promise<Client> {
    try {
      const { id, ...updateData } = clientData
      const response = await api.put<ApiResponse<Client>>(
        `${this.basePath}/${id}`,
        updateData
      )
      return handleApiResponse(response)
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async deleteClient(id: string): Promise<{ message: string }> {
    try {
      const response = await api.delete<ApiResponse<{ message: string }>>(
        `${this.basePath}/${id}`
      )
      return handleApiResponse(response)
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async toggleClientStatus(id: string): Promise<Client> {
    try {
      const response = await api.patch<ApiResponse<Client>>(
        `${this.basePath}/${id}/toggle-status`
      )
      return handleApiResponse(response)
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async getClientsByZone(zone: string): Promise<Client[]> {
    try {
      const response = await api.get<ApiResponse<Client[]>>(
        `${this.basePath}/by-zone/${zone}`
      )
      return handleApiResponse(response)
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async getClientsByType(type: string): Promise<Client[]> {
    try {
      const response = await api.get<ApiResponse<Client[]>>(
        `${this.basePath}/by-type/${type}`
      )
      return handleApiResponse(response)
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async searchClients(query: string): Promise<Client[]> {
    try {
      const response = await api.get<ApiResponse<Client[]>>(
        `${this.basePath}/search?q=${encodeURIComponent(query)}`
      )
      return handleApiResponse(response)
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async exportClients(format: 'csv' | 'excel' = 'csv'): Promise<Blob> {
    try {
      const response = await api.get(
        `${this.basePath}/export?format=${format}`,
        { responseType: 'blob' }
      )
      return response.data
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async importClients(file: File): Promise<{ message: string; imported: number; errors: string[] }> {
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await api.post<ApiResponse<{ message: string; imported: number; errors: string[] }>>(
        `${this.basePath}/import`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )
      return handleApiResponse(response)
    } catch (error) {
      throw handleApiError(error)
    }
  }
}

export const clientService = new ClientService()
export default clientService
