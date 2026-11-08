import { useState, type ReactNode } from 'react'
import { Card, PageHeader } from '../components/Card'
import { Icon } from '../components/Icon'
import { regionsById } from '../config'
import {
  LSAH_DOCUMENTS,
  LSAH_LIMITATIONS,
  LSAH_LINKS,
  LSAH_PUBLICATIONS,
  LSAH_SYSTEMS,
  LSAH_TIMELINE,
  pubmedUrl,
  type Topic,
} from '../content/lsah'

const TOTAL_DOCUMENTS = LSAH_SYSTEMS.reduce((n, s) => n + s.documents, 0)
const TOPICS = [...new Set(LSAH_PUBLICATIONS.flatMap((p) => p.topics))] as Topic[]

function ExternalLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const mail = href.startsWith('mailto:')
  return (
    <a href={href} target={mail ? undefined : '_blank'} rel={mail ? undefined : 'noopener noreferrer'} className={className}>
      {children}
      {!mail && <span className="sr-only"> (opens in a new tab)</span>}
    </a>
  )
}

function SectionTitle({ id, title, children }: { id: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-3 px-1">
      <h2 id={id} className="text-lg font-semibold tracking-tight">
        {title}
      </h2>
      {children && <p className="mt-0.5 text-sm text-fg-muted">{children}</p>}
    </div>
  )
}

/** NASA's Lifetime Surveillance of Astronaut Health program, tied back to the body systems tracked here. */
export function ResourcesView({
  highlightId,
  onOpenRegion,
}: {
  /** LSAH system the user jumped here from, outlined so it's easy to spot. */
  highlightId?: string | null
  onOpenRegion: (regionId: string) => void
}) {
  const [topic, setTopic] = useState<Topic | null>(null)
  const papers = topic ? LSAH_PUBLICATIONS.filter((p) => p.topics.includes(topic)) : LSAH_PUBLICATIONS

  return (
    <div>
      <PageHeader title="NASA resources">What NASA monitors across an astronaut's career, and where to read more.</PageHeader>

      <section
        className="surface overflow-hidden p-5 sm:p-7"
        style={{ backgroundImage: 'radial-gradient(40rem 16rem at 100% 0%, rgb(217 119 6 / 0.16), transparent 70%)' }}
        aria-labelledby="lsah-title"
      >
        <div className="eyebrow text-sand">NASA Life Sciences Portal</div>
        <h2 id="lsah-title" className="mt-1 text-2xl leading-tight font-bold tracking-[-0.015em] sm:text-[28px]">
          Lifetime Surveillance of Astronaut Health
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-fg">
          LSAH is NASA's occupational health program for the astronaut corps. It screens every astronaut and keeps following
          them through their career and after it, combining routine medical exams, occupational health records and
          long-duration flight data to catch work-related illness early and set evidence-based health standards.
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-muted">
          AstroPulse is a self-check between those exams: it tracks daily vitals in the same body systems, so changes reach the
          flight surgeon sooner.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <ExternalLink href={LSAH_LINKS.overview} className="btn btn-ember">
            Open LSAH on NASA's portal <Icon name="external" className="size-4" />
          </ExternalLink>
          <ExternalLink href={LSAH_LINKS.researchDetails} className="btn btn-plain">
            Research details <Icon name="external" className="size-4" />
          </ExternalLink>
        </div>
        <dl className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-line bg-line">
          {[
            ['Body systems watched', LSAH_SYSTEMS.length],
            ['Requirement docs', TOTAL_DOCUMENTS],
            ['Year it began', 1989],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col-reverse justify-end bg-navy-900 p-3 sm:p-4">
              <dt className="mt-0.5 text-xs text-fg-muted">{label}</dt>
              <dd className="text-2xl font-bold tracking-tight text-sand tabular-nums sm:text-[28px]">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-10" aria-labelledby="systems-title">
        <SectionTitle id="systems-title" title="What NASA monitors">
          Each body system has its own medical requirements and test protocols. Tap a system marked “In AstroPulse” to see
          your own readings.
        </SectionTitle>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {LSAH_SYSTEMS.map((s) => (
            <li
              key={s.id}
              id={`lsah-${s.id}`}
              className={`surface flex scroll-mt-24 flex-col p-4 sm:p-5 ${s.id === highlightId ? 'ring-2 ring-sand/70' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold">{s.label}</h3>
                <span className="shrink-0 rounded-full bg-white/6 px-2.5 py-0.5 text-xs text-fg-muted tabular-nums">
                  {s.documents} {s.documents === 1 ? 'doc' : 'docs'}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-fg-muted">{s.summary}</p>
              <ul className="mt-3 space-y-1.5 text-sm" aria-label="Example requirements">
                {s.examples.map((e) => (
                  <li key={e} className="flex gap-2">
                    <Icon name="doc" className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
                {s.regionIds.length > 0 ? (
                  <>
                    <span className="mr-1 text-xs text-fg-subtle">In AstroPulse:</span>
                    {s.regionIds.map((id) => (
                      <button key={id} type="button" onClick={() => onOpenRegion(id)} className="btn btn-tinted btn-sm">
                        {regionsById[id]?.label ?? id}
                        <Icon name="chevron" className="size-3.5" />
                      </button>
                    ))}
                  </>
                ) : (
                  <span className="text-xs text-fg-subtle">Clinic or environment checks, not self-logged here</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <Card title="Key documents" subtitle="PDFs on the NASA Life Sciences Portal">
          <ul className="-mx-2 space-y-1">
            {LSAH_DOCUMENTS.map((d) => (
              <li key={d.url}>
                <ExternalLink href={d.url} className="flex gap-3 rounded-xl p-2 transition-colors hover:bg-white/5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-ember/12 text-sand">
                    <Icon name="doc" className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      {d.title} <Icon name="external" className="size-3.5 text-fg-subtle" />
                    </span>
                    <span className="mt-0.5 block text-xs text-fg-muted">{d.description}</span>
                  </span>
                </ExternalLink>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Reading LSAH data responsibly" subtitle="NASA's own caveats about this data">
          <ul className="space-y-2.5 text-sm">
            {LSAH_LIMITATIONS.map((l) => (
              <li key={l} className="flex gap-2.5">
                <Icon name="info" className="mt-0.5 size-4 shrink-0 text-accent" />
                <span className="text-fg">{l}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="From study to lifetime surveillance" className="mt-4">
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {LSAH_TIMELINE.map((t, i) => (
            <li key={t.when} className="relative border-l-2 border-ember/40 pl-4">
              <span className="absolute top-0.5 -left-[7px] size-3 rounded-full border-2 border-navy-900 bg-ember" aria-hidden />
              <div className="text-xs font-semibold tracking-wide text-sand uppercase">{t.when}</div>
              <div className="mt-0.5 font-medium">
                <span className="sr-only">Step {i + 1}: </span>
                {t.title}
              </div>
              <p className="mt-1 text-sm text-fg-muted">{t.text}</p>
            </li>
          ))}
        </ol>
      </Card>

      <section className="mt-10" aria-labelledby="papers-title">
        <SectionTitle id="papers-title" title="Selected research">Papers and reports built on LSAH data, newest first.</SectionTitle>
        <div role="group" aria-label="Filter by topic" className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
          {[null, ...TOPICS].map((t) => {
            const active = t === topic
            const count = t ? LSAH_PUBLICATIONS.filter((p) => p.topics.includes(t)).length : LSAH_PUBLICATIONS.length
            return (
              <button
                key={t ?? 'all'}
                type="button"
                aria-pressed={active}
                onClick={() => setTopic(t)}
                className={`btn btn-sm shrink-0 border ${
                  active ? 'border-accent bg-accent text-navy-950' : 'border-line bg-white/4 text-fg-muted hover:text-fg'
                }`}
              >
                {t ?? 'All'} <span className="tabular-nums opacity-70">{count}</span>
              </button>
            )
          })}
        </div>
        <ul className="surface divide-y divide-line px-4 sm:px-5" aria-live="polite">
          {papers.map((p) => (
            <li key={p.title} className="py-3.5">
              {p.pmid ? (
                <ExternalLink href={pubmedUrl(p.pmid)} className="group text-[15px] font-medium text-fg hover:text-accent">
                  {p.title}
                  <Icon name="external" className="ml-1.5 inline size-3.5 align-[-2px] text-fg-subtle group-hover:text-accent" />
                </ExternalLink>
              ) : (
                <span className="text-[15px] font-medium">{p.title}</span>
              )}
              <div className="mt-1 text-xs text-fg-muted">
                {p.authors} · {p.venue} · <span className="tabular-nums">{p.year}</span>
                {p.pmid && <span className="text-fg-subtle"> · PubMed</span>}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <Card title="More from NASA" className="mt-10">
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            [LSAH_LINKS.dataRequest, 'Request LSAH data', 'Researchers can apply for grouped data'],
            [LSAH_LINKS.explore, 'Explore the data archive', 'Life sciences datasets from past missions'],
            [LSAH_LINKS.standardMeasures, 'Standard Measures', 'Core measures taken the same way on the ISS and in analogs'],
            [LSAH_LINKS.newsletters, 'LSAH newsletters', 'Updates on findings and surveillance outcomes'],
            [LSAH_LINKS.contact, 'Contact the LSAH team', 'jsc-lsah@mail.nasa.gov'],
          ].map(([href, title, sub]) => (
            <li key={href}>
              <ExternalLink href={href} className="flex h-full items-center gap-3 rounded-2xl border border-line p-3 transition-colors hover:bg-white/5">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{title}</span>
                  <span className="block truncate text-xs text-fg-subtle">{sub}</span>
                </span>
                <Icon name={href.startsWith('mailto:') ? 'send' : 'external'} className="size-4 shrink-0 text-fg-subtle" />
              </ExternalLink>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
