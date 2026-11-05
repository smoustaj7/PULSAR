import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { generateDemoReadings } from '../data/demoReadings'
import type { Reading } from '../engine/types'

export type Environment = 'Space station' | 'Spacecraft (transit)' | 'Lunar base' | 'Mars base' | 'Rover'

export const ENVIRONMENTS: Environment[] = [
  'Space station',
  'Spacecraft (transit)',
  'Lunar base',
  'Mars base',
  'Rover',
]

export interface Mission {
  crewName: string
  environment: Environment
  /** Epoch ms of launch / mission day 1. */
  missionStart: number
}

interface HealthState {
  readings: Reading[]
  mission: Mission
  // UI state (not persisted)
  selectedRegionId: string | null
  selectedIndicatorId: string

  addReading: (r: Omit<Reading, 'id'>) => void
  removeReading: (id: string) => void
  loadDemoData: () => void
  clearReadings: () => void
  updateMission: (patch: Partial<Mission>) => void
  selectRegion: (id: string | null) => void
  selectIndicator: (id: string) => void
}

const DAY = 86_400_000

export const useHealthStore = create<HealthState>()(
  persist(
    (set) => ({
      readings: [],
      mission: {
        crewName: 'Crew Member',
        environment: 'Space station',
        missionStart: Date.now() - 42 * DAY,
      },
      selectedRegionId: null,
      selectedIndicatorId: 'heartRate',

      addReading: (r) => set((s) => ({ readings: [...s.readings, { ...r, id: crypto.randomUUID() }] })),
      removeReading: (id) => set((s) => ({ readings: s.readings.filter((r) => r.id !== id) })),
      loadDemoData: () => set({ readings: generateDemoReadings(Date.now()) }),
      clearReadings: () => set({ readings: [] }),
      updateMission: (patch) => set((s) => ({ mission: { ...s.mission, ...patch } })),
      selectRegion: (id) => set({ selectedRegionId: id }),
      selectIndicator: (id) => set({ selectedIndicatorId: id }),
    }),
    {
      name: 'astropulse:v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ readings: s.readings, mission: s.mission }),
    },
  ),
)
