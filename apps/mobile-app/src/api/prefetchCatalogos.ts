import type { QueryClient } from '@tanstack/react-query';
import { catalogosApi } from '@/api';
import { queryKeys } from './queryKeys';

/**
 * Sprint 3 audit code-quality: prefetchCatalogos extraido a su propio modulo.
 *
 * Antes: duplicado en useAuth.ts (lineas 6-11) y _layout.tsx (lineas 322-325)
 * con misma lista hardcoded de catalogos. Si se agrega un nuevo catalogo,
 * habia que actualizar 2 lugares -> drift potencial.
 *
 * Ahora: single source of truth. Tambien usa queryKeys factory tipada para
 * que cualquier refactor de keys sea safe via TS.
 */
export function prefetchCatalogos(queryClient: QueryClient): void {
  queryClient.prefetchQuery({
    queryKey: queryKeys.catalogos.zonas(),
    queryFn: () => catalogosApi.getZonas(),
  });
  queryClient.prefetchQuery({
    queryKey: queryKeys.catalogos.categoriasCliente(),
    queryFn: () => catalogosApi.getCategoriasCliente(),
  });
  queryClient.prefetchQuery({
    queryKey: queryKeys.catalogos.categoriasProducto(),
    queryFn: () => catalogosApi.getCategoriasProducto(),
  });
  queryClient.prefetchQuery({
    queryKey: queryKeys.catalogos.familiasProducto(),
    queryFn: () => catalogosApi.getFamiliasProducto(),
  });
}
