import { describe, expect, it } from 'vitest'
import { config } from '../config'
import { computeProgress, XP_PER_FULL_DAY, XP_PER_READING } from './gamification'
import { evaluateLatest } from './rules'
import type { Reading } from './types'

const daily = config.indicators.filter((i) => i.cadenceHours <= 24)
// Local noon on a fixed date keeps day boundaries deterministic in any timezone.
const NOW = new Date(2026, 10, 6, 12).getTime()
const daysAgo = (n: number) => {
  const d = new Date(NOW)
  d.setDate(d.getDate() - n)
  return d.getTime()
}

/** A full daily routine (every daily indicator, nominal-ish values) on each given day offset. */
function routine(dayOffsets: number[], value = (id: string) => (id === 'sleep' ? 8 : id === 'mood' ? 4 : 100)): Reading[] {
  return dayOffsets.flatMap((n) =>
    daily.map((i) => ({ id: `${i.id}-${n}`, indicatorId: i.id, value: value(i.id), timestamp: daysAgo(n) })),
  )
}

const progress = (readings: Reading[]) => computeProgress(readings, config, evaluateLatest(readings, config), NOW)

describe('computeProgress', () => {
  it('starts empty', () => {
    const p = progress([])
    expect(p).toMatchObject({ xp: 0, level: 1, streak: 0, bestStreak: 0 })
    expect(p.today.done).toBe(0)
    expect(p.badges.every((b) => !b.earned)).toBe(true)
  })

  it('awards XP per reading plus a bonus per complete day', () => {
    const readings = routine([0, 1])
    expect(progress(readings).xp).toBe(readings.length * XP_PER_READING + 2 * XP_PER_FULL_DAY)
  })

  it('counts a streak ending today', () => {
    expect(progress(routine([0, 1, 2])).streak).toBe(3)
  })

  it("does not break the streak while today's routine is still in progress", () => {
    const p = progress(routine([1, 2, 3]))
    expect(p.streak).toBe(3)
    expect(p.today.done).toBe(0)
    expect(p.today.remaining).toHaveLength(daily.length)
  })

  it('breaks the streak on a missed day but remembers the best run', () => {
    const p = progress(routine([0, 1, 3, 4, 5, 6]))
    expect(p.streak).toBe(2)
    expect(p.bestStreak).toBe(4)
  })

  it('does not count partial days', () => {
    const partial = routine([0]).slice(1) // missing one daily indicator
    expect(progress(partial).streak).toBe(0)
    expect(progress(partial).today.remaining).toHaveLength(1)
  })

  it('earns streak badges', () => {
    const earned = (r: Reading[]) => progress(r).badges.filter((b) => b.earned).map((b) => b.id)
    expect(earned(routine([0, 1, 2]))).toEqual(expect.arrayContaining(['first', 'routine', 'streak3', 'rested']))
    expect(earned(routine([0, 1, 2]))).not.toContain('streak7')
    expect(earned(routine([0, 1, 2, 3, 4, 5, 6]))).toContain('streak7')
  })
})
