# CurioPlay

**Explore beyond the ordinary.** CurioPlay is a digital playground of interactive simulators, educational games and coding experiences that run directly in the browser — on the web and as an Android app.

> Learn it. Play it. Experience it.

Live: https://prathmesh-dubey.github.io/curioplay/

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
npm run dev        # http://localhost:5173/curioplay/
npm run lint       # type-check
npm run build
npm run deploy     # GitHub Pages (base path /curioplay/)
```

### Android

```bash
npm run build:android   # relative asset paths for the WebView
npx cap sync android
npx cap open android
```

Launcher icons and splash screens are generated from `resources/` with `npx @capacitor/assets generate --android`.

## Developer

Prathmesh Dubey — https://github.com/Prathmesh-Dubey
