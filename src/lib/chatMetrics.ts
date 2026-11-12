import type { EnvironmentConfig, Evaluation } from '../engine/types'
import { STATUS_META, formatRange, formatValue, timeAgo } from './status'

/**
 * What the health assistant is told about the signed-in astronaut: where they are, the mission
 * day, and each reading with its status, normal range and trend. Plain text, one fact a line,
 * computed by the app so the model explains numbers rather than judging them.
 */
export function chatMetrics({
  name,
  missionDay,
  environment,
  evaluations,
  now,
}: {
  name: string
  missionDay: number
  environment: EnvironmentConfig
  evaluations: Evaluation[]
  now: number
}): string {
  const lines = [`Crew member: ${name}`, `Mission day ${missionDay}, ${environment.label} (${environment.gravity})`]
  // Most serious first, so the model leads with what matters.
  const RANK = { critical: 0, caution: 1, nominal: 2, unknown: 3 }
  const logged = evaluations
    .filter((e) => e.reading)
    .sort((a, b) => RANK[a.status] - RANK[b.status] || Number(!!b.trend?.flagged) - Number(!!a.trend?.flagged))
  if (!logged.length) return [...lines, 'No readings logged yet.'].join('\n')
  // The verdict up front, so a small model can't call a flagged reading "okay".
  const flagged = logged.filter((e) => e.status === 'critical' || e.status === 'caution' || e.trend?.flagged)
  const fine = logged.filter((e) => !flagged.includes(e))
  lines.push(
    flagged.length
      ? `Needs attention: ${flagged.map((e) => `${e.indicator.label} (${e.status === 'nominal' ? 'trending' : STATUS_META[e.status].label})`).join(', ')}`
      : 'Needs attention: nothing; every logged reading is in range',
  )
  if (fine.length) lines.push(`In range: ${fine.map((e) => e.indicator.label).join(', ')}`)
  lines.push('Details:')
  for (const e of logged) {
    const { indicator, reading, trend } = e
    let line = `${indicator.label}: ${formatValue(indicator, reading!.value)} ${indicator.unit} (${STATUS_META[e.status].label}; normal ${formatRange(indicator)}; ${timeAgo(reading!.timestamp, now)})`
    if (trend?.flagged) {
      const sign = trend.delta > 0 ? '+' : ''
      line += `, trending ${trend.flagged === 'rise' ? 'up' : 'down'} ${sign}${formatValue(indicator, trend.delta)} ${indicator.unit} vs ${trend.baselineDays}-day baseline`
    }
    lines.push(line)
  }
  const missing = evaluations.filter((e) => !e.reading).map((e) => e.indicator.label)
  if (missing.length) lines.push(`Not logged yet: ${missing.join(', ')}`)
  return lines.join('\n')
}
