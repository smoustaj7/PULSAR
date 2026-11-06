/**
 * Rules engine: pure functions, readings in -> status + guidance out.
 * No React, no storage, no clock (callers pass `now`) so it is trivially testable
 * and could later run on a server or in a worker unchanged.
 */
import type {
  DueItem,
  Evaluation,
  IndicatorConfig,
  Range,
  Reading,
  RegionAssessment,
  Status,
  ThresholdConfig,
  TrendResult,
} from './types'

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
/** Minimum earlier readings needed before a personal baseline is trusted. */
export const MIN_BASELINE_SAMPLES = 3

export const STATUS_RANK: Record<Status, number> = {
  unknown: 0,
  nominal: 1,
  caution: 2,
  critical: 3,
}

const FALLBACK_GUIDANCE: Record<Exclude<Status, 'nominal' | 'unknown'>, string> = {
  caution: 'Outside the expected range. Re-measure and keep an eye on this indicator.',
  critical: 'Well outside the expected range. Re-measure and notify the Crew Medical Officer.',
}

export function inRange(value: number, range: Range): boolean {
  return (range.min === null || value >= range.min) && (range.max === null || value <= range.max)
}

/** Classify a single value against an indicator's thresholds. */
export function evaluateValue(indicator: IndicatorConfig, value: number): Evaluation {
  if (!Number.isFinite(value)) {
    return { indicator, status: 'unknown', direction: null, guidance: 'Invalid reading.' }
  }
  if (inRange(value, indicator.normal)) {
    return { indicator, status: 'nominal', direction: null, guidance: indicator.guidance.nominal }
  }
  const direction = indicator.normal.min !== null && value < indicator.normal.min ? 'low' : 'high'
  const status = inRange(value, indicator.caution) ? 'caution' : 'critical'
  const guidance = indicator.guidance[direction]?.[status] ?? FALLBACK_GUIDANCE[status]
  return { indicator, status, direction, guidance }
}

export function evaluateReading(indicator: IndicatorConfig, reading: Reading): Evaluation {
  return { ...evaluateValue(indicator, reading.value), reading }
}

export function worstStatus(statuses: Iterable<Status>): Status {
  let worst: Status = 'unknown'
  for (const s of statuses) if (STATUS_RANK[s] > STATUS_RANK[worst]) worst = s
  return worst
}

/** Most recent reading for each indicator. */
export function latestReadings(readings: readonly Reading[]): Map<string, Reading> {
  const latest = new Map<string, Reading>()
  for (const r of readings) {
    const prev = latest.get(r.indicatorId)
    if (!prev || r.timestamp > prev.timestamp) latest.set(r.indicatorId, r)
  }
  return latest
}

/** Compare `latest` with the mean of the indicator's earlier readings inside the baseline window. */
export function computeTrend(
  indicator: IndicatorConfig,
  series: readonly Reading[],
  latest: Reading,
): TrendResult | undefined {
  const rule = indicator.trend
  if (!rule) return undefined
  const baselineDays = rule.baselineDays ?? 7
  const from = latest.timestamp - baselineDays * DAY_MS
  const base = series.filter((r) => r.id !== latest.id && r.timestamp < latest.timestamp && r.timestamp >= from)
  if (base.length < MIN_BASELINE_SAMPLES) return undefined

  const baseline = base.reduce((sum, r) => sum + r.value, 0) / base.length
  const delta = latest.value - baseline
  const flagged =
    rule.rise !== undefined && delta >= rule.rise
      ? 'rise'
      : rule.drop !== undefined && -delta >= rule.drop
        ? 'drop'
        : null
  return { baseline, delta, baselineDays, samples: base.length, flagged }
}

/**
 * Attach a trend to an evaluation. A flagged trend escalates an in-range (nominal) value to
 * caution, the early warning that lets crew act before a value leaves the normal range.
 */
export function applyTrend(evaluation: Evaluation, trend: TrendResult | undefined): Evaluation {
  if (!trend) return evaluation
  if (!trend.flagged || evaluation.status !== 'nominal') return { ...evaluation, trend }
  const { indicator } = evaluation
  const word = trend.flagged === 'rise' ? 'up' : 'down'
  const amount = Math.abs(trend.delta).toFixed(Math.max(indicator.decimals, 1))
  return {
    ...evaluation,
    trend,
    status: 'caution',
    direction: trend.flagged === 'rise' ? 'high' : 'low',
    guidance: `Trending ${word} ${amount} ${indicator.unit} vs. your ${trend.baselineDays}-day average. Still in range, but this is an early warning. Re-measure and watch this indicator.`,
  }
}

/** One evaluation per configured indicator, based on its latest reading and personal trend. */
export function evaluateLatest(readings: readonly Reading[], config: ThresholdConfig): Evaluation[] {
  const byIndicator = new Map<string, Reading[]>()
  for (const r of readings) {
    const list = byIndicator.get(r.indicatorId)
    if (list) list.push(r)
    else byIndicator.set(r.indicatorId, [r])
  }
  const latest = latestReadings(readings)
  return config.indicators.map((indicator) => {
    const reading = latest.get(indicator.id)
    if (!reading) return { indicator, status: 'unknown', direction: null, guidance: 'No reading logged yet.' }
    const trend = computeTrend(indicator, byIndicator.get(indicator.id) ?? [], reading)
    return applyTrend(evaluateReading(indicator, reading), trend)
  })
}

/** Roll indicator evaluations up to body regions (worst status wins). */
export function assessRegions(readings: readonly Reading[], config: ThresholdConfig): RegionAssessment[] {
  const evaluations = evaluateLatest(readings, config)
  return config.regions.map((region) => {
    const regionEvals = evaluations.filter((e) => e.indicator.regionId === region.id)
    return { region, status: worstStatus(regionEvals.map((e) => e.status)), evaluations: regionEvals }
  })
}

export function overallStatus(regions: readonly RegionAssessment[]): Status {
  return worstStatus(regions.map((r) => r.status))
}

/** Indicators whose measurement cadence has elapsed (or that were never measured). */
export function dueIndicators(readings: readonly Reading[], config: ThresholdConfig, now: number): DueItem[] {
  const latest = latestReadings(readings)
  const due: DueItem[] = []
  for (const indicator of config.indicators) {
    const last = latest.get(indicator.id)?.timestamp ?? null
    if (last === null) {
      due.push({ indicator, lastTimestamp: null, overdueMs: 0 })
      continue
    }
    const dueAt = last + indicator.cadenceHours * HOUR_MS
    if (now >= dueAt) due.push({ indicator, lastTimestamp: last, overdueMs: now - dueAt })
  }
  return due.sort((a, b) => b.overdueMs - a.overdueMs)
}

/** Readings for a single indicator, oldest first (chart-ready). */
export function seriesFor(readings: readonly Reading[], indicatorId: string): Reading[] {
  return readings.filter((r) => r.indicatorId === indicatorId).sort((a, b) => a.timestamp - b.timestamp)
}
