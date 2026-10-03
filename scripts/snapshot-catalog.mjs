#!/usr/bin/env node
/*
 * Build-time catalog snapshot.
 *
 * Fetches the game + simulator lists once, drops the embedded source code (≈ 99 % of the bytes) and
 * writes src/data/catalog-snapshot.json. The app ships it inside its bundle, so a first-time visitor
 * sees the catalogue instantly without calling the backend; the live API is only asked again once the
 * snapshot is older than the catalog cache window (see src/lib/cache/policy.ts).
 *
 *   npm run snapshot            refresh unless the file is < 10 minutes old
 *   npm run snapshot -- --force always refresh
 *
 * Never fails the build: on any error the previous snapshot (or none) is kept and the app falls
 * back to the live API.
 */
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'src', 'data', 'catalog-snapshot.json');
const FRESH_MS = 10 * 60 * 1000;
const force = process.argv.includes('--force');

// One source of truth for the backend URL: read it from the API module.
const apiSource = await readFile(path.join(root, 'src', 'api', 'api.ts'), 'utf8');
const BASE_URL = /const BASE_URL = '([^']+)'/.exec(apiSource)?.[1];
if (!BASE_URL) {
  console.warn('[snapshot] could not find BASE_URL in src/api/api.ts — skipped');
  process.exit(0);
}

if (!force) {
  try {
    const age = Date.now() - (await stat(OUT)).mtimeMs;
    if (age < FRESH_MS) {
      console.log(`[snapshot] up to date (${Math.round(age / 1000)}s old) — skipped`);
      process.exit(0);
    }
  } catch {
    /* no snapshot yet */
  }
}

const slim = (list) =>
  list.map((item) => {
    const copy = { ...item };
    delete copy.gameCode;
    delete copy.simulatorCode;
    return copy;
  });

async function getJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error(`${url} did not return a list`);
  return data;
}

try {
  const [games, simulators] = await Promise.all([getJson(`${BASE_URL}/api/games`), getJson(`${BASE_URL}/api/simulators`)]);
  if (games.length + simulators.length === 0) throw new Error('backend returned an empty catalog');
  const snapshot = { generatedAt: Date.now(), games: slim(games), simulators: slim(simulators) };
  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(snapshot));
  console.log(`[snapshot] ${snapshot.games.length} games + ${snapshot.simulators.length} simulators -> ${(JSON.stringify(snapshot).length / 1024).toFixed(0)} KB`);
} catch (err) {
  console.warn(`[snapshot] ${err instanceof Error ? err.message : err} — keeping the previous snapshot, if any`);
}
