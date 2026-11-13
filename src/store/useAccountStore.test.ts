import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAccountStore } from './useAccountStore'
import { LEGACY_KEY, moveOldSaves, profileKey, useHealthStore } from './useHealthStore'

// Both stores save to localStorage, which tests run without; an in-memory one stands in.
const disk = vi.hoisted(() => {
  const data = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
      key: (i: number) => [...data.keys()][i] ?? null,
      get length() {
        return data.size
      },
    },
  })
  return data
})

const accounts = () => useAccountStore.getState()
const health = () => useHealthStore.getState()
const mission = { environmentId: 'lunar', missionStart: 1000 }
const saved = (id: string) => JSON.parse(disk.get(profileKey(id))!).state

describe('profiles', () => {
  beforeEach(() => {
    accounts().signOut()
    disk.clear()
    useAccountStore.setState({ profiles: [], activeId: null })
  })

  it('keep each astronaut’s readings apart', () => {
    accounts().create({ name: 'Sam', pin: null, mission })
    const sam = accounts().activeId!
    health().addReading({ indicatorId: 'heartRate', value: 70, timestamp: 1 })

    accounts().signOut()
    expect(health().readings).toEqual([])

    accounts().create({ name: 'Lee', pin: null, mission })
    expect(health().readings).toEqual([])
    expect(health().mission.crewName).toBe('Lee')
    expect(saved(sam).readings).toHaveLength(1)

    expect(accounts().signIn(sam)).toBe(true)
    expect(health().readings).toHaveLength(1)
    expect(health().mission).toMatchObject({ crewName: 'Sam', environmentId: 'lunar' })
  })

  it('open a locked profile only with its PIN, and never store the PIN itself', () => {
    accounts().create({ name: 'Sam', pin: '1234', mission })
    const sam = accounts().activeId!
    accounts().signOut()
    expect(accounts().signIn(sam, '0000')).toBe(false)
    expect(accounts().signIn(sam)).toBe(false)
    expect(accounts().activeId).toBeNull()
    expect(accounts().signIn(sam, '1234')).toBe(true)
    expect(JSON.stringify(accounts().profiles)).not.toContain('1234')
  })

  it('give what was logged before profiles to the first astronaut only', () => {
    const old = { state: { readings: [{ id: 'r1', indicatorId: 'sleep', value: 7, timestamp: 1 }] }, version: 3 }
    disk.set(LEGACY_KEY, JSON.stringify(old))
    accounts().create({ name: 'Sam', pin: null, mission })
    expect(health().readings).toHaveLength(1)
    expect(disk.has(LEGACY_KEY)).toBe(false)
    accounts().create({ name: 'Lee', pin: null, mission })
    expect(health().readings).toEqual([])
  })

  it('delete a profile with its data, and bring both back on undo', () => {
    accounts().create({ name: 'Sam', pin: null, mission })
    const sam = accounts().activeId!
    const undo = accounts().remove(sam)
    expect(accounts().profiles).toEqual([])
    expect(accounts().activeId).toBeNull()
    expect(disk.has(profileKey(sam))).toBe(false)
    undo()
    expect(accounts().profiles).toHaveLength(1)
    expect(disk.has(profileKey(sam))).toBe(true)
  })

  it('keep saves made before the app was renamed from AstroPulse to PULSAR', () => {
    disk.clear() // beforeEach saved a fresh pulsar:accounts, which would win over the old one
    disk.set('astropulse:accounts', 'accounts')
    disk.set('astropulse:profile:sam', 'sam’s readings')
    disk.set('astropulse:v1', 'old single-user save')
    disk.set(LEGACY_KEY, 'newer save')
    disk.set('other-site:key', 'untouched')
    moveOldSaves()
    expect(Object.fromEntries(disk)).toEqual({
      'pulsar:accounts': 'accounts',
      [profileKey('sam')]: 'sam’s readings',
      [LEGACY_KEY]: 'newer save',
      'other-site:key': 'untouched',
    })
  })
})
