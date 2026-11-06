import { getActiveConfig, type ActiveConfig } from '../config'
import { useHealthStore } from '../store/useHealthStore'

/** Thresholds for the crew's current mission environment. */
export function useActiveConfig(): ActiveConfig {
  const environmentId = useHealthStore((s) => s.mission.environmentId)
  return getActiveConfig(environmentId)
}
