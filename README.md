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
- **Report to ground:** a 7-day summary for the flight surgeon (copy, Markdown, or JSON)
- **Works offline:** installable PWA, with readings stored on the device

> Prototype only, not a medical device. Thresholds in `src/config/thresholds.json` are illustrative
> general-population ranges with spaceflight context, not flight rules.

## Stack

| Concern        | Choice                                                    |
| -------------- | --------------------------------------------------------- |
| Build / dev    | Vite + React 19 + TypeScript                              |
| Styling        | Tailwind CSS v4 (status tokens: nominal / caution / critical) |
| Body map       | Inline SVG, one clickable `<g>` per body system            |
| Animation      | Framer Motion                                             |
| Charts         | Recharts (normal/caution bands drawn behind each trend)   |
| State          | Zustand + `persist` → localStorage                        |
| Rules          | Pure TS module + JSON thresholds, unit-tested with Vitest |
| Offline        | Hand-written service worker + web app manifest            |
| Hosting        | Cloudflare Workers static assets (`wrangler.jsonc`)       |

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173 — click "Load demo data" to see all states
npm test           # engine, gamification and report unit tests
npm run build      # type-check + production build to ./dist
npm run preview    # serve ./dist (the service worker only runs in production builds)
```

## Deploying to Cloudflare

```bash
npx wrangler@4 login   # once
npm run deploy         # builds, then uploads ./dist as a Workers static-assets site
```

Wrangler isn't a local dependency (its `workerd` binary is large), so `npx` fetches it on first use.
For automatic deploys, connect the GitHub repo in the Cloudflare dashboard (Workers & Pages → Create → Import
a repository). Build command: `npm run build`, deploy command: `npx wrangler deploy`.

`wrangler.jsonc` serves `./dist` with SPA fallback; `public/_headers` keeps `sw.js` revalidated and caches
hashed assets forever. To add API routes later (e.g. syncing with a ground
station), add a `main` Worker script and keep the `assets` block. Cloudflare Pages also works: build command
`npm run build`, output directory `dist`.

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
  store/useHealthStore.ts   ← Zustand store, persisted readings + mission settings (versioned migrations)
  data/demoReadings.ts      ← deterministic 14-day demo dataset with trends
  lib/
    status.ts           ← status → colors/labels, formatting helpers
    report.ts           ← flight-surgeon report (structured + Markdown)
    useActiveConfig.ts  ← thresholds for the current environment
    useNow.ts           ← minute-ticking clock
  components/
    BodyMap.tsx         ← SVG figure; regions colored by worst indicator, critical pulses
    RegionPanel.tsx     ← selected system: description, hazards, readings, guidance
    IndicatorGrid.tsx   ← color-coded tiles for every indicator
    TrendChart.tsx      ← history with normal/caution bands
    ReadingHistory.tsx  ← per-indicator log with delete
    ReadingForm.tsx     ← log a value; shows "how to measure" + live status preview
    DueList.tsx         ← measurements whose cadence has elapsed (routine prompts)
    MissionProgress.tsx ← level, XP, streak, today's routine, badges
    FieldManual.tsx     ← status legend, hazards, indicator reference, escalation plan
    ReportDialog.tsx    ← report preview, copy, download
    Header.tsx          ← status banner, mission day, environment context
public/
  sw.js, manifest.webmanifest, icon.svg, _headers
```

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
- NASA HRP Human Research Roadmap (risks & gaps)
