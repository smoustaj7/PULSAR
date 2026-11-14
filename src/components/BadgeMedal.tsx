import { useId } from 'react'
import { ICON_PATHS, type IconName } from './Icon'

type Tier = 'bronze' | 'silver' | 'gold'

/** Each badge's engraving and metal. Harder badges are struck in a finer metal. */
const BADGE_ART: Record<string, { glyph: IconName | '100'; tier: Tier }> = {
  first: { glyph: 'rocket', tier: 'bronze' },
  routine: { glyph: 'check', tier: 'bronze' },
  streak3: { glyph: 'flame', tier: 'silver' },
  rested: { glyph: 'moon', tier: 'silver' },
  green: { glyph: 'shield', tier: 'silver' },
  streak7: { glyph: 'orbit', tier: 'gold' },
  centurion: { glyph: '100', tier: 'gold' },
}

/** Metal face (light to dark, top to bottom) and the engraving's ink. */
const METAL: Record<Tier, { light: string; dark: string; ink: string }> = {
  bronze: { light: '#efc199', dark: '#8f5b37', ink: '#3d2413' },
  silver: { light: '#f2f6f7', dark: '#8ea2a9', ink: '#24353b' },
  gold: { light: '#f8e19a', dark: '#b3842b', ink: '#4a330c' },
}

// A pointy-top hexagon around the centre of a 64-unit box. A round-joined stroke of the
// same paint softens its corners into a struck-metal shape.
const hexagon = (r: number) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2
    return `${(32 + r * Math.cos(a)).toFixed(2)},${(32 + r * Math.sin(a)).toFixed(2)}`
  }).join(' ')
const OUTER = hexagon(25)
const INNER = hexagon(19)

/** A badge as a medal: metal and engraving once earned, a dark blank with a lock until then. */
export function BadgeMedal({ id, earned, className = 'size-14' }: { id: string; earned: boolean; className?: string }) {
  const gradient = useId()
  const art = BADGE_ART[id] ?? { glyph: 'check', tier: 'bronze' }
  const metal = METAL[art.tier]
  const face = earned ? `url(#${gradient})` : 'var(--ink-800)'
  const ink = earned ? metal.ink : 'rgb(255 255 255 / 0.28)'

  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor={metal.light} />
          <stop offset="1" stopColor={metal.dark} />
        </linearGradient>
      </defs>
      <polygon points={OUTER} fill={face} stroke={face} strokeWidth={7} strokeLinejoin="round" />
      {/* The rim: light catching the bevel on a medal, a faint edge on a blank. */}
      <polygon
        points={INNER}
        fill="none"
        stroke={earned ? 'rgb(255 255 255 / 0.45)' : 'rgb(255 255 255 / 0.1)'}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      {art.glyph === '100' ? (
        <text
          x="32"
          y="37"
          textAnchor="middle"
          fill={ink}
          style={{ font: '700 15.5px var(--font-display)', letterSpacing: '-0.02em' }}
        >
          100
        </text>
      ) : (
        <path
          d={ICON_PATHS[art.glyph]}
          transform="translate(18.8 18.8) scale(1.1)"
          fill="none"
          stroke={ink}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {!earned && (
        <g transform="translate(41 41)">
          <circle cx="8" cy="8" r="8.5" fill="var(--ink-950)" stroke="rgb(255 255 255 / 0.18)" strokeWidth={1} />
          <path
            d={ICON_PATHS.lock}
            transform="translate(2.6 2.4) scale(0.45)"
            fill="none"
            stroke="rgb(255 255 255 / 0.7)"
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}
    </svg>
  )
}
