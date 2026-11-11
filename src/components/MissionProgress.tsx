import { useState } from 'react'
import { XP_PER_LEVEL, type Progress } from '../engine/gamification'
import { Card } from './Card'
import { Icon } from './Icon'

/** Level, streak and badges as three rows, the number on the right; the badge shelf opens on request. */
export function MissionProgress({ progress }: { progress: Progress }) {
  const { level, levelXp, streak, bestStreak, badges } = progress
  const earned = badges.filter((b) => b.earned).length
  const [showBadges, setShowBadges] = useState(false)

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
        <ul id="badge-shelf" className="mt-3 grid grid-cols-4 gap-2 @lg:grid-cols-7" aria-label="Badges">
          {badges.map((b) => (
            <li key={b.id} title={`${b.label}: ${b.description}${b.earned ? '' : ' (locked)'}`}>
              <div
                className={`grid aspect-square place-items-center rounded-2xl border text-xl ${
                  b.earned ? 'border-accent/30 bg-accent/10' : 'border-line bg-white/3 opacity-40 grayscale'
                }`}
              >
                <span aria-hidden>{b.icon}</span>
              </div>
              <div className="mt-1 truncate text-center text-[10px] text-fg-subtle">
                {b.label}
                <span className="sr-only">{b.earned ? ' (earned)' : ' (locked)'}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
