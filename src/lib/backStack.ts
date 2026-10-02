import { useEffect, useRef } from 'react';

/*
 * Back stack — what the Android back button / edge-swipe closes before it navigates.
 *
 * Every dismissible layer (dialog, sheet, popover, menu, running game, finder…) registers itself while it is
 * open via `useBackClose(open, close)`. The newest layer is on top, so back always peels off the top-most
 * thing first, and only when nothing is open does the router go back (see nativeBack.ts).
 * Platform-neutral on purpose: registering costs nothing in a normal browser.
 */

/** A layer's close handler. Return 'stay' when it only peeled something smaller (e.g. left fullscreen) and remains open. */
type CloseResult = void | 'stay';

interface Layer {
  id: number;
  close: () => CloseResult;
}

const layers: Layer[] = [];
let nextId = 1;

/** Registers a layer; returns the function that removes it. */
export function pushBackLayer(close: () => CloseResult): () => void {
  const layer: Layer = { id: nextId++, close };
  layers.push(layer);
  return () => {
    const i = layers.findIndex((l) => l.id === layer.id);
    if (i !== -1) layers.splice(i, 1);
  };
}

/** True while at least one layer is open. */
export const hasBackLayer = () => layers.length > 0;

/**
 * Closes the top-most layer. Returns true if something was closed (so the caller must NOT navigate).
 * The layer is removed first, so a close handler that re-opens or double-fires can't be hit twice by one press.
 */
export function closeTopBackLayer(): boolean {
  const top = layers.pop();
  if (!top) return false;
  if (top.close() === 'stay') layers.push(top);
  return true;
}

/**
 * Registers `onClose` as a back-closable layer while `active` is true.
 * The newest callback is always the one invoked, without re-registering (which would change stacking order).
 */
export function useBackClose(active: boolean, onClose: () => CloseResult) {
  const ref = useRef(onClose);
  ref.current = onClose;
  useEffect(() => {
    if (!active) return;
    return pushBackLayer(() => ref.current());
  }, [active]);
}
