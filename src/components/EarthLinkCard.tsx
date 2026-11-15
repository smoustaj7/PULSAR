import { DEMO_SPEED, commsProgress, onBoardSteps, setSpeed, surgeonReply, type CommsPhase, type Transmission } from '../engine/comms'
import { formatClock, formatDuration, marsDistanceAu, marsLightTimeMs } from '../engine/lightTime'
import { askJarvis } from '../lib/askJarvis'
import { STATUS_META } from '../lib/status'
import { useNow } from '../lib/useNow'
import { useHealthStore } from '../store/useHealthStore'
import { SectionTitle } from './Card'
import { Icon } from './Icon'

const HEADLINE: Record<Exclude<CommsPhase, 'arrived'>, string> = {
  outbound: 'Reaching Earth in',
  review: 'Flight surgeon reading · reply leaves Earth in',
  inbound: 'Reply on its way · lands in',
}

/**
 * Mars mode's centre: how far away help is today, the report on its way to Earth and back,
 * and, until the reply lands, what to do on board, because nobody on Earth can answer sooner.
 */
export function EarthLinkCard({ onReport }: { onReport: () => void }) {
  const comms = useHealthStore((s) => s.comms)
  const setComms = useHealthStore((s) => s.setComms)
  // Countdowns tick every second once a report has been sent.
  const now = useNow(comms ? 1000 : 60_000)

  const delay = marsLightTimeMs(now)
  const progress = comms ? commsProgress(comms, now) : null
  const inFlight = progress !== null && progress.phase !== 'arrived'

  return (
    <section id="earth-link" aria-labelledby="earth-link-title" className="surface @container scroll-mt-20 p-4 sm:p-5">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <SectionTitle id="earth-link-title">Link to Earth</SectionTitle>
          <p className="mt-1.5 text-sm text-fg-muted tabular-nums">
            <span className="whitespace-nowrap">{formatDuration(delay)} each way</span> at light speed ·{' '}
            <span className="whitespace-nowrap">{marsDistanceAu(now).toFixed(2)} AU today</span>
          </p>
        </div>
        <button type="button" onClick={onReport} className="btn btn-tinted btn-sm shrink-0">
          <Icon name="send" className="size-3.5" /> {comms ? 'Send new report' : 'Send report'}
        </button>
      </header>

      <Track comms={comms} now={now} />

      {!comms && (
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-fg-muted">
          A report sent now gets an answer in {formatDuration(2 * delay)} at the very earliest. Until then you and your crew
          medical officer are the doctors on board; send your report, and PULSAR walks you through what to do while you wait.
        </p>
      )}

      {inFlight && comms && progress && (
        <>
          <p className="mt-4 flex flex-wrap items-baseline gap-x-2 text-sm text-fg-muted" aria-live="off">
            {HEADLINE[progress.phase as Exclude<CommsPhase, 'arrived'>]}
            <span className="display text-[2rem] text-fg tabular-nums">{formatClock(progress.phaseLeft)}</span>
          </p>
          <p className="mt-0.5 text-xs text-fg-subtle tabular-nums">Full reply in {formatClock(progress.replyIn)}</p>
          <OnBoard comms={comms} replyIn={progress.replyIn} />
          <button
            type="button"
            aria-pressed={comms.speed > 1}
            onClick={() => setComms(setSpeed(comms, comms.speed > 1 ? 1 : DEMO_SPEED, Date.now()))}
            className="mt-4 text-xs font-medium text-accent hover:underline"
          >
            {comms.speed > 1 ? `Demo speed ×${DEMO_SPEED} on · back to real time` : `Demo speed ×${DEMO_SPEED}`}
          </button>
        </>
      )}

      {progress?.phase === 'arrived' && comms && (
        <article className="mt-4 rounded-2xl border border-accent/30 bg-accent/6 p-4" aria-labelledby="reply-title">
          <header className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 id="reply-title" className="text-sm font-semibold text-fg">
              Reply from your flight surgeon
            </h3>
            <span className="text-xs text-fg-subtle">Simulated · round trip {formatDuration(2 * comms.delayMs + comms.reviewMs)}</span>
          </header>
          <div className="mt-2 space-y-2 text-sm leading-relaxed text-fg-muted">
            {surgeonReply(comms).map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </article>
      )}
    </section>
  )
}

/** Mars and Earth at the two ends, and the report as a dot travelling between them. */
function Track({ comms, now }: { comms: Transmission | null; now: number }) {
  const p = comms ? commsProgress(comms, now) : null
  const out = comms ? comms.delayMs : 1
  // Where the dot sits, 0 at Mars and 1 at Earth.
  const at = !p || !comms ? null : p.phase === 'outbound' ? p.elapsed / out : p.phase === 'review' ? 1 : p.phase === 'inbound' ? 1 - (p.elapsed - out - comms.reviewMs) / out : 0
  return (
    <div className="mt-5" aria-hidden>
      <div className="flex items-center justify-between text-xs text-fg-subtle">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#d9693f]" /> Mars
        </span>
        <span className="flex items-center gap-1.5">
          Earth <span className="size-2.5 rounded-full bg-sea" />
        </span>
      </div>
      <div className="relative mt-2 h-3">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[repeating-linear-gradient(90deg,rgb(168_218_220/0.35)_0_6px,transparent_6px_11px)]" />
        {at !== null && (
          <div
            className="absolute inset-0 transition-transform duration-1000 ease-linear motion-reduce:transition-none"
            style={{ transform: `translateX(${at * 100}%)` }}
          >
            <span
              className={`absolute top-1/2 left-0 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ${
                p?.phase === 'inbound' || p?.phase === 'arrived' ? 'bg-accent ring-accent/20' : 'bg-fg ring-fg/15'
              }`}
            />
          </div>
        )}
      </div>
    </div>
  )
}

/** What to do now, while Earth can't answer: the flagged items with their on-board guidance. */
function OnBoard({ comms, replyIn }: { comms: Transmission; replyIn: number }) {
  const steps = onBoardSteps(comms)
  const top = steps[0]
  return (
    <div className="mt-5 border-t border-line pt-4">
      <h3 className="text-xs font-medium text-fg-muted">Until Earth answers</h3>
      {steps.length === 0 ? (
        <p className="mt-2 text-sm text-fg-muted">Nothing in your report needs action. Keep to your schedule.</p>
      ) : (
        <ul className="mt-2 grid gap-3 @3xl:grid-cols-2">
          {steps.map((s) => (
            <li key={s.id} className="flex gap-3">
              <span
                aria-hidden
                className={`mt-1.5 size-2.5 shrink-0 rounded-full ${s.status === 'injury' ? 'bg-[#ff4d5e]' : STATUS_META[s.status].dot}`}
              />
              <p className="min-w-0 text-sm">
                <span className="block font-medium text-fg">
                  {s.label}
                  <span className="sr-only">, {s.status === 'injury' ? 'injury' : STATUS_META[s.status].label}</span>
                </span>
                <span className="mt-0.5 block leading-snug text-fg-muted">{s.guidance}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
      {top && (
        <button
          type="button"
          onClick={() =>
            askJarvis(
              `I'm on Mars and the flight surgeon can't answer for about ${Math.ceil(replyIn / 60_000)} minutes. What should I do right now about my ${top.label.toLowerCase()}?`,
            )
          }
          className="btn btn-plain btn-sm mt-4"
        >
          <Icon name="chat" className="size-3.5" /> Ask Dr.Jarvis what to do now
        </button>
      )}
    </div>
  )
}
