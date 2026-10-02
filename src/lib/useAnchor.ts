import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from 'react';

export type Placement = 'bottom-start' | 'bottom-end' | 'bottom' | 'top-start' | 'top-end' | 'top' | 'right' | 'left';

interface AnchorPos {
  top: number;
  left: number;
  /** Final placement after flipping to stay in the viewport. */
  placement: Placement;
  /** Anchor width — handy for matching a listbox to its trigger. */
  anchorWidth: number;
}

const GAP = 8;
const PAD = 8;

/**
 * Positions a floating element (rendered in a portal with `position: fixed`)
 * relative to an anchor. Flips vertically when there's no room and clamps to the viewport.
 */
export function useAnchor(
  anchorRef: RefObject<HTMLElement | null>,
  floatingRef: RefObject<HTMLElement | null>,
  open: boolean,
  placement: Placement = 'bottom-start',
) {
  const [pos, setPos] = useState<AnchorPos | null>(null);

  const update = useCallback(() => {
    const a = anchorRef.current;
    const f = floatingRef.current;
    if (!a) return;
    const r = a.getBoundingClientRect();
    const fw = f?.offsetWidth ?? 0;
    const fh = f?.offsetHeight ?? 0;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let p = placement;
    if (p.startsWith('bottom') && r.bottom + GAP + fh > vh - PAD && r.top - GAP - fh > PAD) {
      p = p.replace('bottom', 'top') as Placement;
    } else if (p.startsWith('top') && r.top - GAP - fh < PAD && r.bottom + GAP + fh < vh - PAD) {
      p = p.replace('top', 'bottom') as Placement;
    }

    let top = 0;
    let left = 0;
    if (p.startsWith('bottom')) top = r.bottom + GAP;
    else if (p.startsWith('top')) top = r.top - GAP - fh;
    else top = r.top + r.height / 2 - fh / 2;

    if (p === 'right') left = r.right + GAP;
    else if (p === 'left') left = r.left - GAP - fw;
    else if (p.endsWith('-end')) left = r.right - fw;
    else if (p.endsWith('-start')) left = r.left;
    else left = r.left + r.width / 2 - fw / 2;

    left = Math.min(Math.max(PAD, left), vw - fw - PAD);
    top = Math.min(Math.max(PAD, top), vh - fh - PAD);
    setPos({ top, left, placement: p, anchorWidth: r.width });
  }, [anchorRef, floatingRef, placement]);

  useLayoutEffect(() => {
    if (!open) return;
    update();
    // second pass once the floating element has measured itself
    const id = requestAnimationFrame(update);
    return () => cancelAnimationFrame(id);
  }, [open, update]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, update]);

  return pos;
}

/** Calls `onOutside` for pointer-downs outside every given element. */
export function useOutside(refs: RefObject<HTMLElement | null>[], onOutside: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: PointerEvent) => {
      const t = e.target as Node;
      if (refs.some((r) => r.current?.contains(t))) return;
      onOutside();
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [refs, onOutside, active]);
}
