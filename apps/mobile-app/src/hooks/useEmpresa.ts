import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Image } from 'react-native';

export interface DatosEmpresa {
  razonSocial: string | null;
  rfc: string | null;
  telefono: string | null;
  email: string | null;
  contacto: string | null;
  direccion: string | null;
  ciudad: string | null;
  estado: string | null;
  codigoPostal: string | null;
  sitioWeb: string | null;
  logoUrl: string | null;
  country: string | null;
  billingEnabled: boolean;
  timezone: string;           // IANA tz, ej "America/Mexico_City"
  currency: string;           // ej "MXN"
  language: string;           // ej "es"
}

export function useEmpresa() {
  return useQuery({
    queryKey: ['empresa'],
    queryFn: async (): Promise<DatosEmpresa> => {
      const response = await api.get('/api/mobile/empresa');
      const data = (response.data as any).data;

      // Prefetch logo into RN image cache so it renders instantly
      if (data?.logoUrl) {
        Image.prefetch(data.logoUrl).catch(() => {});
      }

      return data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour cache — company data rarely changes
  });
}
