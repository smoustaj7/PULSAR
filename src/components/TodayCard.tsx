import { motion } from 'framer-motion'
import { useState } from 'react'
import { checksBetween } from '../content/nasaSchedule'
import type { Progress } from '../engine/gamification'
import type { DueItem } from '../engine/types'
import { timeAgo } from '../lib/status'
import { Icon } from './Icon'

const SHOWN = 5

type Task =
  | { kind: 'log'; id: string; title: string; detail: string }
  | { kind: 'nasa'; id: string; title: string; detail: string }

/**
 * One list for the day: measurements that are due, then NASA's checks scheduled for today.
 * The first few show; the rest are one tap away, so the list never fills the screen.
 */
export function TodayCard({
  due,
  progress,
  missionDay,
  now,
  onLog,
  onOpenRequirement,
  onOpenPlan,
}: {
  due: DueItem[]
  progress: Progress
  missionDay: number
  now: number
  onLog: (indicatorId: string) => void
  onOpenRequirement: (requirementId: string) => void
  onOpenPlan: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const tasks: Task[] = [
    ...due.map(({ indicator, lastTimestamp }) => ({
      kind: 'log' as const,
      id: indicator.id,
      title: indicator.label,
      detail: lastTimestamp ? `Last logged ${timeAgo(lastTimestamp, now)}` : 'Not logged yet',
    })),
    ...checksBetween(missionDay, 0).map((i) => ({
      kind: 'nasa' as const,
      id: i.requirement.id,
      title: i.title,
      detail: `NASA check${i.check.minutes ? ` · about ${i.check.minutes} min` : ''}`,
    })),
  ]
  const visible = expanded ? tasks : tasks.slice(0, SHOWN)
  const hidden = tasks.length - visible.length
  const { done, total } = progress.today
  const pct = total ? (done / total) * 100 : 0

  return (
    <section id="today" aria-labelledby="today-title" className="surface scroll-mt-20 p-4 sm:p-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 id="today-title" className="text-[15px] font-semibold tracking-tight">
            Today
          </h2>
          <p className="mt-0.5 text-xs text-fg-subtle">
            {tasks.length ? `${tasks.length} ${tasks.length === 1 ? 'thing' : 'things'} to do` : 'Nothing left to do today'}
          </p>
        </div>
        <span className="shrink-0 text-xs text-fg-muted tabular-nums">
          {done} of {total} daily readings
        </span>
      </header>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8" aria-hidden>
        <motion.div
          className={`h-full rounded-full ${pct === 100 ? 'bg-nominal' : 'bg-accent'}`}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
        />
      </div>

      {tasks.length === 0 ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-nominal">
          <Icon name="check" className="size-4.5" /> All done. Nice work.
        </p>
      ) : (
        <ul className="-mx-2 mt-3 space-y-0.5">
          {visible.map((t) => (
            <li key={`${t.kind}-${t.id}`}>
              <button
                type="button"
                onClick={() => (t.kind === 'log' ? onLog(t.id) : onOpenRequirement(t.id))}
                className="group flex min-h-12 w-full items-center gap-3 rounded-xl px-2 text-left transition-colors hover:bg-white/5"
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-full ${
                    t.kind === 'log' ? 'bg-accent/12 text-accent' : 'bg-ember/12 text-sand'
                  }`}
                  aria-hidden
                >
                  <Icon name={t.kind === 'log' ? 'plus' : 'resources'} className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{t.title}</span>
                  <span className="block truncate text-xs text-fg-subtle">{t.detail}</span>
                </span>
                {t.kind === 'log' ? (
                  <span className="btn btn-tinted btn-sm pointer-events-none group-hover:bg-accent/20">Log</span>
                ) : (
                  <Icon name="chevron" className="size-4 shrink-0 text-fg-subtle group-hover:text-fg" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        {tasks.length > SHOWN ? (
          <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} className="btn btn-plain btn-sm">
            {expanded ? 'Show less' : `Show ${hidden} more`}
          </button>
        ) : (
          <span />
        )}
        <button type="button" onClick={onOpenPlan} className="text-xs font-medium text-accent hover:underline">
          NASA’s plan for the week
        </button>
      </div>
    </section>
  )
}
