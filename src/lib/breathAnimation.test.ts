import { describe, expect, it } from 'vitest'
import { lungEffortAt, lungScaleAt } from './breathAnimation'

describe('lung animation timing', () => {
  it('keeps a steady breathing cadence and modulates expansion with signal effort', () => {
    const peak = 60 / 16 / 4
    expect(lungScaleAt(16, 0, 0)).toBeCloseTo(1)
    expect(lungScaleAt(16, peak, 0)).toBeCloseTo(1.035)
    expect(lungScaleAt(16, peak, 0.5)).toBeCloseTo(1.0525)
    expect(lungScaleAt(16, peak, 1)).toBeCloseTo(1.07)
  })

  it('maps lower SpO₂ and higher CO₂ to stronger illustrative expansion', () => {
    expect(lungEffortAt(96, 95, 90, 'low')).toBe(0)
    expect(lungEffortAt(94, 95, 90, 'low')).toBeCloseTo(0.2)
    expect(lungEffortAt(89, 95, 90, 'low')).toBe(1)
    expect(lungEffortAt(4.5, 3, 6, 'high')).toBeCloseTo(0.5)
    expect(lungEffortAt(7, 3, 6, 'high')).toBe(1)
    expect(lungEffortAt(undefined, 95, 90, 'low')).toBe(0)
  })
})

// for my teamates 
//The lungs now keep a steady 16 breaths/min rhythm and use the latest existing SpO₂ and cabin CO₂ readings to modulate expansion: lower oxygen or higher CO₂ increases the motion.