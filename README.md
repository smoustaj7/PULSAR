# AstroPulse: Crew Health Monitor

NASA Space Apps Challenge 2026: a visual self-assessment tool that helps astronauts on long-duration missions
log health indicators, see their status at a glance, and know what to do next.

**Features**

- **Body map:** click a body system to see its indicators, the spaceflight hazards behind them, and guidance
- **Color-coded status:** nominal / caution / critical for every indicator, region, and the whole crew member
- **Trend alerts:** early warning when a value is still in range but moving away from your personal 7-day baseline
- **Mission environments:** station, deep-space transit, lunar base, Mars base, and rover, each with its own comms delay,
  medical support, escalation plan, and optional threshold overrides
- **Measurement routine:** cadence-based "due" list, how-to-measure help, and a live status preview while you type
- **Gamification:** XP, levels, daily-routine streaks, and badges. Rewards consistency, never "good" values
- **Field manual:** what each status means, the five HRP hazards, and a reference for every indicator
- **NASA resources:** what NASA's [Lifetime Surveillance of Astronaut Health](https://nlsp.nasa.gov/resources/lsah)
  (LSAH) program monitors across ten body systems, key requirement documents, data caveats and selected research.
  Each body system in the app links to the matching LSAH system and back
- **Report to ground:** a 7-day summary for the flight surgeon (copy, Markdown, or JSON)
- **Easy to use:** status first ("how am I, what now"), logging one tap away from anywhere, a phone tab bar, and
  Undo on every save, delete, clear or demo load
- **Works offline:** installable PWA, with readings stored on the device

> Prototype only, not a medical device. Thresholds in `src/config/thresholds.json` are illustrative
> general-population ranges with spaceflight context, not flight rules.

## Stack

| Concern        | Choice                                                    |
| -------------- | --------------------------------------------------------- |
| Build / dev    | Vite + React 19 + TypeScript                              |
| Styling        | Tailwind CSS v4 with palette tokens (see below) plus status tokens |
| Body map       | Inline SVG, one clickable `<g>` per body system            |
| Animation      | Framer Motion                                             |
| Charts         | Recharts (normal/caution bands drawn behind each trend)   |
| State          | Zustand + `persist` → localStorage                        |
| Rules          | Pure TS module + JSON thresholds, unit-tested with Vitest |
| Offline        | Hand-written service worker + web app manifest            |
| Hosting        | Cloudflare Pages (`wrangler.jsonc`)                       |

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173 — open mission settings (top right) → "Load demo data" to see all states
npm test           # engine, gamification and report unit tests
npm run build      # type-check + production build to ./dist
npm run preview    # serve ./dist (the service worker only runs in production builds)
```

## Deploying to Cloudflare

Live at **https://astropulse-health.pages.dev** (Cloudflare Pages).

```bash
npx wrangler@4 login   # once
npm run deploy         # builds, then uploads ./dist to the "astropulse-health" Pages project
```

Wrangler isn't a local dependency (its `workerd` binary is large), so `npx` fetches it on first use.
`wrangler.jsonc` names the Pages project and output directory. Pages serves `index.html` for unknown paths
(SPA fallback), and `public/_headers` keeps `sw.js` revalidated and caches hashed assets forever.

For automatic deploys on every push instead, connect the GitHub repo in the Cloudflare dashboard
(Workers & Pages → Create → Pages → Connect to Git) with build command `npm run build` and output directory
`dist`. To add API routes later (e.g. syncing with a ground station), add Pages Functions in `functions/`.

## Project layout

```
src/
  config/
    thresholds.json     ← indicators, ranges, trend rules, guidance, regions, environments (edit here, no code)
    hazards.json        ← the five HRP hazards (field manual content)
    index.ts            ← typed access, lookup maps, getActiveConfig(environmentId)
  engine/               ← PURE, no React / storage / clock
    types.ts            ← Reading, IndicatorConfig, Evaluation, EnvironmentConfig…
    rules.ts            ← readings in → status + trend + guidance out
    environment.ts      ← merge an environment's threshold overrides
    gamification.ts     ← XP, levels, streaks, badges derived from readings
  store/
    useHealthStore.ts   ← Zustand store, persisted readings + mission settings (versioned migrations)
    useToastStore.ts    ← one toast at a time, with an optional Undo action
  content/lsah.ts       ← NASA LSAH systems, documents, caveats, timeline, verified publications
  data/demoReadings.ts      ← deterministic 14-day demo dataset with trends
  lib/
    status.ts           ← status → colors/labels, formatting helpers
    report.ts           ← flight-surgeon report (structured + Markdown)
    useActiveConfig.ts  ← thresholds for the current environment
    useNow.ts           ← minute-ticking clock
    views.ts            ← the four top-level views (hash routed: #overview, #trends, #manual, #resources)
  views/
    OverviewView.tsx    ← status hero, up next, vitals, body map + systems, mission progress
    TrendsView.tsx      ← vital picker, trend chart, history, how/why for the chosen vital
    ResourcesView.tsx   ← NASA LSAH program, linked back to body systems
  components/
    TopBar.tsx          ← translucent bar (log, report, settings) + phone tab bar
    StatusHero.tsx      ← overall status, what to do, flagged vitals, environment context
    Sheet.tsx           ← modal sheet on <dialog>: bottom sheet on phones, centered on desktop
    SettingsSheet.tsx   ← crew name, mission day 1, environment, demo data / clear (undoable)
    Toaster.tsx         ← confirmation toasts
    BodyMap.tsx         ← SVG figure; regions colored by worst indicator, critical pulses
    RegionPanel.tsx     ← all systems as a list, or one system: readings, guidance, NASA monitoring
    IndicatorGrid.tsx   ← color-coded tiles for every indicator
    TrendChart.tsx      ← history with normal/caution bands
    ReadingHistory.tsx  ← per-indicator log with undoable delete
    ReadingForm.tsx     ← log sheet; "how to measure", live status preview, inline validation
    DueList.tsx         ← "Up next": measurements whose cadence has elapsed, one tap to log
    MissionProgress.tsx ← level, XP, streak, today's routine, badges
    FieldManual.tsx     ← status legend, hazards, indicator reference, escalation plan
    ReportDialog.tsx    ← report preview, copy, download
public/
  sw.js, manifest.webmanifest, icon.svg, _headers
```

### Color palette

Defined once as CSS tokens in `src/index.css` and exposed to Tailwind (`bg-navy-900`, `text-accent`, …).

| Token      | Hex       | Used for                                                      |
| ---------- | --------- | ------------------------------------------------------------- |
| `navy-950` | `#0B132B` | Page background                                               |
| `navy-900` | `#1C2541` | Cards and sheets                                              |
| `navy-700` | `#3A506B` | Raised controls, hairlines                                    |
| `accent`   | `#5BC0DE` | Anything interactive: primary buttons, links, selection, focus |
| `sand`     | `#F4D6B0` | Warm highlight text (streaks, NASA section labels)            |
| `ember`    | `#D97706` | Brand mark and the escalation action, "Report to ground"      |

Health status keeps its own green / yellow / red (`nominal`, `caution`, `critical`), tuned to sit on navy, so the
brand orange never doubles as a warning. Status is always written out as well as colored. Translucent bars fall back to
solid under `prefers-reduced-transparency`, motion to fades under `prefers-reduced-motion`, and hairlines strengthen
under `prefers-contrast: more`.

### How the rules engine works

1. Each indicator has a `normal` and a `caution` range (`null` = unbounded).
2. A value inside `normal` is **nominal**, inside `caution` is **caution**, and outside both is **critical**.
3. Direction (`low` / `high`) selects the guidance text, so low glucose and high glucose get different advice.
4. Each body region takes the **worst** status of its indicators' latest readings; the overall banner takes the worst region.
5. `cadenceHours` drives the "Measurements due" list.
6. **Trends:** with at least 3 earlier readings in the baseline window (default 7 days), a `trend.rise` / `trend.drop`
   breach escalates an in-range value to **caution**, an early warning before it leaves the normal range.
7. **Environments:** `applyEnvironment()` merges the selected environment's `overrides` (e.g. a lower exercise target
   on rover sorties), and the critical banner shows that environment's escalation plan.

Adding an indicator means adding an entry to `thresholds.json` with a `regionId`. The UI picks it up automatically.

## Code knowledge graph (Graphify)

The repo is set up for [Graphify](https://github.com/Graphify-Labs/graphify), which maps the codebase into a
queryable graph so you (and AI assistants) can ask how things connect instead of grepping.

```bash
uv tool install graphifyy      # once per machine (PyPI name has a double y)
graphify update .              # build/refresh graphify-out/ — local tree-sitter parsing, no LLM, a few seconds
open graphify-out/graph.html   # interactive map of the code
graphify explain "evaluateLatest"
graphify path "App" "applyEnvironment"
graphify query "how does the environment change thresholds?"
```

- `graphify-out/` is git-ignored; rebuild it after pulling. `.graphifyignore` keeps tooling out of the graph.
- Claude Code: `/graphify` is available as a project skill (`.claude/skills/graphify/`), `CLAUDE.md` tells the
  assistant to query the graph first, and `.claude/settings.json` adds soft hooks that suggest graph queries before
  searches and file reads. They need `graphify` on your `PATH`.

## Engineering skills for Claude Code (agent-skills)

[addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) is copied into `.claude/` (pinned version and
local changes in [`.claude/AGENT_SKILLS.md`](.claude/AGENT_SKILLS.md)). Nothing to install: open the repo in Claude Code.

- **25 skills** in `.claude/skills/` activate on their own when a task matches, for example
  `test-driven-development`, `frontend-ui-engineering`, `security-and-hardening`, `debugging-and-error-recovery`.
- **Lifecycle commands:** `/spec` → `/plan-tasks` → `/build` (or `/build auto`) → `/test` → `/review-code` →
  `/code-simplify` → `/ship`, plus `/constraints` and `/webperf`. `/review` and `/plan` were renamed because Claude Code
  already has built-in commands with those names.
- **Subagent personas** in `.claude/agents/`: `code-reviewer`, `security-auditor`, `test-engineer`,
  `web-performance-auditor` (`/ship` runs the first three in parallel).
- `/spec` and `/plan-tasks` write `SPEC.md`, `tasks/plan.md` and `tasks/todo.md` as working files.

### Ponytail (smallest-change mode)

[DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)'s six skills are also in `.claude/skills/`
(version and what was left out in [`.claude/PONYTAIL.md`](.claude/PONYTAIL.md)). `/ponytail` (or `/ponytail
lite|full|ultra`) switches the agent to the smallest change that fully works, with one small test for risky logic.
`/ponytail-review` reviews a change, `/ponytail-audit` the whole repo, `/ponytail-debt` lists `shortcut:` comments.
The plugin's hooks, status line and cost tracking are not set up here; install the plugin yourself if you want them.

### UI and animation skills (emilkowalski/skills)

15 of [Emil Kowalski's](https://github.com/emilkowalski/skills) design-engineering skills are in `.claude/skills/`
(list and pinned commit in [`.claude/EMIL_SKILLS.md`](.claude/EMIL_SKILLS.md)). They activate on UI and animation work,
for example the body-map pulse or the Framer Motion transitions: `animate`, `choreograph`, `animation-performance`,
`mobile-native`, `break-ui` and more. `/review-animations`, `/pick-ui-library` and `/prototype` run only when typed.

### Impeccable (frontend design)

[pbakaus/impeccable](https://github.com/pbakaus/impeccable) is in `.claude/skills/impeccable/` with its four helper
agents (details in [`.claude/IMPECCABLE.md`](.claude/IMPECCABLE.md)). `/impeccable` with no argument shows a menu;
`/impeccable critique`, `audit`, `polish`, `layout`, `typeset`, `colorize`, `harden` and the rest work on a target such
as `src/components/BodyMap.tsx`. On first use it downloads its engine from the project's GitHub releases, checksum-verified,
into `~/.impeccable/`. Its after-edit design detector is off; `/impeccable hooks on` enables it.

## Indicators → body systems → hazards

| Region          | Indicators                         | Main hazards                     |
| --------------- | ---------------------------------- | -------------------------------- |
| Brain & Behavior| Sleep hours, mood (1–5)            | Isolation & confinement, distance|
| Immune          | Body temperature                   | Radiation, closed environment    |
| Lungs           | SpO₂                               | Closed environment (CO₂)         |
| Heart           | Resting HR, systolic/diastolic BP  | Altered gravity, radiation       |
| Metabolism      | Fasting glucose                    | Altered gravity, nutrition       |
| Bones & Muscles | Exercise countermeasure minutes    | Altered gravity                  |

## Roadmap ideas

- [x] Gamification: XP, streaks, badges for completing the daily measurement routine
- [x] Trend rules vs. a personal rolling baseline, not just single-value thresholds
- [x] Per-environment context, escalation, and threshold overrides
- [x] "Report to ground" export (Markdown/JSON) with comms-delay context
- [x] Offline-first PWA (a spacecraft has no reliable internet)
- [ ] Personal baselines from pre-flight data (currently a rolling in-flight average)
- [ ] Camera input (e.g. photo of a device readout, skin/eye check) and wearable import
- [ ] Multiple crew members on one device, with a CMO overview
- [ ] Reminders/notifications when a measurement becomes due
- [ ] IndexedDB storage for larger histories and images

## References

- NASA Human Research Program, *Five Hazards of Human Spaceflight*
- NASA Life Sciences Portal, [*Lifetime Surveillance of Astronaut Health*](https://nlsp.nasa.gov/resources/lsah)
  (summarized in `src/content/lsah.ts`; most PubMed links on that page point to unrelated papers, so the app uses
  ids verified against PubMed)
- NASA HRP Human Research Roadmap (risks & gaps)
