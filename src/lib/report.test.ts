import { describe, expect, it } from 'vitest'
import { config } from '../config'
import type { Reading } from '../engine/types'
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
})
