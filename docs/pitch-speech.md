# PULSAR: 5-minute pitch

About 680 spoken words, which fits 5:00 at a calm pace with room for the demo.
**[Brackets]** are stage cues, not to be read aloud. *Italics* mark the words to stress.

---

## 0:00 – 0:30 · The hook

**[Black screen, or the nebula. Wait 2 seconds before speaking.]**

Imagine you wake up with a pounding headache. Your heart is racing. You slept four hours.

On Earth, you'd call a doctor.

But you're on *Mars*. Your doctor is 225 million kilometres away, and every word you send them
travels at the speed of light, and it *still* takes up to *22 minutes* to arrive.

So you wait. Alone. Not knowing if this is nothing… or the start of something serious.

---

## 0:30 – 1:15 · The problem

Today, astronauts on the Space Station have something we take for granted: *a live line to the ground*.
A flight surgeon can see their data and answer in seconds.

On the way to the Moon and Mars, that line breaks.

NASA's Human Research Program names five hazards of deep space: radiation, isolation, distance from
Earth, altered gravity, and a closed environment. Together they hit *every* system in the body:
bones, heart, eyes, sleep, mood.

And the warning signs are small. NASA's own astronaut health data found that every *1 mmHg* rise in
cabin CO₂ *almost doubles* the odds of a headache. A small number on a gauge, a real symptom in a body.

So the question is simple: **when Earth can't answer, who does the crew ask?**

---

## 1:15 – 1:45 · The solution

**[Open the live site: pulsar-health.pages.dev]**

We built **PULSAR**: a crew health monitor *for the wait*.

It answers three questions in one glance: *How am I? What changed? What do I do now?*

Everything runs on the device, offline, because a spacecraft has no reliable internet.

---

## 1:45 – 3:45 · The demo

**[Overview screen: "Needs attention."]**

The first thing you see is your status, in plain words. Not a wall of charts. Green, yellow or red,
and *always* written out, not just colored.

**[Rotate and tap the 3D body.]**

This is you. A full anatomical model: skin, muscles, bones, vessels, organs. Tap a system, and you
see its readings, the spaceflight hazard behind it, and what to do. The heart beats, the lungs
breathe, and anything critical *pulses* so you can't miss it.

**[Log a reading: type a heart rate, watch the status change live.]**

Logging takes one tap. As you type, PULSAR checks the value against NASA-based ranges, *before* you
even save. Nominal… caution… critical.

**[Trends view.]**

But the real danger isn't one bad number. It's a *slow drift*. PULSAR compares every reading to your
own 7-day baseline, and warns you when a value is still "normal" but moving the wrong way.
*An early warning, days before it becomes a problem.*

**[Tap Ask → Dr. Jarvis. Ask: "Why do I have headaches?"]**

And when you have a question, you ask Dr. Jarvis, our AI health assistant. It runs on *MedGemma*,
Google's medical model, and it reads *your* readings. But we didn't want an AI that guesses. So we
built a library from *147 NASA documents*, almost 700,000 words, and Dr. Jarvis answers *from* that
research, and *cites* it, with a link to the exact page.

**[Report to ground → Send to Earth. Show the countdown.]**

Finally, Report to Ground. One tap sends a 7-day summary to the flight surgeon. PULSAR shows the
signal crossing space in real time, *"Reaching Earth in 10 minutes 53"*, and until the reply lands,
it tells you exactly what to do *on board*.

---

## 3:45 – 4:30 · Why it works

Three things make PULSAR different.

**One: it's built on NASA's own science.** Our thresholds, our schedule of checks by flight day, and
21 research findings come straight from NASA's Lifetime Surveillance of Astronaut Health program.

**Two: it's built for distance.** Five mission environments (station, transit, Moon, Mars, rover),
each with its own comms delay and escalation plan.

**Three: it builds a habit.** Streaks, levels and badges reward *consistency*, never "good" numbers.
Because the best health data is the data you actually log.

And it runs anywhere: a phone, a tablet, a laptop. You can install it today.

---

## 4:30 – 5:00 · The close

**[Back to the 3D astronaut. Slow down.]**

The farther we go, the longer the silence between a question and its answer.

PULSAR fills that silence. It turns a crew member who is *waiting* into one who *knows*.

**Because on Mars, help is 22 minutes away. PULSAR is there in the first second.**

Thank you.

**[Hold. Smile. Wait for applause before taking questions.]**

---

## Delivery tips

- **Pause after the hook.** The two seconds of silence before the first line is what grabs the room.
- **Rehearse the demo against the clock.** It's the part that runs long. If you're behind at 3:00,
  skip the Trends view: the live status preview already shows the idea.
- **Have a backup.** Load demo data before you go on stage (settings → Load demo data), and keep a
  screen recording ready in case the Wi-Fi or the AI backend drops. `brag-output/brag.mp4` works as a
  last resort.
- **Dr. Jarvis needs the backend shared** (`./backendLLM/share.sh`) for the live site to answer.
  Test one question 10 minutes before you present.
- **Numbers to know cold for Q&A:** 147 NASA documents · 3,970 passages · 100% of test questions
  answered in the top 4 results · 22 min max one-way Mars delay · 1 mmHg CO₂ ≈ 2× headache odds.

---

## Tech stack and tools

### Front end

| Concern            | Tool                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------- |
| Build / dev server | **Vite 8**                                                                            |
| UI framework       | **React 19** + **TypeScript**                                                         |
| Styling            | **Tailwind CSS v4** with design tokens (navy, accent, nominal / caution / critical)  |
| State              | **Zustand** with `persist` → localStorage (versioned migrations)                     |
| Charts             | **Recharts** (trend lines with normal / caution bands)                                |
| Chat rendering     | **react-markdown**                                                                    |
| Voice input        | **Web Speech API** (dictation) + Web Audio (live waveform)                            |
| Fonts              | **Space Grotesk** (display), **Inter** (UI), **JetBrains Mono** (telemetry) via Fontsource |
| Offline            | **PWA**: hand-written service worker + web app manifest                               |
| Rules engine       | Pure TypeScript module + JSON thresholds (no framework, fully unit-tested)            |

### Motion

| Concern                | Tool                                                                          |
| ---------------------- | ----------------------------------------------------------------------------- |
| UI animation           | **Framer Motion** (sheets, transitions, toasts, guided tour)                  |
| Organ animation        | Custom heartbeat and breathing curves driving the 3D heart and lungs          |
| Space backdrop         | Seamless **AV1 / HEVC** nebula video loop, streamed through Media Source      |
| Accessibility          | Respects `prefers-reduced-motion`, `prefers-reduced-transparency` and `prefers-contrast` |
| Launch video           | **HyperFrames** (HTML rendered to video)                                      |

### 3D

| Concern              | Tool                                                                                   |
| -------------------- | -------------------------------------------------------------------------------------- |
| Engine               | **Three.js**                                                                           |
| React integration    | **React Three Fiber**                                                                  |
| Helpers              | **Drei** (OrbitControls, Stars, useGLTF)                                               |
| Glow / post effects  | **@react-three/postprocessing** (Bloom)                                                |
| Model                | Full anatomy atlas in a suit (glTF): skin, muscles, skeleton, vessels, organs, plus a female variant |
| Model pipeline       | **glTF-Transform** + **meshoptimizer**: 189 MB / 8M triangles → about 12 MB for the web |

### Back end and AI

| Concern               | Tool                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------- |
| API server            | **Python**, **FastAPI** + **Uvicorn**                                                   |
| Language model        | **MedGemma 1.5 (4B)**, Google's medical model, via **Hugging Face Transformers** + **PyTorch** (Apple GPU / MPS) |
| Image input           | **Pillow** (the chat accepts a photo with the question)                                |
| Retrieval (RAG)       | Hybrid search: **BM25** keywords + **BAAI/bge-base-en-v1.5** embeddings, merged with reciprocal rank fusion |
| Re-ranking + citations| **cross-encoder/ms-marco-MiniLM-L-6-v2**: re-ranks passages and attaches citations to each sentence |
| NASA library builder  | **requests** + **BeautifulSoup**: 147 NASA / CSA documents → 3,970 passages            |

### Hosting and infrastructure

| Concern            | Tool                                                                     |
| ------------------ | ------------------------------------------------------------------------ |
| Hosting            | **Cloudflare Pages** (pulsar-health.pages.dev)                            |
| API relay          | **Cloudflare Pages Functions** (`/api/chat`)                              |
| Sharing the model  | **Cloudflare Tunnel** (cloudflared) + **Cloudflare KV** for the tunnel address |
| Deploy CLI         | **Wrangler**                                                              |

### Quality and dev tools

| Concern         | Tool                                                                 |
| --------------- | -------------------------------------------------------------------- |
| Unit tests      | **Vitest** (rules engine, gamification, comms delay, NASA schedule, report) |
| Browser tests   | **Playwright**                                                       |
| Linting         | **oxlint**                                                           |
| AI pair-coding  | **Claude Code**, with **Graphify** (code knowledge graph) and design / animation skills |
