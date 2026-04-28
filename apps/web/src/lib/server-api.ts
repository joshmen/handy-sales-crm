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
  token?: string,
  // Headers del request cliente para forward (User-Agent, IP real vía X-Forwarded-For).
  // Sin esto, el backend registra "axios/x.y.z" como UserAgent de DeviceSession y la
  // lista de "Mis dispositivos" queda con "Navegador desconocido en Sistema desconocido".
  forwardHeaders?: Record<string, string | string[] | undefined>
): Promise<T> {
  try {
    const headers: Record<string, string> = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    if (forwardHeaders) {
      const ua = forwardHeaders['user-agent'];
      if (typeof ua === 'string' && ua.length > 0) headers['User-Agent'] = ua;
      // Forward IP real — Kestrel respeta X-Forwarded-For con ForwardedHeaders middleware.
      const xff = forwardHeaders['x-forwarded-for'];
      if (typeof xff === 'string' && xff.length > 0) headers['X-Forwarded-For'] = xff;
      const xri = forwardHeaders['x-real-ip'];
      if (typeof xri === 'string' && xri.length > 0) headers['X-Real-IP'] = xri;
    }

    const config: AxiosRequestConfig = {
      method,
      url,
      data,
      headers,
    };

    const response = await serverApiInstance(config);
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw error.response?.data || error;
    }
    throw error;
  }
}
