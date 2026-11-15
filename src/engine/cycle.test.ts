import { describe, expect, it } from 'vitest'
import { config } from '../config'
import { cycleAdvice, cycleDays, cycleShift, cycleState, defaultCycle, logPeriodEnd, logPeriodStart, startOfDay, type Cycle } from './cycle'
import { evaluateLatest } from './rules'
import type { Reading } from './types'

const DAY = 86_400_000
// Noon, so whole-day steps never cross midnight on a daylight-saving change.
const T0 = new Date(2026, 0, 5, 12).getTime()
const day = (n: number) => T0 + n * DAY
const cycle = (patch: Partial<Cycle> = {}): Cycle => ({ ...defaultCycle(), starts: [startOfDay(T0)], ...patch })

describe('cycleState', () => {
  it('counts the cycle day and walks through the phases of a natural 28-day cycle', () => {
    const c = logPeriodEnd(cycle(), day(4))
    expect(cycleState(cycle(), day(0))).toMatchObject({ day: 1, phase: 'period', bleeding: true })
    expect(cycleState(c, day(6))).toMatchObject({ day: 7, phase: 'follicular', ovulationDay: 14 })
    expect(cycleState(c, day(13)).phase).toBe('ovulation')
    expect(cycleState(c, day(20)).phase).toBe('luteal')
    expect(cycleState(c, day(20))).toMatchObject({ daysUntil: 8, nextStart: startOfDay(day(28)) })
  })

  it('calls a period due, then late once past the window', () => {
    const c = logPeriodEnd(cycle(), day(4))
    expect(cycleState(c, day(29)).phase).toBe('due')
    expect(cycleState(c, day(31))).toMatchObject({ phase: 'late', daysUntil: -3 })
  })

  it('takes a period nobody ended as over a few days past its usual length', () => {
    expect(cycleState(cycle(), day(7)).bleeding).toBe(true)
    expect(cycleState(cycle(), day(8)).bleeding).toBe(false)
  })

  it('learns the cycle length from logged periods and widens the window when they vary', () => {
    const c = cycle({ starts: [day(0), day(30), day(64)].map(startOfDay) })
    const s = cycleState(c, day(70))
    expect(s).toMatchObject({ length: 32, learned: true, window: 2 })
    expect(cycleState({ ...c, starts: [day(0), day(26), day(60)].map(startOfDay) }, day(70)).window).toBe(4)
  })

  it('gives an irregular cycle a wider window', () => {
    expect(cycleState(cycle({ pattern: 'irregular' }), day(10)).window).toBe(5)
  })

  it('predicts bleeds but not ovulation on hormones with a break', () => {
    const s = cycleState(logPeriodEnd(cycle({ hormonal: 'combined' }), day(4)), day(15))
    expect(s).toMatchObject({ mode: 'withdrawal', phase: 'active', ovulationDay: null, daysUntil: 13 })
  })

  it('predicts nothing when periods are suppressed', () => {
    const s = cycleState(cycle({ hormonal: 'continuous', starts: [] }), day(15))
    expect(s).toMatchObject({ mode: 'suppressed', phase: 'suppressed', nextStart: null })
  })

  it('waits for a first period before predicting', () => {
    expect(cycleState(cycle({ starts: [] }), day(3))).toMatchObject({ phase: 'unknown', day: null, nextStart: null })
  })
})

describe('logging periods', () => {
  it('adds a start, and replaces one logged within the same week', () => {
    const c = logPeriodStart(cycle(), day(28))
    expect(c.starts).toEqual([startOfDay(day(0)), startOfDay(day(28))])
    expect(logPeriodStart(c, day(30)).starts).toEqual([startOfDay(day(0)), startOfDay(day(30))])
  })

  it('reopens a period whose end was logged before its new start', () => {
    expect(logPeriodStart(logPeriodEnd(cycle(), day(4)), day(28)).lastEnd).toBeUndefined()
  })
})

describe('cycleShift', () => {
  it('lifts temperature and heart rate in the luteal phase of natural cycles only', () => {
    const c = cycle({ starts: [day(0), day(28)].map(startOfDay) })
    expect(cycleShift(c, 'temperature', day(5))).toBe(0)
    expect(cycleShift(c, 'temperature', day(20))).toBe(0.4)
    expect(cycleShift(c, 'heartRate', day(20))).toBe(3)
    expect(cycleShift(c, 'sleep', day(20))).toBe(0)
    expect(cycleShift(c, 'temperature', day(30))).toBe(0)
    expect(cycleShift({ ...c, hormonal: 'combined' }, 'temperature', day(20))).toBe(0)
    expect(cycleShift(undefined, 'temperature', day(20))).toBe(0)
  })

  it('counts back from the first logged period for older readings', () => {
    expect(cycleShift(cycle({ starts: [startOfDay(day(28))] }), 'temperature', day(20))).toBe(0.4)
  })

  it('keeps the luteal rise from being flagged as a temperature trend', () => {
    const c = cycle()
    const temps: Reading[] = [36.5, 36.5, 36.6, 36.5, 36.5, 36.5, 37.1].map((value, i) => ({
      id: `t${i}`,
      indicatorId: 'temperature',
      value,
      timestamp: day(9 + i),
    }))
    const plain = evaluateLatest(temps, config).find((e) => e.indicator.id === 'temperature')!
    const adjusted = evaluateLatest(temps, config, (id, t) => cycleShift(c, id, t)).find((e) => e.indicator.id === 'temperature')!
    expect(plain.trend?.flagged).toBe('rise')
    expect(adjusted.trend?.flagged).toBeNull()
    expect(adjusted.trend?.cycleShift).toBeGreaterThan(0)
    expect(adjusted.status).toBe('nominal')
  })
})

describe('cycleAdvice', () => {
  const ids = (c: Cycle, at: number) => cycleAdvice(c, cycleState(c, at)).map((a) => a.id)

  it('looks after the body during a period and prepares for the next', () => {
    expect(ids(cycle(), day(1))).toEqual(expect.arrayContaining(['supplies', 'iron', 'cramps']))
    expect(ids(logPeriodEnd(cycle(), day(4)), day(26))).toContain('prepare')
  })

  it('explains the luteal rise only when the baselines shift for it', () => {
    expect(ids(logPeriodEnd(cycle(), day(4)), day(20))).toContain('baseline')
    expect(ids(logPeriodEnd(cycle({ hormonal: 'combined' }), day(4)), day(20))).not.toContain('baseline')
  })

  it('warns about clots on estrogen and sends a late period to the flight surgeon', () => {
    expect(ids(cycle({ hormonal: 'continuous', starts: [] }), day(3))).toEqual(expect.arrayContaining(['clot', 'breakthrough', 'pill']))
    const late = cycleAdvice(logPeriodEnd(cycle(), day(4)), cycleState(logPeriodEnd(cycle(), day(4)), day(36)))
    expect(late.find((a) => a.id === 'late')?.body).toMatch(/flight surgeon at the next private medical conference/)
  })
})

describe('cycleDays', () => {
  it('lays out one phase per day of the cycle', () => {
    const c = cycle()
    const days = cycleDays(c, cycleState(c, day(10)))
    expect(days).toHaveLength(28)
    expect(days.slice(0, 5)).toEqual(Array(5).fill('period'))
    expect(days[13]).toBe('ovulation')
    expect(days[27]).toBe('luteal')
  })
})
