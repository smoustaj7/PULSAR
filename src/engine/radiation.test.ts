import { describe, expect, it } from 'vitest'
import { DOSE_ID, doseAt, radiationAdvice, radiationState, radiationSummary } from './radiation'
import type { Reading } from './types'

const DAY = 86_400_000
const START = new Date(2026, 0, 5, 12).getTime()
const day = (n: number) => START + n * DAY
const dose = (d: number, value: number): Reading => ({ id: `d${d}`, indicatorId: DOSE_ID, value, timestamp: day(d) })
const state = (readings: Reading[], now: number, environmentId = 'station') =>
  radiationState({ readings, environmentId, missionStart: START, now })
const limit = (s: ReturnType<typeof state>, id: string) => s.limits.find((l) => l.id === id)!

describe('radiationState', () => {
  it('estimates from the typical rate where the crew is until the dosimeter is read', () => {
    const s = state([], day(100))
    expect(s.measured).toBe(false)
    expect(s.rateFrom).toBe('typical')
    expect(s.total).toBeCloseTo(50)
    // 0.5 mSv a day never fills a 30-day or 1-year window, so only the career limit is ever reached.
    expect(limit(s, '30-day').daysLeft).toBeNull()
    expect(limit(s, '1-year').daysLeft).toBeNull()
    expect(limit(s, 'career').daysLeft).toBeCloseTo(1100)
    expect(s.nearest.id).toBe('career')
    expect(s.status).toBe('nominal')
  })

  it('builds faster in deep space and turns to caution past half the career limit', () => {
    const s = state([], day(200), 'transit')
    expect(s.total).toBeCloseTo(320)
    expect(limit(s, 'career').status).toBe('caution')
    expect(limit(s, 'career').daysLeft).toBeCloseTo(175)
    expect(s.status).toBe('caution')
  })

  it('takes the dose and rate from the dosimeter, and adds the rate since the last reading', () => {
    const s = state([dose(10, 6), dose(20, 12)], day(25))
    expect(s.measured).toBe(true)
    expect(s.rateFrom).toBe('dosimeter')
    expect(s.ratePerDay).toBeCloseTo(0.6)
    expect(s.total).toBeCloseTo(15)
  })

  it('reads the dose between readings off a straight line, and ramps up to the first from launch', () => {
    const series = [dose(10, 6), dose(20, 12)]
    expect(doseAt(day(15), series, START, 0.6)).toBeCloseTo(9)
    expect(doseAt(day(5), series, START, 0.6)).toBeCloseTo(3)
    expect(doseAt(day(-1), series, START, 0.6)).toBe(0)
  })

  it('counts days to a rolling limit only when the rate can fill its window', () => {
    const readings = Array.from({ length: 21 }, (_, d) => dose(d, d * 9))
    const s = state(readings, day(20))
    const month = limit(s, '30-day')
    expect(month.used).toBeCloseTo(180)
    expect(month.daysLeft).toBeCloseTo(70 / 9)
    expect(s.nearest.id).toBe('30-day')
    expect(month.status).toBe('caution')
  })

  it('flags a solar storm when the dose rate jumps, and only while it is recent', () => {
    const readings = [dose(28, 20), dose(29, 21), dose(30, 46)]
    const now = state(readings, day(30.5))
    expect(now.storm).toBe(true)
    expect(now.status).toBe('critical')
    expect(radiationAdvice(now, day(30.5))[0].id).toBe('storm')
    expect(state(readings, day(36)).storm).toBe(false)
  })

  it('marks a limit reached once the dose is past it', () => {
    const s = state([dose(400, 650)], day(400))
    expect(limit(s, 'career').daysLeft).toBe(0)
    expect(limit(s, 'career').status).toBe('critical')
    expect(radiationAdvice(s, day(400)).map((a) => a.id)).toContain('career-over')
  })
})

describe('radiationAdvice', () => {
  it('says the numbers are estimates until a dosimeter reading, and asks for a fresh one when it is old', () => {
    expect(radiationAdvice(state([], day(10)), day(10)).map((a) => a.id)).toContain('measure')
    expect(radiationAdvice(state([dose(2, 1)], day(10)), day(10)).map((a) => a.id)).toContain('stale')
  })
})

describe('radiationSummary', () => {
  it('gives the assistant the dose, the rate and every limit', () => {
    const line = radiationSummary(state([dose(20, 12)], day(20)))
    expect(line).toMatch(/12 mSv since launch \(from the dosimeter\)/)
    expect(line).toMatch(/Career limit 12 of 600 mSv \(2%\), reached in about 980 days/)
    expect(line).toMatch(/30-day limit .* not reached at this rate/)
  })
})
