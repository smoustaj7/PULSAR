import raw from './thresholds.json'
import { applyEnvironment } from '../engine/environment'
import type { EnvironmentConfig, IndicatorConfig, RegionConfig, ThresholdConfig } from '../engine/types'

/** Base thresholds, before any environment overrides. */
export const config = raw as ThresholdConfig

const byId = <T extends { id: string }>(items: T[]): Record<string, T> =>
  Object.fromEntries(items.map((i) => [i.id, i]))

export const indicatorsById: Record<string, IndicatorConfig> = byId(config.indicators)
export const regionsById: Record<string, RegionConfig> = byId(config.regions)

export interface ActiveConfig {
  config: ThresholdConfig
  indicatorsById: Record<string, IndicatorConfig>
  environment: EnvironmentConfig
}

const cache = new Map<string, ActiveConfig>()

/** Thresholds with the given environment's overrides applied (memoized per environment). */
export function getActiveConfig(environmentId: string): ActiveConfig {
  let active = cache.get(environmentId)
  if (!active) {
    const { config: resolved, environment } = applyEnvironment(config, environmentId)
    active = { config: resolved, indicatorsById: byId(resolved.indicators), environment }
    cache.set(environmentId, active)
  }
  return active
}
