import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  usersService,
  type User,
  type CreateUserRequest,
  type UpdateUserRequest,
  type PaginatedResult,
} from '@/services/api/users';

interface UsersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
  role?: string;
}

export function useUsers(params?: UsersParams) {
  const [data, setData] = useState<User[] | PaginatedResult<User> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoizar params para evitar cambios innecesarios
  const memoizedParams = useMemo(() => params, [JSON.stringify(params)]);

  const execute = useCallback(async () => {
    if (loading) return; // Evitar múltiples llamadas simultáneas

    setLoading(true);
    setError(null);

    try {
      const response = await usersService.getAllUsers(memoizedParams);

      if (response.success && response.data) {
        // Pasar toda la respuesta - no extraer items aquí
        setData(response.data);
      } else {
        setError(response.error || 'Error loading users');
        setData(null);
      }
    } catch (err) {
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

export function useUser(id: number | string) {
  const [data, setData] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await usersService.getUserById(Number(id));
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.error || 'Error loading user');
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

export function useCreateUser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return {
    mutateAsync: async (userData: CreateUserRequest) => {
      setLoading(true);
      setError(null);

      try {
        const response = await usersService.createUser(userData);
        if (response.success) {
          return response.data;
        } else {
          setError(response.error || 'Error creating user');
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

export function useUpdateUser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return {
    mutateAsync: async (variables: { id: number } & UpdateUserRequest) => {
      setLoading(true);
      setError(null);

      try {
        const { id, ...userData } = variables;
        const response = await usersService.updateUser(id, userData);
        if (response.success) {
          return response.data;
        } else {
          setError(response.error || 'Error updating user');
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

export function useDeleteUser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return {
    mutateAsync: async (id: number) => {
      setLoading(true);
      setError(null);

      try {
        const response = await usersService.deleteUser(id);
        if (response.success) {
          return true;
        } else {
          setError(response.error || 'Error deleting user');
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

export function usePaginatedUsers(initialPage = 1, pageSize = 5) {
  const [page, setPage] = useState(initialPage);
  const [paginationData, setPaginationData] = useState<PaginatedResult<User> | null>(null);

  // Memoizar params para evitar recreaciones
  const params = useMemo(() => ({ page, pageSize }), [page, pageSize]);

  const { data, loading, error, refetch, execute } = useUsers(params);

  // Handle pagination data when data changes
  useEffect(() => {
    if (data) {
      if ('items' in data && 'totalCount' in data) {
        // It's a PaginatedResult from the backend
        setPaginationData(data as PaginatedResult<User>);
      } else if (Array.isArray(data)) {
        // It's a simple array (when no pagination params)
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

  const users = paginationData?.items || [];
  const totalCount = paginationData?.totalCount || 0;
  const totalPages = paginationData?.totalPages || 1;
  const currentPage = paginationData?.page || page;
  const hasNextPage = paginationData?.hasNextPage || false;
  const hasPreviousPage = paginationData?.hasPreviousPage || false;

  const goToPage = (newPage: number) => {
    setPage(newPage);
    // No llamar refetch() aquí - el useEffect se encarga del refetch cuando cambia page
  };

  const nextPage = () => {
    if (hasNextPage) {
      const newPage = currentPage + 1;
      goToPage(newPage);
    }
  };

  const previousPage = () => {
    if (hasPreviousPage) {
      const newPage = currentPage - 1;
      goToPage(newPage);
    }
  };

  const loadUsers = () => {
    return refetch();
  };

  // Cargar usuarios una sola vez al montar y cuando cambie página
  useEffect(() => {
    if (!loading) {
      execute();
    }
  }, [page, pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    users,
    totalCount,
    totalPages,
    currentPage,
    pageSize,
    hasNextPage,
    hasPreviousPage,
    isLoading: loading,
    error,
    loadUsers,
    goToPage,
    nextPage,
    previousPage,
  };
}
