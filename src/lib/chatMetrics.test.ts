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

  it('gives the astronaut’s sex only when they said', () => {
    const evaluations = evaluateLatest([], config)
    expect(chatMetrics({ ...base, sex: 'female', evaluations })).toMatch(/^Crew member: Sam\nSex: female\nMission day 12/)
    expect(chatMetrics({ ...base, sex: 'unspecified', evaluations })).not.toContain('Sex:')
    expect(chatMetrics({ ...base, evaluations })).not.toContain('Sex:')
  })

  it('lists the injuries marked on the body model, with or without readings', () => {
    const injuries = [
      { id: 'a', kind: 'scratch' as const, place: 'Shin (left)', point: [0, 0, 0] as [number, number, number], normal: [0, 0, 1] as [number, number, number], timestamp: NOW - 3 * HOUR },
      { id: 'b', kind: 'burn' as const, place: 'Palm (right)', point: [0, 0, 0] as [number, number, number], normal: [0, 0, 1] as [number, number, number], note: 'hot tray', timestamp: NOW - 50 * HOUR },
    ]
    const text = chatMetrics({ ...base, injuries, evaluations: evaluateLatest([], config) })
    expect(text).toContain('Skin injuries marked on the body model: scratch on shin (left) (3 h ago); burn on palm (right) (2 d ago; "hot tray")')
    expect(chatMetrics({ ...base, evaluations: evaluateLatest([], config) })).not.toContain('injuries')
  })

  it('says so when nothing is logged', () => {
    expect(chatMetrics({ ...base, evaluations: evaluateLatest([], config) })).toMatch(/No readings logged yet\.$/)
  })
})
