# CurioPlay

**Explore beyond the ordinary.** CurioPlay is a digital playground of interactive simulators, educational games and coding experiences that run directly in the browser — on the web and as an Android app.

> Learn it. Play it. Experience it.

Live: https://prathmesh-dubey.github.io/CurioPlay/

## What's inside

- **Landing page** — editorial hero, platform overview, live featured games/simulators, feature bento, FAQ.
- **Authentication** — login / register with validation, admin registration key for creator accounts.
- **Dashboard** — overview, game library, simulator lab, leaderboard, achievements, analytics, profile, settings.
- **Creator Studio (admins)** — paste a single-file React TSX component and publish it as a game or simulator.
- **Admin notifications** — broadcast alerts to every player.
- **Execution sandbox** — TSX is transpiled in the browser (Babel) and rendered with React, Lucide and Motion available.

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS 4 · React Router 7 · TanStack Query · Motion (+ [Motion Primitives](https://motion-primitives.com)) · Lucide · Capacitor (Android)

## Design system

See [`DESIGN.md`](DESIGN.md) — art direction "A Field Guide to Curiosity", tokens, typography, motion language and component catalogue.
Tokens live in `src/index.css` (CSS variables; dark is the default theme, light is derived). Brand palette:

| Role | Hex |
| --- | --- |
| Background | `#071A2E` |
| Text | `#F8FAFC` |
| Primary | `#2563EB` |
| Secondary | `#172B45` |
| Accent | `#8BCBFF` |

Font: Archivo (variable, with the width axis — bundled via `@fontsource-variable/archivo`, works offline in the Android app).

```
src/
  api/            REST client for the CurioPlay backend
  components/
    ui/           buttons, inputs, cards, toasts, avatar, logo …
    motion/       Motion Primitives (+ reveal helpers)
    layout/       containers & section headings
    landing/      landing page sections
    auth/         login / register
    dashboard/    shell, overview, achievements, analytics, settings …
    games/ simulators/ leaderboard/ profile/ creator/
  hooks/          react-query hooks, theme, catalog
  pages/          route components
```

## Develop

```bash
npm install
npm run dev          # http://localhost:5173/            (dev server, base "/")
npm run lint         # type-check
npm run build        # builds BOTH targets: dist/ (web) and dist-android/ (Android)
npm run preview      # serves dist/ the way GitHub Pages will: http://localhost:4173/CurioPlay/
npm run deploy       # builds the web target and publishes dist/ to the gh-pages branch
```

### One codebase, three base paths

`vite.config.ts` decides the base path in one place, and the router's basename follows it (`import.meta.env.BASE_URL`):

| Target | Command | Base | Output |
| --- | --- | --- | --- |
| GitHub Pages | `npm run build:web` / `npm run deploy` | `/CurioPlay/` | `dist/` |
| Android (Capacitor) | `npm run build:android` / `npm run android:sync` | `./` | `dist-android/` |
| Local dev | `npm run dev` | `/` | — |

GitHub Pages paths are **case-sensitive**: the base must match the repository name exactly (`CurioPlay`). If the repository is ever renamed or forked, build with `VITE_BASE_PATH=/NewName/ npm run build:web` (or change `REPO` in `vite.config.ts`).

Deep links and refreshes work on GitHub Pages through `public/404.html` + the restore script in `index.html` (the standard SPA fallback for project sites). `public/.nojekyll` keeps GitHub from processing the files.

### Caching (backend egress)

The backend returns every game's and simulator's full source code inside `/api/games` and `/api/simulators` (≈ 2.9 MB per call, uncompressed, no `Cache-Control`/`ETag`). Before the cache, every page view, reload and new tab downloaded it again. The cache layers live in `src/lib/cache/`:

| Layer | What it does | Egress |
| --- | --- | --- |
| **Catalog snapshot** (`scripts/snapshot-catalog.mjs` → `src/data/catalog-snapshot.json`) | Metadata-only copy of the catalog (~40 KB) baked into the bundle at build time. First paint needs no API call. | 0 for a first visit while the snapshot is < 24 h old |
| **Persisted query cache** (`persist.ts`) | React Query cache saved to IndexedDB (7 days): reloads, new tabs and app restarts start warm. Only whitelisted, successful queries; sign-out drops user data and keeps the public catalog. | 0 on reload / new tab |
| **Slim lists** (`catalog.ts`) | `gameCode` / `simulatorCode` are dropped on arrival, so lists stay ~40 KB in memory and on disk. `useGames({ active: true })` is derived from the same list (no second download). | −99 % per list |
| **Source-code store** (`getExperienceCode`) | A game's/simulator's source is fetched from `/{id}/code` once, kept in IndexedDB, and reused until its `updatedAt` changes (or an admin edits/deletes it). | 1 small request per experience, ever |

TTLs are in `policy.ts` (`TTL.catalog` = 24 h). Bump `CACHE_SCHEMA` there to discard every persisted entry after changing a response shape. The snapshot is regenerated automatically by `predev` / `prebuild:*` (skipped if < 10 min old, never fails the build); run `npm run snapshot -- --force` to refresh by hand. It is git-ignored, and the app works without it (it just calls the API on first load). The all-users endpoint is public and includes e-mails, so the cached copy has them stripped.

Remaining bytes are the backend's to fix: enabling response compression (`server.compression.enabled=true` in Spring Boot) cuts each list ~5×, and a list DTO without the code fields would cut it ~99 %.

### Android

Capacitor's `webDir` is `dist-android`, which holds a separate build with relative asset paths. The web build (`dist/`) is never packaged into the app.

```bash
npm run build           # web + android bundles
npx cap sync android    # copies dist-android/ into the Android project
npx cap open android

# or in one step, Android only:
npm run android:sync
```

Launcher icons and splash screens are generated from `resources/` with `npx @capacitor/assets generate --android`.

## Developer

Prathmesh Dubey — https://github.com/Prathmesh-Dubey
