import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { demoCrewReadings, demoMissionStart, type DemoSex } from '../data/demoReadings'
import { newId } from '../lib/browser'
import type { Reading } from '../engine/types'
import type { InjuryKind } from '../lib/bodyPlace'

/** Sex, which changes how the body reacts to spaceflight; 'unspecified' when not given. */
export type Sex = 'female' | 'male' | 'unspecified'

/** A scratch, cut or the like, marked on the body model where it is. */
export interface Injury {
  id: string
  kind: InjuryKind
  /** Where it is, in plain words: "Shin (left)". */
  place: string
  /** The spot on the model's skin and the way the skin faces there (metres, the model's own space). */
  point: [number, number, number]
  normal: [number, number, number]
  note?: string
  /** Epoch ms it was marked. */
  timestamp: number
}

export interface Mission {
  crewName: string
  /** Id of an entry in thresholds.json `environments`. */
  environmentId: string
  /** Epoch ms of launch / mission day 1. */
  missionStart: number
  /** Missing on profiles made before the question was asked. */
  sex?: Sex
}

interface HealthState {
  watchConnected: boolean
  connectWatch: () => void
  readings: Reading[]
  mission: Mission
  /**
   * While demo readings are showing, the log they stand in for (empty if there was none);
   * null otherwise. Exiting the demo puts it back.
   */
  demoBackup: Reading[] | null
  /** While a demo is showing, the mission details it changed (sex, start, place), to put back. */
  demoMission: Pick<Mission, 'sex' | 'missionStart' | 'environmentId'> | null
  /** Whether this astronaut has finished or skipped the tour of the app. */
  tourSeen: boolean
  /** Injuries marked on the body model, oldest first. */
  injuries: Injury[]
  // UI state (not persisted)
  selectedRegionId: string | null
  selectedIndicatorId: string

  /** Returns the new reading's id. */
  addReading: (r: Omit<Reading, 'id'>) => string
  removeReading: (id: string) => void
  /** Swap the whole log, e.g. to undo a delete, clear or demo load. */
  replaceReadings: (readings: Reading[]) => void
  /**
   * Show a demo astronaut's readings in place of the log, keeping the log aside until
   * `exitDemo`. The mission takes on the demo's sex, start and place (a space station).
   */
  loadDemoData: (sex: DemoSex) => void
  /** Put back the log the demo readings stood in for. */
  exitDemo: () => void
  clearReadings: () => void
  updateMission: (patch: Partial<Mission>) => void
  setTourSeen: (seen: boolean) => void
  /** Returns the new injury's id. */
  addInjury: (injury: Omit<Injury, 'id' | 'timestamp'>) => string
  removeInjury: (id: string) => void
  /** Put back an injury just removed (the Undo of `removeInjury`), in its place by date. */
  restoreInjury: (injury: Injury) => void
  selectRegion: (id: string | null) => void
  selectIndicator: (id: string) => void
}


/** Demo readings carry ids starting `demo-` (see generateDemoReadings). */
export const isDemoLog = (readings: readonly Reading[]) =>
  readings.length > 0 && readings.every((r) => r.id.startsWith('demo-'))

/** v1 stored the environment as a display label. */
const V1_ENVIRONMENTS: Record<string, string> = {
  'Space station': 'station',
  'Spacecraft (transit)': 'transit',
  'Lunar base': 'lunar',
  'Mars base': 'mars',
  Rover: 'rover',
}

/** The single-user save from before profiles; the first profile created takes it over. */
export const LEGACY_KEY = 'pulsar:v1'
const ACCOUNTS_KEY = 'pulsar:accounts'
export const profileKey = (id: string) => `pulsar:profile:${id}`

/** The app was called AstroPulse until November 2026 and saved under these keys. */
const OLD_PREFIX = 'astropulse:'

/** Move saves made under the old name to the new keys. A save already under a new key wins. */
export function moveOldSaves() {
  try {
    const old = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).filter(
      (k): k is string => !!k?.startsWith(OLD_PREFIX),
    )
    for (const key of old) {
      const renamed = `pulsar:${key.slice(OLD_PREFIX.length)}`
      const value = localStorage.getItem(key)
      if (value !== null && localStorage.getItem(renamed) === null) localStorage.setItem(renamed, value)
      localStorage.removeItem(key)
    }
  } catch {
    // Storage can be blocked (private windows, site data turned off); there is nothing to move then.
  }
}
// Runs before either store reads its save; useAccountStore imports this module first.
moveOldSaves()

/** Each astronaut's data is saved under their own key; with nobody signed in, nothing is saved. */
let saveKey: string | null = (() => {
  try {
    const id = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? 'null')?.state?.activeId
    return typeof id === 'string' ? profileKey(id) : null
  } catch {
    return null
  }
})()
const profileStorage = {
  getItem: () => (saveKey ? localStorage.getItem(saveKey) : null),
  setItem: (_: string, value: string) => {
    if (saveKey) localStorage.setItem(saveKey, value)
  },
  removeItem: () => {
    if (saveKey) localStorage.removeItem(saveKey)
  },
}

const blank = () => ({
  watchConnected: false,
  readings: [] as Reading[],
  mission: { crewName: 'Crew Member', environmentId: 'station', missionStart: Date.now() } as Mission,
  demoBackup: null,
  demoMission: null,
  tourSeen: false,
  injuries: [] as Injury[],
  selectedRegionId: null,
  selectedIndicatorId: 'heartRate',
})

/**
 * Point the store at one astronaut's data, or at nobody's (`null`). The store is emptied
 * first, with saving paused, so one person's readings never land in another's save.
 */
export function openProfile(id: string | null) {
  saveKey = null
  useHealthStore.setState(blank())
  if (!id) return
  saveKey = profileKey(id)
  void useHealthStore.persist.rehydrate()
}

export const useHealthStore = create<HealthState>()(
  persist(
    (set) => ({
      ...blank(),
      addReading: (r) => {
        const id = newId()
        set((s) => ({ readings: [...s.readings, { ...r, id }] }))
        return id
      },
      removeReading: (id) => set((s) => ({ readings: s.readings.filter((r) => r.id !== id) })),
      replaceReadings: (readings) => set({ readings }),
      // Loading again while already in a demo (or switching to the other one) keeps the first
      // backups, not the demo itself.
      loadDemoData: (sex) =>
        set((s) => {
          const now = Date.now()
          const { sex: mySex, missionStart, environmentId } = s.mission
          return {
            readings: demoCrewReadings(now, sex),
            demoBackup: s.demoBackup ?? s.readings,
            demoMission: s.demoMission ?? { sex: mySex, missionStart, environmentId },
            mission: { ...s.mission, sex, missionStart: demoMissionStart(now, sex), environmentId: 'station' },
          }
        }),
      // Only what the demo changed goes back: a name edited during the demo stays.
      exitDemo: () =>
        set((s) =>
          s.demoBackup
            ? {
                readings: s.demoBackup,
                demoBackup: null,
                demoMission: null,
                // Sex is set even when the backup has none, so a profile that never said goes back to not saying.
                ...(s.demoMission && { mission: { ...s.mission, ...s.demoMission, sex: s.demoMission.sex } }),
              }
            : {},
        ),
      connectWatch: () =>
        set((s) => ({
          watchConnected: true,
          readings: [
              ...s.readings,
              ...Object.entries({
                heartRate: 68,
                systolic: 118,
                diastolic: 76,
                spo2: 98,
                temperature: 36.7,
                cabinCO2: 1.5,
                sleep: 8,
              }).map(([indicatorId, value]) => ({
                id: newId(),
                indicatorId,
                value,
                timestamp: Date.now(),
                source: 'simulation' as const,
                note: 'Simulated device reading — not a real measurement',
              })),
          ],
        })),
      clearReadings: () => set({ readings: [] }),
      updateMission: (patch) => set((s) => ({ mission: { ...s.mission, ...patch } })),
      setTourSeen: (tourSeen) => set({ tourSeen }),
      addInjury: (injury) => {
        const id = newId()
        set((s) => ({ injuries: [...s.injuries, { ...injury, id, timestamp: Date.now() }] }))
        return id
      },
      removeInjury: (id) => set((s) => ({ injuries: s.injuries.filter((i) => i.id !== id) })),
      restoreInjury: (injury) =>
        set((s) => ({ injuries: [...s.injuries.filter((i) => i.id !== injury.id), injury].sort((a, b) => a.timestamp - b.timestamp) })),
      selectRegion: (id) => set({ selectedRegionId: id }),
      selectIndicator: (id) => set({ selectedIndicatorId: id }),
    }),
    {
      name: LEGACY_KEY,
      version: 3,
      storage: createJSONStorage(() => profileStorage),
      partialize: (s) => ({
        watchConnected: s.watchConnected,
        readings: s.readings,
        mission: s.mission,
        demoBackup: s.demoBackup,
        demoMission: s.demoMission,
        tourSeen: s.tourSeen,
        injuries: s.injuries,
      }),
      migrate: (persisted, version) => {
        const state = persisted as {
          mission?: Mission & { environment?: string }
          readings?: Reading[]
          demoBackup?: Reading[] | null
        }
        if (version < 2 && state.mission) {
          const { environment, ...rest } = state.mission
          state.mission = { ...rest, environmentId: V1_ENVIRONMENTS[environment ?? ''] ?? 'station' }
        }
        // Before v3 nothing recorded that demo data was showing, so there was no way back.
        // A log made only of demo readings stood in for an empty one.
        if (version < 3) state.demoBackup = isDemoLog(state.readings ?? []) ? [] : null
        return state as Partial<HealthState>
      },
    },
  ),
)
