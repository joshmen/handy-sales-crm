import axios from 'axios'
import { API_CONFIG } from '@/lib/constants'

// Crear una instancia de axios sin interceptores para uso en el servidor
export const serverApiInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Función helper para llamadas al API desde el servidor
export async function serverApiCall<T = any>(
  method: 'get' | 'post' | 'put' | 'delete',
  url: string,
  data?: any,
  token?: string
): Promise<T> {
  try {
    const config: any = {
      method,
      url,
      data,
      headers: {}
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    const response = await serverApiInstance(config)
    return response.data
  } catch (error: any) {
    throw error.response?.data || error
  }
}
