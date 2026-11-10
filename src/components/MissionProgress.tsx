import { useState } from 'react'
import { XP_PER_LEVEL, type Progress } from '../engine/gamification'
import { Card } from './Card'
import { Icon } from './Icon'

/** Level, streak and badges in one row; the badge shelf opens on request. */
export function MissionProgress({ progress }: { progress: Progress }) {
  const { level, levelXp, streak, bestStreak, badges } = progress
  const earned = badges.filter((b) => b.earned).length
  const [showBadges, setShowBadges] = useState(false)

  return (
    <Card kicker="05 / Progress" title="Your progress" subtitle="Rewards a steady routine, never “good” numbers">
      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-line bg-line text-sm">
        <div className="flex flex-col-reverse justify-end bg-navy-900 p-3">
          <dt className="mt-0.5 text-xs text-fg-subtle tabular-nums">
            Level · {XP_PER_LEVEL - levelXp} XP to next
          </dt>
          <dd className="display text-3xl text-accent tabular-nums">{level}</dd>
        </div>
        <div className="flex flex-col-reverse justify-end bg-navy-900 p-3">
          <dt className="mt-0.5 text-xs text-fg-subtle">Day streak · best {bestStreak}</dt>
          <dd className="display text-3xl text-sand tabular-nums">{streak}</dd>
        </div>
        <div className="flex flex-col-reverse justify-end bg-navy-900 p-3">
          <dt className="mt-0.5 text-xs text-fg-subtle">Badges earned</dt>
          <dd className="display text-3xl tabular-nums">
            {earned}
            <span className="text-sm font-medium text-fg-subtle">/{badges.length}</span>
          </dd>
        </div>
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
        <ul id="badge-shelf" className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7" aria-label="Badges">
          {badges.map((b) => (
            <li key={b.id} title={`${b.label}: ${b.description}${b.earned ? '' : ' (locked)'}`}>
              <div
                className={`grid aspect-square place-items-center rounded-2xl border text-xl ${
                  b.earned ? 'border-sand/30 bg-sand/10' : 'border-line bg-white/3 opacity-40 grayscale'
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
