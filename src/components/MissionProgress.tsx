import { useState } from 'react'
import { XP_PER_LEVEL, type Progress } from '../engine/gamification'
import { BadgeMedal } from './BadgeMedal'
import { Card } from './Card'
import { Icon } from './Icon'

/** Level, streak and badges as three rows, the number on the right; the badge shelf opens on request. */
export function MissionProgress({ progress }: { progress: Progress }) {
  const { level, levelXp, streak, bestStreak, badges } = progress
  const earned = badges.filter((b) => b.earned).length
  const [showBadges, setShowBadges] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)
  const pickedBadge = badges.find((b) => b.id === picked)

  const rows = [
    { label: 'Level', detail: `${XP_PER_LEVEL - levelXp} XP to level ${level + 1}`, value: level, accent: true },
    { label: 'Day streak', detail: `Best ${bestStreak}`, value: streak },
    { label: 'Badges', detail: `${badges.length - earned} still to earn`, value: `${earned}/${badges.length}` },
  ]

  return (
    <Card title="Your progress" className="@container h-full">
      <dl className="-my-1 divide-y divide-line">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-4 py-3">
            <dt className="min-w-0">
              <span className="block text-sm font-medium text-fg">{r.label}</span>
              <span className="mt-0.5 block truncate text-xs text-fg-subtle tabular-nums">{r.detail}</span>
            </dt>
            <dd className={`display shrink-0 text-[2rem] tabular-nums ${r.accent ? 'text-accent' : 'text-fg'}`}>{r.value}</dd>
          </div>
        ))}
      </dl>

      <button
        type="button"
        onClick={() => setShowBadges((v) => !v)}
        aria-expanded={showBadges}
        aria-controls="badge-shelf"
        className="mt-3 flex items-center gap-1 text-xs font-medium text-accent hover:underline"
      >
        {showBadges ? 'Hide badges' : 'See badges'}
        <Icon name="chevron" className={`size-3.5 transition-transform ${showBadges ? '-rotate-90' : 'rotate-90'}`} />
      </button>
      {showBadges && (
        <div id="badge-shelf" className="mt-4">
          <ul className="grid grid-cols-4 gap-x-1 gap-y-3 @lg:grid-cols-7" aria-label="Badges">
            {badges.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => setPicked((p) => (p === b.id ? null : b.id))}
                  aria-pressed={picked === b.id}
                  className={`flex w-full flex-col items-center gap-1.5 rounded-xl px-0.5 py-1.5 transition-[transform,background-color] duration-100 ease-out active:scale-[0.96] motion-reduce:active:scale-100 ${
                    picked === b.id ? 'bg-white/6' : 'hover:bg-white/4'
                  }`}
                >
                  <BadgeMedal id={b.id} earned={b.earned} className="size-12 drop-shadow-[0_4px_10px_rgb(0_0_0/0.35)]" />
                  <span className={`line-clamp-2 text-center text-[11px] leading-tight ${b.earned ? 'text-fg-muted' : 'text-fg-subtle'}`}>
                    {b.label}
                    <span className="sr-only">{b.earned ? ', earned' : `, locked: ${b.description}`}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {/* What the picked badge is for; until one is picked, how to find out. */}
          <p className="mt-3 min-h-9 text-xs leading-snug text-fg-subtle" aria-live="polite">
            {pickedBadge ? (
              <>
                <span className="font-medium text-fg">{pickedBadge.label}</span>
                {pickedBadge.earned ? ' · Earned. ' : ' · Locked. '}
                {pickedBadge.description}.
              </>
            ) : (
              'Tap a badge to see how to earn it.'
            )}
          </p>
        </div>
      )}
    </Card>
  )
}
