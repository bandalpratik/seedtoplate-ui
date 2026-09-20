import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../lib/ApiError';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && !error.isNetwork) return false;
        return failureCount < 2;
      },
    },
    mutations: { retry: false },
  },
});
