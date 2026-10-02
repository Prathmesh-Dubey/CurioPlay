import { useCallback, useEffect, useRef, useState } from 'react';

/** Nearest ancestor that scrolls vertically (the dashboard scrolls inside <main>, not the window). */
function getScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node && node !== document.body) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') return node;
    node = node.parentElement;
  }
  return null;
}

/**
 * Tracks which section is "being read": the first section intersecting a band
 * 20–45% down the viewport. Reaching the bottom of the scroller activates the last
 * section (short tail sections never reach the band). `jumpTo` pins the choice while a
 * smooth scroll is in flight so the indicator doesn't flicker through intermediate sections.
 */
export function useScrollSpy(ids: readonly string[]) {
  const [active, setActive] = useState<string>(ids[0]);
  const lockUntil = useRef(0);

  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    if (els.length === 0) return;

    const visible = new Map<string, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => visible.set(e.target.id, e.isIntersecting));
        if (Date.now() < lockUntil.current) return;
        const first = ids.find((id) => visible.get(id));
        if (first) setActive(first);
      },
      { rootMargin: '-20% 0px -55% 0px', threshold: 0 },
    );
    els.forEach((el) => io.observe(el));

    const scroller = getScrollParent(els[0]);
    const target: HTMLElement | Window = scroller ?? window;
    const onScroll = () => {
      if (Date.now() < lockUntil.current) return;
      const atBottom = scroller
        ? scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 8
        : window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8;
      if (atBottom) setActive(ids[ids.length - 1]);
    };
    target.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      io.disconnect();
      target.removeEventListener('scroll', onScroll);
    };
  }, [ids]);

  const jumpTo = useCallback((id: string, lockMs = 900) => {
    lockUntil.current = Date.now() + lockMs;
    setActive(id);
  }, []);

  return { active, jumpTo };
}
