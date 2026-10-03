import { useSyncExternalStore } from 'react';

/*
 * Tiny shared state for the 3D gamepad. The hero's Orrery keeps showing the flat CurioPlay mark
 * until the real model has rendered its first frame ('ready'); on 'fallback' (no WebGL, load error)
 * it simply never hands over. A module store avoids threading a context through the landing page.
 */

export type GamepadStatus = 'idle' | 'loading' | 'ready' | 'fallback';

let status: GamepadStatus = 'idle';
const listeners = new Set<() => void>();

export function setGamepadStatus(next: GamepadStatus) {
  if (status === next) return;
  status = next;
  listeners.forEach((l) => l());
}

export function getGamepadStatus() {
  return status;
}

export function useGamepadStatus() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
    () => status,
  );
}

/** Attribute marking a waypoint of the controller's scroll journey (see choreography.ts). */
export const ANCHOR_ATTR = 'data-gamepad-anchor';

export type GamepadPose = 'hero' | 'restRight' | 'restLeft' | 'hoverLeft' | 'hoverRight' | 'perch' | 'finale';

/**
 * Props that turn any element into a waypoint. Order = position on the route; the element's box
 * is where the controller rests (its width sets the controller's size there). Hide the element at a
 * breakpoint (display:none) and the route simply skips it.
 *   rest / depart: viewport fractions where it arrives / lets go (non-sticky anchors only)
 *   fit: controller width as a fraction of the element width
 */
export function gamepadAnchor(
  name: string,
  order: number,
  pose: GamepadPose,
  opts: { fit?: number; rest?: number; depart?: number } = {},
): Record<string, string> {
  const props: Record<string, string> = {
    [ANCHOR_ATTR]: name,
    'data-gamepad-order': String(order),
    'data-gamepad-pose': pose,
  };
  if (opts.fit !== undefined) props['data-gamepad-fit'] = String(opts.fit);
  if (opts.rest !== undefined) props['data-gamepad-rest'] = String(opts.rest);
  if (opts.depart !== undefined) props['data-gamepad-depart'] = String(opts.depart);
  return props;
}
