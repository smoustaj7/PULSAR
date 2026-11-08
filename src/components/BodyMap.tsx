import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import type { RegionAssessment } from '../engine/types'
import { STATUS_META } from '../lib/status'

/** The drawing space. The figure sits in the middle; labels use the margins on either side. */
const W = 360
const H = 470
const FIGURE_X = 80
const FIGURE_Y = 12

/** Shapes for each body system, in figure coordinates (a 200x440 body centered on x=100). */
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

/**
 * Where each label sits (drawing coordinates). `edge` is the label's inner edge, nearest the
 * body; `to` is the point on the organ the leader line ends at. Labels clear the arms.
 */
const CALLOUTS: Record<string, { side: 'left' | 'right'; y: number; edge: number; to: [number, number] }> = {
  brain: { side: 'left', y: 50, edge: 126, to: [160, 52] },
  respiratory: { side: 'left', y: 144, edge: 96, to: [146, 144] },
  metabolic: { side: 'left', y: 220, edge: 84, to: [152, 214] },
  immune: { side: 'right', y: 88, edge: 236, to: [192, 94] },
  cardiovascular: { side: 'right', y: 168, edge: 266, to: [196, 156] },
  musculoskeletal: { side: 'right', y: 340, edge: 232, to: [214, 340] },
}

const pct = (v: number, of: number) => `${(v / of) * 100}%`

/**
 * The body model: a figure with each system colored by its worst reading, and a label beside
 * each one naming it and its status. The labels are the buttons; the shapes are a larger
 * pointer target for the same action.
 */
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
  const reduceMotion = useReducedMotion()

  return (
    // Sized as a container so the labels can scale with the figure (cq units).
    <div className="relative mx-auto aspect-[360/470] h-full max-w-full" style={{ containerType: 'size' }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full overflow-visible" aria-hidden>
        <defs>
          <radialGradient id="bm-skin" cx="50%" cy="38%" r="65%">
            <stop offset="0%" stopColor="rgb(91 192 222)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="rgb(91 192 222)" stopOpacity="0.04" />
          </radialGradient>
          <linearGradient id="bm-edge" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(91 192 222)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="rgb(91 192 222)" stopOpacity="0.12" />
          </linearGradient>
          <radialGradient id="bm-floor">
            <stop offset="0%" stopColor="rgb(91 192 222)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="rgb(91 192 222)" stopOpacity="0" />
          </radialGradient>
          <filter id="bm-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Pedestal the figure stands on */}
        <ellipse cx={W / 2} cy={448} rx={92} ry={13} fill="url(#bm-floor)" />
        <ellipse cx={W / 2} cy={448} rx={70} ry={8} fill="none" stroke="rgb(91 192 222)" strokeOpacity="0.25" />

        <g transform={`translate(${FIGURE_X} ${FIGURE_Y})`}>
          {/* Silhouette */}
          <g fill="url(#bm-skin)" stroke="url(#bm-edge)" strokeWidth="1.5">
            <circle cx="100" cy="42" r="30" />
            <rect x="90" y="70" width="20" height="20" rx="4" />
            <path d="M58 96 Q100 82 142 96 L150 232 Q100 250 50 232 Z" />
          </g>

          {ORDER.map((id) => {
            const a = byId[id]
            if (!a) return null
            const color = STATUS_META[a.status].color
            const selected = selectedId === id
            const flagged = a.status === 'critical' || a.status === 'caution'
            // A slow pulse marks a critical system, unless the viewer asked for less motion.
            const pulse = a.status === 'critical' && !reduceMotion
            return (
              <motion.g
                key={id}
                onClick={() => onSelect(id)}
                className="cursor-pointer"
                style={{ fill: color, stroke: selected ? 'var(--accent)' : color }}
                filter={flagged ? 'url(#bm-glow)' : undefined}
                strokeWidth={selected ? 3 : 1}
                initial={false}
                animate={{ fillOpacity: pulse ? [0.4, 0.8, 0.4] : selected ? 0.8 : 0.45 }}
                transition={pulse ? { duration: 1.6, repeat: Infinity } : { duration: 0.2 }}
                whileHover={{ fillOpacity: 0.85 }}
              >
                {REGION_SHAPES[id]}
              </motion.g>
            )
          })}
        </g>

        {/* Leader lines from each label to its organ */}
        {ORDER.map((id) => {
          const c = CALLOUTS[id]
          const a = byId[id]
          if (!c || !a) return null
          const selected = selectedId === id
          const start = c.side === 'left' ? c.edge + 4 : c.edge - 4
          return (
            <g key={id} stroke={selected ? 'var(--accent)' : 'rgb(255 255 255 / 0.28)'} strokeWidth={selected ? 1.5 : 1}>
              <polyline points={`${start},${c.y} ${c.to[0]},${c.to[1]}`} fill="none" />
              <circle cx={c.to[0]} cy={c.to[1]} r={2.5} fill={selected ? 'var(--accent)' : 'rgb(255 255 255 / 0.6)'} stroke="none" />
            </g>
          )
        })}
      </svg>

      {ORDER.map((id) => {
        const c = CALLOUTS[id]
        const a = byId[id]
        if (!c || !a) return null
        const m = STATUS_META[a.status]
        const selected = selectedId === id
        const off = a.status === 'critical' || a.status === 'caution'
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-pressed={selected}
            aria-label={`${a.region.label}: ${m.label}`}
            className={`absolute w-max max-w-[8rem] -translate-y-1/2 rounded-lg px-1.5 py-1 leading-tight transition-colors hover:bg-white/6 ${
              c.side === 'left' ? 'text-right' : 'text-left'
            } ${selected ? 'bg-accent/12' : ''}`}
            style={{
              top: pct(c.y, H),
              ...(c.side === 'left' ? { right: pct(W - c.edge, W) } : { left: pct(c.edge, W) }),
            }}
          >
            <span className={`block text-[clamp(11px,2.9cqh,13px)] font-medium ${selected ? 'text-accent' : 'text-fg'}`}>
              {a.region.label}
            </span>
            <span className={`block text-[clamp(10px,2.6cqh,12px)] ${off ? m.text : 'text-fg-subtle'}`}>{m.label}</span>
          </button>
        )
      })}
    </div>
  )
}
