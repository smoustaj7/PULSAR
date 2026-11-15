# PULSAR: Crew Health Monitor

**NASA Space Apps Challenge 2026.** A health app for astronauts on long missions, where help from Earth can be
22 minutes away. Log your readings, see how you are at a glance, and know what to do next.

**Live:** https://pulsar-health.pages.dev

> Prototype only, not a medical device. The ranges in `src/config/thresholds.json` are illustrative, not NASA flight rules.

## What it does

- **Status at a glance:** nominal, caution or critical for every reading, every body system and you as a whole,
  always written out as well as colored.
- **3D body:** tap a body system to see its readings, the spaceflight hazard behind them, and what to do. Critical
  systems pulse. Tap the skin to mark an injury.
- **Early warnings:** flags a reading that is still in range but drifting from your own 7-day baseline.
- **For female and male crew:** female crew get a body model with female anatomy and optional cycle tracking. Trend
  checks allow for the normal rise in temperature and pulse after ovulation, so a cycle isn't flagged as a problem.
- **Mission environments:** station, transit, Moon, Mars and rover, each with its own signal delay to Earth,
  escalation plan and ranges.
- **NASA's checks, day by day:** the "Today" list shows what's due, plus NASA's own checks for your mission day,
  each explained in plain words.
- **Dr. Jarvis:** an AI assistant (MedGemma) that knows your readings, answers from NASA's research, and links its
  sources. You can type or speak.
- **Report to ground:** a 7-day summary for the flight surgeon, with a countdown until it reaches Earth.
- **Habit, not pressure:** XP, streaks and badges reward logging regularly, never "good" numbers.
- **Works offline:** install it as an app. Each crew member has their own profile with an optional PIN, and data
  stays on the device.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

To see every state, sign up, then choose the female or male demo on the dashboard (or in Settings).

| Command | What it does |
|---|---|
| `npm run dev:phone` | Same as `dev`, also reachable from a phone on your Wi-Fi |
| `npm test` | Unit tests |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the build (the offline service worker only runs here) |
| `npm run deploy` | Build and upload to Cloudflare Pages (run `npx wrangler@4 login` once first) |

## Dr. Jarvis (AI assistant)

Dr. Jarvis runs on **MedGemma 1.5 (4B)** in a Python backend. Setup is in [backendLLM/README.md](backendLLM/README.md).
On a Mac it's one command:

```bash
./backendLLM/run-mac.sh     # starts the backend on http://localhost:8000
```

- Each question goes with the astronaut's current readings, so answers are about their data.
- Answers come from a library of **147 NASA and Canadian Space Agency documents** from the challenge's resources,
  with each source linked. How the search works is in
  [backendLLM/README.md](backendLLM/README.md#nasa-reference-library).
- **On the live site:** a team member runs `./backendLLM/share.sh` to share their backend through a free Cloudflare
  tunnel, so visitors get answers without installing anything. If no one is sharing, the site tries a backend on the
  visitor's own computer, and otherwise says the assistant is offline.
- Settings: `VITE_CHAT_API_URL` points the app at another backend, and `FRONTEND_ORIGINS` lets other sites call the
  backend.

## How it works

**Readings to status.** Each indicator in `src/config/thresholds.json` has a normal and a caution range:

1. Inside normal is **nominal**, inside caution is **caution**, outside both is **critical**.
2. A body system takes the worst status of its readings, and the overall status takes the worst system.
3. With at least 3 earlier readings in the last 7 days, a big enough rise or drop turns an in-range value into
   **caution**.
4. The mission environment can override ranges and sets the escalation plan.

To add an indicator, add an entry to `thresholds.json` with a `regionId`. The app picks it up automatically.

| Body system | Readings | Main hazard |
|---|---|---|
| Brain & behavior | Sleep hours, mood | Isolation, distance from Earth |
| Immune | Body temperature | Radiation, closed environment |
| Lungs | SpO₂, cabin CO₂ | Closed environment |
| Heart | Resting heart rate, blood pressure | Altered gravity, radiation |
| Metabolism | Fasting glucose | Altered gravity, nutrition |
| Bones & muscles | Exercise minutes | Altered gravity |

## Project layout

```
src/
  config/      thresholds, ranges, environments and hazards (JSON, no code needed)
  engine/      pure logic: status rules, trends, cycle, signal delay, gamification
  content/     NASA content: checks by flight day, requirements, research findings
  store/       saved state: profiles, readings, settings, toasts
  components/  UI pieces: 3D body, cards, sheets, chat, charts
  views/       screens: sign-in, dashboard, trends
  lib/         helpers: report, citations, voice, tour
functions/     Cloudflare Pages Function for /api/chat
backendLLM/    MedGemma backend and NASA reference library
public/        service worker, manifest, 3D models
```

## Built with

Vite, React 19, TypeScript, Tailwind CSS v4, Three.js (React Three Fiber), Framer Motion, Recharts, Zustand, Vitest.
Hosted on Cloudflare Pages. The design system (colors, type, components) is in [DESIGN.md](DESIGN.md).

<details>
<summary><b>For contributors using Claude Code</b></summary>

The repo comes with AI tooling in `.claude/`. Nothing to install except Graphify.

- **[Graphify](https://github.com/Graphify-Labs/graphify):** a map of the code you can query. Install with
  `uv tool install graphifyy`, then run `graphify update .` after pulling (the output in `graphify-out/` is git-ignored).
  Try `graphify query "how does the environment change thresholds?"`.
- **Skills and commands:**

  | Source | What it adds | Details |
  |---|---|---|
  | [agent-skills](https://github.com/addyosmani/agent-skills) | 25 engineering skills, `/spec` → `/plan-tasks` → `/build` → `/test` → `/review-code` → `/ship` | [AGENT_SKILLS.md](.claude/AGENT_SKILLS.md) |
  | [ponytail](https://github.com/DietrichGebert/ponytail) | `/ponytail` for the smallest change that works | [PONYTAIL.md](.claude/PONYTAIL.md) |
  | [emilkowalski/skills](https://github.com/emilkowalski/skills) | 15 UI and animation skills | [EMIL_SKILLS.md](.claude/EMIL_SKILLS.md) |
  | [impeccable](https://github.com/pbakaus/impeccable) | `/impeccable` to critique, audit and polish UI | [IMPECCABLE.md](.claude/IMPECCABLE.md) |

</details>

## Next steps

- Personal baselines from pre-flight data
- Camera and wearable input
- A crew medical officer view of the whole crew
- Reminders when a measurement is due

## References

- NASA Human Research Program, *Five Hazards of Human Spaceflight*, and the Human Research Roadmap
- NASA, [*Lifetime Surveillance of Astronaut Health*](https://nlsp.nasa.gov/resources/lsah): medical requirements
  (JSC 28913), the annual exam (MR089S) and newsletters 2017–2026, summarized in `src/content/`
- PubMed abstracts of the 15 LSAH papers (looked up by title, since most PubMed links on the LSAH page are wrong)
- The challenge's resources, for Dr. Jarvis's library (see [backendLLM/README.md](backendLLM/README.md))
