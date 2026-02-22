import { useQuery } from '@tanstack/react-query';
import { catalogosApi } from '@/api/catalogos';

export function useZonas() {
  return useQuery({
    queryKey: ['catalogos', 'zonas'],
    queryFn: () => catalogosApi.getZonas(),
    staleTime: 1000 * 60 * 30, // 30min cache — catalogs rarely change
  });
}

export function useCategoriasCliente() {
  return useQuery({
    queryKey: ['catalogos', 'categorias-cliente'],
    queryFn: () => catalogosApi.getCategoriasCliente(),
    staleTime: 1000 * 60 * 30,
  });
}

export function useCategoriasProducto() {
  return useQuery({
    queryKey: ['catalogos', 'categorias-producto'],
    queryFn: () => catalogosApi.getCategoriasProducto(),
    staleTime: 1000 * 60 * 30,
  });
}

export function useFamiliasProducto() {
  return useQuery({
    queryKey: ['catalogos', 'familias-producto'],
    queryFn: () => catalogosApi.getFamiliasProducto(),
    staleTime: 1000 * 60 * 30,
  });
}
