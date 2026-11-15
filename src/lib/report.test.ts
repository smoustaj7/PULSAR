import { describe, expect, it } from 'vitest'
import { config } from '../config'
import type { Reading } from '../engine/types'
import type { Injury } from '../store/useHealthStore'
import { buildReport, missionDay, reportToMarkdown } from './report'

const DAY = 86_400_000
const NOW = Date.UTC(2026, 10, 6, 12)
const mission = { crewName: 'Test Crew', environmentId: 'mars', missionStart: NOW - 9.5 * DAY }
const r = (indicatorId: string, value: number, daysAgo: number, note?: string): Reading => ({
  id: `${indicatorId}-${daysAgo}`,
  indicatorId,
  value,
  timestamp: NOW - daysAgo * DAY,
  note,
})

describe('report', () => {
  const readings = [
    r('heartRate', 60, 10), // outside the 7-day window
    r('heartRate', 64, 3),
    r('heartRate', 70, 1),
    r('sleep', 4.5, 0, 'noisy fan'),
  ]
  const report = buildReport({ readings, config, environment: config.environments[3], mission, now: NOW })

  it('summarizes the window and latest status', () => {
    const hr = report.indicators.find((i) => i.id === 'heartRate')!
    expect(hr.latest).toBe(70)
    expect(hr.window).toEqual({ count: 2, min: 64, mean: 67, max: 70 })
    expect(report.indicators.find((i) => i.id === 'sleep')!.status).toBe('critical')
    expect(report.overallStatus).toBe('critical')
    expect(report.missionDay).toBe(10)
  })

  it('lists overdue measurements and crew notes', () => {
    expect(report.overdue).toContain('Mood self-rating')
    expect(report.notes).toEqual([expect.objectContaining({ indicator: 'Sleep duration', note: 'noisy fan' })])
  })

  it('renders markdown with flagged items first', () => {
    const md = reportToMarkdown(report)
    expect(md).toContain('**Environment:** Mars base')
    expect(md).toMatch(/## Needs attention\n- \*\*Sleep duration\*\*: 4.5 h \(CRITICAL, low\)/)
    expect(md).toContain('| Resting heart rate | 70 bpm | NOMINAL | 64 / 67 / 70 |')
  })

  it('computes mission day from launch', () => {
    expect(missionDay(NOW, NOW)).toBe(1)
    expect(missionDay(NOW - 1.5 * DAY, NOW)).toBe(2)
  })

  describe('injuries', () => {
    const injury = (id: string, kind: Injury['kind'], place: string, daysAgo: number, note?: string): Injury => ({
      id,
      kind,
      place,
      point: [0, 0, 0],
      normal: [0, 0, 1],
      note,
      timestamp: NOW - daysAgo * DAY,
    })
    const open = [injury('b', 'cut', 'Shin (left)', 3, 'caught on a panel'), injury('a', 'scratch', 'Forearm (right)', 0)]
    const base = { readings, config, environment: config.environments[3], mission, now: NOW }

    it('lists open injuries, oldest first, in the report and its markdown', () => {
      const withInjuries = buildReport({ ...base, injuries: open })
      expect(withInjuries.injuries.map((i) => i.place)).toEqual(['Shin (left)', 'Forearm (right)'])
      expect(withInjuries.injuries[0]).toMatchObject({ daysOpen: 3, note: 'caught on a panel' })
      const md = reportToMarkdown(withInjuries)
      expect(md).toContain('## Injuries\n- Cut, Shin (left): marked 3 days ago; caught on a panel\n- Scratch, Forearm (right): marked today')
    })

    it('drops an injury from the report once it has healed (been removed)', () => {
      const healed = buildReport({ ...base, injuries: open.filter((i) => i.id !== 'b') })
      expect(healed.injuries.map((i) => i.place)).toEqual(['Forearm (right)'])
      const none = buildReport({ ...base, injuries: [] })
      expect(none.injuries).toEqual([])
      expect(reportToMarkdown(none)).toContain('## Injuries\n- None.')
    })
  })
})
