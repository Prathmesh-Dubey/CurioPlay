const KEY = 'curioplay_user';

/** True when a CurioPlay session is stored (used only to pick CTA destinations). */
export function hasSession(): boolean {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return false;
  }
}

export function entryPath(): string {
  return hasSession() ? '/dashboard' : '/login';
}

/** Deep link to an experience: opens its detail inside the dashboard, or the login page first. */
export function experiencePath(id: string, kind: 'game' | 'simulator'): string {
  if (!hasSession()) return '/login';
  const tab = kind === 'game' ? 'games' : 'simulators';
  return `/dashboard?tab=${tab}&focus=${encodeURIComponent(id)}`;
}
