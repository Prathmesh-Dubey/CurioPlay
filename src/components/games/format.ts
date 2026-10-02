/** Small, pure helpers shared by the Arcade Wing components. */

export function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function timeOf(value: string | null | undefined): number {
  const t = value ? Date.parse(value) : NaN;
  return Number.isNaN(t) ? 0 : t;
}

export function formatDate(value: string | null | undefined): string {
  const t = timeOf(value);
  if (!t) return 'Unknown';
  return new Date(t).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const DAY = 86_400_000;

/** "Added today" · "Added 3 days ago" · "Added 2 weeks ago" · "Added Oct 2" (catalogue caption). */
export function addedLabel(value: string | null | undefined): string {
  const t = timeOf(value);
  if (!t) return 'Catalogued';
  const days = Math.floor((Date.now() - t) / DAY);
  if (days <= 0) return 'Added today';
  if (days === 1) return 'Added yesterday';
  if (days < 7) return `Added ${days} days ago`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return `Added ${w} ${w === 1 ? 'week' : 'weeks'} ago`;
  }
  const d = new Date(t);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return `Added ${d.toLocaleDateString(undefined, sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', year: 'numeric' })}`;
}

export interface LaunchRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Viewport rect of an element, used as the Stage's launch origin. */
export function rectOf(el: Element | null | undefined): LaunchRect | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}
