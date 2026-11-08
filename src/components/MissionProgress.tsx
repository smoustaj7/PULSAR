import { motion } from 'framer-motion'
import { XP_PER_LEVEL, type Progress } from '../engine/gamification'
import { Card } from './Card'

export function MissionProgress({ progress, onLog }: { progress: Progress; onLog: (indicatorId: string) => void }) {
  const { level, levelXp, xp, streak, bestStreak, today, badges } = progress
  const routinePct = today.total ? (today.done / today.total) * 100 : 0
  const earned = badges.filter((b) => b.earned).length

  return (
    <Card title="Mission progress" subtitle="Rewards a steady routine, never “good” numbers" action={<span className="text-xs text-fg-subtle tabular-nums">{xp} XP</span>}>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-accent/8 p-3">
          <div className="text-xs text-fg-muted">Level</div>
          <div className="text-[26px] leading-8 font-bold text-accent tabular-nums">{level}</div>
          <Bar pct={(levelXp / XP_PER_LEVEL) * 100} className="bg-accent" />
          <div className="mt-1.5 text-[11px] text-fg-subtle tabular-nums">
            {XP_PER_LEVEL - levelXp} XP to level {level + 1}
          </div>
        </div>
        <div className="rounded-2xl bg-ember/10 p-3">
          <div className="text-xs text-fg-muted">Routine streak</div>
          <div className="text-[26px] leading-8 font-bold text-sand tabular-nums">
            {streak} <span className="text-sm font-medium">day{streak === 1 ? '' : 's'}</span>
          </div>
          <div className="mt-3.5 text-[11px] text-fg-subtle">Best: {bestStreak}</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-sm">
          <span className="text-fg-muted">Today's routine</span>
          <span className="font-medium tabular-nums">
            {today.done}/{today.total}
          </span>
        </div>
        <Bar pct={routinePct} className={routinePct === 100 ? 'bg-nominal' : 'bg-ember'} />
        {today.remaining.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {today.remaining.map((i) => (
              <button key={i.id} type="button" onClick={() => onLog(i.id)} className="btn btn-plain btn-sm font-medium">
                + {i.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-nominal">Routine complete. +25 XP bonus earned today.</p>
        )}
      </div>

      <div className="mt-5 flex items-baseline justify-between">
        <span className="text-sm text-fg-muted">Badges</span>
        <span className="text-xs text-fg-subtle tabular-nums">
          {earned} of {badges.length}
        </span>
      </div>
      <ul className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7 lg:grid-cols-4" aria-label="Badges">
        {badges.map((b) => (
          <li key={b.id} title={`${b.label}: ${b.description}${b.earned ? '' : ' (locked)'}`}>
            <div
              className={`grid aspect-square place-items-center rounded-2xl border text-xl transition-opacity ${
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
    </Card>
  )
}

function Bar({ pct, className }: { pct: number; className: string }) {
  return (
    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/8">
      <motion.div
        className={`h-full rounded-full ${className}`}
        initial={false}
        animate={{ width: `${pct}%` }}
        transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
      />
    </div>
  )
}
