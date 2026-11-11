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
  beforeEach(() => useHealthStore.setState({ readings: [], demoBackup: null }))

  it('puts back an empty log on exit', () => {
    state().loadDemoData()
    expect(isDemoLog(state().readings)).toBe(true)
    expect(state().demoBackup).toEqual([])
    state().exitDemo()
    expect(state().readings).toEqual([])
    expect(state().demoBackup).toBeNull()
  })

  it('puts back your own readings, even after loading the demo twice', () => {
    useHealthStore.setState({ readings: [mine] })
    state().loadDemoData()
    state().loadDemoData()
    state().exitDemo()
    expect(state().readings).toEqual([mine])
  })

  it('changes nothing when the demo is not showing', () => {
    useHealthStore.setState({ readings: [mine] })
    state().exitDemo()
    expect(state().readings).toEqual([mine])
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
