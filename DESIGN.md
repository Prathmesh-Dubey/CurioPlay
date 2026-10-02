# CurioPlay Design System — "A Field Guide to Curiosity"

CurioPlay should feel like opening a beautifully made field guide that turns out to be alive:
a navy night-sky observatory, specimen labels, orbit diagrams, plates and indices — and
every exhibit can be picked up and played with. Planetarium meets arcade meets lab.

Not a SaaS template. Not a kids' game portal. Not an AI landing page.

---

## 1. Colour

Brand palette (user-defined): background `#071A2E` · text `#F8FAFC` · primary `#2563EB` · secondary `#172B45` · accent `#8BCBFF`.
**Dark is the default theme** (a navy night-sky field guide); the light theme is derived from the same blues.

| Token (Tailwind) | Dark (default) | Light (derived) | Role |
| --- | --- | --- | --- |
| `canvas` | `#071A2E` | `#F5F8FC` | page background |
| `surface` / `surface-2` | `#0E223A` / `#172B45` | `#FFFFFF` / `#EAF0F8` | cards / recessed fills |
| `line` / `line-strong` | `#1F3654` / `#2B4668` | `#DCE4EF` / `#C5D2E3` | hairlines |
| `ink` · `ink-muted` · `ink-faint` | `#F8FAFC` · `#A9B8CC` · `#7088A6` | `#071A2E` · `#3E5674` · `#7187A3` | text |
| `brand` / `brand-strong` / `brand-soft` | `#2563EB` / `#6FA8FF` / `#12305A` | `#2563EB` / `#1D4ED8` / `#E3ECFD` | **interaction**: buttons, links, focus, live state, selection |
| `rose` / `rose-soft` | `#35587F` / `#172B45` | `#9DB3CF` / `#E4EBF5` | secondary family: soft fills, selected chips, strokes |
| `gold` / `gold-strong` / `gold-soft` | `#8BCBFF` / `#A8D8FF` / `#10304D` | `#8BCBFF` / `#1E6FB8` / `#E6F4FF` | **accent — distinction only**: achievements, rank #1, featured, numbers that matter |
| `navy` / `navy-2` | `#041427` / `#0A1E36` | `#071A2E` / `#172B45` | "night" chapters (immersive panels, runner stage, lab, CTA, footer) |
| `night-sage` / `night-gold` | `#CDE8FF` / `#8BCBFF` (fixed) | same | labels / highlights on night surfaces |

Token names (`rose`, `gold`, `navy`, `night-sage`) are historical; their values are the blue system above.

**Distribution rules**
- Mostly canvas/surface, ink for text, primary blue for action, accent sky sparingly (≤5%) for distinction.
- Primary means "you can act here / this is live". Blue fills always carry white text.
- Night (`navy`) sections are chapters, not the default. At most one per screenful.
- On night surfaces use `text-white`, `text-white/70`, `text-night-sage` for labels, `text-night-gold` for highlights.
- Themes swap every token automatically (`.dark`). Never hand-write `dark:` colours for tokens.
- Never use raw Tailwind palette colours (slate/blue-500/zinc…) — use tokens. Exception: `red-*` for destructive/error.

## 2. Typography

One family — **Archivo Variable with the width axis** (62–125%). Width is our voice:

| Use | Class | Setting |
| --- | --- | --- |
| Display / hero / section titles | `font-wide` + `font-extrabold` | stretch 125%, tracking -0.035em, leading 0.95 |
| Headings in product UI | default width, `font-bold` | tracking -0.02em |
| Body | default | 15–17px / 1.6 |
| Specimen labels, eyebrows, indices, data captions | `label-mono` | ui-monospace 11px, uppercase, tracking .14em |
| Dense numbers (scores, stats) | `tabular-nums` + `font-wide` for hero numbers | |
| Condensed metadata (chips, tight tables) | `font-narrow` | stretch 75% |

Scale: `text-display-xl` clamp(3rem→6.5rem), `text-display` clamp(2.5→4.5rem), `text-title` clamp(2→3rem), then Tailwind sizes.

## 3. Motifs (use deliberately, not everywhere)

- **Plate / index numbers** — `№ 01`, `PLATE II`, `EXP-014` set in `label-mono`. Sections and exhibits are catalogued.
- **Hairlines** — 1px `border-line` rules separate content instead of heavy boxes.
- **Corner ticks** — `<CornerTicks />` crop marks on specimen-like cards (lab, featured exhibits).
- **Orbits** — dotted ellipses + satellites echo the logo (curiosity ring + play triangle).
- **Graph paper** — `bg-graph` only in the Simulator Lab and lab-related surfaces.
- **Grain** — `grain` overlay only on night surfaces, at very low opacity.
- **Logo** — blue tile (`#2563EB`), white curiosity ring, sky play-triangle, navy satellite dot.

## 4. Shape & depth

Radius: chips `rounded-md` (6) · inputs/buttons `rounded-xl` (12) · cards `rounded-2xl`/`rounded-[20px]` · feature panels `rounded-[28px]` · pills `rounded-full`.
Depth: borders first (`border-line`), shadows only for float/hover (`shadow-card` hover, `shadow-float` for dialogs/popovers).

## 5. Motion language — "observe, then reveal"

All tokens live in `src/lib/motion.ts`.

| Token | Value | Use |
| --- | --- | --- |
| `ease.out` | `[0.16, 1, 0.3, 1]` | entrances, reveals |
| `ease.inOut` | `[0.65, 0, 0.35, 1]` | state swaps, morphs |
| `spring.snappy` | stiffness 420, damping 32 | toggles, pills, layout indicators |
| `spring.soft` | bounce .15, duration .6 | cards, dialogs |
| `dur.micro/fast/base/slow/cinematic` | .15 / .25 / .4 / .7 / 1.1s | |
| distance | 12 (micro) · 24 (reveal) · 48 (hero) | |
| stagger | .05 lists · .08 cards · .12 hero | |

Rules
1. Content reveals **once**, as it enters the viewport (`RevealGroup` / `RevealItem`, `InView`).
2. Hover = lift −2px + `shadow-card` + border tint; press = `scale(.97)`; focus = emerald ring. Always.
3. Shared layout (`layoutId`) for active indicators, tabs, selected chips and item→detail morphs.
4. At most **one** ambient loop per viewport region; pause loops off-screen.
5. Numbers that change animate (`AnimatedNumber`, `SlidingNumber`).
6. Never animate the running game/simulator or its scaling container.
7. `MotionConfig reducedMotion="user"` is global; CSS respects `prefers-reduced-motion`.

## 6. Components

`src/components/ui`: Button / ButtonLink / IconButton · Input · Textarea · Select · Checkbox · Radio · Switch ·
Badge · Label (`label-mono`) · Tooltip · Menu (dropdown) · Popover · Dialog · Sheet (drawer) · Tabs ·
Accordion · Breadcrumbs · Pagination · Table · Progress / ProgressRing · Skeleton · Alert · EmptyState ·
ErrorState · Spinner · CurioLoader · Kbd · Avatar · Thumb (remote image → fallback, never a broken icon) · Logo · ThemeToggle · Feedback (`useToast`, `useConfirm`) ·
decor (`CornerTicks`, `PlateTag`, `OrbitLines`).

Use them. Don't hand-style a new button or input inside a page.

## 7. Page concepts

- **Landing — "The Field Guide."** Editorial, catalogued, cinematic. Hero is a live orrery of the collection.
- **Auth — "The Reading Room."** One experience, two states; the night panel changes its story with the mode.
- **Dashboard — "The Observatory."** Calm, dense, useful. Instrument-panel stats, activity log, next steps.
- **Navigation.** One top navbar (`dashboard/NavBar.tsx`), no sidebar or dock: four dropdowns of two pages each — Dashboard
  (Overview, Analytics), Play (Games, Simulators), Progress (Leaderboard, Achievements), Studio (Creator, Broadcasts; admins
  only) — plus search, notifications and the account menu (Profile, Settings, theme, Sign out). Phones get one menu sheet.
  Creating games, simulators and notifications is admin-only everywhere.
- **Game library — "The Arcade Wing."** Big covers, lively hover, tilt + spotlight, morphing details. The collection is a
  masonry wall of pins (`lib/masonry.ts`): covers keep their own shape, notes run to their own length, DOM order = reading order.
- **Simulator lab — "The Laboratory."** Graph paper, specimen sheets, EXP numbers, technical readouts. The bench uses the
  same masonry; sheets are size containers and drop the ruler/table in narrow columns (<16rem).
- **Runner — "The Stage."** Night surface, minimal chrome, the experience is the hero.
- **Leaderboard — "The Podium."** Clear ranks, sliding scores, you are always findable.
- **Achievements — "The Cabinet."** Engraved locked medals, gold only when earned.
- **Profiles — "The Player Card."** One dark card (`profile/PlayerCard.tsx`) for your Profile tab and every public profile: identity,
  presence, global standing, four figures on a ruled rail; the rank is a huge outlined numeral in the player's accent. Profiles
  are read-only — editing lives in Settings → Profile.
- **Settings.** Quiet, precise, honest controls only.
