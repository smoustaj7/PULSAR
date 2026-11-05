import type { Reading } from '../engine/types'

const DAY = 86_400_000

/** Small deterministic PRNG so the demo looks the same every time. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Two weeks of plausible in-flight readings with a few deliberate trends so the
 * dashboard shows every status: sleep drifting down, blood pressure creeping up,
 * mood dipping, and a missed exercise day.
 */
export function generateDemoReadings(now: number, days = 14): Reading[] {
  const rand = mulberry32(2026)
  const jitter = (amp: number) => (rand() - 0.5) * 2 * amp
  const readings: Reading[] = []

  for (let d = days - 1; d >= 0; d--) {
    const t = now - d * DAY - 2 * 3_600_000 // a couple of hours ago, each day
    const progress = 1 - d / (days - 1) // 0 -> 1 across the window
    const push = (indicatorId: string, value: number, decimals = 0) =>
      readings.push({
        id: `demo-${indicatorId}-${d}`,
        indicatorId,
        value: Number(value.toFixed(decimals)),
        timestamp: t,
      })

    push('heartRate', 64 + progress * 8 + jitter(4))
    push('systolic', 116 + progress * 20 + jitter(4))
    push('diastolic', 74 + progress * 8 + jitter(3))
    push('temperature', 36.8 + progress * 0.4 + jitter(0.2), 1)
    push('spo2', 98 + jitter(1))
    push('sleep', d === 0 ? 4.6 : 7.4 - progress * 1.8 + jitter(0.4), 1)
    push('mood', Math.round(4.4 - progress * 1.6 + jitter(0.4)))
    push('exercise', d === 1 ? 70 : 125 + jitter(15))
    if (d % 3 === 0) push('glucose', 88 + progress * 10 + jitter(5))
  }
  return readings
}
