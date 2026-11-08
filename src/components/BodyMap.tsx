import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import type { RegionAssessment, Status } from '../engine/types'
import { STATUS_META } from '../lib/status'

/** SVG shapes for each clickable region. Coordinates are in a 200x440 viewBox. */
const REGION_SHAPES: Record<string, ReactNode> = {
  musculoskeletal: (
    <>
      <rect x="30" y="100" width="18" height="138" rx="9" transform="rotate(10 39 100)" />
      <rect x="152" y="100" width="18" height="138" rx="9" transform="rotate(-10 161 100)" />
      <rect x="64" y="236" width="30" height="190" rx="14" />
      <rect x="106" y="236" width="30" height="190" rx="14" />
    </>
  ),
  brain: <ellipse cx="100" cy="40" rx="21" ry="17" />,
  immune: <ellipse cx="100" cy="82" rx="13" ry="7" />,
  respiratory: (
    <>
      <ellipse cx="80" cy="132" rx="16" ry="30" />
      <ellipse cx="120" cy="132" rx="16" ry="30" />
    </>
  ),
  cardiovascular: (
    <path d="M108 160 C 90 148, 92 130, 102 132 C 106 133, 108 137, 108 139 C 108 137, 111 133, 115 132 C 125 130, 126 148, 108 160 Z" />
  ),
  metabolic: <ellipse cx="100" cy="200" rx="30" ry="22" />,
}

/** Paint order: limbs underneath, heart on top of the lungs. */
const ORDER = ['musculoskeletal', 'brain', 'immune', 'respiratory', 'metabolic', 'cardiovascular']

export function BodyMap({
  regions,
  selectedId,
  onSelect,
}: {
  regions: RegionAssessment[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const byId = Object.fromEntries(regions.map((r) => [r.region.id, r]))

  return (
    <svg viewBox="0 0 200 440" className="mx-auto h-[340px] w-full sm:h-[400px]" role="group" aria-label="Body map">
      {/* Silhouette */}
      <g className="fill-white/4 stroke-white/12" strokeWidth="1.5">
        <circle cx="100" cy="42" r="30" />
        <rect x="90" y="70" width="20" height="20" rx="4" />
        <path d="M58 96 Q100 82 142 96 L150 232 Q100 250 50 232 Z" />
      </g>

      {ORDER.map((id) => {
        const a = byId[id]
        if (!a) return null
        return (
          <Region
            key={id}
            label={a.region.label}
            status={a.status}
            selected={selectedId === id}
            onSelect={() => onSelect(id)}
          >
            {REGION_SHAPES[id]}
          </Region>
        )
      })}
    </svg>
  )
}

function Region({
  label,
  status,
  selected,
  onSelect,
  children,
}: {
  label: string
  status: Status
  selected: boolean
  onSelect: () => void
  children: ReactNode
}) {
  const color = STATUS_META[status].color
  // A slow pulse marks a critical region, unless the viewer asked for less motion.
  const reduceMotion = useReducedMotion()
  const pulse = status === 'critical' && !reduceMotion
  return (
    <motion.g
      role="button"
      tabIndex={0}
      aria-label={`${label}: ${STATUS_META[status].label}`}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className="cursor-pointer outline-none"
      style={{ fill: color, stroke: selected ? 'var(--accent)' : color }}
      strokeWidth={selected ? 3 : 1}
      initial={false}
      animate={{ fillOpacity: pulse ? [0.35, 0.75, 0.35] : selected ? 0.75 : 0.45 }}
      transition={pulse ? { duration: 1.6, repeat: Infinity } : { duration: 0.2 }}
      whileHover={{ fillOpacity: 0.85 }}
      whileFocus={{ fillOpacity: 0.85 }}
    >
      <title>{label}</title>
      {children}
    </motion.g>
  )
}
