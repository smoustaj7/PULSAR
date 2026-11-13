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

export interface OrganInfo {
  id: string
  label: string
  /** The body system this organ belongs to. */
  regionId: string
  icon: IconName
  /** The organ's colour in the 3D model, used for the swatch in the list. */
  swatch: string
}

/**
 * The single source of truth for the organs. The ids match the rules in BodyModel3D
 * (the organs of astronautmodel2), and BodyModel3D reads ORGAN_REGION from here.
 */
export const ORGANS: OrganInfo[] = [
  { id: 'heart', label: 'Heart', regionId: 'cardiovascular', icon: 'heart', swatch: '#ff3b4e' },
  { id: 'neckveins', label: 'Neck veins', regionId: 'cardiovascular', icon: 'heart', swatch: '#5a74b8' },
  { id: 'lungs', label: 'Lungs', regionId: 'respiratory', icon: 'wind', swatch: '#ff8fa3' },
  { id: 'brain', label: 'Brain', regionId: 'brain', icon: 'brain', swatch: '#ff7ac8' },
  { id: 'eyes', label: 'Eyes', regionId: 'brain', icon: 'user', swatch: '#9db4c8' },
  { id: 'ears', label: 'Inner ears', regionId: 'brain', icon: 'user', swatch: '#c8a89a' },
  { id: 'stomach', label: 'Stomach', regionId: 'metabolic', icon: 'flame', swatch: '#ffa24a' },
  { id: 'liver', label: 'Liver & pancreas', regionId: 'metabolic', icon: 'flame', swatch: '#9c5a3f' },
  { id: 'kidneys', label: 'Kidneys', regionId: 'metabolic', icon: 'flame', swatch: '#b85a4c' },
  { id: 'immune', label: 'Immune organs', regionId: 'immune', icon: 'shield', swatch: '#6fae92' },
  { id: 'skull', label: 'Skull', regionId: 'musculoskeletal', icon: 'bone', swatch: '#e3d9c4' },
  { id: 'skeleton', label: 'Skeleton', regionId: 'musculoskeletal', icon: 'bone', swatch: '#efe9df' },
]

export const ORGAN_REGION: Record<string, string> = Object.fromEntries(ORGANS.map((o) => [o.id, o.regionId]))

/**
 * The quick way in: every body system as one row, then every organ as one row in the same
 * format. Picking a system selects it everywhere, so the model turns to it and its readings
 * open; picking an organ focuses that organ alone. Only items that need a look carry a
 * status dot, so the list stays quiet when all is well.
 */
export function SystemsNav({
  regions,
  selectedId,
  onSelect,
  organId = null,
  onSelectOrgan,
  pillId,
  toggle = true,
  className = '',
}: {
  regions: RegionAssessment[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  /** The organ in focus, if any. */
  organId?: string | null
  /** When given, the organs are listed after the systems and this is called when one is picked. */
  onSelectOrgan?: (organ: OrganInfo) => void
  /** Names the sliding highlight, so two lists on screen do not share one. */
  pillId: string
  /** Whether pressing the chosen system again clears the choice. */
  toggle?: boolean
  className?: string
}) {
  const row = (active: boolean) =>
    `group relative flex min-h-13 w-full items-center gap-3.5 rounded-lg px-3 text-left transition-colors duration-150 ${
      active ? 'text-fg' : 'text-fg-muted hover:text-fg'
    }`
  const pill = (id: string) => (
    <motion.span
      layoutId={id}
      className="absolute inset-0 rounded-lg bg-mist/10"
      transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
    />
  )
  const iconClass = (active: boolean) =>
    `relative size-6 shrink-0 transition-colors duration-150 ${active ? 'text-accent' : 'text-fg-subtle group-hover:text-accent'}`
  const heading = 'px-3 pb-1 text-xs font-medium tracking-wider text-fg-subtle uppercase'
  const list = 'grid gap-x-2 gap-y-1 sm:grid-cols-2 lg:grid-cols-1'

  return (
    <nav aria-label="Body systems" className={`grid gap-4 ${className}`}>
      <section>
        <h4 className={heading}>Systems</h4>
        <ul className={list}>
          {regions.map((r) => {
            const active = r.region.id === selectedId && !organId
            const flagged = r.status === 'critical' || r.status === 'caution'
            return (
              <li key={r.region.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelect(r.region.id === selectedId && toggle ? null : r.region.id)}
                  className={row(active)}
                >
                  {active && pill(pillId)}
                  <Icon name={REGION_ICON[r.region.id] ?? 'user'} strokeWidth={1.6} className={iconClass(active)} />
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
      </section>

      {onSelectOrgan && (
        <section>
          <h4 className={heading}>Organs</h4>
          <ul className={list}>
            {ORGANS.map((o) => {
              const on = organId === o.id
              const status = regions.find((r) => r.region.id === o.regionId)?.status ?? 'unknown'
              const flagged = status === 'critical' || status === 'caution'
              return (
                <li key={o.id}>
                  <button type="button" aria-pressed={on} onClick={() => onSelectOrgan(o)} className={row(on)}>
                    {on && pill(`${pillId}-organ`)}
                    <Icon name={o.icon} strokeWidth={1.6} className={iconClass(on)} />
                    <span className={`relative min-w-0 flex-1 truncate text-[15px] ${on ? 'font-medium' : ''}`}>{o.label}</span>
                    <span
                      aria-hidden
                      className="relative size-2.5 shrink-0 rounded-full opacity-80"
                      style={{ backgroundColor: o.swatch }}
                    />
                    {flagged && (
                      <span className={`relative size-2 shrink-0 rounded-full ${STATUS_META[status].dot}`}>
                        <span className="sr-only">{STATUS_META[status].label}</span>
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </nav>
  )
}