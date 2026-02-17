import { useApiQuery } from './useApiQuery';
import { useApiMutation } from './useApiMutation';
import { useAppStore } from '@/stores/useAppStore';
import type { Client } from '@/types';

interface ClientsParams {
  search?: string;
  page?: number;
  limit?: number;
  type?: string;
  city?: string;
  isActive?: boolean;
}

export function useClients(params?: ClientsParams) {
  const { setClients } = useAppStore();

  const queryKey = ['clients', JSON.stringify(params || {})];

  return useApiQuery(
    queryKey,
    '/api/clientes',
    {
      method: 'GET',
      params,
    },
    {
      onSuccess: (data: { clients: Client[] }) => {
        if (data?.clients) {
          setClients(data.clients);
        }
      },
    }
  );
}

export function useClient(id: string) {
  return useApiQuery(
    ['client', id],
    `/api/clientes/${id}`,
    { method: 'GET' },
    {
      enabled: !!id,
    }
  );
}

export function useCreateClient() {
  const { addClient } = useAppStore();

  return useApiMutation<Client, Partial<Client>>(
    '/api/clientes',
    { method: 'POST' },
    {
      onSuccess: data => {
        addClient(data);
      },
    }
  );
}

export function useUpdateClient() {
  const { updateClient } = useAppStore();

  return useApiMutation<Client, { id: string } & Partial<Client>>(
    variables => `/api/clientes/${variables.id}`,
    { method: 'PUT' },
    {
      onSuccess: data => {
        updateClient(data);
      },
    }
  );
}

export function useDeleteClient() {
  const { deleteClient } = useAppStore();

  return useApiMutation<void, string>(
    id => `/api/clientes/${id}`,
    { method: 'DELETE' },
    {
      onSuccess: (_, id) => {
        deleteClient(id);
      },
    }
  );
}
