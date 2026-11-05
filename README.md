# AstroPulse: Crew Health Monitor

NASA Space Apps Challenge 2026: a visual self-assessment tool that helps astronauts on long-duration missions
log health indicators, see their status at a glance, and know what to do next.

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
| Hosting        | Cloudflare Workers static assets (`wrangler.jsonc`)       |

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173 — click "Load demo data" to see all states
npm test           # rules engine unit tests
npm run build      # type-check + production build to ./dist
```

## Deploying to Cloudflare

```bash
npx wrangler@4 login   # once
npm run deploy         # builds, then uploads ./dist as a Workers static-assets site
```

Wrangler isn't a local dependency (its `workerd` binary is large), so `npx` fetches it on first use.
For automatic deploys, connect the GitHub repo in the Cloudflare dashboard (Workers & Pages → Create → Import
a repository). Build command: `npm run build`, deploy command: `npx wrangler deploy`.

`wrangler.jsonc` serves `./dist` with SPA fallback. To add API routes later (e.g. syncing with a ground
station), add a `main` Worker script and keep the `assets` block. Cloudflare Pages also works: build command
`npm run build`, output directory `dist`.

## Project layout

```
src/
  config/
    thresholds.json     ← all indicators, ranges, guidance text, body regions (edit here, no code)
    index.ts            ← typed access + lookup maps
  engine/
    types.ts            ← Reading, IndicatorConfig, Evaluation, Status…
    rules.ts            ← PURE: readings in → status + guidance out
    rules.test.ts
  store/useHealthStore.ts   ← Zustand store, persisted readings + mission settings
  data/demoReadings.ts      ← deterministic 14-day demo dataset with trends
  lib/status.ts             ← status → colors/labels, formatting helpers
  components/
    BodyMap.tsx         ← SVG figure; regions colored by worst indicator, critical pulses
    RegionPanel.tsx     ← selected system: description, hazards, readings, guidance
    IndicatorGrid.tsx   ← color-coded tiles for every indicator
    TrendChart.tsx      ← history with normal/caution bands
    ReadingForm.tsx     ← log a value; shows "how to measure" + live status preview
    DueList.tsx         ← measurements whose cadence has elapsed (routine prompts)
    Header.tsx          ← overall status banner, mission day, environment
```

### How the rules engine works

1. Each indicator has a `normal` and a `caution` range (`null` = unbounded).
2. A value inside `normal` is **nominal**, inside `caution` is **caution**, and outside both is **critical**.
3. Direction (`low` / `high`) selects the guidance text, so low glucose and high glucose get different advice.
4. Each body region takes the **worst** status of its indicators' latest readings; the overall banner takes the worst region.
5. `cadenceHours` drives the "Measurements due" list.

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

- [ ] Gamification: streaks / badges for completing the daily measurement routine
- [ ] Trend rules (e.g. "resting HR up 10% over 7 days"), not just single-value thresholds
- [ ] Per-environment thresholds and guidance (station vs. lunar base vs. Mars transit)
- [ ] Personal baselines computed from pre-flight data
- [ ] Camera input (e.g. photo of a device readout, skin/eye check) and wearable import
- [ ] "Send to flight surgeon" report export (PDF/JSON) with comms-delay awareness
- [ ] IndexedDB storage for larger histories and images
- [ ] Offline-first PWA (a spacecraft has no reliable internet)

## References

- NASA Human Research Program, *Five Hazards of Human Spaceflight*
- NASA HRP Human Research Roadmap (risks & gaps)
