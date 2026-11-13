/** Builds the crew → flight-surgeon health report. Pure: all inputs (including `now`) are passed in. */
import { dueIndicators, evaluateLatest, overallStatus, assessRegions, seriesFor } from '../engine/rules'
import type { EnvironmentConfig, Reading, Status, ThresholdConfig } from '../engine/types'
import type { Mission } from '../store/useHealthStore'
import { STATUS_META } from './status'

const DAY_MS = 86_400_000
export const REPORT_WINDOW_DAYS = 7

export function missionDay(missionStart: number, now: number): number {
  return Math.max(1, Math.floor((now - missionStart) / DAY_MS) + 1)
}

export interface ReportInput {
  readings: readonly Reading[]
  config: ThresholdConfig
  environment: EnvironmentConfig
  mission: Mission
  now: number
}

export interface IndicatorSummary {
  id: string
  label: string
  unit: string
  latest: number | null
  latestAt: string | null
  status: Status
  direction: 'low' | 'high' | null
  guidance: string
  trend: { baseline: number; delta: number; flagged: 'rise' | 'drop' | null } | null
  window: { count: number; min: number; mean: number; max: number } | null
}

export interface HealthReport {
  generatedAt: string
  crewName: string
  missionDay: number
  environment: { id: string; label: string; commsDelay: string }
  overallStatus: Status
  windowDays: number
  indicators: IndicatorSummary[]
  overdue: string[]
  notes: { at: string; indicator: string; value: number; note: string }[]
}

const round = (n: number, d: number) => Number(n.toFixed(d))
const iso = (t: number) => new Date(t).toISOString()

export function buildReport({ readings, config, environment, mission, now }: ReportInput): HealthReport {
  const from = now - REPORT_WINDOW_DAYS * DAY_MS
  const recent = readings.filter((r) => r.timestamp >= from && r.timestamp <= now)
  const evaluations = evaluateLatest(readings, config)

  const indicators: IndicatorSummary[] = evaluations.map((e) => {
    const d = e.indicator.decimals
    const values = seriesFor(recent, e.indicator.id).map((r) => r.value)
    return {
      id: e.indicator.id,
      label: e.indicator.label,
      unit: e.indicator.unit,
      latest: e.reading ? e.reading.value : null,
      latestAt: e.reading ? iso(e.reading.timestamp) : null,
      status: e.status,
      direction: e.direction,
      guidance: e.guidance,
      trend: e.trend
        ? { baseline: round(e.trend.baseline, d + 1), delta: round(e.trend.delta, d + 1), flagged: e.trend.flagged }
        : null,
      window: values.length
        ? {
            count: values.length,
            min: Math.min(...values),
            mean: round(values.reduce((a, b) => a + b, 0) / values.length, d + 1),
            max: Math.max(...values),
          }
        : null,
    }
  })

  const labelOf = (id: string) => config.indicators.find((i) => i.id === id)?.label ?? id

  return {
    generatedAt: iso(now),
    crewName: mission.crewName,
    missionDay: missionDay(mission.missionStart, now),
    environment: { id: environment.id, label: environment.label, commsDelay: environment.commsDelay },
    overallStatus: overallStatus(assessRegions(readings, config)),
    windowDays: REPORT_WINDOW_DAYS,
    indicators,
    overdue: dueIndicators(readings, config, now).map((d) => d.indicator.label),
    notes: recent
      .filter((r) => r.note)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((r) => ({ at: iso(r.timestamp), indicator: labelOf(r.indicatorId), value: r.value, note: r.note! })),
  }
}

const SEVERITY: Record<Status, number> = { critical: 0, caution: 1, nominal: 2, unknown: 3 }

export function reportToMarkdown(r: HealthReport): string {
  const status = (s: Status) => STATUS_META[s].label.toUpperCase()
  const val = (i: IndicatorSummary) => (i.latest === null ? 'n/a' : `${i.latest} ${i.unit}`)
  const trend = (i: IndicatorSummary) =>
    i.trend ? `${i.trend.delta >= 0 ? '+' : ''}${i.trend.delta} vs ${i.trend.baseline}${i.trend.flagged ? ' ⚠' : ''}` : 'n/a'

  const attention = r.indicators
    .filter((i) => i.status === 'critical' || i.status === 'caution')
    .sort((a, b) => SEVERITY[a.status] - SEVERITY[b.status])

  const lines = [
    '# PULSAR health report',
    '',
    `**Crew:** ${r.crewName} · **Mission day:** ${r.missionDay} · **Environment:** ${r.environment.label} (comms delay: ${r.environment.commsDelay})`,
    `**Generated:** ${r.generatedAt} · **Overall status:** ${status(r.overallStatus)}`,
    '',
    '## Needs attention',
    ...(attention.length
      ? attention.map(
          (i) => `- **${i.label}**: ${val(i)} (${status(i.status)}${i.direction ? `, ${i.direction}` : ''}). ${i.guidance}`,
        )
      : ['- Nothing flagged.']),
    '',
    `## All indicators (last ${r.windowDays} days)`,
    '',
    '| Indicator | Latest | Status | Min / avg / max | Trend vs baseline | Readings |',
    '| --- | --- | --- | --- | --- | --- |',
    ...r.indicators.map(
      (i) =>
        `| ${i.label} | ${val(i)} | ${status(i.status)} | ${
          i.window ? `${i.window.min} / ${i.window.mean} / ${i.window.max}` : 'n/a'
        } | ${trend(i)} | ${i.window?.count ?? 0} |`,
    ),
    '',
    '## Overdue measurements',
    ...(r.overdue.length ? r.overdue.map((o) => `- ${o}`) : ['- None.']),
    '',
    '## Crew notes',
    ...(r.notes.length ? r.notes.map((n) => `- ${n.at}, ${n.indicator} ${n.value}: ${n.note}`) : ['- None.']),
    '',
  ]
  return lines.join('\n')
}
