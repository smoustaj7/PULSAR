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

export interface ThresholdConfig {
  version: number
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
