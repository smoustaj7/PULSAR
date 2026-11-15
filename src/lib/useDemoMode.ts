import type { DemoSex } from '../data/demoReadings'
import { useHealthStore } from '../store/useHealthStore'
import { useToastStore } from '../store/useToastStore'

const WHO: Record<DemoSex, string> = { female: 'a female', male: 'a male' }

/**
 * Demo data as a mode you can always leave: entering keeps your own log aside, exiting puts it
 * back. Each step offers an Undo, so neither is a trap. There are two demo astronauts, a woman
 * and a man on the same station mission, to compare how each body reads.
 */
export function useDemoMode() {
  const active = useHealthStore((s) => s.demoBackup !== null)
  const sex = useHealthStore((s) => s.mission.sex)
  const load = useHealthStore((s) => s.loadDemoData)
  const restore = useHealthStore((s) => s.exitDemo)
  const show = useToastStore((s) => s.show)
  /** Which demo astronaut is showing, if any. */
  const showing: DemoSex | null = active && (sex === 'female' || sex === 'male') ? sex : null

  return {
    active,
    showing,
    enter: (who: DemoSex) => {
      const undo = showing ? () => load(showing) : restore
      load(who)
      show({ message: `Showing 180 days of readings for ${WHO[who]} astronaut`, action: { label: 'Undo', run: undo } })
    },
    exit: () => {
      const was = showing
      restore()
      show({ message: 'Demo data removed', action: { label: 'Undo', run: () => was && load(was) } })
    },
  }
}
