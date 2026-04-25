import { useQuery, useMutation } from '@tanstack/react-query';
import { facturasApi } from '@/api/facturas';

// NOTA: el móvil NO timbra facturas. No exponemos un useCreateFactura.
// El timbrado ocurre desde el backoffice web. Aquí solo se consulta y reenvía.

export function useFacturasList() {
  return useQuery({
    queryKey: ['facturas'],
    queryFn: () => facturasApi.list(),
  });
}

export function useFacturaById(id: number | undefined) {
  return useQuery({
    queryKey: ['factura', id],
    queryFn: () => facturasApi.getById(id!),
    enabled: !!id,
  });
}

export function useEnviarFactura() {
  return useMutation({
    mutationFn: (id: number) => facturasApi.enviar(id),
  });
}

/**
 * Obtiene el payload completo (sellos, cadena, certificados, RFC PAC) para
 * la representación impresa 80mm del CFDI. On-demand: solo se llama cuando
 * el usuario tappea "Imprimir ticket" para no bloatear la lista.
 */
export function useFacturaTicketData(id: number | undefined) {
  return useQuery({
    queryKey: ['factura-ticket-data', id],
    queryFn: () => facturasApi.getTicketData(id!),
    enabled: !!id,
    staleTime: Infinity, // CFDI timbrado es inmutable; no refetch
  });
}
