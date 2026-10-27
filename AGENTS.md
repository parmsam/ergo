# AGENTS.md

Guidance for AI coding agents working in this repo.

**`PLAN.md` is the living plan.** Read it before starting work. When you finish a task, tick its checklist item. When scope or a key decision changes, update the relevant section and add a dated line to the decisions log.

## Project
ergo: break reminders for **eye health** and **posture/movement**, grounded in evidence. A static PWA on GitHub Pages; no backend. All persistence is `localStorage`.

## Principles (non-negotiable)
- **Evidence first.** Every rule, nudge, checklist item, coach fact and exercise claim must cite a file in `evidence/`.
  - Each file needs primary sources (studies, systematic reviews, AAO/OSHA/NIOSH/WHO guidance) with links, a strength label, and honest caveats.
  - Don't overstate: if the evidence is mixed, say so in the app.
  - `src/core/content.test.ts` enforces that referenced files exist.
  - See `evidence/README.md` for the template and strength scale.
- **Privacy.** No accounts, servers, analytics or third-party trackers.
  - **Never monitor user activity**: no keyboard/mouse hooks, no Idle Detection API, no camera/posture detection.
  - The only "away" signal allowed is a gap in the app's own tick loop (the device slept).
- **Not medical advice.** Keep the disclaimer. Exercises stay gentle and low-risk, and never say "push through pain".

## Stack
- Vite + TypeScript (strict), **no UI framework**: plain DOM modules rendering template strings.
- vite-plugin-pwa (`registerType: 'prompt'`; never auto-reload mid-break).
  - `public/sw-notify.js` is imported into the generated service worker for notification clicks and actions.
- No runtime dependencies. Don't add one for something a few lines of TS can do.

## Layout
- `src/core/`: logic that tests can reach without a browser UI.
  - `engine.ts`: cycle math.
  - `controller.ts`: runtime. Turns ticks into breaks, cues and log entries; side effects are injected.
  - `rules.ts`, `exercises.ts`, `guide.ts`, `coach.ts`: content.
  - `stats.ts`, `storage.ts`, `store.ts`: data.
  - `audio.ts`, `notify.ts`: browser I/O.
- `src/ui/`: views (`today`, `stats`, `guide`, `settings`), `overlay` (break screen), `toast`, `icons`, `pwa`.
- `src/main.ts`: wires the controller's effects to the UI, plus the shell, routing, keyboard and link actions.
- `evidence/`: sourced Markdown, one topic per file.
- `scripts/`: `icons.mjs` renders PNG icons from the logo; `screens.mjs` captures README screenshots.

## Commands
- `npm run dev`: dev server at `/ergo/`.
- `npm run build`: typecheck plus production build to `dist/`. `npm run preview` serves it.
- `npm test`: unit tests (Vitest, jsdom).
- `npm run test:e2e`: Playwright (Chromium, WebKit, mobile). Starts its own dev server.
- `npm run check`: typecheck + unit + e2e. **Run before every commit.**
- `npm run icons`: after changing the logo.
- Screenshots: `npm run build && npm run preview -- --port 4179`, then `node scripts/screens.mjs docs`.

## Conventions
- **Timing.**
  - Never count down with `setInterval`. Each lane has an `anchor` (epoch ms), and the phase is derived from `Date.now()`.
  - Pausing freezes the clock (`pausedAt`); resuming shifts anchors.
  - Ticks come from a Web Worker (less throttling in background tabs).
  - Chimes are pre-scheduled on the AudioContext clock.
- **State.** Mutate through `store.update(fn, keys)`. Views read from the store; they don't hold copies of persisted state. Settings changes go through `app.updateSettings` so the controller can restart affected lanes.
- **Storage.** Only via `src/core/storage.ts`.
  - Keys are `ergo:v1:*`, and every access is wrapped in try/catch.
  - New settings need a default in `DEFAULT_SETTINGS`; `mergeSettings` fills them in.
  - Bump the namespace and add a migration if the shape changes incompatibly.
- **Theming.** Colors are CSS custom properties on `:root`, with light values under `prefers-color-scheme` and `[data-theme]`. Eye = `--eye` (mint), body = `--body` (amber). Text uses text tokens, never series colors.
- **Motion.**
  - Animations explain something: rings recede for far gaze, the circle breathes for stretches.
  - Respect `prefers-reduced-motion`.
  - For SVG transforms use `transform-box: fill-box` with keyword/percentage origins, never pixel origins.
- **Accessibility.** Role/label locators in tests double as a11y checks. Icon-only controls need `aria-label`. Charts include a table view.

## Testing
- Unit tests sit next to modules as `*.test.ts`. Use explicit timestamps (`ctrl.tick(T0 + …)`) rather than real waits.
- E2E tests in `e2e/` use `open(page, seed)` from `e2e/helpers.ts`, which installs a fake clock and seeds `localStorage`. Import `test` from the helpers: it fails on any uncaught page error.
  - Seed `awayMin` high when using `clock.fastForward`: one big jump otherwise reads as the laptop sleeping.
- New behavior needs tests. Bug fixes need a regression test.

## Versioning & releases
- The version lives in `package.json`. It's injected as `__APP_VERSION__` and shown in the header chip, the footer, and Settings → About. The README badge reads it from GitHub.
- For a user-visible change:
  1. Bump `package.json` (semver: patch = fixes, minor = features).
  2. Add a `CHANGELOG.md` entry dated YYYY-MM-DD.
  3. Note it in the PLAN.md decisions log if it changes direction.

## Deployment
Pushing to `main` runs `.github/workflows/deploy.yml`: CI first, then build, then publish `dist/` to GitHub Pages. The Pages source must be set to "GitHub Actions".
