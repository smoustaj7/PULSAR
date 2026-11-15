import { describe, expect, it } from 'vitest'
import { formatClock, formatDuration, marsDistanceAu, marsLightTimeMs, signalDelayMs } from './lightTime'

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

describe('signal delay by place', () => {
  const t = Date.UTC(2026, 10, 15)
  it('is under a second in orbit, 1.3 s from the Moon, and the Mars delay on Mars', () => {
    expect(signalDelayMs('station', t)).toBeLessThan(1000)
    expect(signalDelayMs('lunar', t)).toBeCloseTo(1282, -1)
    expect(signalDelayMs('mars', t)).toBe(marsLightTimeMs(t))
    expect(signalDelayMs('rover', t)).toBe(marsLightTimeMs(t))
  })

  it('grows through a transit toward the Mars delay', () => {
    expect(signalDelayMs('transit', t, 1)).toBeLessThan(10_000)
    expect(signalDelayMs('transit', t, 105)).toBeCloseTo(marsLightTimeMs(t) / 2, -2)
    expect(signalDelayMs('transit', t, 400)).toBe(marsLightTimeMs(t))
  })
})

describe('formatting', () => {
  it('writes durations and countdowns', () => {
    expect(formatDuration(52_000)).toBe('52 s')
    expect(formatDuration(1282)).toBe('1.3 s')
    expect(formatDuration(500)).toBe('0.5 s')
    expect(formatDuration(2000)).toBe('2 s')
    expect(formatDuration(9 * MIN + 36_000)).toBe('9 min 36 s')
    expect(formatDuration(62 * MIN)).toBe('1 h 2 min')
    expect(formatClock(9 * MIN + 35_100)).toBe('9:36')
    expect(formatClock(0)).toBe('0:00')
  })
})
