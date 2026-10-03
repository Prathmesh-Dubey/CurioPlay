import type { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { PersistQueryClientProviderProps } from '@tanstack/react-query-persist-client';
import { createStore, del, get, set } from 'idb-keyval';
import { CACHE_SCHEMA, PERSIST_MAX_AGE, isPersistable, isPublicQuery } from './policy';

/*
 * Persists the React Query cache to IndexedDB so reloads, new tabs and app restarts (including the
 * Android WebView) start warm instead of re-downloading everything. Only whitelisted, successful
 * queries are written (see policy.ts); mutations and source-code `detail` queries never are.
 * If IndexedDB is unavailable the app simply runs with the in-memory cache it always had.
 */

type PersistOptions = PersistQueryClientProviderProps['persistOptions'];

function buildOptions(): PersistOptions | null {
  try {
    if (typeof indexedDB === 'undefined') return null;
    const db = createStore('curioplay-cache', 'query');
    const persister = createAsyncStoragePersister({
      key: 'react-query',
      throttleTime: 2000, // writes are batched; a burst of updates costs one write
      storage: {
        getItem: (key) => get<string>(key, db).then((v) => v ?? null),
        setItem: (key, value) => set(key, value, db),
        removeItem: (key) => del(key, db),
      },
    });
    return {
      persister,
      maxAge: PERSIST_MAX_AGE,
      buster: CACHE_SCHEMA,
      dehydrateOptions: {
        shouldDehydrateQuery: (query) => query.state.status === 'success' && isPersistable(query.queryKey),
      },
    };
  } catch {
    return null;
  }
}

/** `null` when the browser offers no IndexedDB (the provider then skips persistence). */
export const persistOptions = buildOptions();

/**
 * Sign-out / account deletion: drop everything tied to the person (scores, sessions, profile…)
 * and keep the public catalog, so the next sign-in doesn't re-download it.
 */
export function clearUserScopedCache(queryClient: QueryClient): void {
  void queryClient.cancelQueries();
  queryClient.removeQueries({ predicate: (q) => !isPublicQuery(q.queryKey) });
}
