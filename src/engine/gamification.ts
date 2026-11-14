/**
 * Gamification, derived purely from readings: nothing extra is stored, so it can never
 * drift out of sync with the health log. Rewards consistency (doing the routine), never
 * "good" values, so crew are never nudged to under-report symptoms.
 */
import type { Evaluation, IndicatorConfig, Reading, ThresholdConfig } from './types'

export const XP_PER_READING = 10
export const XP_PER_FULL_DAY = 25
export const XP_PER_LEVEL = 250

export interface Badge {
  id: string
  label: string
  description: string
  earned: boolean
}

export interface Progress {
  xp: number
  level: number
  /** XP earned inside the current level, 0..XP_PER_LEVEL. */
  levelXp: number
  /** Consecutive days (ending today, or yesterday if today isn't finished) with the full daily routine. */
  streak: number
  bestStreak: number
  today: { done: number; total: number; remaining: IndicatorConfig[] }
  badges: Badge[]
}

/** Local calendar day, e.g. "2026-11-06". */
export function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Shift a timestamp by whole calendar days (DST-safe: anchored at local noon). */
function shiftDays(ts: number, days: number): number {
  const d = new Date(ts)
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + days)
  return d.getTime()
}

export function computeProgress(
  readings: readonly Reading[],
  config: ThresholdConfig,
  evaluations: readonly Evaluation[],
  now: number,
): Progress {
  const daily = config.indicators.filter((i) => i.cadenceHours <= 24)

  const loggedByDay = new Map<string, Set<string>>()
  for (const r of readings) {
    const key = dayKey(r.timestamp)
    const set = loggedByDay.get(key) ?? new Set<string>()
    set.add(r.indicatorId)
    loggedByDay.set(key, set)
  }
  const isComplete = (key: string) => {
    const set = loggedByDay.get(key)
    return !!set && daily.every((i) => set.has(i.id))
  }
  const completeDays = [...loggedByDay.keys()].filter(isComplete)

  // Current streak: today counts if done; otherwise it's still "in progress" and we start from yesterday.
  let cursor = isComplete(dayKey(now)) ? now : shiftDays(now, -1)
  let streak = 0
  while (isComplete(dayKey(cursor))) {
    streak++
    cursor = shiftDays(cursor, -1)
  }

  // Best streak: walk each complete day that starts a run.
  const completeSet = new Set(completeDays)
  let bestStreak = 0
  for (const key of completeDays) {
    const start = new Date(`${key}T12:00:00`).getTime()
    if (completeSet.has(dayKey(shiftDays(start, -1)))) continue // not the start of a run
    let len = 0
    let t = start
    while (completeSet.has(dayKey(t))) {
      len++
      t = shiftDays(t, 1)
    }
    bestStreak = Math.max(bestStreak, len)
  }

  const xp = readings.length * XP_PER_READING + completeDays.length * XP_PER_FULL_DAY
  const todaySet = loggedByDay.get(dayKey(now)) ?? new Set<string>()
  const remaining = daily.filter((i) => !todaySet.has(i.id))

  const recentSleep = readings
    .filter((r) => r.indicatorId === 'sleep')
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 3)

  const badge = (id: string, label: string, description: string, earned: boolean): Badge => ({
    id,
    label,
    description,
    earned,
  })

  return {
    xp,
    level: Math.floor(xp / XP_PER_LEVEL) + 1,
    levelXp: xp % XP_PER_LEVEL,
    streak,
    bestStreak,
    today: { done: daily.length - remaining.length, total: daily.length, remaining },
    badges: [
      badge('first', 'First contact', 'Log your first reading', readings.length > 0),
      badge('routine', 'Full routine', 'Complete every daily measurement in one day', completeDays.length > 0),
      badge('streak3', 'On a roll', 'Keep a 3-day routine streak', bestStreak >= 3),
      badge('streak7', 'Week in orbit', 'Keep a 7-day routine streak', bestStreak >= 7),
      badge(
        'green',
        'Green board',
        'Every indicator nominal at the same time',
        evaluations.length > 0 && evaluations.every((e) => e.status === 'nominal'),
      ),
      badge(
        'rested',
        'Well rested',
        'Sleep 7+ hours three nights in a row',
        recentSleep.length === 3 && recentSleep.every((r) => r.value >= 7),
      ),
      badge('centurion', 'Centurion', 'Log 100 readings', readings.length >= 100),
    ],
  }
}
