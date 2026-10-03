import { QueryClient } from '@tanstack/react-query';
import { PERSIST_MAX_AGE, TTL } from './cache/policy';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Small endpoints: reuse for 10 minutes. Big ones (the game/simulator lists) set TTL.catalog themselves.
      staleTime: TTL.default,
      // Must be >= the persisted cache's maxAge, or restored entries are garbage-collected immediately.
      gcTime: PERSIST_MAX_AGE,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      // Only refetch on mount when the data is stale. This was `false`, which would leave data restored
      // from the persisted cache stale forever; staleTime now does the rate limiting instead.
      refetchOnMount: true,
      retry: 1,
      throwOnError: false,
    },
    mutations: {
      retry: 1,
    },
  },
});
