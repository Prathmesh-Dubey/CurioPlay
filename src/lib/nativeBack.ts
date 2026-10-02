import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import type { createBrowserRouter } from 'react-router-dom';
import { normalizeTab } from '@/components/dashboard/nav';
import { closeTopBackLayer } from '@/lib/backStack';
import { hasSession } from '@/lib/session';

/*
 * Android back button + edge-swipe back, wired into the EXISTING React Router (no second router).
 *
 * @capacitor/app fires one 'backButton' event for both the hardware/system button and the back gesture
 * (Android 13+ predictive back, enabled in AndroidManifest). Once a listener exists the plugin never exits by
 * itself, so this file owns every decision:
 *
 *   1. an open layer (dialog, sheet, menu, running game…)  → close the top-most one          (backStack.ts)
 *   2. a page with real history behind it                  → router back, no page reload
 *   3. a page that is a top-level section, or whose history can't be trusted → go Home (Overview)
 *   4. already Home / the sign-in screen                   → "press back again to exit", then exit
 */

type AppRouter = ReturnType<typeof createBrowserRouter>;

const EXIT_WINDOW_MS = 2000;
const HINT_MS = 2000;

/* ------------------------- exit hint (tiny store) ------------------------- */

let hintVisible = false;
let hintTimer: number | undefined;
const hintListeners = new Set<() => void>();

function setHint(v: boolean) {
  hintVisible = v;
  hintListeners.forEach((l) => l());
}
export const subscribeExitHint = (l: () => void) => {
  hintListeners.add(l);
  return () => void hintListeners.delete(l);
};
export const getExitHint = () => hintVisible;

function flashExitHint() {
  window.clearTimeout(hintTimer);
  setHint(true);
  hintTimer = window.setTimeout(() => setHint(false), HINT_MS);
}

/* ------------------------------ route facts ------------------------------ */

const clean = (p: string) => p.replace(/\/+$/, '') || '/';

/** The router's own location includes its basename (e.g. /curioplay on the web build); routes don't. */
const appPath = (pathname: string, basename: string) => {
  const base = clean(basename);
  const path = clean(pathname);
  return base !== '/' && (path === base || path.startsWith(`${base}/`)) ? path.slice(base.length) || '/' : path;
};

/** Where "home" is: Overview when signed in, the sign-in screen otherwise. */
export const homePath = () => (hasSession() ? '/dashboard?tab=overview' : '/login');

/** The screens where back means "leave the app" — there is nothing further up. */
export function isRootLocation(loc: { pathname: string; search: string }): boolean {
  const path = clean(loc.pathname);
  if (path === '/' || path === '/login') return true;
  if (path !== '/dashboard') return false;
  const q = new URLSearchParams(loc.search);
  // A detail, a player profile or the creator form is something to back out of, not a home screen.
  if (q.get('focus') || q.get('player') || q.get('mode') || q.get('edit')) return false;
  return normalizeTab(q.get('tab') ?? localStorage.getItem('activeTab')) === 'overview';
}

const historyIndex = () => (window.history.state as { idx?: number } | null)?.idx ?? 0;

/* ----------------------------- the controller ----------------------------- */

/**
 * The back-press decision logic, free of any Android API so it can be driven (and tested) anywhere.
 * `onBack` is what one back press does; `dispose` detaches its router subscription.
 */
export function createBackController(router: AppRouter, exitApp: () => void) {
  let lastExitPress = 0;

  // Which path sat at each history index — lets us avoid "backing" into the sign-in / splash screens while
  // signed in (they would bounce straight back and make the button feel dead).
  const visited = new Map<number, string>();
  const note = () => {
    const idx = historyIndex();
    if (router.state.historyAction === 'PUSH') for (const k of [...visited.keys()]) if (k > idx) visited.delete(k);
    visited.set(idx, appPath(router.state.location.pathname, router.basename));
  };
  note();
  const unsubscribe = router.subscribe(note);

  const onBack = () => {
    // 1. Layers first: dialogs, sheets, menus, a running game…
    if (closeTopBackLayer()) return;

    const loc = { pathname: appPath(router.state.location.pathname, router.basename), search: router.state.location.search };

    // 4. Home: deliberate exit, never an accident.
    if (isRootLocation(loc)) {
      const now = Date.now();
      if (now - lastExitPress < EXIT_WINDOW_MS) {
        setHint(false);
        exitApp();
        return;
      }
      lastExitPress = now;
      flashExitHint();
      return;
    }

    // 2. Real history behind us → plain router back (client-side, no reload, scroll/state preserved).
    const idx = historyIndex();
    const prev = visited.get(idx - 1);
    const prevIsAuth = prev === '/' || prev === '/login';
    if (idx > 0 && !(hasSession() && prevIsAuth)) {
      void router.navigate(-1);
      return;
    }

    // 3. Opened cold (restored session, deep link) or only auth pages behind: climb to Home instead of exiting.
    void router.navigate(homePath(), { replace: true });
  };

  return {
    onBack,
    dispose: () => {
      unsubscribe();
      window.clearTimeout(hintTimer);
      setHint(false);
    },
  };
}

/* ------------------------------- installer ------------------------------- */

/**
 * Binds the controller to Android's back event. Safe to call repeatedly (StrictMode, HMR): the returned cleanup
 * removes exactly what this call added, and a late-resolving registration is removed as soon as it lands.
 */
export function installNativeBack(router: AppRouter): () => void {
  if (Capacitor.getPlatform() !== 'android') return () => undefined;

  let disposed = false;
  const controller = createBackController(router, () => void App.exitApp());

  let handle: { remove: () => Promise<void> } | undefined;
  void App.addListener('backButton', () => {
    if (!disposed) controller.onBack();
  }).then((h) => {
    if (disposed) void h.remove();
    else handle = h;
  });

  return () => {
    disposed = true;
    controller.dispose();
    void handle?.remove();
  };
}
