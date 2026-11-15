import type { IndicatorConfig, Reading } from './types'

const DAY_MS = 24 * 60 * 60 * 1000
const BASELINE_DAYS = 7
const TREND_DAYS = 7
const FORECAST_DAYS = 7
const MIN_SAMPLES = 3
const MIN_SPAN_DAYS = 3

export interface HeartRateForecast {
  projectedBpm: number
  baselineBpm: number
  deltaBpm: number
  targetTimestamp: number
  shouldReview: boolean
}

/** Project the recent 7-day linear trend one week ahead, against the prior week's baseline. */
export function forecastHeartRate(readings: readonly Reading[], indicator: IndicatorConfig): HeartRateForecast | undefined {
  const series = readings
    .filter((reading) => reading.indicatorId === indicator.id)
    .sort((a, b) => a.timestamp - b.timestamp)
  const latest = series.at(-1)
  if (!latest) return undefined

  const baselineStart = latest.timestamp - (BASELINE_DAYS + TREND_DAYS) * DAY_MS
  const trendStart = latest.timestamp - TREND_DAYS * DAY_MS
  const baseline = series.filter((reading) => reading.timestamp >= baselineStart && reading.timestamp < trendStart)
  const recent = series.filter((reading) => reading.timestamp >= trendStart)
  if (
    baseline.length < MIN_SAMPLES ||
    recent.length < MIN_SAMPLES ||
    baseline.at(-1)!.timestamp - baseline[0].timestamp < MIN_SPAN_DAYS * DAY_MS ||
    recent.at(-1)!.timestamp - recent[0].timestamp < MIN_SPAN_DAYS * DAY_MS
  ) {
    return undefined
  }

  const x = recent.map((reading) => (reading.timestamp - latest.timestamp) / DAY_MS)
  const meanX = x.reduce((sum, value) => sum + value, 0) / x.length
  const meanY = recent.reduce((sum, reading) => sum + reading.value, 0) / recent.length
  const varianceX = x.reduce((sum, value) => sum + (value - meanX) ** 2, 0)
  if (varianceX === 0) return undefined

  const slope =
    x.reduce((sum, value, index) => sum + (value - meanX) * (recent[index].value - meanY), 0) / varianceX
  const projectedBpm = meanY + slope * (FORECAST_DAYS - meanX)
  if (
    !Number.isFinite(projectedBpm) ||
    projectedBpm < indicator.input.min ||
    projectedBpm > indicator.input.max
  ) {
    return undefined
  }

  const baselineBpm = baseline.reduce((sum, reading) => sum + reading.value, 0) / baseline.length
  const deltaBpm = projectedBpm - baselineBpm
  const riseThreshold = indicator.trend?.rise ?? 10
  const aboveNormal = indicator.normal.max !== null && projectedBpm > indicator.normal.max

  return {
    projectedBpm,
    baselineBpm,
    deltaBpm,
    targetTimestamp: latest.timestamp + FORECAST_DAYS * DAY_MS,
    shouldReview: deltaBpm >= riseThreshold || aboveNormal,
  }
}
