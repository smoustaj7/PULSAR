import { describe, expect, it } from 'vitest'
import { indicatorsById } from '../config'
import type { Reading } from './types'
import { forecastHeartRate } from './forecast'

const DAY = 24 * 60 * 60 * 1000
const series = (values: number[]): Reading[] =>
  values.map((value, day) => ({ id: `hr-${day}`, indicatorId: 'heartRate', value, timestamp: day * DAY }))

describe('forecastHeartRate', () => {
  it('projects a steady value without raising an early-review flag', () => {
    const forecast = forecastHeartRate(series(Array(14).fill(70)), indicatorsById.heartRate)

    expect(forecast?.projectedBpm).toBeCloseTo(70)
    expect(forecast?.baselineBpm).toBeCloseTo(70)
    expect(forecast?.shouldReview).toBe(false)
  })

  it('flags a projected rise above the personal baseline threshold', () => {
    const readings = series(Array.from({ length: 14 }, (_, day) => (day < 7 ? 60 : 60 + day - 6)))
    const forecast = forecastHeartRate(readings, indicatorsById.heartRate)

    expect(forecast?.projectedBpm).toBeCloseTo(74)
    expect(forecast?.deltaBpm).toBeCloseTo(14)
    expect(forecast?.shouldReview).toBe(true)
  })

  it('requires enough readings across both weeks', () => {
    expect(forecastHeartRate(series(Array(10).fill(70)), indicatorsById.heartRate)).toBeUndefined()
  })
})
