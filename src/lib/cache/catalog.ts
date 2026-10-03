import { createStore, del, get, set, type UseStore } from 'idb-keyval';
import { gameApi, simulatorApi, userApi, type Game, type Simulator, type User } from '@/api/api';

/*
 * Data-layer helpers behind the cache:
 *   fetchGames / fetchSimulators   the real list endpoints, minus the embedded source code
 *   fetchUserDirectory             the public player list, minus anything personal
 *   getExperienceCode              source code, fetched once per version and kept in IndexedDB
 *
 * `src/api/api.ts` itself is untouched — these wrap it, so the API contract stays in one place.
 */

// ─── slim lists ───────────────────────────────────────────────────────────────

/** A shallow copy without the heavy source-code fields (they are ≈ 99 % of the list payload). */
function withoutCode<T extends Game | Simulator>(item: T): T {
  // Either DTO may carry either field (a simulator row can hold its source in `gameCode`).
  const rec = item as T & { gameCode?: string | null; simulatorCode?: string | null };
  if (!rec.gameCode && !rec.simulatorCode) return item;
  const copy = { ...rec };
  delete copy.gameCode;
  delete copy.simulatorCode;
  return copy;
}

export const fetchGames = async (): Promise<Game[]> => (await gameApi.getAll()).map(withoutCode);
export const fetchSimulators = async (): Promise<Simulator[]> => (await simulatorApi.getAll()).map(withoutCode);

/**
 * The all-users endpoint is public and returns every account's email. The app only needs names,
 * avatars and counts from it, so the e-mail is dropped before anything is cached or persisted.
 */
export const fetchUserDirectory = async (): Promise<User[]> =>
  (await userApi.getAll()).map((u) => {
    const safe = { ...u, email: '', dateOfBirth: null };
    delete (safe as { password?: unknown }).password;
    return safe;
  });

// ─── source-code store ────────────────────────────────────────────────────────

interface StoredCode {
  /** The experience's `updatedAt` when this copy was fetched. */
  v: string;
  code: string;
}

export type ExperienceKind = 'game' | 'simulator';

let codeStore: UseStore | null | undefined;
function store(): UseStore | null {
  if (codeStore === undefined) {
    try {
      codeStore = typeof indexedDB === 'undefined' ? null : createStore('curioplay-code', 'sources');
    } catch {
      codeStore = null; // private mode / blocked storage — fall back to network only
    }
  }
  return codeStore;
}

const inflight = new Map<string, Promise<string>>();

/**
 * Source code of a game or simulator. Read from IndexedDB when the stored copy matches `version`
 * (the item's `updatedAt`), otherwise fetched once and stored. Concurrent calls share one request,
 * and if the network fails an older stored copy is still better than an error.
 */
export function getExperienceCode(kind: ExperienceKind, id: string, version?: string | null): Promise<string> {
  const key = `${kind}:${id}`;
  const pending = inflight.get(key);
  if (pending) return pending;

  const run = (async () => {
    const db = store();
    let cached: StoredCode | undefined;
    try {
      cached = db ? await get<StoredCode>(key, db) : undefined;
    } catch {
      cached = undefined;
    }
    if (cached && (!version || cached.v === version)) return cached.code;

    try {
      const code = await (kind === 'game' ? gameApi.getCode(id) : simulatorApi.getCode(id));
      if (db && typeof code === 'string' && code) {
        void set(key, { v: version ?? '', code } satisfies StoredCode, db).catch(() => undefined);
      }
      return code;
    } catch (err) {
      if (cached) return cached.code;
      throw err;
    }
  })().finally(() => inflight.delete(key));

  inflight.set(key, run);
  return run;
}

/** Forget a stored source (after the admin edits or deletes it, in case `updatedAt` did not move). */
export function evictExperienceCode(kind: ExperienceKind, id: string): void {
  const db = store();
  if (db) void del(`${kind}:${id}`, db).catch(() => undefined);
}
