import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { generateDemoReadings } from '../data/demoReadings'
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
  // UI state (not persisted)
  selectedRegionId: string | null
  selectedIndicatorId: string

  /** Returns the new reading's id. */
  addReading: (r: Omit<Reading, 'id'>) => string
  removeReading: (id: string) => void
  /** Swap the whole log, e.g. to undo a delete, clear or demo load. */
  replaceReadings: (readings: Reading[]) => void
  loadDemoData: () => void
  clearReadings: () => void
  updateMission: (patch: Partial<Mission>) => void
  selectRegion: (id: string | null) => void
  selectIndicator: (id: string) => void
}

const DAY = 86_400_000

/** v1 stored the environment as a display label. */
const V1_ENVIRONMENTS: Record<string, string> = {
  'Space station': 'station',
  'Spacecraft (transit)': 'transit',
  'Lunar base': 'lunar',
  'Mars base': 'mars',
  Rover: 'rover',
}

export const useHealthStore = create<HealthState>()(
  persist(
    (set) => ({
      readings: [],
      mission: {
        crewName: 'Crew Member',
        environmentId: 'station',
        missionStart: Date.now() - 42 * DAY,
      },
      selectedRegionId: null,
      selectedIndicatorId: 'heartRate',

      addReading: (r) => {
        const id = crypto.randomUUID()
        set((s) => ({ readings: [...s.readings, { ...r, id }] }))
        return id
      },
      removeReading: (id) => set((s) => ({ readings: s.readings.filter((r) => r.id !== id) })),
      replaceReadings: (readings) => set({ readings }),
      loadDemoData: () => set({ readings: generateDemoReadings(Date.now()) }),
      clearReadings: () => set({ readings: [] }),
      updateMission: (patch) => set((s) => ({ mission: { ...s.mission, ...patch } })),
      selectRegion: (id) => set({ selectedRegionId: id }),
      selectIndicator: (id) => set({ selectedIndicatorId: id }),
    }),
    {
      name: 'astropulse:v1',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ readings: s.readings, mission: s.mission }),
      migrate: (persisted, version) => {
        const state = persisted as { mission?: Mission & { environment?: string } }
        if (version < 2 && state.mission) {
          const { environment, ...rest } = state.mission
          state.mission = { ...rest, environmentId: V1_ENVIRONMENTS[environment ?? ''] ?? 'station' }
        }
        return state as Partial<HealthState>
      },
    },
  ),
)
