import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { API_CONFIG } from '@/lib/constants'

// Create axios instance
const apiInstance: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for auth token
apiInstance.interceptors.request.use(
  (config) => {
    // Only access localStorage on client side
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth-token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
apiInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Generic API methods
export const api = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiInstance.get(url, config)
  },

  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiInstance.post(url, data, config)
  },

  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiInstance.put(url, data, config)
  },

  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiInstance.patch(url, data, config)
  },

  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiInstance.delete(url, config)
  },
}

// Response wrapper for consistent API responses
export interface ApiResponse<T = any> {
  data: T
  message?: string
  success: boolean
  errors?: string[]
}

// Error response type
export interface ApiError {
  message: string
  status: number
  errors?: string[]
}

// Helper function to handle API responses
export const handleApiResponse = <T>(response: AxiosResponse<ApiResponse<T>>): T => {
  if (response.data.success) {
    return response.data.data
  } else {
    throw new Error(response.data.message || 'API request failed')
  }
}

// Helper function to handle API errors
export const handleApiError = (error: any): ApiError => {
  if (error.response) {
    return {
      message: error.response.data?.message || 'Server error',
      status: error.response.status,
      errors: error.response.data?.errors || [],
    }
  } else if (error.request) {
    return {
      message: 'Network error - please check your connection',
      status: 0,
    }
  } else {
    return {
      message: error.message || 'An unexpected error occurred',
      status: 0,
    }
  }
}

export default apiInstance
