/*
 * Cache policy — one place that decides how long each kind of data may be reused.
 *
 * Why this exists: the backend sends the full source code of every game and simulator inside the
 * list endpoints (≈ 2.9 MB per load, uncompressed, no Cache-Control/ETag) and nothing survived a
 * reload, so every page view and every new tab re-downloaded it. The cache has four layers:
 *
 *   1. build-time snapshot   src/data/catalog-snapshot.json   (metadata only, ~40 KB, free on GitHub Pages)
 *   2. persisted query cache IndexedDB, survives reloads / new tabs / app restarts (7 days)
 *   3. slim lists            the heavy `gameCode` / `simulatorCode` fields are dropped on arrival
 *   4. code store            each experience's source is fetched once, then kept until it changes
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Bump to discard every persisted cache entry (e.g. after changing a response shape). */
export const CACHE_SCHEMA = 'curioplay-cache-v1';

/** Longest a persisted cache may be restored, and how long unused queries stay in memory. */
export const PERSIST_MAX_AGE = 7 * DAY;

export const TTL = {
  /** Game + simulator lists. Content changes rarely and admins invalidate after publishing. */
  catalog: 24 * HOUR,
  /** The public player directory (names / avatars / counts). */
  directory: 6 * HOUR,
  /** Default for everything else — small endpoints (< a few KB). */
  default: 10 * MINUTE,
} as const;

/** Query-key roots that may be written to disk. Everything else stays in memory only. */
const PERSISTED_ROOTS = new Set([
  'games',
  'simulators',
  'scores',
  'profiles',
  'achievements',
  'user-achievements',
  'sessions',
  'notifications',
  'users',
]);

/** `detail` queries carry the full source code and feed the Creator's editor — never persist them. */
export function isPersistable(queryKey: readonly unknown[]): boolean {
  const [root, second] = queryKey;
  if (typeof root !== 'string' || !PERSISTED_ROOTS.has(root)) return false;
  if ((root === 'games' || root === 'simulators') && second !== 'list') return false;
  return true;
}

/** Public data that is identical for every visitor: kept when someone signs out. */
export function isPublicQuery(queryKey: readonly unknown[]): boolean {
  const [root, second] = queryKey;
  if (root === 'games' || root === 'simulators') return second === 'list';
  if (root === 'users') return true;
  return root === 'scores' && second === 'global-leaderboard';
}
