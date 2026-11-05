import raw from './thresholds.json'
import type { IndicatorConfig, RegionConfig, ThresholdConfig } from '../engine/types'

export const config = raw as ThresholdConfig

export const indicatorsById: Record<string, IndicatorConfig> = Object.fromEntries(
  config.indicators.map((i) => [i.id, i]),
)

export const regionsById: Record<string, RegionConfig> = Object.fromEntries(
  config.regions.map((r) => [r.id, r]),
)
