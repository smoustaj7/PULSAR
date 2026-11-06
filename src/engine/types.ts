export type Status = 'nominal' | 'caution' | 'critical' | 'unknown'
export type Direction = 'low' | 'high'

/** Inclusive range. `null` means unbounded on that side. */
export interface Range {
  min: number | null
  max: number | null
}

export interface DirectionalGuidance {
  caution: string
  critical: string
}

export interface IndicatorConfig {
  id: string
  label: string
  unit: string
  regionId: string
  decimals: number
  input: { min: number; max: number; step: number }
  normal: Range
  caution: Range
  /** How often the astronaut should take this measurement. */
  cadenceHours: number
  /**
   * Personal-baseline trend rule: flag when the latest value moves this far (in the
   * indicator's unit) from the mean of the previous `baselineDays` (default 7) of readings,
   * even if it is still inside the normal range.
   */
  trend?: { rise?: number; drop?: number; baselineDays?: number }
  howToMeasure: string
  whyItMatters: string
  guidance: {
    nominal: string
    low?: DirectionalGuidance
    high?: DirectionalGuidance
  }
}

export interface RegionConfig {
  id: string
  label: string
  system: string
  description: string
  hazards: string[]
}

/** Where the crew is operating. Changes context, escalation advice, and optionally thresholds. */
export interface EnvironmentConfig {
  id: string
  label: string
  gravity: string
  commsDelay: string
  support: string
  /** What "contact the ground" realistically means here. */
  escalation: string
  /** Per-indicator threshold overrides, keyed by indicator id. */
  overrides?: Record<string, Partial<Pick<IndicatorConfig, 'normal' | 'caution' | 'trend' | 'cadenceHours'>>>
}

export interface ThresholdConfig {
  version: number
  environments: EnvironmentConfig[]
  regions: RegionConfig[]
  indicators: IndicatorConfig[]
}

export interface Reading {
  id: string
  indicatorId: string
  value: number
  /** Epoch milliseconds. */
  timestamp: number
  note?: string
}

export interface Evaluation {
  indicator: IndicatorConfig
  status: Status
  direction: Direction | null
  guidance: string
  /** The reading that produced this evaluation, if any. */
  reading?: Reading
  /** Change vs. personal baseline, when enough history exists. */
  trend?: TrendResult
}

export interface TrendResult {
  baseline: number
  /** latest − baseline, in the indicator's unit. */
  delta: number
  baselineDays: number
  samples: number
  flagged: 'rise' | 'drop' | null
}

export interface RegionAssessment {
  region: RegionConfig
  status: Status
  evaluations: Evaluation[]
}

export interface DueItem {
  indicator: IndicatorConfig
  lastTimestamp: number | null
  /** Milliseconds past due. 0 means due now or never measured. */
  overdueMs: number
}
