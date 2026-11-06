import { motion } from 'framer-motion'
import { XP_PER_LEVEL, type Progress } from '../engine/gamification'
import { Card } from './Card'

export function MissionProgress({ progress, onPick }: { progress: Progress; onPick: (indicatorId: string) => void }) {
  const { level, levelXp, xp, streak, bestStreak, today, badges } = progress
  const routinePct = today.total ? (today.done / today.total) * 100 : 0

  return (
    <Card title="Mission progress" action={<span className="text-xs text-slate-400">{xp} XP</span>}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-slate-400">Level</div>
          <div className="text-2xl font-bold text-sky-300">{level}</div>
          <Bar pct={(levelXp / XP_PER_LEVEL) * 100} className="bg-sky-400" />
          <div className="mt-1 text-[11px] text-slate-500">
            {XP_PER_LEVEL - levelXp} XP to level {level + 1}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Routine streak</div>
          <div className="text-2xl font-bold text-orange-300">
            {streak} <span className="text-sm font-normal">day{streak === 1 ? '' : 's'}</span>
          </div>
          <div className="text-[11px] text-slate-500">Best: {bestStreak}</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-xs text-slate-400">
          <span>Today's routine</span>
          <span>
            {today.done}/{today.total}
          </span>
        </div>
        <Bar pct={routinePct} className={routinePct === 100 ? 'bg-nominal' : 'bg-orange-300'} />
        {today.remaining.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {today.remaining.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => onPick(i.id)}
                className="rounded-md bg-space-700 px-2 py-0.5 text-xs text-slate-300 hover:bg-space-800 hover:text-white"
              >
                + {i.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-nominal">Routine complete. +25 XP bonus earned today.</p>
        )}
      </div>

      <ul className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7 lg:grid-cols-4" aria-label="Badges">
        {badges.map((b) => (
          <li key={b.id} title={`${b.label}: ${b.description}${b.earned ? '' : ' (locked)'}`}>
            <motion.div
              initial={false}
              animate={{ scale: b.earned ? 1 : 0.92, opacity: b.earned ? 1 : 0.35 }}
              className={`grid aspect-square place-items-center rounded-xl border text-xl ${
                b.earned ? 'border-sky-400/40 bg-sky-400/10' : 'border-white/5 bg-space-800 grayscale'
              }`}
            >
              <span aria-hidden>{b.icon}</span>
            </motion.div>
            <div className="mt-1 truncate text-center text-[10px] text-slate-400">{b.label}</div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function Bar({ pct, className }: { pct: number; className: string }) {
  return (
    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-space-700">
      <motion.div className={`h-full rounded-full ${className}`} initial={false} animate={{ width: `${pct}%` }} />
    </div>
  )
}
