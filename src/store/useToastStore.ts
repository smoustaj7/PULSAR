import { create } from 'zustand'

export interface Toast {
  id: number
  message: string
  /** Optional single action, e.g. Undo. */
  action?: { label: string; run: () => void }
}

interface ToastState {
  toast: Toast | null
  show: (t: Omit<Toast, 'id'>) => void
  dismiss: () => void
}

let nextId = 1

/** One toast at a time: a newer message replaces the current one. */
export const useToastStore = create<ToastState>()((set) => ({
  toast: null,
  show: (t) => set({ toast: { ...t, id: nextId++ } }),
  dismiss: () => set({ toast: null }),
}))
