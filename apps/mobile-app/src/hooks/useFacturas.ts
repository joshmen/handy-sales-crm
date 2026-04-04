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
