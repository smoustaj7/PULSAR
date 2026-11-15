import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Reading } from '../engine/types'
import { isDemoLog, useHealthStore } from './useHealthStore'

// The store saves to localStorage, which tests run without; an in-memory one stands in.
vi.hoisted(() => {
  const data = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    },
  })
})

const mine: Reading = { id: 'r1', indicatorId: 'heartRate', value: 70, timestamp: 1 }
const state = () => useHealthStore.getState()

describe('demo mode', () => {
  const myMission = { crewName: 'Sam', environmentId: 'mars', missionStart: 5, sex: 'unspecified' as const }
  beforeEach(() => useHealthStore.setState({ readings: [], demoBackup: null, demoMission: null, mission: myMission }))

  it('puts back an empty log on exit', () => {
    state().loadDemoData('female')
    expect(isDemoLog(state().readings)).toBe(true)
    expect(state().demoBackup).toEqual([])
    state().exitDemo()
    expect(state().readings).toEqual([])
    expect(state().demoBackup).toBeNull()
  })

  it('puts back your own readings, even after loading the demo twice', () => {
    useHealthStore.setState({ readings: [mine] })
    state().loadDemoData('female')
    state().loadDemoData('male')
    state().exitDemo()
    expect(state().readings).toEqual([mine])
  })

  it('takes on the demo astronaut’s sex and station mission, and gives yours back', () => {
    state().loadDemoData('male')
    expect(state().mission).toMatchObject({ crewName: 'Sam', sex: 'male', environmentId: 'station' })
    expect(state().mission.missionStart).toBeLessThan(Date.now() - 178 * 86_400_000)
    state().loadDemoData('female')
    expect(state().mission.sex).toBe('female')
    state().updateMission({ crewName: 'Sam R' })
    state().exitDemo()
    expect(state().mission).toEqual({ ...myMission, crewName: 'Sam R' })
  })

  it('leaves a profile that never gave its sex without one after the demo', () => {
    useHealthStore.setState({ mission: { crewName: 'Sam', environmentId: 'mars', missionStart: 5 } })
    state().loadDemoData('female')
    state().exitDemo()
    expect(state().mission.sex).toBeUndefined()
  })

  it('gives each demo astronaut 180 days of station vitals, which differ by sex', () => {
    const mean = (sex: 'female' | 'male', id: string) => {
      state().loadDemoData(sex)
      const v = state().readings.filter((r) => r.indicatorId === id).map((r) => r.value)
      return { n: v.length, avg: v.reduce((a, b) => a + b, 0) / v.length }
    }
    const [f, m] = [mean('female', 'heartRate'), mean('male', 'heartRate')]
    expect(f.n).toBe(180)
    expect(f.avg).toBeGreaterThan(m.avg)
    expect(mean('female', 'systolic').avg).toBeLessThan(mean('male', 'systolic').avg)
  })

  it('changes nothing when the demo is not showing', () => {
    useHealthStore.setState({ readings: [mine] })
    state().exitDemo()
    expect(state().readings).toEqual([mine])
  })
})

describe('injuries', () => {
  beforeEach(() => useHealthStore.setState({ injuries: [] }))
  const scratch = { kind: 'scratch' as const, place: 'Shin (left)', point: [0.1, 0.3, 0] as [number, number, number], normal: [0, 0, 1] as [number, number, number] }

  it('keeps an injury until it has healed, and puts one back in date order on undo', () => {
    const first = state().addInjury(scratch)
    const second = state().addInjury({ ...scratch, kind: 'burn', place: 'Palm (right)' })
    expect(state().injuries.map((i) => i.kind)).toEqual(['scratch', 'burn'])
    const healed = state().injuries.find((i) => i.id === first)!
    state().removeInjury(first)
    expect(state().injuries.map((i) => i.id)).toEqual([second])
    state().restoreInjury({ ...healed, timestamp: healed.timestamp - 1 })
    expect(state().injuries.map((i) => i.id)).toEqual([first, second])
  })
})

describe('saved logs from before demo mode was recorded', () => {
  const migrate = useHealthStore.persist.getOptions().migrate!
  const demo = (): Reading[] => [{ id: 'demo-heartRate-0', indicatorId: 'heartRate', value: 68, timestamp: 1 }]

  it('treat a demo-only log as the demo, standing in for an empty one', () => {
    expect((migrate({ readings: demo() }, 2) as { demoBackup: unknown }).demoBackup).toEqual([])
  })

  it('leave a log with your own readings alone', () => {
    expect((migrate({ readings: [mine, ...demo()] }, 2) as { demoBackup: unknown }).demoBackup).toBeNull()
  })
})
