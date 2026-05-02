import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Image } from 'react-native';

export interface DatosEmpresa {
  razonSocial: string | null;
  /** Nombre canónico (RFC en MX, NIT en CO, etc.). Preferir sobre `rfc` para nuevos consumers. */
  identificadorFiscal: string | null;
  /** @deprecated Alias legacy de `identificadorFiscal`. Se mantiene mientras alguna pantalla lo lea. */
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
  // Horario laboral configurado por el admin para tracking GPS.
  // null/undefined = sin restricción (vendedor controla manualmente la jornada).
  horaInicioJornada?: string | null;  // formato "HH:mm"
  horaFinJornada?: string | null;     // formato "HH:mm"
  diasLaborables?: string | null;     // CSV "1,2,3,4,5" (1=Lun..7=Dom)
}

export function useEmpresa() {
  return useQuery({
    queryKey: ['empresa'],
    queryFn: async (): Promise<DatosEmpresa> => {
      const response = await api.get('/api/mobile/empresa');
      // Defensive parse: backend siempre devuelve `{success, data}`, pero si
      // retorna unwrapped por bug o test, fall through a response.data directo.
      const body = (response.data ?? {}) as { data?: DatosEmpresa };
      const data = body.data ?? (response.data as unknown as DatosEmpresa);

      // Prefetch logo into RN image cache so it renders instantly
      if (data?.logoUrl) {
        Image.prefetch(data.logoUrl).catch(() => {});
      }

      return data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour cache — company data rarely changes
  });
}
