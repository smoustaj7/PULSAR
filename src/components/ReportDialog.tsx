import { useMemo, useState } from 'react'
import { copyText } from '../lib/browser'
import { indicatorIcon } from '../lib/indicatorIcons'
import { buildReport, reportToMarkdown, type HealthReport, type IndicatorSummary, type ReportInput } from '../lib/report'
import { STATUS_META } from '../lib/status'
import { Icon } from './Icon'
import { Sheet } from './Sheet'

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const STEPS = [
  { title: 'Check it', detail: 'Below is exactly what your flight surgeon will read.' },
  { title: 'Copy it', detail: 'One tap copies the whole report as text.' },
  { title: 'Send it', detail: 'Paste it into your next message home.' },
]

/**
 * The crew → flight surgeon report: what it is and how to send it, then the report itself,
 * laid out to be read. Copy and download hand over the same content as text (or JSON).
 */
export function ReportDialog({ open, onClose, input }: { open: boolean; onClose: () => void; input: ReportInput }) {
  const [copied, setCopied] = useState<'done' | 'failed' | null>(null)
  const report = useMemo(() => (open ? buildReport(input) : null), [open, input])
  const markdown = useMemo(() => (report ? reportToMarkdown(report) : ''), [report])
  const base = report ? `pulsar-report-day${report.missionDay}-${report.generatedAt.slice(0, 10)}` : 'report'

  return (
    <Sheet
      open={open}
      onClose={onClose}
      size="lg"
      title="Report to ground"
      description={`A summary of your last ${report?.windowDays ?? 7} days for your flight surgeon on Earth.`}
    >
      {/* On phones the steps shrink to one row of titles, so the report itself stays in view. */}
      <ol className="grid grid-cols-3 gap-2">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex items-center gap-1.5 rounded-2xl bg-white/4 px-2 py-2.5 sm:items-start sm:gap-3 sm:p-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent/15 text-xs font-semibold text-accent tabular-nums">
              {i + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium whitespace-nowrap text-fg">{s.title}</span>
              <span className="hidden text-xs leading-snug text-fg-subtle sm:block">{s.detail}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-primary"
          onClick={async () => {
            setCopied((await copyText(markdown)) ? 'done' : 'failed')
            setTimeout(() => setCopied(null), 2500)
          }}
        >
          <Icon name={copied === 'done' ? 'check' : 'doc'} className="size-4" />
          {copied === 'done' ? 'Copied' : 'Copy report'}
        </button>
        <button type="button" className="btn btn-plain" onClick={() => download(`${base}.md`, markdown, 'text/markdown')}>
          Download as a file
        </button>
        <p className="w-full text-xs text-fg-subtle sm:ml-1 sm:w-auto" aria-live="polite">
          {copied === 'done'
            ? 'Now paste it into your message to the flight surgeon.'
            : copied === 'failed'
              ? 'Copying isn’t allowed here. Download the file and attach it instead.'
              : 'Or download it to attach to your next comms pass.'}
        </p>
      </div>

      {report && <ReportPreview report={report} />}

      <p className="mt-4 text-xs text-fg-subtle">
        Medical systems on the ground can take the same report as data:{' '}
        <button
          type="button"
          className="font-medium text-accent hover:underline"
          onClick={() => download(`${base}.json`, JSON.stringify(report, null, 2), 'application/json')}
        >
          download JSON
        </button>
        .
      </p>
    </Sheet>
  )
}

const SEVERITY = { critical: 0, caution: 1, nominal: 2, unknown: 3 } as const

const value = (i: IndicatorSummary) => (i.latest === null ? 'No reading' : `${i.latest} ${i.unit}`)

/** "Higher than your usual 6.9 h", from the trend against the astronaut's own baseline. */
function trendText(i: IndicatorSummary) {
  if (!i.trend?.flagged) return null
  return `${i.trend.flagged === 'rise' ? 'Rising' : 'Falling'} from your usual ${i.trend.baseline} ${i.unit}`
}

function ReportPreview({ report }: { report: HealthReport }) {
  const attention = report.indicators
    .filter((i) => i.status === 'critical' || i.status === 'caution')
    .sort((a, b) => SEVERITY[a.status] - SEVERITY[b.status])
  const overall = STATUS_META[report.overallStatus]
  const generated = new Date(report.generatedAt)

  return (
    <article className="mt-5 rounded-3xl border border-line bg-ink-950/50 p-4 sm:p-6" aria-label="Report preview">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-[0.08em] text-fg-subtle uppercase">Health report</p>
          <h3 className="mt-1 font-display text-xl font-semibold text-fg">{report.crewName}</h3>
          <p className="mt-1 text-sm text-fg-muted">
            Mission day {report.missionDay} · {report.environment.label} ·{' '}
            {generated.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <span className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${overall.border} ${overall.bg}`}>
          <span className={`size-2 rounded-full ${overall.dot}`} aria-hidden />
          <span className="text-fg-muted">Overall</span>
          <span className={`font-medium ${overall.text}`}>{overall.label}</span>
        </span>
      </header>

      <section className="pt-4" aria-labelledby="report-attention">
        <h4 id="report-attention" className="text-sm font-semibold text-fg">
          Needs attention {attention.length > 0 && <span className="text-fg-subtle">({attention.length})</span>}
        </h4>
        {attention.length ? (
          <ul className="mt-3 space-y-2">
            {attention.map((i) => {
              const m = STATUS_META[i.status]
              return (
                <li key={i.id} className={`flex gap-3 rounded-2xl border p-3 ${m.border} ${m.bg}`}>
                  <ReadingIcon id={i.id} className={m.text} />
                  <div className="min-w-0">
                    <p className="text-sm text-fg">
                      <span className="font-medium">{i.label}</span>{' '}
                      <span className={`tabular-nums ${m.text}`}>
                        {value(i)} · {m.label}
                        {i.direction ? `, ${i.direction}` : ''}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs leading-snug text-fg-muted">{i.guidance}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-fg-muted">Nothing flagged. Every reading is in its normal range.</p>
        )}
      </section>

      <section className="pt-5" aria-labelledby="report-all">
        <h4 id="report-all" className="text-sm font-semibold text-fg">
          All readings, last {report.windowDays} days
        </h4>
        <ul className="mt-2 divide-y divide-line">
          {report.indicators.map((i) => {
            const m = STATUS_META[i.status]
            const trend = trendText(i)
            return (
              <li key={i.id} className="flex items-center gap-3 py-2.5">
                <ReadingIcon id={i.id} className="text-fg-muted" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-fg">{i.label}</p>
                  <p className="truncate text-xs text-fg-subtle tabular-nums">
                    {i.window
                      ? `${i.window.min}–${i.window.max} ${i.unit} over ${i.window.count} reading${i.window.count === 1 ? '' : 's'}`
                      : 'Not logged this week'}
                    {trend && <span className="text-caution"> · {trend}</span>}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm text-fg tabular-nums">{value(i)}</p>
                  <p className="flex items-center justify-end gap-1.5 text-xs">
                    <span className={`size-1.5 rounded-full ${m.dot}`} aria-hidden />
                    <span className={i.status === 'nominal' || i.status === 'unknown' ? 'text-fg-subtle' : m.text}>{m.label}</span>
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      {report.overdue.length > 0 && (
        <section className="pt-5" aria-labelledby="report-overdue">
          <h4 id="report-overdue" className="text-sm font-semibold text-fg">
            Overdue checks
          </h4>
          <ul className="mt-2 flex flex-wrap gap-2">
            {report.overdue.map((o) => (
              <li key={o} className="rounded-full border border-line px-3 py-1 text-xs text-fg-muted">
                {o}
              </li>
            ))}
          </ul>
        </section>
      )}

      {report.notes.length > 0 && (
        <section className="pt-5" aria-labelledby="report-notes">
          <h4 id="report-notes" className="text-sm font-semibold text-fg">
            Your notes
          </h4>
          <ul className="mt-2 space-y-2">
            {report.notes.map((n) => (
              <li key={`${n.at}-${n.indicator}`} className="text-sm text-fg-muted">
                <span className="text-xs text-fg-subtle tabular-nums">
                  {new Date(n.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · {n.indicator}
                </span>
                <span className="block">“{n.note}”</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}

function ReadingIcon({ id, className }: { id: string; className: string }) {
  return (
    <span className={`grid size-8 shrink-0 place-items-center rounded-[10px] bg-white/6 ${className}`} aria-hidden>
      <Icon name={indicatorIcon(id)} strokeWidth={1.7} className="size-[18px]" />
    </span>
  )
}
