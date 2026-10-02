import type { CSSProperties } from 'react';

/*
 * Pinterest-style masonry for the game and simulator collections.
 *
 * A plain CSS grid with tiny 4px row tracks: every item is measured and told how many tracks to span, and the
 * grid's own (sparse) auto-placement drops each item into the column that frees up first. DOM order — and so
 * reading and keyboard order — stays the catalogue order, unlike CSS columns. Columns and the horizontal gap
 * come from the caller; the vertical gap mirrors the horizontal one.
 */

const ROW = 4;

/** Base classes for a masonry grid. Add `grid-cols-*` and `gap-x-*` (never `gap-*`/`gap-y-*`). */
export const MASONRY_GRID = 'grid auto-rows-[4px] items-start';

function place(el: HTMLElement, gap: number) {
  const span = `span ${Math.max(1, Math.ceil((el.offsetHeight + gap) / ROW))}`;
  if (el.style.gridRowEnd !== span) el.style.gridRowEnd = span;
}

/**
 * Ref callback for a masonry grid (React 19 ref cleanup). Children must size to their content: no `h-full`
 * on the grid items themselves, or an item would grow with its own span forever.
 */
export function masonry(grid: HTMLElement | null) {
  if (!grid || typeof ResizeObserver === 'undefined') return;

  // Only the children are observed: a breakpoint that changes the gap also changes their width, so they
  // re-measure anyway, and observing the grid would re-enter the observer on every span change.
  const ro = new ResizeObserver((entries) => {
    const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
    for (const entry of entries) place(entry.target as HTMLElement, gap);
  });
  const observeChildren = () => {
    ro.disconnect();
    for (const child of grid.children) ro.observe(child);
  };
  observeChildren();

  // Filtering and sorting add, drop and reorder children.
  const mo = new MutationObserver(observeChildren);
  mo.observe(grid, { childList: true });

  return () => {
    ro.disconnect();
    mo.disconnect();
  };
}

/* ---------- cover proportions ---------- */

/** Covers keep their own shape within these bounds (portrait 3:4 … panorama 2.4:1). */
const MIN_RATIO = 0.75;
const MAX_RATIO = 2.4;
const DEFAULT_RATIO = 4 / 3;
/** Shapes for covers with no image, so composed art still varies the wall. */
const FALLBACK_RATIOS = [4 / 5, 1, 4 / 3, 3 / 2];

const ratios = new Map<string, number>();

/**
 * Initial `--cover-ratio` for a cover: the measured ratio if this image has loaded before in this session,
 * otherwise 4:3 until it loads (or a seeded shape when there is no image).
 */
export function coverRatioStyle(src: string | null | undefined, seed: number): CSSProperties {
  const ratio = src ? (ratios.get(src) ?? DEFAULT_RATIO) : FALLBACK_RATIOS[seed % FALLBACK_RATIOS.length];
  return { '--cover-ratio': ratio } as CSSProperties;
}

/**
 * Records a loaded cover's natural shape and writes it onto `host` (the element whose `--cover-ratio` the
 * cover and its overlays read). Written straight to the DOM rather than through state, so the motion
 * layout ids on the card (dialog morph) don't animate the resize as if it were a move.
 */
export function applyCoverRatio(img: HTMLImageElement, host: HTMLElement | null) {
  if (!img.naturalWidth || !img.naturalHeight) return;
  const ratio = Math.min(MAX_RATIO, Math.max(MIN_RATIO, img.naturalWidth / img.naturalHeight));
  const src = img.getAttribute('src');
  if (src) ratios.set(src, ratio);
  host?.style.setProperty('--cover-ratio', String(ratio));
}
