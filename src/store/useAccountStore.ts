import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { newId } from '../lib/browser'
import { LEGACY_KEY, openProfile, profileKey, useHealthStore, type Mission } from './useHealthStore'

/** One astronaut on this device. Their readings live apart, under their own key. */
export interface Profile {
  id: string
  name: string
  /** A scrambled PIN, or null for no lock. It keeps crewmates out; it is not encryption. */
  pin: string | null
}

interface AccountState {
  profiles: Profile[]
  /** Who is signed in; null shows the sign-in screen. */
  activeId: string | null
  /** Make a profile and sign in to it. */
  create: (input: { name: string; pin: string | null; mission: Omit<Mission, 'crewName'> }) => void
  /** False when the PIN is wrong. */
  signIn: (id: string, pin?: string) => boolean
  signOut: () => void
  rename: (id: string, name: string) => void
  /** Delete a profile and its data. Returns a function that brings both back. */
  remove: (id: string) => () => void
}

/** A short, stable scramble (cyrb53) of the PIN, salted with the profile id. */
const scramble = (id: string, pin: string) => {
  let a = 0xdeadbeef
  let b = 0x41c6ce57
  for (const ch of `${id}:${pin}`) {
    const c = ch.charCodeAt(0)
    a = Math.imul(a ^ c, 2654435761)
    b = Math.imul(b ^ c, 1597334677)
  }
  a = Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909)
  b = Math.imul(b ^ (b >>> 16), 2246822507) ^ Math.imul(a ^ (a >>> 13), 3266489909)
  return (4294967296 * (2097151 & b) + (a >>> 0)).toString(36)
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set, get) => ({
      profiles: [],
      activeId: null,

      create: ({ name, pin, mission }) => {
        const id = newId()
        // What was logged before profiles existed belongs to the first astronaut.
        const legacy = get().profiles.length === 0 ? localStorage.getItem(LEGACY_KEY) : null
        if (legacy) {
          localStorage.setItem(profileKey(id), legacy)
          localStorage.removeItem(LEGACY_KEY)
        }
        set((s) => ({ profiles: [...s.profiles, { id, name, pin: pin ? scramble(id, pin) : null }], activeId: id }))
        openProfile(id)
        useHealthStore.getState().updateMission({ ...mission, crewName: name })
      },
      signIn: (id, pin) => {
        const profile = get().profiles.find((p) => p.id === id)
        if (!profile || (profile.pin && profile.pin !== scramble(id, pin ?? ''))) return false
        set({ activeId: id })
        openProfile(id)
        return true
      },
      signOut: () => {
        set({ activeId: null })
        openProfile(null)
      },
      rename: (id, name) => set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? { ...p, name } : p)) })),
      remove: (id) => {
        const before = get().profiles
        const data = localStorage.getItem(profileKey(id))
        if (get().activeId === id) get().signOut()
        localStorage.removeItem(profileKey(id))
        set((s) => ({ profiles: s.profiles.filter((p) => p.id !== id) }))
        return () => {
          if (data) localStorage.setItem(profileKey(id), data)
          set({ profiles: before })
        }
      },
    }),
    {
      name: 'astropulse:accounts',
      storage: createJSONStorage(() => localStorage),
      // A profile with a PIN is asked for it again whenever the app is reopened.
      partialize: (s) => ({
        profiles: s.profiles,
        activeId: s.profiles.find((p) => p.id === s.activeId)?.pin ? null : s.activeId,
      }),
    },
  ),
)
