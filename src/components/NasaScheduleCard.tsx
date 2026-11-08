import { checksBetween, relativeDay, type ScheduledItem } from '../content/nasaSchedule'
import { Card } from './Card'
import { Icon } from './Icon'

const WEEK_LIMIT = 5

/** NASA's in-flight medical checks for today and the coming week, keyed to the mission day. */
export function NasaScheduleCard({
  missionDay,
  onOpen,
  onSeeAll,
}: {
  missionDay: number
  onOpen: (requirementId: string) => void
  onSeeAll: () => void
}) {
  const items = checksBetween(missionDay, 7)
  const today = items.filter((i) => i.day === missionDay)
  const week = items.filter((i) => i.day > missionDay)
  const shown = week.slice(0, WEEK_LIMIT)

  return (
    <Card
      title="NASA checks"
      subtitle={`Day ${missionDay}, from NASA’s station medical requirements`}
      action={
        <button type="button" onClick={onSeeAll} className="btn btn-plain btn-sm">
          Full plan
        </button>
      }
    >
      <h3 className="eyebrow">Today</h3>
      {today.length ? (
        <ul className="-mx-2 mt-1 space-y-0.5">
          {today.map((i) => (
            <Row key={i.requirement.id} item={i} onOpen={onOpen} />
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-sm text-fg-muted">Nothing on NASA’s schedule today.</p>
      )}

      <h3 className="eyebrow mt-4">Next 7 days</h3>
      {shown.length ? (
        <ul className="-mx-2 mt-1 space-y-0.5">
          {shown.map((i) => (
            <Row key={`${i.day}-${i.requirement.id}`} item={i} onOpen={onOpen} missionDay={missionDay} />
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-sm text-fg-muted">Nothing else scheduled this week.</p>
      )}
      {week.length > WEEK_LIMIT && (
        <button type="button" onClick={onSeeAll} className="mt-1 text-xs font-medium text-accent hover:underline">
          {week.length - WEEK_LIMIT} more this week in the full plan
        </button>
      )}

      <button
        type="button"
        onClick={() => onOpen('dosimeter')}
        className="mt-4 flex w-full items-center gap-2.5 rounded-xl border border-line bg-white/3 px-3 py-2.5 text-left text-xs text-fg-muted transition-colors hover:bg-white/6"
      >
        <Icon name="info" className="size-4 shrink-0 text-sand" />
        <span className="flex-1">Every day: carry your personal radiation dosimeter.</span>
        <Icon name="chevron" className="size-3.5 shrink-0 text-fg-subtle" />
      </button>
    </Card>
  )
}

function Row({ item, onOpen, missionDay }: { item: ScheduledItem; onOpen: (id: string) => void; missionDay?: number }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(item.requirement.id)}
        className="group flex min-h-12 w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-white/5"
      >
        {missionDay !== undefined && (
          <span className="w-16 shrink-0">
            <span className="block text-xs font-semibold tabular-nums text-fg">Day {item.day}</span>
            <span className="block text-[11px] text-fg-subtle">{relativeDay(item.day, missionDay)}</span>
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{item.title}</span>
          <span className="block text-xs text-fg-subtle">
            {item.check.minutes ? `About ${item.check.minutes} min · ` : ''}NASA {item.requirement.code}
          </span>
        </span>
        <Icon name="chevron" className="size-4 shrink-0 text-fg-subtle group-hover:text-fg" />
      </button>
    </li>
  )
}
