import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const KEY = 'theme';

/**
 * Stored values: 'light' | 'dark' | 'system'. No stored value = the brand default, dark
 * (CurioPlay's palette is a navy interface; light is the derived alternative).
 */
function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    if (saved === 'system' && typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
  } catch {
    /* storage unavailable */
  }
  return 'dark';
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', theme === 'dark' ? '#071a2e' : '#f5f8fc');
}

/** Persistent light/dark theme. Shares the existing `theme` localStorage key. */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // keep multiple hook instances (navbar + dashboard) in sync
  useEffect(() => {
    const onChange = (e: Event) => setThemeState((e as CustomEvent<Theme>).detail);
    window.addEventListener('curioplay-theme', onChange);
    return () => window.removeEventListener('curioplay-theme', onChange);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
    setThemeState(next);
    window.dispatchEvent(new CustomEvent<Theme>('curioplay-theme', { detail: next }));
  }, []);

  const toggle = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [theme, setTheme]);

  return { theme, setTheme, toggle, isDark: theme === 'dark' };
}
