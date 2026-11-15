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

export type Sex = 'female' | 'male'

export interface OrganInfo {
  id: string
  label: string
  /** The body system this organ belongs to. */
  regionId: string
  /** The organ's colour in the 3D model, used for the swatch on its chip. */
  swatch: string
  /** Shown only for this sex; omitted means every crew member. */
  sex?: Sex
}

/**
 * The single source of truth for the organs. The ids match the rules in BodyModel3D, and
 * BodyModel3D reads ORGAN_REGION from here.
 */
export const ORGANS: OrganInfo[] = [
  { id: 'heart', label: 'Heart', regionId: 'cardiovascular', swatch: '#ff5a3c' },
  { id: 'vessels', label: 'Blood vessels', regionId: 'cardiovascular', swatch: '#38b6ff' },
  { id: 'neckveins', label: 'Neck veins', regionId: 'cardiovascular', swatch: '#38b6ff' },
  { id: 'lungs', label: 'Lungs', regionId: 'respiratory', swatch: '#ff8fa3' },
  { id: 'brain', label: 'Brain', regionId: 'brain', swatch: '#ff7ac8' },
  { id: 'eyes', label: 'Eyes', regionId: 'brain', swatch: '#9db4c8' },
  { id: 'ears', label: 'Inner ears', regionId: 'brain', swatch: '#c8a89a' },
  { id: 'stomach', label: 'Stomach', regionId: 'metabolic', swatch: '#ffa24a' },
  { id: 'liver', label: 'Liver & pancreas', regionId: 'metabolic', swatch: '#9c5a3f' },
  { id: 'kidneys', label: 'Kidneys', regionId: 'metabolic', swatch: '#b85a4c' },
  { id: 'femaleOrgans', label: 'Female organs', regionId: 'metabolic', swatch: '#e07a93', sex: 'female' },
  { id: 'immune', label: 'Immune organs', regionId: 'immune', swatch: '#6fae92' },
  { id: 'skeleton', label: 'Skeleton', regionId: 'musculoskeletal', swatch: '#eef3fb' },
  { id: 'skull', label: 'Skull', regionId: 'musculoskeletal', swatch: '#eaf1fb' },
  { id: 'muscles', label: 'Muscles', regionId: 'musculoskeletal', swatch: '#c25a52' },
]

export const ORGAN_REGION: Record<string, string> = Object.fromEntries(ORGANS.map((o) => [o.id, o.regionId]))

/**
 * The way into the body: each system is one row, and the organs that belong to it sit under
 * it as chips, so nothing is listed twice and the whole body fits on one screen. Picking a
 * system turns the model to it and opens its readings; picking a chip shows that organ alone.
 * A system with a single organ has no chips, as its row already means that organ. Only a
 * system that needs a look carries a status.
 */
export function SystemsNav({
  regions,
  selectedId,
  onSelect,
  organId = null,
  onSelectOrgan,
  pillId,
  sex = 'male',
}: {
  regions: RegionAssessment[]
  selectedId: string | null
  /** A system's row was pressed: its id, or null when it was the selected one (pressing again clears). */
  onSelect: (id: string | null) => void
  /** The organ in focus, if any. */
  organId?: string | null
  onSelectOrgan: (organ: OrganInfo) => void
  /** Names the sliding highlight, so two lists on screen do not share one. */
  pillId: string
  /** Crew member's sex: decides which sex-specific organs are listed. */
  sex?: Sex
}) {
  return (
    <nav aria-label="Body systems">
      <ul className="grid gap-x-3 gap-y-0.5 sm:grid-cols-2 lg:grid-cols-1">
        {regions.map((r) => {
          const mine = r.region.id === selectedId
          const active = mine && !organId
          const flagged = r.status === 'critical' || r.status === 'caution'
          const organs = ORGANS.filter((o) => o.regionId === r.region.id && (!o.sex || o.sex === sex))
          return (
            <li key={r.region.id}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(active ? null : r.region.id)}
                className={`group relative flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left transition-colors duration-150 ${
                  mine ? 'text-fg' : 'text-fg-muted hover:text-fg'
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
                  className={`relative size-5.5 shrink-0 transition-colors duration-150 ${mine ? 'text-accent' : 'text-fg-subtle group-hover:text-accent'}`}
                />
                <span className={`relative min-w-0 flex-1 truncate text-[15px] ${mine ? 'font-medium' : ''}`}>{r.region.label}</span>
                {flagged && (
                  <span className={`relative flex shrink-0 items-center gap-1.5 text-xs font-medium ${STATUS_META[r.status].text}`}>
                    <span className={`size-2 rounded-full ${STATUS_META[r.status].dot}`} aria-hidden />
                    {STATUS_META[r.status].label}
                  </span>
                )}
              </button>

              {organs.length > 1 && (
                <ul aria-label={`${r.region.label}: organs`} className="flex flex-wrap gap-1.5 pt-0.5 pr-2 pb-2.5 pl-[2.9rem]">
                  {organs.map((o) => {
                    const on = organId === o.id
                    return (
                      <li key={o.id}>
                        <button
                          type="button"
                          aria-pressed={on}
                          onClick={() => onSelectOrgan(o)}
                          className={`flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[13px] whitespace-nowrap transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.97] ${
                            on ? 'border-accent/60 bg-accent/12 text-fg' : 'border-line text-fg-muted hover:border-mist/30 hover:text-fg'
                          }`}
                        >
                          <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: o.swatch }} />
                          {o.label}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
