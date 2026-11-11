import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { generateDemoReadings } from '../data/demoReadings'
import { newId } from '../lib/browser'
import type { Reading } from '../engine/types'

export interface Mission {
  crewName: string
  /** Id of an entry in thresholds.json `environments`. */
  environmentId: string
  /** Epoch ms of launch / mission day 1. */
  missionStart: number
}

interface HealthState {
  readings: Reading[]
  mission: Mission
  /**
   * While demo readings are showing, the log they stand in for (empty if there was none);
   * null otherwise. Exiting the demo puts it back.
   */
  demoBackup: Reading[] | null
  // UI state (not persisted)
  selectedRegionId: string | null
  selectedIndicatorId: string

  /** Returns the new reading's id. */
  addReading: (r: Omit<Reading, 'id'>) => string
  removeReading: (id: string) => void
  /** Swap the whole log, e.g. to undo a delete, clear or demo load. */
  replaceReadings: (readings: Reading[]) => void
  /** Show demo readings in place of the log, keeping the log aside until `exitDemo`. */
  loadDemoData: () => void
  /** Put back the log the demo readings stood in for. */
  exitDemo: () => void
  clearReadings: () => void
  updateMission: (patch: Partial<Mission>) => void
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
export const LEGACY_KEY = 'astropulse:v1'
const ACCOUNTS_KEY = 'astropulse:accounts'
export const profileKey = (id: string) => `astropulse:profile:${id}`

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
  readings: [] as Reading[],
  mission: { crewName: 'Crew Member', environmentId: 'station', missionStart: Date.now() } as Mission,
  demoBackup: null,
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
      // Loading again while already in the demo keeps the first backup, not the demo itself.
      loadDemoData: () => set((s) => ({ readings: generateDemoReadings(Date.now()), demoBackup: s.demoBackup ?? s.readings })),
      exitDemo: () => set((s) => (s.demoBackup ? { readings: s.demoBackup, demoBackup: null } : {})),
      clearReadings: () => set({ readings: [] }),
      updateMission: (patch) => set((s) => ({ mission: { ...s.mission, ...patch } })),
      selectRegion: (id) => set({ selectedRegionId: id }),
      selectIndicator: (id) => set({ selectedIndicatorId: id }),
    }),
    {
      name: LEGACY_KEY,
      version: 3,
      storage: createJSONStorage(() => profileStorage),
      partialize: (s) => ({ readings: s.readings, mission: s.mission, demoBackup: s.demoBackup }),
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
