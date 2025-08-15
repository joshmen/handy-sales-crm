import axios, { AxiosRequestConfig } from 'axios';
import { API_CONFIG } from '@/lib/constants';

// Crear una instancia de axios sin interceptores para uso en el servidor
export const serverApiInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Función helper para llamadas al API desde el servidor
export async function serverApiCall<T = unknown>(
  method: 'get' | 'post' | 'put' | 'delete',
  url: string,
  data?: unknown,
  token?: string
): Promise<T> {
  try {
    const config: AxiosRequestConfig = {
      method,
      url,
      data,
      headers: {},
    };

    if (token) {
      (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }

    const response = await serverApiInstance(config);
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw error.response?.data || error;
    }
    throw error;
  }
}
