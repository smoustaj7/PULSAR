import { motion } from 'framer-motion'
import type { RegionAssessment } from '../engine/types'
import { STATUS_META } from '../lib/status'
import { Icon, type IconName } from './Icon'

const REGION_ICON: Record<string, IconName> = {
  brain: 'brain',
  immune: 'shield',
  respiratory: 'wind',
  cardiovascular: 'heart',
  metabolic: 'flame',
  musculoskeletal: 'bone',
}

/**
 * The quick way in: every body system as one row. Picking a row selects that system
 * everywhere, so the model turns to it and its readings open. Only systems that need a look
 * carry a status dot, so the list stays quiet when all is well.
 */
export function SystemsNav({
  regions,
  selectedId,
  onSelect,
  pillId,
  className = '',
}: {
  regions: RegionAssessment[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  /** Names the sliding highlight, so two lists on screen do not share one. */
  pillId: string
  className?: string
}) {
  return (
    <nav aria-label="Body systems" className={className}>
      <ul className="grid gap-x-2 gap-y-1 sm:grid-cols-2 lg:grid-cols-1">
        {regions.map((r) => {
          const active = r.region.id === selectedId
          const flagged = r.status === 'critical' || r.status === 'caution'
          return (
            <li key={r.region.id}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(active ? null : r.region.id)}
                className={`group relative flex min-h-13 w-full items-center gap-3.5 rounded-lg px-3 text-left transition-colors duration-150 ${
                  active ? 'text-fg' : 'text-fg-muted hover:text-fg'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId={pillId}
                    className="absolute inset-0 rounded-lg bg-mist/10"
                    transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                  />
                )}
                <Icon
                  name={REGION_ICON[r.region.id] ?? 'user'}
                  strokeWidth={1.6}
                  className={`relative size-6 shrink-0 transition-colors duration-150 ${
                    active ? 'text-accent' : 'text-fg-subtle group-hover:text-accent'
                  }`}
                />
                <span className={`relative min-w-0 flex-1 truncate text-[15px] ${active ? 'font-medium' : ''}`}>{r.region.label}</span>
                {flagged && (
                  <span className={`relative size-2 shrink-0 rounded-full ${STATUS_META[r.status].dot}`}>
                    <span className="sr-only">{STATUS_META[r.status].label}</span>
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
