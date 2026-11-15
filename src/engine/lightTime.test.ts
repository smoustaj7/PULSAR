import { describe, expect, it } from 'vitest'
import { formatClock, formatDuration, marsDistanceAu, marsLightTimeMs } from './lightTime'

const MIN = 60_000

describe('Earth–Mars light time', () => {
  it('matches the 2025 close approach: about 0.64 AU, 5.3 light-minutes', () => {
    const t = Date.UTC(2025, 0, 12)
    expect(marsDistanceAu(t)).toBeCloseTo(0.642, 1)
    expect(marsLightTimeMs(t) / MIN).toBeCloseTo(5.3, 0)
  })

  it('matches the January 2026 conjunction: about 2.4 AU, 20 light-minutes', () => {
    const t = Date.UTC(2026, 0, 9)
    expect(marsDistanceAu(t)).toBeGreaterThan(2.3)
    expect(marsDistanceAu(t)).toBeLessThan(2.5)
    expect(marsLightTimeMs(t) / MIN).toBeGreaterThan(19)
  })

  it('always stays between the closest and farthest the planets get', () => {
    for (let d = 0; d < 800; d += 20) {
      const minutes = marsLightTimeMs(Date.UTC(2026, 0, 1) + d * 86_400_000) / MIN
      expect(minutes).toBeGreaterThan(3)
      expect(minutes).toBeLessThan(22.5)
    }
  })
})

describe('formatting', () => {
  it('writes durations and countdowns', () => {
    expect(formatDuration(52_000)).toBe('52 s')
    expect(formatDuration(9 * MIN + 36_000)).toBe('9 min 36 s')
    expect(formatDuration(62 * MIN)).toBe('1 h 2 min')
    expect(formatClock(9 * MIN + 35_100)).toBe('9:36')
    expect(formatClock(0)).toBe('0:00')
  })
})
