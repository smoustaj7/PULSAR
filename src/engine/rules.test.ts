import { describe, expect, it } from 'vitest'
import { config, indicatorsById } from '../config'
import {
  assessRegions,
  computeTrend,
  dueIndicators,
  evaluateLatest,
  evaluateValue,
  latestReadings,
  overallStatus,
  worstStatus,
} from './rules'
import { applyEnvironment } from './environment'
import type { Reading } from './types'

const HOUR = 3_600_000
const r = (indicatorId: string, value: number, timestamp = 0): Reading => ({
  id: `${indicatorId}-${timestamp}`,
  indicatorId,
  value,
  timestamp,
})

describe('evaluateValue', () => {
  const hr = indicatorsById.heartRate

  it('classifies nominal, caution, and critical bands', () => {
    expect(evaluateValue(hr, 70).status).toBe('nominal')
    expect(evaluateValue(hr, 110).status).toBe('caution')
    expect(evaluateValue(hr, 130).status).toBe('critical')
    expect(evaluateValue(hr, 45).status).toBe('caution')
    expect(evaluateValue(hr, 35).status).toBe('critical')
  })

  it('treats band edges as inclusive', () => {
    expect(evaluateValue(hr, 50).status).toBe('nominal')
    expect(evaluateValue(hr, 100).status).toBe('nominal')
    expect(evaluateValue(hr, 120).status).toBe('caution')
  })

  it('reports direction and direction-specific guidance', () => {
    const low = evaluateValue(hr, 35)
    expect(low.direction).toBe('low')
    expect(low.guidance).toBe(hr.guidance.low!.critical)
    expect(evaluateValue(hr, 130).direction).toBe('high')
  })

  it('handles one-sided (unbounded) ranges', () => {
    const ex = indicatorsById.exercise
    expect(evaluateValue(ex, 240).status).toBe('nominal')
    expect(evaluateValue(ex, 90).status).toBe('caution')
    expect(evaluateValue(ex, 30).status).toBe('critical')
  })

  it('falls back to generic guidance when a direction is not configured', () => {
    // spo2 has no "high" guidance; narrow its normal band so 99.5 reads as high-caution.
    const spo2 = { ...indicatorsById.spo2, normal: { min: 95, max: 98 } }
    const e = evaluateValue(spo2, 99.5)
    expect(e.status).toBe('caution')
    expect(e.direction).toBe('high')
    expect(e.guidance).toMatch(/Outside the expected range/)
  })

  it('returns unknown for non-finite input', () => {
    expect(evaluateValue(hr, Number.NaN).status).toBe('unknown')
  })
})

describe('aggregation', () => {
  it('worstStatus picks the most severe', () => {
    expect(worstStatus(['nominal', 'critical', 'caution'])).toBe('critical')
    expect(worstStatus([])).toBe('unknown')
  })

  it('latestReadings keeps the newest reading per indicator', () => {
    const latest = latestReadings([r('heartRate', 60, 1), r('heartRate', 90, 3), r('heartRate', 70, 2)])
    expect(latest.get('heartRate')?.value).toBe(90)
  })

  it('rolls indicators up to regions and overall status', () => {
    const regions = assessRegions([r('heartRate', 70), r('systolic', 170), r('sleep', 8)], config)
    const cardio = regions.find((x) => x.region.id === 'cardiovascular')!
    expect(cardio.status).toBe('critical')
    expect(regions.find((x) => x.region.id === 'brain')!.status).toBe('nominal')
    expect(regions.find((x) => x.region.id === 'musculoskeletal')!.status).toBe('unknown')
    expect(overallStatus(regions)).toBe('critical')
  })
})

describe('trends', () => {
  const DAY = 24 * HOUR
  const hrSeries = (values: number[]) => values.map((v, i) => r('heartRate', v, i * DAY))

  it('escalates an in-range value that rose past the trend limit to caution', () => {
    const readings = hrSeries([60, 62, 61, 60, 75]) // baseline ≈ 60.75, +14.25, still < 100
    const hr = evaluateLatest(readings, config).find((e) => e.indicator.id === 'heartRate')!
    expect(hr.trend?.flagged).toBe('rise')
    expect(hr.status).toBe('caution')
    expect(hr.direction).toBe('high')
    expect(hr.guidance).toMatch(/Trending up/)
  })

  it('does not flag small changes', () => {
    const hr = evaluateLatest(hrSeries([60, 62, 61, 60, 65]), config).find((e) => e.indicator.id === 'heartRate')!
    expect(hr.trend?.flagged).toBeNull()
    expect(hr.status).toBe('nominal')
  })

  it('needs enough baseline readings inside the window', () => {
    const latest = r('heartRate', 90, 30 * DAY)
    expect(computeTrend(indicatorsById.heartRate, [r('heartRate', 60, 29 * DAY), latest], latest)).toBeUndefined()
    // Old readings outside the 7-day window are ignored.
    const old = [0, 1, 2].map((d) => r('heartRate', 60, d * DAY))
    expect(computeTrend(indicatorsById.heartRate, [...old, latest], latest)).toBeUndefined()
  })

  it('keeps an already out-of-range status and its guidance', () => {
    const readings = hrSeries([60, 61, 60, 62, 130])
    const hr = evaluateLatest(readings, config).find((e) => e.indicator.id === 'heartRate')!
    expect(hr.status).toBe('critical')
    expect(hr.guidance).toBe(indicatorsById.heartRate.guidance.high!.critical)
    expect(hr.trend?.flagged).toBe('rise')
  })

  it('flags drops for drop-only rules', () => {
    const series = [8, 8, 7.5, 8, 6].map((v, i) => r('sleep', v, i * DAY))
    const sleep = evaluateLatest(series, config).find((e) => e.indicator.id === 'sleep')!
    expect(sleep.trend?.flagged).toBe('drop')
  })
})

describe('dueIndicators', () => {
  it('flags never-measured and overdue indicators', () => {
    const now = 100 * HOUR
    const due = dueIndicators([r('heartRate', 70, now - 2 * HOUR), r('glucose', 90, now - 80 * HOUR)], config, now)
    const ids = due.map((d) => d.indicator.id)
    expect(ids).not.toContain('heartRate')
    expect(ids).toContain('glucose') // 72h cadence, measured 80h ago
    expect(ids).toContain('mood') // never measured
  })
})

describe('applyEnvironment', () => {
  it('merges indicator overrides for the selected environment only', () => {
    const rover = applyEnvironment(config, 'rover')
    const ex = rover.config.indicators.find((i) => i.id === 'exercise')!
    expect(ex.normal.min).toBe(60)
    expect(evaluateValue(ex, 75).status).toBe('nominal')
    expect(evaluateValue(indicatorsById.exercise, 75).status).toBe('caution') // base unchanged
    expect(rover.config.indicators.find((i) => i.id === 'heartRate')).toBe(indicatorsById.heartRate)
  })

  it('falls back to the first environment for unknown ids', () => {
    expect(applyEnvironment(config, 'nowhere').environment.id).toBe(config.environments[0].id)
  })
})
