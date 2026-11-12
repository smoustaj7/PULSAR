import { describe, expect, it } from 'vitest'
import { config } from '../config'
import { evaluateLatest } from '../engine/rules'
import type { Reading } from '../engine/types'
import { chatMetrics } from './chatMetrics'

const NOW = Date.UTC(2026, 10, 12, 12)
const HOUR = 3_600_000
const r = (indicatorId: string, value: number): Reading => ({ id: indicatorId, indicatorId, value, timestamp: NOW - 2 * HOUR })
const base = { name: 'Sam', missionDay: 12, environment: config.environments[2], now: NOW }

describe('chatMetrics', () => {
  it('lists each logged reading with its status and normal range, then what is missing', () => {
    const text = chatMetrics({ ...base, evaluations: evaluateLatest([r('sleep', 4.6), r('heartRate', 70)], config) })
    expect(text).toContain('Crew member: Sam')
    expect(text).toContain(`Mission day 12, ${config.environments[2].label}`)
    expect(text).toMatch(/Sleep duration: 4\.6 h \(Critical; normal .+; 2 h ago\)/)
    expect(text).toMatch(/Resting heart rate: 70 bpm \(Nominal/)
    expect(text).toMatch(/^Not logged yet: .*Body temperature/m)
    expect(text).toMatch(/^Needs attention: Sleep duration \(Critical\)$/m)
    expect(text).toMatch(/^In range: Resting heart rate$/m)
  })

  it('says so when nothing is logged', () => {
    expect(chatMetrics({ ...base, evaluations: evaluateLatest([], config) })).toMatch(/No readings logged yet\.$/)
  })
})
