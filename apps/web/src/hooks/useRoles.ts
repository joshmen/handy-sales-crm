import { useState, useEffect, useCallback, useMemo } from 'react';
import { roleService, type Role, type CreateRoleDto, type UpdateRoleDto, type PaginatedResult } from '@/services/api/roleService';

interface RolesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
}

export function useRoles(params?: RolesParams) {
  const [data, setData] = useState<Role[] | PaginatedResult<Role> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoizar params para evitar cambios innecesarios
  const memoizedParams = useMemo(() => params, [JSON.stringify(params)]);

  const execute = useCallback(async () => {
    if (loading) return; // Evitar múltiples llamadas simultáneas

    setLoading(true);
    setError(null);

    try {
      console.log('Calling roleService.getAllRoles() with params:', memoizedParams);
      const response = await roleService.getAllRoles(memoizedParams);
      console.log('Roles service response:', response);

      if (response.success && response.data) {
        // Pasar toda la respuesta - no extraer items aquí
        setData(response.data);
        console.log(`Loaded ${Array.isArray(response.data) ? response.data.length : 'paginated'} roles`);
      } else {
        setError(response.error || 'Error loading roles');
        setData(null);
      }
    } catch (err) {
      console.error('Error in useRoles:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [memoizedParams, loading]);

  return {
    data,
    loading,
    error: error ? { message: error } : null,
    execute,
    refetch: execute,
  };
}

export function useRole(id: number | string) {
  const [data, setData] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await roleService.getRoleById(Number(id));
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.error || 'Error loading role');
        setData(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  return {
    data,
    loading,
    error: error ? { message: error } : null,
    execute,
    refetch: execute,
  };
}

export function useCreateRole() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return {
    mutateAsync: async (roleData: CreateRoleDto) => {
      setLoading(true);
      setError(null);

      try {
        const response = await roleService.createRole(roleData);
        if (response.success) {
          return response.data;
        } else {
          setError(response.error || 'Error creating role');
          return null;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        return null;
      } finally {
        setLoading(false);
      }
    },
    loading,
    error: error ? { message: error } : null,
  };
}

export function useUpdateRole() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return {
    mutateAsync: async (variables: { id: number } & UpdateRoleDto) => {
      setLoading(true);
      setError(null);

      try {
        const { id, ...roleData } = variables;
        const response = await roleService.updateRole(id, roleData);
        if (response.success) {
          return response.data;
        } else {
          setError(response.error || 'Error updating role');
          return null;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        return null;
      } finally {
        setLoading(false);
      }
    },
    loading,
    error: error ? { message: error } : null,
  };
}

export function useDeleteRole() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return {
    mutateAsync: async (id: number) => {
      setLoading(true);
      setError(null);

      try {
        const response = await roleService.deleteRole(id);
        if (response.success) {
          return true;
        } else {
          setError(response.error || 'Error deleting role');
          return false;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        return false;
      } finally {
        setLoading(false);
      }
    },
    loading,
    error: error ? { message: error } : null,
  };
}

export function usePaginatedRoles(initialPage = 1, pageSize = 5) {
  const [page, setPage] = useState(initialPage);
  const [paginationData, setPaginationData] = useState<PaginatedResult<Role> | null>(null);

  // Memoizar params para evitar recreaciones
  const params = useMemo(() => ({ page, pageSize }), [page, pageSize]);

  const { data, loading, error, refetch, execute } = useRoles(params);

  // Handle pagination data when data changes
  useEffect(() => {
    if (data) {
      if ('items' in data && 'totalCount' in data) {
        // It's a PaginatedResult from the backend
        console.log('Received paginated roles data:', data);
        setPaginationData(data as PaginatedResult<Role>);
      } else if (Array.isArray(data)) {
        // It's a simple array (when no pagination params)
        console.log('Received simple roles array:', data.length, 'items');
        setPaginationData({
          items: data,
          totalCount: data.length,
          page: 1,
          pageSize: data.length,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        });
      }
    }
  }, [data]);

  const roles = paginationData?.items || [];
  const totalCount = paginationData?.totalCount || 0;
  const totalPages = paginationData?.totalPages || 1;
  const currentPage = paginationData?.page || page;
  const hasNextPage = paginationData?.hasNextPage || false;
  const hasPreviousPage = paginationData?.hasPreviousPage || false;

  const goToPage = (newPage: number) => {
    console.log(`Changing roles page from ${page} to ${newPage}`);
    setPage(newPage);
    // No llamar refetch() aquí - el useEffect se encarga del refetch cuando cambia page
  };

  const nextPage = () => {
    if (hasNextPage) {
      const newPage = currentPage + 1;
      console.log(`Going to next roles page: ${newPage}`);
      goToPage(newPage);
    }
  };

  const previousPage = () => {
    if (hasPreviousPage) {
      const newPage = currentPage - 1;
      console.log(`Going to previous roles page: ${newPage}`);
      goToPage(newPage);
    }
  };

  const loadRoles = () => {
    return refetch();
  };

  // Cargar roles una sola vez al montar y cuando cambie página
  useEffect(() => {
    if (!loading) {
      console.log('Loading roles for page:', page);
      execute();
    }
  }, [page, pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    roles,
    totalCount,
    totalPages,
    currentPage,
    pageSize,
    hasNextPage,
    hasPreviousPage,
    isLoading: loading,
    error,
    loadRoles,
    goToPage,
    nextPage,
    previousPage,
  };
}