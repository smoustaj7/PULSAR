import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Card, PageHeader } from '../components/Card'
import { Icon } from '../components/Icon'
import { indicatorsById, regionsById } from '../config'
import { FINDINGS, TOPICS, type Topic } from '../content/findings'
import {
  ANNUAL_EXAM,
  LSAH_DOCUMENT_COUNT,
  LSAH_LIMITATIONS,
  LSAH_PURPOSES,
  LSAH_SOURCES,
  LSAH_SYSTEMS,
  LSAH_TIMELINE,
  PHASE_LABEL,
  requirementsForSystem,
  requirementsInPhase,
  type Phase,
} from '../content/lsah'
import { UNSCHEDULED_INFLIGHT, nextForEachCheck, relativeDay } from '../content/nasaSchedule'
import { GUIDE_TABS, type GuideTab } from '../lib/views'

interface GuideProps {
  tab: GuideTab
  onTabChange: (tab: GuideTab) => void
  missionDay: number
  /** LSAH system the user jumped here from, outlined so it's easy to spot. */
  highlightSystemId?: string | null
  onOpenRequirement: (requirementId: string) => void
  onOpenRegion: (regionId: string) => void
  onTrend: (indicatorId: string) => void
}

/** NASA's Lifetime Surveillance of Astronaut Health, read and rewritten for crew use. */
export function NasaGuideView(props: GuideProps) {
  const { tab, onTabChange } = props
  const tabRefs = useRef<Partial<Record<GuideTab, HTMLButtonElement | null>>>({})

  // Arrow keys move between tabs, as in a native segmented control.
  const onKeyDown = (e: KeyboardEvent) => {
    const i = GUIDE_TABS.findIndex((t) => t.id === tab)
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? GUIDE_TABS.length - 1 : delta ? (i + delta + GUIDE_TABS.length) % GUIDE_TABS.length : -1
    if (next < 0) return
    e.preventDefault()
    onTabChange(GUIDE_TABS[next].id)
    tabRefs.current[GUIDE_TABS[next].id]?.focus()
  }

  return (
    <div>
      <PageHeader title="NASA guide">
        What NASA checks, when, and what its astronaut health data has shown, from the Lifetime Surveillance of Astronaut Health
        program.
      </PageHeader>

      <div
        role="tablist"
        aria-label="NASA guide sections"
        onKeyDown={onKeyDown}
        className="mb-5 grid grid-cols-4 gap-1 rounded-full bg-white/5 p-1 sm:inline-grid sm:auto-cols-auto sm:grid-flow-col sm:grid-cols-none"
      >
        {GUIDE_TABS.map((t) => {
          const active = t.id === tab
          return (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[t.id] = el
              }}
              type="button"
              role="tab"
              id={`guide-tab-${t.id}`}
              aria-selected={active}
              aria-controls="guide-panel"
              tabIndex={active ? 0 : -1}
              onClick={() => onTabChange(t.id)}
              className={`min-h-9 rounded-full px-2 text-[13px] font-medium whitespace-nowrap transition-colors sm:px-4 sm:text-sm ${
                active ? 'bg-white/12 text-fg' : 'text-fg-muted hover:text-fg'
              }`}
            >
              <span className="sm:hidden">{t.short}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          )
        })}
      </div>

      <div role="tabpanel" id="guide-panel" aria-labelledby={`guide-tab-${tab}`}>
        {tab === 'plan' && <PlanTab {...props} />}
        {tab === 'systems' && <SystemsTab {...props} />}
        {tab === 'research' && <ResearchTab {...props} />}
        {tab === 'about' && <AboutTab />}
      </div>
    </div>
  )
}

/** A tappable row that opens one requirement. */
function RequirementRow({
  title,
  detail,
  lead,
  onClick,
}: {
  title: string
  detail: string
  lead?: ReactNode
  onClick: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="group flex min-h-12 w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/5"
      >
        {lead}
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{title}</span>
          <span className="line-clamp-2 block text-xs text-fg-subtle">{detail}</span>
        </span>
        <Icon name="chevron" className="size-4 shrink-0 text-fg-subtle group-hover:text-fg" />
      </button>
    </li>
  )
}

function PhaseCard({ phase, title, subtitle, onOpen }: { phase: Phase; title: string; subtitle: string; onOpen: (id: string) => void }) {
  return (
    <Card title={title} subtitle={subtitle}>
      <ul className="-mx-2 space-y-0.5">
        {requirementsInPhase(phase).map(({ requirement, timing }) => (
          <RequirementRow key={requirement.id} title={requirement.title} detail={timing.text} onClick={() => onOpen(requirement.id)} />
        ))}
      </ul>
    </Card>
  )
}

function PlanTab({ missionDay, onOpenRequirement }: GuideProps) {
  return (
    <div className="space-y-4">
      <p className="px-1 text-sm text-fg-muted">
        NASA’s plan for a long-duration station mission. You’re on <strong className="font-semibold text-fg">day {missionDay}</strong>, so
        the in-flight checks below are ordered by when they next come up.
      </p>

      <Card title={PHASE_LABEL.inflight} subtitle="By flight day. Tap a check to see what it involves.">
        <ul className="-mx-2 space-y-0.5">
          {nextForEachCheck(missionDay).map((item) => (
            <RequirementRow
              key={item.requirement.id}
              title={item.title}
              detail={item.requirement.when.find((w) => w.phase === 'inflight')?.text ?? ''}
              onClick={() => onOpenRequirement(item.requirement.id)}
              lead={
                <span className="w-16 shrink-0">
                  <span className="block text-xs font-semibold tabular-nums text-fg">Day {item.day}</span>
                  <span className="block text-[11px] text-fg-subtle">{relativeDay(item.day, missionDay)}</span>
                </span>
              }
            />
          ))}
        </ul>
        <h3 className="eyebrow mt-5 mb-1">No fixed day</h3>
        <ul className="-mx-2 space-y-0.5">
          {UNSCHEDULED_INFLIGHT.map((r) => (
            <RequirementRow
              key={r.id}
              title={r.title}
              detail={r.when.find((w) => w.phase === 'inflight')?.text ?? ''}
              onClick={() => onOpenRequirement(r.id)}
            />
          ))}
        </ul>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <PhaseCard phase="before" title={PHASE_LABEL.before} subtitle="From assignment to launch, earliest first" onOpen={onOpenRequirement} />
        <PhaseCard phase="after" title={PHASE_LABEL.after} subtitle="From landing day to return to duty" onOpen={onOpenRequirement} />
      </div>

      <Card title="Every year, for life" subtitle="The annual exam NASA offers every active and retired astronaut (MR089S)">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ANNUAL_EXAM.map((e) => (
            <li key={e.title} className="rounded-2xl border border-line bg-white/3 p-3.5 text-sm">
              <h3 className="font-semibold text-accent">{e.title}</h3>
              <p className="mt-1 text-fg-muted">{e.text}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

const phasesOf = (phases: Phase[]) => phases.map((p) => PHASE_LABEL[p]).join(' · ')

function SystemsTab({ highlightSystemId, onOpenRequirement, onOpenRegion }: GuideProps) {
  return (
    <div>
      <p className="mb-4 px-1 text-sm text-fg-muted">
        NASA files its {LSAH_DOCUMENT_COUNT} medical requirement documents under ten body systems. Tap a check to see what it
        measures and when.
      </p>
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {LSAH_SYSTEMS.map((s) => (
          <li
            key={s.id}
            id={`lsah-${s.id}`}
            className={`surface flex scroll-mt-24 flex-col p-4 sm:p-5 ${s.id === highlightSystemId ? 'ring-2 ring-accent/70' : ''}`}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-semibold">{s.label}</h2>
              <span className="shrink-0 rounded-full bg-white/6 px-2.5 py-0.5 text-xs text-fg-muted tabular-nums">
                {s.documents} {s.documents === 1 ? 'doc' : 'docs'}
              </span>
            </div>
            <p className="mt-1 text-sm text-fg-muted">{s.summary}</p>
            <ul className="-mx-2 mt-3 space-y-0.5">
              {requirementsForSystem(s.id).map((r) => (
                <RequirementRow
                  key={r.id}
                  title={r.title}
                  detail={phasesOf(r.when.map((w) => w.phase))}
                  onClick={() => onOpenRequirement(r.id)}
                />
              ))}
            </ul>
            <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
              {s.regionIds.length > 0 ? (
                <>
                  <span className="mr-1 text-xs text-fg-subtle">Your readings:</span>
                  {s.regionIds.map((id) => (
                    <button key={id} type="button" onClick={() => onOpenRegion(id)} className="btn btn-tinted btn-sm">
                      {regionsById[id]?.label ?? id}
                      <Icon name="chevron" className="size-3.5" />
                    </button>
                  ))}
                </>
              ) : (
                <span className="text-xs text-fg-subtle">Measured by equipment or in the clinic, not self-logged</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ResearchTab({ onTrend }: GuideProps) {
  const [topic, setTopic] = useState<Topic | null>(null)
  const findings = topic ? FINDINGS.filter((f) => f.topic === topic) : FINDINGS

  return (
    <div>
      <p className="mb-3 px-1 text-sm text-fg-muted">
        What NASA’s astronaut health data and related studies have shown, with what each finding means for you.
      </p>
      <div role="group" aria-label="Filter by topic" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        {[null, ...TOPICS].map((t) => {
          const active = t === topic
          const count = t ? FINDINGS.filter((f) => f.topic === t).length : FINDINGS.length
          return (
            <button
              key={t ?? 'all'}
              type="button"
              aria-pressed={active}
              onClick={() => setTopic(t)}
              className={`btn btn-sm shrink-0 border ${
                active ? 'border-accent bg-accent text-ink-950' : 'border-line bg-white/4 text-fg-muted hover:text-fg'
              }`}
            >
              {t ?? 'All'} <span className="tabular-nums opacity-70">{count}</span>
            </button>
          )
        })}
      </div>

      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-live="polite">
        {findings.map((f) => (
          <li key={f.id} className="surface flex flex-col p-4 sm:p-5">
            <div className="eyebrow">{f.topic}</div>
            <p className="mt-2 text-[30px] leading-none font-bold tracking-[-0.02em] text-accent tabular-nums">{f.stat}</p>
            <p className="mt-1.5 text-sm font-medium text-fg">{f.statLabel}</p>
            <p className="mt-3 text-sm text-fg-muted">{f.finding}</p>
            <div className="mt-3 rounded-2xl border border-accent/25 bg-accent/8 p-3 text-sm">
              <div className="text-xs font-semibold text-accent">What it means for you</div>
              <p className="mt-0.5 text-fg">{f.meaning}</p>
            </div>
            <div className="mt-auto pt-3">
              {f.indicatorIds?.length ? (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {f.indicatorIds.map((id) => (
                    <button key={id} type="button" onClick={() => onTrend(id)} className="btn btn-plain btn-sm">
                      <Icon name="trends" className="size-3.5" /> Your {indicatorsById[id]?.label ?? id}
                    </button>
                  ))}
                </div>
              ) : null}
              <p className="text-xs text-fg-subtle">Source: {f.source}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AboutTab() {
  return (
    <div className="space-y-4">
      <section
        className="surface overflow-hidden p-5 sm:p-7"
        style={{ backgroundImage: 'radial-gradient(40rem 16rem at 100% 0%, rgb(42 157 143 / 0.22), transparent 70%)' }}
        aria-labelledby="lsah-title"
      >
        <div className="eyebrow text-accent">NASA occupational health</div>
        <h2 id="lsah-title" className="mt-1 text-2xl leading-tight font-bold tracking-[-0.015em] sm:text-[28px]">
          Lifetime Surveillance of Astronaut Health
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-fg">
          LSAH is NASA’s occupational health program for the astronaut corps. It screens every astronaut and follows them through
          their career and after it, combining routine medical exams, occupational health records and long-duration flight data.
          The aim is to catch work-related illness early, before it becomes disease, and to set evidence-based health standards.
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-muted">
          PULSAR follows the same body systems between those exams, so changes reach the flight surgeon sooner.
        </p>
        <dl className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-line bg-line">
          {[
            ['Body systems', LSAH_SYSTEMS.length],
            ['Requirement docs', LSAH_DOCUMENT_COUNT],
            ['Began', 1989],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col-reverse justify-end bg-ink-900 p-3 sm:p-4">
              <dt className="mt-0.5 text-xs text-fg-muted">{label}</dt>
              <dd className="text-2xl font-bold tracking-tight text-accent tabular-nums sm:text-[28px]">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <Card title="What NASA does with the data">
          <ul className="space-y-2.5 text-sm">
            {LSAH_PURPOSES.map((p) => (
              <li key={p} className="flex gap-2.5">
                <Icon name="check" className="mt-0.5 size-4 shrink-0 text-nominal" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Reading LSAH data responsibly" subtitle="NASA’s own caveats about this data">
          <ul className="space-y-2.5 text-sm">
            {LSAH_LIMITATIONS.map((l) => (
              <li key={l} className="flex gap-2.5">
                <Icon name="info" className="mt-0.5 size-4 shrink-0 text-accent" />
                <span>{l}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="From study to lifetime surveillance">
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {LSAH_TIMELINE.map((t, i) => (
            <li key={t.when} className="relative border-l-2 border-sea/40 pl-4">
              <span className="absolute top-0.5 -left-[7px] size-3 rounded-full border-2 border-ink-900 bg-sea" aria-hidden />
              <div className="text-xs font-semibold tracking-wide text-accent uppercase">{t.when}</div>
              <div className="mt-0.5 font-medium">
                <span className="sr-only">Step {i + 1}: </span>
                {t.title}
              </div>
              <p className="mt-1 text-sm text-fg-muted">{t.text}</p>
            </li>
          ))}
        </ol>
      </Card>

      <Card title="Where this guide comes from" subtitle="Read from NASA’s own material and summarized in plain words">
        <ul className="space-y-2 text-sm text-fg-muted">
          {LSAH_SOURCES.map((s) => (
            <li key={s} className="flex gap-2.5">
              <Icon name="doc" className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
