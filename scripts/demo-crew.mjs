// Builds src/data/demoCrew.json, the two demo astronauts, from readings/vitals_simulated.csv:
// 180 days of simulated space station vitals for the Inspiration4 crew (see readings/README.md).
// One woman (C002) and one man (C001), so the app can show how the same mission reads for each.
//
//   node scripts/demo-crew.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const CREW = { female: 'C002', male: 'C001' }

// The dataset's indicators, as the app's indicators, with each value converted to the app's unit.
const ISS_CABIN_MMHG = 760 // the station is kept at sea-level pressure
const INDICATORS = {
  rhr: ['heartRate', (v) => Math.round(v)],
  sbp: ['systolic', (v) => Math.round(v)],
  dbp: ['diastolic', (v) => Math.round(v)],
  spo2: ['spo2', (v) => Math.round(Math.min(v, 100))],
  temp: ['temperature', (v) => Math.round(v * 10) / 10],
  // ppm to partial pressure: a fraction of the cabin's total pressure.
  co2_ppm: ['cabinCO2', (v) => Math.round(((v * ISS_CABIN_MMHG) / 1e6) * 10) / 10],
  sleep_h: ['sleep', (v) => Math.round(v * 10) / 10],
}

const [header, ...lines] = readFileSync(new URL('../readings/vitals_simulated.csv', import.meta.url), 'utf8').trim().split('\n')
const cols = header.split(',')
const rows = lines.map((line) => Object.fromEntries(line.split(',').map((v, i) => [cols[i], v])))

const out = {}
for (const [sex, subject] of Object.entries(CREW)) {
  const mine = rows.filter((r) => r.subject === subject)
  const days = Math.max(...mine.map((r) => Number(r.day))) + 1
  const series = {}
  for (const [from, [to, convert]] of Object.entries(INDICATORS)) {
    series[to] = Array(days).fill(null)
    for (const r of mine.filter((r) => r.indicator === from)) series[to][Number(r.day)] = convert(Number(r.value))
  }
  out[sex] = { subject, days, series }
}

const target = new URL('../src/data/demoCrew.json', import.meta.url)
writeFileSync(target, JSON.stringify(out) + '\n')
console.log(`wrote ${target.pathname}: ${Object.entries(out).map(([s, c]) => `${s} ${c.subject}, ${c.days} days`).join('; ')}`)
