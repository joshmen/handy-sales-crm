import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rutasApi } from '@/api';

export function useRouteToday() {
  return useQuery({
    queryKey: ['route', 'today'],
    queryFn: () => rutasApi.getHoy(),
  });
}

export function useRoutePending() {
  return useQuery({
    queryKey: ['routes', 'pending'],
    queryFn: () => rutasApi.getPendientes(),
  });
}

export function useRouteDetail(id: number) {
  return useQuery({
    queryKey: ['route', id],
    queryFn: () => rutasApi.getById(id),
    enabled: id > 0,
  });
}

export function useIniciarRuta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => rutasApi.iniciar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['route'] });
      queryClient.invalidateQueries({ queryKey: ['routes'] });
    },
  });
}

export function useAceptarRuta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => rutasApi.aceptar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['route'] });
      queryClient.invalidateQueries({ queryKey: ['routes'] });
    },
  });
}

export function useCompletarRuta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, km }: { id: number; km?: number }) =>
      rutasApi.completar(id, km),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['route'] });
      queryClient.invalidateQueries({ queryKey: ['routes'] });
    },
  });
}
