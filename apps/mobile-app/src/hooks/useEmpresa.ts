import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';

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
}

export function useEmpresa() {
  return useQuery({
    queryKey: ['empresa'],
    queryFn: async (): Promise<DatosEmpresa> => {
      const response = await api.get('/api/mobile/empresa');
      return (response.data as any).data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour cache — company data rarely changes
  });
}
