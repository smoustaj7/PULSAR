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
- **Radiation tracker:** your dose since launch, from your dosimeter, and how many days are left before each of
  NASA's limits at this rate. It warns you to shelter if a solar storm makes the dose jump.
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

**Radiation.** Vital signs can't measure radiation: it does its harm long before a pulse or temperature would show
it. So the dose comes from the personal dosimeter every astronaut carries, and the time left comes from the dose
rate. The code is in `src/engine/radiation.ts`.

1. **Dose so far:** the latest dosimeter reading (the mission total, in mSv). Between readings, or before the first,
   PULSAR adds the typical rate where the crew is.
2. **Dose rate:** the change across the last 7 days of dosimeter readings. With no readings, it uses the typical
   rate for the mission environment:

   | Where | Typical dose | Source |
   |---|---|---|
   | Space station | 0.5 mSv a day | LSAH Newsletter, 2023 |
   | Deep-space transit | 1.6 mSv a day | NASA, *Space Faring*: about 300 mSv in six months on the way to Mars |
   | Lunar base | 0.5 mSv a day | LSAH Newsletter, 2023 |
   | Mars base, rover | 0.7 mSv a day | NASA, *Space Faring*: about 400 mSv in 18 months on Mars |

3. **Time left:** for each of NASA's limits (NASA-STD-3001), days until it's reached = what's left of the limit ÷
   the dose rate. A rolling limit is only reached if the rate can fill its window; otherwise the card says
   "Not at this rate".

   | Limit | Dose | What it protects against |
   |---|---|---|
   | 30 days | 250 mSv | Radiation sickness and harm to blood and heart from a burst |
   | 1 year | 500 mSv | Harm to blood-forming organs and the heart |
   | Career | 600 mSv | Long-term cancer risk. The same limit for every astronaut, whatever their age or sex |

4. **Status:** caution past half of any limit, critical past a limit, or when the dose rate jumps above 10 mSv a day
   (the end of "low dose rate" in NASA's evidence reports). In space that jump means a solar particle event, so the
   card says to shelter and watch for nausea, tiredness and fever.

The 30-day and 1-year limits are in mGy-Eq. A dosimeter reads mSv, which in space comes out higher for the same
exposure, so comparing the two errs on the safe side. Dr. Jarvis and the report to ground get the same numbers.

| Body system | Readings | Main hazard |
|---|---|---|
| Brain & behavior | Sleep hours, mood | Isolation, distance from Earth |
| Immune | Body temperature, radiation dose | Radiation, closed environment |
| Lungs | SpO₂, cabin CO₂ | Closed environment |
| Heart | Resting heart rate, blood pressure | Altered gravity, radiation |
| Metabolism | Fasting glucose | Altered gravity, nutrition |
| Bones & muscles | Exercise minutes | Altered gravity |

## Project layout

```
src/
  config/      thresholds, ranges, environments and hazards (JSON, no code needed)
  engine/      pure logic: status rules, trends, cycle, radiation dose, signal delay, gamification
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
- Add the dose from earlier missions to the career total, and read the dosimeter automatically
- Camera and wearable input
- A crew medical officer view of the whole crew
- Reminders when a measurement is due

## References

- NASA Human Research Program, *Five Hazards of Human Spaceflight*, and the Human Research Roadmap
- NASA, [*Lifetime Surveillance of Astronaut Health*](https://nlsp.nasa.gov/resources/lsah): medical requirements
  (JSC 28913), the annual exam (MR089S) and newsletters 2017–2026, summarized in `src/content/`
- PubMed abstracts of the 15 LSAH papers (looked up by title, since most PubMed links on the LSAH page are wrong)
- NASA, *Space Faring: The Radiation Challenge*, and NASA-STD-3001 Vol. 1 Rev. B dose limits (as quoted in the
  Human Research Program's cardiovascular evidence report), for the radiation tracker
- The challenge's resources, for Dr. Jarvis's library (see [backendLLM/README.md](backendLLM/README.md))
