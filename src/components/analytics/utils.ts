import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';

/** Shared formatting + time helpers for the instrument room (analytics) and the profile cards. */

export const DAY = 86_400_000;

export type RangeKey = '7d' | '30d' | 'all';

export const RANGE_LABEL: Record<RangeKey, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  all: 'All time',
};

/** Durations from the API are in seconds. */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return m ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

/** Splits seconds into a number + unit suffix so StatCard can animate it, e.g. 12 + "h 30m". */
export function splitDuration(seconds: number): { value: number; suffix: string } {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return { value: s, suffix: 's' };
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return { value: h, suffix: m ? `h ${m}m` : 'h' };
  return { value: m, suffix: 'm' };
}

/** Subscribes to a CSS media query (false during SSR / unsupported). */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (cb: () => void) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', cb);
      return () => mql.removeEventListener('change', cb);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => (typeof window !== 'undefined' && !!window.matchMedia ? window.matchMedia(query).matches : false),
    () => false,
  );
}

export const toTime = (iso: string | null | undefined) => {
  if (!iso) return NaN;
  return new Date(iso).getTime();
};

export const isValidTime = (t: number) => Number.isFinite(t);

export const shortDate = (d: string | number | Date) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export const longDate = (d: string | number | Date) =>
  new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export const clockTime = (d: string | number | Date) => new Date(d).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

export const weekdayDate = (d: string | number | Date) =>
  new Date(d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

/** "12,400" below 10k, "12.4K" above (axis labels). */
export function compactNumber(v: number): string {
  if (Math.abs(v) < 10_000) return Math.round(v).toLocaleString();
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(v);
}

export function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Local calendar key, stable across DST. */
export function dayKey(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Inclusive lower bound for a range (local midnight), or -Infinity for "all". */
export function rangeStart(range: RangeKey, now: number): number {
  if (range === 'all') return -Infinity;
  const days = range === '7d' ? 7 : 30;
  const d = new Date(startOfDay(now));
  d.setDate(d.getDate() - (days - 1));
  return d.getTime();
}

/** Round a maximum up to 1/2/2.5/5 × 10ⁿ so axis ticks read cleanly. */
export function niceMax(v: number): number {
  if (v <= 0) return 10;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * pow;
}

/** Measures an element's content width (for SVG charts that render at true pixel size). */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(Math.round(el.getBoundingClientRect().width));
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Monotone cubic path (Fritsch–Carlson): smooth, never overshoots the data. */
export function monotonePath(pts: readonly (readonly [number, number])[]): string {
  const n = pts.length;
  if (n === 0) return '';
  if (n === 1) return `M${pts[0][0]},${pts[0][1]}`;
  if (n === 2) return `M${pts[0][0]},${pts[0][1]}L${pts[1][0]},${pts[1][1]}`;
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1][0] - pts[i][0] || 1e-6;
    m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i];
  }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  t[n - 1] = m[n - 2];
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      t[i] = k * a * m[i];
      t[i + 1] = k * b * m[i];
    }
  }
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${(pts[i][0] + h).toFixed(1)},${(pts[i][1] + t[i] * h).toFixed(1)} ${(pts[i + 1][0] - h).toFixed(1)},${(
      pts[i + 1][1] -
      t[i + 1] * h
    ).toFixed(1)} ${pts[i + 1][0].toFixed(1)},${pts[i + 1][1].toFixed(1)}`;
  }
  return d;
}

/** Normalise a user-entered website to an absolute https:// link (keeps http/https if present). */
export function websiteHref(website: string): string {
  return /^https?:\/\//i.test(website) ? website : `https://${website}`;
}

export const websiteLabel = (website: string) => website.replace(/^https?:\/\//i, '').replace(/\/$/, '');
