import { indicatorsById } from '../config'
import { PHASE_LABEL, requirementsById, systemsById } from '../content/lsah'
import { INFLIGHT_SCHEDULE, nextOccurrence, relativeDay } from '../content/nasaSchedule'
import { Icon } from './Icon'
import { Sheet } from './Sheet'

/** One NASA medical requirement in full: what it measures, why, when, and how to prepare. */
export function RequirementSheet({
  requirementId,
  missionDay,
  onClose,
  onLog,
  onOpenSystem,
}: {
  requirementId: string | null
  missionDay: number
  onClose: () => void
  onLog: (indicatorId: string) => void
  onOpenSystem: (systemId: string) => void
}) {
  const req = requirementId ? requirementsById[requirementId] : null
  const system = req ? systemsById[req.systemId] : null
  const scheduled = req ? INFLIGHT_SCHEDULE.find((c) => c.requirementId === req.id) : undefined
  const next = scheduled ? nextOccurrence(scheduled, missionDay) : null

  return (
    <Sheet open={!!req} onClose={onClose} title={req?.title ?? ''} description={system && `${system.label} · NASA ${req!.code}`}>
      {req && system && (
        <div className="space-y-5 text-sm">
          {next !== null && (
            <p className="flex items-center gap-2 rounded-2xl border border-accent/30 bg-accent/10 px-3.5 py-2.5 text-fg">
              <Icon name="clock" className="size-4.5 shrink-0 text-accent" />
              <span>
                Next on your mission: <strong className="font-semibold">Day {next}</strong>{' '}
                <span className="text-fg-muted">({relativeDay(next, missionDay).toLowerCase()})</span>
              </span>
            </p>
          )}

          <section>
            <h3 className="font-medium text-accent">What NASA measures</h3>
            <p className="mt-1 text-fg">{req.measures}</p>
          </section>
          <section>
            <h3 className="font-medium text-sand">Why</h3>
            <p className="mt-1 text-fg-muted">{req.purpose}</p>
          </section>

          <section aria-labelledby="req-when">
            <h3 id="req-when" className="font-medium text-fg">
              When
            </h3>
            <ol className="mt-2 space-y-2">
              {req.when.map((w) => (
                <li key={w.phase} className="rounded-2xl border border-line bg-white/3 p-3">
                  <div className="eyebrow">{PHASE_LABEL[w.phase]}</div>
                  <p className="mt-0.5 text-fg">{w.text}</p>
                </li>
              ))}
            </ol>
          </section>

          {req.prep && (
            <section className="rounded-2xl border border-sand/25 bg-sand/8 p-3.5">
              <h3 className="font-medium text-sand">How to prepare</h3>
              <p className="mt-1 text-fg">{req.prep}</p>
            </section>
          )}

          {req.indicatorIds?.length ? (
            <section>
              <h3 className="font-medium text-fg">Related readings in AstroPulse</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {req.indicatorIds.map((id) => (
                  <button key={id} type="button" onClick={() => onLog(id)} className="btn btn-tinted btn-sm">
                    <Icon name="plus" className="size-3.5" /> {indicatorsById[id]?.label ?? id}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <button type="button" onClick={() => onOpenSystem(system.id)} className="btn btn-plain w-full">
            All {system.label} checks <Icon name="chevron" className="size-4" />
          </button>
        </div>
      )}
    </Sheet>
  )
}
