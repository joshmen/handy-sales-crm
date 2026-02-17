import { useApi } from './useApi';
import { AxiosRequestConfig } from 'axios';

interface UseApiMutationOptions<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: unknown, variables: TVariables) => void;
  onSettled?: (data: TData | undefined, error: unknown, variables: TVariables) => void;
}

export function useApiMutation<TData = unknown, TVariables = unknown>(
  url: string | ((variables: TVariables) => string),
  config?: AxiosRequestConfig,
  options?: UseApiMutationOptions<TData, TVariables>
) {
  const api = useApi<TData>(typeof url === 'function' ? '' : url, config, {
    onSuccess: undefined,
    onError: undefined,
  });

  const mutate = async (variables: TVariables): Promise<TData | undefined> => {
    try {
      const response = await api.execute(variables as Record<string, unknown>);

      if (response !== undefined) {
        options?.onSuccess?.(response, variables);
        options?.onSettled?.(response, null, variables);
      }

      return response;
    } catch (error) {
      options?.onError?.(error, variables);
      options?.onSettled?.(undefined, error, variables);
      throw error;
    }
  };

  const mutateAsync = async (variables: TVariables): Promise<TData> => {
    const result = await mutate(variables);
    if (result === undefined) {
      throw new Error('Mutation failed');
    }
    return result;
  };

  return {
    ...api,
    mutate,
    mutateAsync,
    isLoading: api.loading,
    isError: !!api.error,
    isSuccess: !api.loading && !api.error && api.data !== undefined,
    isIdle: !api.loading && !api.error && api.data === undefined,
  };
}
