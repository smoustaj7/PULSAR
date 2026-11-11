import { useHealthStore } from '../store/useHealthStore'
import { useToastStore } from '../store/useToastStore'

/**
 * Demo data as a mode you can always leave: entering keeps your own log aside, exiting puts it
 * back. Each step offers an Undo, so neither is a trap.
 */
export function useDemoMode() {
  const active = useHealthStore((s) => s.demoBackup !== null)
  const load = useHealthStore((s) => s.loadDemoData)
  const restore = useHealthStore((s) => s.exitDemo)
  const show = useToastStore((s) => s.show)

  return {
    active,
    enter: () => {
      load()
      show({ message: 'Showing 14 days of demo readings', action: { label: 'Undo', run: restore } })
    },
    exit: () => {
      restore()
      show({ message: 'Demo data removed', action: { label: 'Undo', run: load } })
    },
  }
}
