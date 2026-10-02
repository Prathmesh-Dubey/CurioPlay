import { useCallback, useSyncExternalStore } from 'react';

/** Subscribes to a CSS media query (SSR/old-browser safe: returns `fallback`). */
export function useMediaQuery(query: string, fallback = false): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => undefined;
      const mql = window.matchMedia(query);
      mql.addEventListener('change', notify);
      return () => mql.removeEventListener('change', notify);
    },
    [query],
  );
  const read = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : fallback);
  return useSyncExternalStore(subscribe, read, () => fallback);
}

/** Mouse / trackpad: a precise pointer that can hover. Tilt + spotlight only run here. */
export const useCanHover = () => useMediaQuery('(hover: hover) and (pointer: fine)');
