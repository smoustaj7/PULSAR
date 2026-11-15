# /brag plan: PULSAR

## Answers

- **What is it?** PULSAR is a crew health monitor that helps astronauts on long missions log their health, see their status at a glance, and know what to do next.
- **Who is it for?** Crew on long missions, especially far from Earth, where the flight surgeon can't answer right away.
- **What sets it apart?** It's built for the light delay. From Mars, a report takes 10 min 54 s to reach Earth, so PULSAR tells the crew what to do while they wait. Status comes first: "Needs attention." in big type. Every reading is checked against NASA-based ranges as you type.
- **Most impressive claim:** "A report sent now gets an answer in 21 min 48 s at the very earliest." This is the app's own copy, on its Link to Earth card.
- **Visual hook:** a Mars dot and an Earth dot joined by a dashed light-speed line, with a signal crawling across it.
- **Real UI to show:** the welcome screen with the 3D astronaut, the "Needs attention." dashboard, logging a reading with the live status preview (Nominal → Caution → Critical), and Report to ground → Send to Earth → "Reaching Earth in 10:53".
- **Tone:** cinematic, held back toward polished. It's a serious health tool, so the drama comes from the distance, not from jokes.
- **Share caption:** "On Mars, help from Earth is 21 minutes away. PULSAR is the crew health monitor for the wait."

## Angle

**The light delay is the villain.** Open on the distance problem (Mars ↔ Earth, 21 minutes). Then PULSAR answers it: the crew checks themselves, sees their status instantly, and gets guidance until Earth replies.

## Identity (from the source)

- Colors: ink `#061d24`, surface `#0b3541`, accent `#a8dadc`, sea `#2a9d8f`, fg `#f7fffd`, nominal `#6fdc8c`, caution `#f4d35e`, critical `#f26d6d`, Mars dot `#d9693f`
- Type: Space Grotesk (display), Inter (UI), JetBrains Mono (telemetry), all from the project's own `@fontsource-variable` packages
- Backdrop: the app's own nebula video loop (`src/assets/space/nebula-loop-hevc.mp4`)
- Wordmark: the app's `Wordmark` SVG (pulse in a ring + widely spaced "PULSAR")
- UI: transparent captures of the live site (pulsar-health.pages.dev) at 2×, composited over the nebula loop

## Fictional data

The demo crew member is "Alex Reyes", a made-up name entered during onboarding. Every reading comes from the app's built-in male demo data. No real people appear.

## Format

Landscape 16:9, 1920×1080, 30 fps, 21 s. Music at 120 BPM (beat = 0.5 s, bar = 2 s). Every cut lands on a beat.

## Storyboard

| # | Time | Beats | Scene | On screen | Motion | Sound |
|---|---|---|---|---|---|---|
| 1 | 0.0–4.0 | 0–8 | **Hook** | Nebula, dimmed. Mars dot ● (orange) and Earth dot ● (teal) on a dashed line. A signal leaves Mars. **"On Mars, help is / 21 minutes away."** Under it, in mono: "10 MIN 54 S EACH WAY AT LIGHT SPEED". | Dots and line draw in; lines rise word by word, settled by 1.6 s, held to 4.0 | Pad swells, heartbeat kick (lub-dub) on beats, a soft ping when the signal leaves |
| 2 | 4.0–7.0 | 8–14 | **Reveal** | Real 3D astronaut floating on its platform; PULSAR wordmark; **"Your mission starts with you."** | Astronaut floats in, wordmark draws, headline words rise, settled by 5.0 | Drop: full beat comes in, swell |
| 3 | 7.0–10.5 | 14–21 | **At a glance** | Real dashboard: **"Needs attention."**, caution stats (CO₂ 2.8, sleep 6.1 h, mood 3/5), counts 0 / 3 / 7 / 0 | Top bar slides down, headline rises, stats pop one at a time on beats, slow push | Soft ticks on each stat, in key |
| 4 | 10.5–14.5 | 21–29 | **Log it** | Real "Log a reading" sheet, mood self-rating: types **5 → Nominal**, **2 → Caution**, **1 → Critical**. Left caption: **"Your status updates right away."** | Sheet rises, camera eases toward the value and preview, keystrokes on beats | Key taps; the status chime pitch drops with each status |
| 5 | 14.5–18.0 | 29–36 | **Send it to Earth** | Real Report to ground dialog; cursor clicks **Send to Earth** → Link to Earth card: **"Reaching Earth in 10:53"** and guidance. Caption: **"PULSAR guides you until the reply lands."** | Cursor glides and clicks (press), dissolves through the background to the card, push-in | Click + rising "transmit" swell, ping in key |
| 6 | 18.0–21.0 | 36–42 | **Outro** | Wordmark, **"Crew Health Monitor"**, `pulsar-health.pages.dev`, "NASA Space Apps Challenge 2026" | Logo draws its pulse line, text settles, held | Final chord rings out with the heartbeat |

Scene durations: 4 + 3 + 3.5 + 4 + 3.5 + 3 = **21 s**.

## Readability check

- Hook: 6 words, settled at 1.6 s and held 2.4 s ✓
- Reveal: 5 words, settled at 5.0 s and held 2.0 s ✓
- Log: caption has 5 words, held 3 s ✓. Each status badge (1 word) holds about 1.1 s ✓. The guidance sentences are texture, not meant to be read.
- Send: caption has 7 words, held 2.4 s ✓
- Outro: held 2.4 s ✓

## Music

Original, synthesized for this video. D minor, 120 BPM, progression Dm – B♭ – F – C (one chord per bar). Hook: pad plus a heartbeat kick (PULSAR = pulse). The beat drops at 4.0 s with a 16th-note arpeggio pluck, sub bass, soft hats and a clap on beats 2 and 4. It thins out at 18 s and the final D chord rings. Effects are pitched to the key and mixed under the music.
