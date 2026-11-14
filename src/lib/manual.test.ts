import { describe, expect, it } from 'vitest'
import { config } from '../config'
import { cadence, steps } from './manual'

describe('steps', () => {
  it('splits sentences and "…, then …" into separate steps', () => {
    expect(steps('Right after waking, sit still for 5 minutes, then count your pulse for 60 seconds. Log it.')).toEqual([
      'Right after waking, sit still for 5 minutes',
      'Count your pulse for 60 seconds',
      'Log it',
    ])
  })

  it('keeps decimals and abbreviations inside a step', () => {
    expect(steps('Aim for 7.5 h of sleep.')).toEqual(['Aim for 7.5 h of sleep'])
  })

  it('gives every indicator at least one step', () => {
    for (const i of config.indicators) expect(steps(i.howToMeasure).length).toBeGreaterThan(0)
  })
})

describe('cadence', () => {
  it('reads like a schedule', () => {
    expect(cadence(24)).toBe('Daily')
    expect(cadence(72)).toBe('Every 3 days')
    expect(cadence(168)).toBe('Weekly')
    expect(cadence(6)).toBe('Every 6 h')
  })
})
