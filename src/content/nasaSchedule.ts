import { requirementsById, type Requirement } from './lsah'

/**
 * In-flight checks on NASA's long-duration (ISS) plan, keyed to flight day, from the
 * schedules in each requirement document. Day 1 is launch day, which AstroPulse treats as
 * mission day 1. Windows NASA gives (for example "L+14/21") use their first day; checks
 * timed from landing (R-) are left out because the landing date isn't known here.
 */
export interface ScheduledCheck {
  requirementId: string
  /** Shorter name for the schedule, when the requirement covers more than this one task. */
  label?: string
  minutes?: number
  /** Specific flight days. */
  days?: number[]
  /** Repeats every `every` days, starting on flight day `from`. */
  every?: number
  from?: number
}

export const INFLIGHT_SCHEDULE: ScheduledCheck[] = [
  { requirementId: 'pmc', minutes: 15, days: [1, 2, 3, 4, 5], every: 7, from: 7 },
  { requirementId: 'pfc', minutes: 15, every: 7, from: 7 },
  { requirementId: 'nutrition', label: 'Food questionnaire', minutes: 10, every: 7, from: 7 },
  { requirementId: 'ppc', minutes: 15, every: 14, from: 14 },
  { requirementId: 'calf', minutes: 10, every: 14, from: 14 },
  { requirementId: 'body-mass', minutes: 5, days: [7], every: 30, from: 30 },
  { requirementId: 'cognition', minutes: 30, every: 30, from: 30 },
  { requirementId: 'handgrip', minutes: 30, every: 30, from: 14 },
  { requirementId: 'cycle-test', minutes: 70, days: [14, 75] },
  { requirementId: 'health-status', minutes: 15, days: [14, 90, 180, 270] },
  { requirementId: 'eye-exam', label: 'Vision test', minutes: 30, days: [30, 90, 180, 270] },
  { requirementId: 'hearing', minutes: 20, days: [21, 90, 180, 270] },
  { requirementId: 'noise', label: 'Noise monitor, 24 hours', days: [21], every: 60, from: 90 },
  { requirementId: 'grab-samples', minutes: 5, every: 45, from: 45 },
]

export interface ScheduledItem {
  day: number
  check: ScheduledCheck
  requirement: Requirement
  title: string
}

export function occursOn(check: ScheduledCheck, day: number): boolean {
  if (check.days?.includes(day)) return true
  if (check.every && check.from !== undefined && day >= check.from) return (day - check.from) % check.every === 0
  return false
}

/** The first flight day on or after `day` when this check happens, if any. */
export function nextOccurrence(check: ScheduledCheck, day: number): number | null {
  const candidates: number[] = (check.days ?? []).filter((d) => d >= day)
  if (check.every && check.from !== undefined) {
    const start = Math.max(day, check.from)
    const offset = (check.every - ((start - check.from) % check.every)) % check.every
    candidates.push(start + offset)
  }
  return candidates.length ? Math.min(...candidates) : null
}

const item = (day: number, check: ScheduledCheck): ScheduledItem => {
  const requirement = requirementsById[check.requirementId]
  return { day, check, requirement, title: check.label ?? requirement.title }
}

/** Checks from `day` through `day + horizon`, in date order. */
export function checksBetween(day: number, horizon: number): ScheduledItem[] {
  const out: ScheduledItem[] = []
  for (let d = day; d <= day + horizon; d++) {
    for (const check of INFLIGHT_SCHEDULE) if (occursOn(check, d)) out.push(item(d, check))
  }
  return out
}

/** Every scheduled check with its next date from `day`, soonest first. */
export function nextForEachCheck(day: number): ScheduledItem[] {
  return INFLIGHT_SCHEDULE.flatMap((check) => {
    const next = nextOccurrence(check, day)
    return next === null ? [] : [item(next, check)]
  }).sort((a, b) => a.day - b.day)
}

/** In-flight requirements with no fixed day: continuous, automatic or done when needed. */
export const UNSCHEDULED_INFLIGHT = ['dosimeter', 'co2', 'skin-photos', 'eva-monitoring', 'combustion', 'aqm', 'area-monitors'].map(
  (id) => requirementsById[id],
)

export function relativeDay(day: number, today: number): string {
  const diff = day - today
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return diff > 0 ? `In ${diff} days` : `${-diff} days ago`
}
