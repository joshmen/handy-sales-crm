import { api, handleApiResponse, handleApiError, ApiResponse } from '@/lib/api'
import { DashboardMetrics } from '@/types'

export interface DashboardDateRange {
  startDate: string // ISO date string
  endDate: string // ISO date string
}

export interface SalesData {
  date: string
  amount: number
  orders: number
}

export interface VisitsData {
  date: string
  scheduled: number
  completed: number
  missed: number
}

export interface TopProduct {
  id: string
  name: string
  totalSold: number
  revenue: number
}

export interface TopClient {
  id: string
  name: string
  totalOrders: number
  totalAmount: number
}

export interface UserPerformance {
  userId: string
  userName: string
  totalSales: number
  totalOrders: number
  completedVisits: number
  scheduledVisits: number
  efficiency: number
}

export interface DashboardChartsData {
  salesChart: SalesData[]
  visitsChart: VisitsData[]
  topProducts: TopProduct[]
  topClients: TopClient[]
  userPerformance: UserPerformance[]
}

class DashboardService {
  private readonly basePath = '/dashboard'

  async getMetrics(dateRange?: DashboardDateRange): Promise<DashboardMetrics> {
    try {
      const queryParams = new URLSearchParams()
      
      if (dateRange) {
        queryParams.append('startDate', dateRange.startDate)
        queryParams.append('endDate', dateRange.endDate)
      }

      const response = await api.get<ApiResponse<DashboardMetrics>>(
        `${this.basePath}/metrics?${queryParams.toString()}`
      )
      return handleApiResponse(response)
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async getChartsData(dateRange?: DashboardDateRange): Promise<DashboardChartsData> {
    try {
      const queryParams = new URLSearchParams()
      
      if (dateRange) {
        queryParams.append('startDate', dateRange.startDate)
        queryParams.append('endDate', dateRange.endDate)
      }

      const response = await api.get<ApiResponse<DashboardChartsData>>(
        `${this.basePath}/charts?${queryParams.toString()}`
      )
      return handleApiResponse(response)
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async getSalesData(dateRange?: DashboardDateRange): Promise<SalesData[]> {
    try {
      const queryParams = new URLSearchParams()
      
      if (dateRange) {
        queryParams.append('startDate', dateRange.startDate)
        queryParams.append('endDate', dateRange.endDate)
      }

      const response = await api.get<ApiResponse<SalesData[]>>(
        `${this.basePath}/sales-data?${queryParams.toString()}`
      )
      return handleApiResponse(response)
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async getVisitsData(dateRange?: DashboardDateRange): Promise<VisitsData[]> {
    try {
      const queryParams = new URLSearchParams()
      
      if (dateRange) {
        queryParams.append('startDate', dateRange.startDate)
        queryParams.append('endDate', dateRange.endDate)
      }

      const response = await api.get<ApiResponse<VisitsData[]>>(
        `${this.basePath}/visits-data?${queryParams.toString()}`
      )
      return handleApiResponse(response)
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async getTopProducts(limit: number = 10, dateRange?: DashboardDateRange): Promise<TopProduct[]> {
    try {
      const queryParams = new URLSearchParams()
      queryParams.append('limit', limit.toString())
      
      if (dateRange) {
        queryParams.append('startDate', dateRange.startDate)
        queryParams.append('endDate', dateRange.endDate)
      }

      const response = await api.get<ApiResponse<TopProduct[]>>(
        `${this.basePath}/top-products?${queryParams.toString()}`
      )
      return handleApiResponse(response)
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async getTopClients(limit: number = 10, dateRange?: DashboardDateRange): Promise<TopClient[]> {
    try {
      const queryParams = new URLSearchParams()
      queryParams.append('limit', limit.toString())
      
      if (dateRange) {
        queryParams.append('startDate', dateRange.startDate)
        queryParams.append('endDate', dateRange.endDate)
      }

      const response = await api.get<ApiResponse<TopClient[]>>(
        `${this.basePath}/top-clients?${queryParams.toString()}`
      )
      return handleApiResponse(response)
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async getUserPerformance(dateRange?: DashboardDateRange): Promise<UserPerformance[]> {
    try {
      const queryParams = new URLSearchParams()
      
      if (dateRange) {
        queryParams.append('startDate', dateRange.startDate)
        queryParams.append('endDate', dateRange.endDate)
      }

      const response = await api.get<ApiResponse<UserPerformance[]>>(
        `${this.basePath}/user-performance?${queryParams.toString()}`
      )
      return handleApiResponse(response)
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async getMyPerformance(dateRange?: DashboardDateRange): Promise<UserPerformance> {
    try {
      const queryParams = new URLSearchParams()
      
      if (dateRange) {
        queryParams.append('startDate', dateRange.startDate)
        queryParams.append('endDate', dateRange.endDate)
      }

      const response = await api.get<ApiResponse<UserPerformance>>(
        `${this.basePath}/my-performance?${queryParams.toString()}`
      )
      return handleApiResponse(response)
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async exportDashboardData(format: 'csv' | 'excel' | 'pdf' = 'excel', dateRange?: DashboardDateRange): Promise<Blob> {
    try {
      const queryParams = new URLSearchParams()
      queryParams.append('format', format)
      
      if (dateRange) {
        queryParams.append('startDate', dateRange.startDate)
        queryParams.append('endDate', dateRange.endDate)
      }

      const response = await api.get(
        `${this.basePath}/export?${queryParams.toString()}`,
        { responseType: 'blob' }
      )
      return response.data
    } catch (error) {
      throw handleApiError(error)
    }
  }
}

export const dashboardService = new DashboardService()
export default dashboardService
