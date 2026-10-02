import { useCallback, useEffect, useState } from 'react';

/*
 * Personal colour palette.
 *   primary   → the profile's accentColor (saved to the backend; applied in DashboardApp as before)
 *   the rest  → this file: background, text, secondary, accent, saved per user in this browser only.
 * Unset colours fall back to the CurioPlay defaults of the current light/dark theme.
 */

export type LocalColorKey = 'background' | 'text' | 'secondary' | 'accent';
export type PaletteKey = LocalColorKey | 'primary';
export type LocalPalette = Partial<Record<LocalColorKey, string>>;

/** CurioPlay's own colours, i.e. what every user gets until they choose otherwise. */
export const DEFAULT_PALETTE: Record<'dark' | 'light', Record<PaletteKey, string>> = {
  dark: { background: '#071a2e', text: '#f8fafc', primary: '#2563eb', secondary: '#172b45', accent: '#8bcbff' },
  light: { background: '#f5f8fc', text: '#071a2e', primary: '#2563eb', secondary: '#e4ebf5', accent: '#8bcbff' },
};

export interface PalettePreset {
  id: string;
  name: string;
  colors: Record<PaletteKey, string>;
}

/** One-click themes. `curioplay` is the default (it clears every custom colour). */
export const PALETTE_PRESETS: PalettePreset[] = [
  { id: 'curioplay', name: 'CurioPlay', colors: DEFAULT_PALETTE.dark },
  { id: 'emerald-ivory', name: 'Emerald Ivory', colors: { background: '#f7f5ef', text: '#173b2d', primary: '#176b4d', secondary: '#dce9df', accent: '#c6a76b' } },
  { id: 'violet-night', name: 'Violet Night', colors: { background: '#171126', text: '#ffffff', primary: '#a855f7', secondary: '#35234c', accent: '#f472b6' } },
  { id: 'burgundy-cream', name: 'Burgundy Cream', colors: { background: '#faf5ef', text: '#3a1724', primary: '#8b1e3f', secondary: '#e9d8d0', accent: '#c9a46a' } },
  { id: 'ember', name: 'Ember', colors: { background: '#181818', text: '#fafafa', primary: '#ff5c1b', secondary: '#303030', accent: '#ffb18f' } },
  { id: 'deep-forest', name: 'Deep Forest', colors: { background: '#10251b', text: '#f5f3e9', primary: '#496b45', secondary: '#243d2d', accent: '#c4a66a' } },
  { id: 'cocoa-sky', name: 'Cocoa Sky', colors: { background: '#201814', text: '#f3ede4', primary: '#a7d8e8', secondary: '#a65332', accent: '#d8a17b' } },
];

const HEX_RE = /^#[0-9a-f]{6}$/i;
export const isHex = (v: string) => HEX_RE.test(v);

const storageKey = (userId: string) => `curioplay_palette_${userId}`;
const EVENT = 'curioplay-palette';

export function loadPalette(userId: string | undefined): LocalPalette {
  if (!userId) return {};
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey(userId)) || '{}') as Record<string, unknown>;
    const out: LocalPalette = {};
    (['background', 'text', 'secondary', 'accent'] as const).forEach((k) => {
      const v = raw[k];
      if (typeof v === 'string' && isHex(v)) out[k] = v.toLowerCase();
    });
    return out;
  } catch {
    return {};
  }
}

function savePalette(userId: string, palette: LocalPalette) {
  try {
    if (Object.keys(palette).length) localStorage.setItem(storageKey(userId), JSON.stringify(palette));
    else localStorage.removeItem(storageKey(userId));
  } catch {
    /* storage unavailable: the palette still applies for this visit */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { userId, palette } }));
}

/** This user's local palette, kept in sync across every component that uses it. */
export function useLocalPalette(userId: string | undefined) {
  const [palette, setPalette] = useState<LocalPalette>(() => loadPalette(userId));

  useEffect(() => setPalette(loadPalette(userId)), [userId]);

  useEffect(() => {
    const onChange = (e: Event) => {
      const { userId: id, palette: next } = (e as CustomEvent<{ userId: string; palette: LocalPalette }>).detail;
      if (id === userId) setPalette(next);
    };
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, [userId]);

  const setColor = useCallback(
    (key: LocalColorKey, value: string | null) => {
      if (!userId) return;
      const next = { ...loadPalette(userId) };
      if (value && isHex(value)) next[key] = value.toLowerCase();
      else delete next[key];
      savePalette(userId, next);
    },
    [userId],
  );

  const resetAll = useCallback(() => {
    if (userId) savePalette(userId, {});
  }, [userId]);

  /** Replace the whole local palette in one go (a preset). */
  const setAll = useCallback(
    (next: LocalPalette) => {
      if (!userId) return;
      const clean: LocalPalette = {};
      (Object.keys(next) as LocalColorKey[]).forEach((k) => {
        const v = next[k];
        if (v && isHex(v)) clean[k] = v.toLowerCase();
      });
      savePalette(userId, clean);
    },
    [userId],
  );

  return { palette, setColor, setAll, resetAll };
}

/* ------------------------------------------------------------------ */
/* Contrast helpers                                                     */
/* ------------------------------------------------------------------ */

function channel(c: number) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** WCAG contrast ratio between two hex colours (1–21). */
export function contrast(a: string, b: string) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/* ------------------------------------------------------------------ */
/* Applying to the CSS tokens                                           */
/* ------------------------------------------------------------------ */

export const PALETTE_VARS = [
  '--cp-canvas',
  '--cp-surface',
  '--cp-surface-2',
  '--cp-line',
  '--cp-line-strong',
  '--cp-navy',
  '--cp-ink',
  '--cp-ink-muted',
  '--cp-ink-faint',
  '--cp-rose',
  '--cp-rose-soft',
  '--cp-navy-2',
  '--cp-gold',
  '--cp-gold-strong',
  '--cp-gold-soft',
  'color-scheme',
] as const;

const mix = (a: string, pct: number, b: string) => `color-mix(in srgb, ${a} ${pct}%, ${b})`;

/**
 * Writes the user's colours onto the theme tokens (inline on <html>, so they beat both themes),
 * deriving the supporting shades — surfaces, hairlines, muted text — from them.
 */
export function applyPalette(palette: LocalPalette, isDarkTheme: boolean) {
  const root = document.documentElement;
  PALETTE_VARS.forEach((v) => root.style.removeProperty(v));
  const set = (k: string, v: string) => root.style.setProperty(k, v);

  const bg = palette.background;
  // A custom background decides light vs dark surfaces by its own brightness.
  const darkSurface = bg ? luminance(bg) < 0.18 : isDarkTheme;
  const text = palette.text ?? (bg ? (darkSurface ? DEFAULT_PALETTE.dark.text : DEFAULT_PALETTE.light.text) : undefined);

  if (bg) {
    set('color-scheme', darkSurface ? 'dark' : 'light');
    set('--cp-canvas', bg);
    set('--cp-surface', darkSurface ? mix(bg, 92, '#ffffff') : mix(bg, 35, '#ffffff'));
    set('--cp-surface-2', darkSurface ? mix(bg, 84, '#ffffff') : mix(bg, 92, '#000000'));
    set('--cp-line', mix(bg, 86, text!));
    set('--cp-line-strong', mix(bg, 76, text!));
    set('--cp-navy', darkSurface ? mix(bg, 80, '#000000') : mix(bg, 12, '#071a2e'));
  }
  if (text) {
    set('--cp-ink', text);
    set('--cp-ink-muted', mix(text, 72, 'var(--cp-canvas)'));
    set('--cp-ink-faint', mix(text, 50, 'var(--cp-canvas)'));
  }
  if (palette.secondary) {
    const s = palette.secondary;
    set('--cp-rose-soft', s);
    set('--cp-navy-2', s);
    set('--cp-rose', mix(s, 70, 'var(--cp-ink)'));
  }
  if (palette.accent) {
    const a = palette.accent;
    set('--cp-gold', a);
    set('--cp-gold-strong', darkSurface ? mix(a, 80, '#ffffff') : mix(a, 55, '#000000'));
    set('--cp-gold-soft', mix(a, darkSurface ? 20 : 16, 'var(--cp-surface)'));
  }

  return () => PALETTE_VARS.forEach((v) => root.style.removeProperty(v));
}
