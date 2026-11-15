import { describe, expect, it } from 'vitest'
import { heartScaleAt } from './heartAnimation'

describe('heart animation timing', () => {
  it('uses the logged BPM to calculate a repeatable pulse phase', () => {
    expect(heartScaleAt(60, 0)).toBeCloseTo(1)
    expect(heartScaleAt(60, 0.25)).toBeCloseTo(1.07)
    expect(heartScaleAt(60, 1)).toBeCloseTo(1)
  })

  it('beats faster at a higher recorded heart rate', () => {
    expect(heartScaleAt(120, 0.125)).toBeCloseTo(1.07)
    expect(heartScaleAt(60, 0.125)).toBeCloseTo(1 + 0.07 * Math.SQRT1_2)
  })
})
