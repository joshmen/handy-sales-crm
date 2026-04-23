import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { facturasApi } from '@/api/facturas';
import type { CreateFacturaRequest } from '@/api/facturas';

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

export function useCreateFactura() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pedidoId, data }: { pedidoId: number; data: CreateFacturaRequest }) =>
      facturasApi.createFromOrder(pedidoId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facturas'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
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
