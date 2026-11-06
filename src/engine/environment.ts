import type { EnvironmentConfig, ThresholdConfig } from './types'

/**
 * Resolve the config for a mission environment: merge that environment's indicator
 * overrides over the base thresholds. Pure; unknown ids fall back to the first environment.
 */
export function applyEnvironment(
  base: ThresholdConfig,
  environmentId: string,
): { config: ThresholdConfig; environment: EnvironmentConfig } {
  const environment = base.environments.find((e) => e.id === environmentId) ?? base.environments[0]
  const overrides = environment.overrides ?? {}
  const config: ThresholdConfig = {
    ...base,
    indicators: base.indicators.map((i) => (overrides[i.id] ? { ...i, ...overrides[i.id] } : i)),
  }
  return { config, environment }
}
