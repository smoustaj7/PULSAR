import { describe, expect, it } from 'vitest'
import { requirementsById } from './lsah'
import { INFLIGHT_SCHEDULE, checksBetween, nextForEachCheck, nextOccurrence, occursOn } from './nasaSchedule'

const check = (id: string) => INFLIGHT_SCHEDULE.find((c) => c.requirementId === id)!
const idsOn = (day: number) => checksBetween(day, 0).map((i) => i.requirement.id)

describe('NASA in-flight schedule', () => {
  it('points every check at a known requirement', () => {
    for (const c of INFLIGHT_SCHEDULE) expect(requirementsById[c.requirementId]).toBeDefined()
  })

  it('holds private medical conferences daily for 5 days, then weekly', () => {
    const pmc = check('pmc')
    expect([1, 2, 3, 4, 5].every((d) => occursOn(pmc, d))).toBe(true)
    expect(occursOn(pmc, 6)).toBe(false)
    expect(occursOn(pmc, 7)).toBe(true)
    expect(occursOn(pmc, 14)).toBe(true)
    expect(occursOn(pmc, 15)).toBe(false)
  })

  it('stacks the flight day 14 fitness and health checks', () => {
    expect(idsOn(14)).toEqual(expect.arrayContaining(['pmc', 'ppc', 'calf', 'handgrip', 'cycle-test', 'health-status']))
    expect(idsOn(3)).toEqual(['pmc'])
  })

  it('finds the next occurrence of fixed and repeating checks', () => {
    expect(nextOccurrence(check('cycle-test'), 15)).toBe(75)
    expect(nextOccurrence(check('cycle-test'), 76)).toBeNull()
    expect(nextOccurrence(check('handgrip'), 15)).toBe(44)
    expect(nextOccurrence(check('noise'), 22)).toBe(90)
    expect(nextOccurrence(check('noise'), 91)).toBe(150)
  })

  it('lists each check once, soonest first', () => {
    const list = nextForEachCheck(20)
    expect(new Set(list.map((i) => i.requirement.id)).size).toBe(list.length)
    expect(list.map((i) => i.day)).toEqual([...list.map((i) => i.day)].sort((a, b) => a - b))
    expect(list[0].day).toBeGreaterThanOrEqual(20)
  })
})
