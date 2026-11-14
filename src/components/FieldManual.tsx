import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import hazards from '../config/hazards.json'
import type { IndicatorConfig, Range, Status } from '../engine/types'
import { indicatorIcon } from '../lib/indicatorIcons'
import { cadence, hazardIcon, steps } from '../lib/manual'
import { STATUS_META, formatRange } from '../lib/status'
import { useActiveConfig } from '../lib/useActiveConfig'
import { Card, PageHeader } from './Card'
import { Icon } from './Icon'
import { Sheet } from './Sheet'

const SPRING = { type: 'spring', bounce: 0, duration: 0.35 } as const

/** What each colour asks of you, in one line each. */
const STATUS_KEY: [Status, string][] = [
  ['nominal', 'In range. Keep your routine.'],
  ['caution', 'Off range or drifting. Re-measure and watch it.'],
  ['critical', 'Far off range. Act now and tell the ground.'],
  ['unknown', 'No reading yet. Take the measurement.'],
]

const rangeText = (r: Range, unit: string) =>
  r.min !== null && r.max !== null ? `${r.min}–${r.max} ${unit}` : r.min !== null ? `≥ ${r.min} ${unit}` : `≤ ${r.max} ${unit}`

function trendText(i: IndicatorConfig): string | null {
  if (!i.trend) return null
  const parts = [
    i.trend.rise !== undefined && `rises ${i.trend.rise} ${i.unit}`,
    i.trend.drop !== undefined && `drops ${i.trend.drop} ${i.unit}`,
  ].filter(Boolean)
  return `Flagged early if it ${parts.join(' or ')} against your ${i.trend.baselineDays ?? 7}-day average.`
}

type Hazard = (typeof hazards)[number]

/**
 * The reference you reach for mid-task: the colour key and who to call first, then each
 * measurement as one line that opens into numbered steps, then the hazards behind it all,
 * each a tile that opens into the detail. Nothing long is shown until it's asked for.
 */
export function FieldManual() {
  const { config, environment } = useActiveConfig()
  const [openId, setOpenId] = useState<string | null>(null)
  const [hazard, setHazard] = useState<Hazard | null>(null)
  const regionLabel = (id: string) => config.regions.find((r) => r.id === id)?.label ?? id

  return (
    <div className="space-y-4">
      <PageHeader title="Field manual">How to take each measurement, what the colours mean, and when to call the ground.</PageHeader>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card title="The colours" className="lg:col-span-7">
          <ul className="grid gap-x-5 gap-y-3.5 sm:grid-cols-2">
            {STATUS_KEY.map(([status, text]) => (
              <li key={status} className="flex gap-3">
                <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${STATUS_META[status].dot}`} aria-hidden />
                <p className="text-sm text-fg-muted">
                  <span className={`font-semibold ${STATUS_META[status].text}`}>{STATUS_META[status].label}</span>
                  <span className="block text-fg">{text}</span>
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <section aria-labelledby="ground-title" className="surface border-critical/30 p-4 sm:p-5 lg:col-span-5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-full bg-critical/15 text-critical" aria-hidden>
              <Icon name="alert" className="size-4" />
            </span>
            <h2 id="ground-title" className="font-display text-xl leading-none font-semibold tracking-[-0.02em]">
              Call the ground
            </h2>
          </div>
          <p className="mt-3 text-sm text-fg">{environment.escalation}</p>
          <dl className="mt-3 flex flex-wrap gap-2 text-xs">
            <div className="rounded-full bg-white/6 px-2.5 py-1">
              <dt className="inline text-fg-subtle">Delay </dt>
              <dd className="inline text-fg">{environment.commsDelay}</dd>
            </div>
            <div className="rounded-full bg-white/6 px-2.5 py-1">
              <dt className="sr-only">Where</dt>
              <dd className="text-fg">{environment.label}</dd>
            </div>
          </dl>
        </section>
      </div>

      <Card title="Measurements" subtitle="Tap one for the steps.">
        <ul className="-mx-2 divide-y divide-line">
          {config.indicators.map((i) => {
            const open = openId === i.id
            const panelId = `manual-${i.id}`
            const trend = trendText(i)
            return (
              <li key={i.id}>
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenId(open ? null : i.id)}
                  className="flex min-h-14 w-full items-center gap-3 rounded-xl px-2 text-left transition-colors hover:bg-white/4"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent/10 text-accent" aria-hidden>
                    <Icon name={indicatorIcon(i.id)} className="size-4.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] leading-snug font-medium text-fg">{i.label}</span>
                    <span className="block text-xs text-fg-subtle">
                      {regionLabel(i.regionId)}
                      {/* Phones fold the schedule in here, so the name keeps the width. */}
                      <span className="sm:hidden"> · {cadence(i.cadenceHours)}</span>
                    </span>
                  </span>
                  <span className="hidden shrink-0 text-right text-sm text-nominal tabular-nums sm:block">{formatRange(i)}</span>
                  <span className="hidden w-20 shrink-0 text-right text-xs text-fg-muted sm:block">{cadence(i.cadenceHours)}</span>
                  <Icon
                    name="chevron"
                    className={`size-4 shrink-0 text-fg-subtle transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      id={panelId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={SPRING}
                      className="overflow-hidden"
                    >
                      <div className="grid gap-4 px-2 pt-1 pb-5 md:grid-cols-[1fr_15rem] md:gap-6 md:pl-14">
                        <div>
                          <h3 className="eyebrow">How to measure</h3>
                          <ol className="mt-2.5 space-y-2.5">
                            {steps(i.howToMeasure).map((step, n) => (
                              <li key={n} className="flex gap-3 text-sm text-fg">
                                <span className="grid size-5.5 shrink-0 place-items-center rounded-full bg-white/8 font-mono text-[11px] text-fg-muted tabular-nums">
                                  {n + 1}
                                </span>
                                <span className="pt-0.5">{step}</span>
                              </li>
                            ))}
                          </ol>
                          <p className="mt-4 text-sm text-fg-muted">{i.whyItMatters}</p>
                        </div>
                        <dl className="grid grid-cols-2 content-start gap-2 text-xs md:grid-cols-1">
                          <div className="rounded-xl bg-nominal/8 px-3 py-2">
                            <dt className="text-fg-subtle">Normal</dt>
                            <dd className="mt-0.5 text-sm text-nominal tabular-nums">{formatRange(i)}</dd>
                          </div>
                          <div className="rounded-xl bg-caution/8 px-3 py-2">
                            <dt className="text-fg-subtle">Caution</dt>
                            <dd className="mt-0.5 text-sm text-caution tabular-nums">{rangeText(i.caution, i.unit)}</dd>
                          </div>
                          {trend && <dd className="col-span-2 px-1 text-fg-muted md:col-span-1">{trend}</dd>}
                        </dl>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            )
          })}
        </ul>
      </Card>

      <Card title="Why it matters" subtitle="The five hazards of spaceflight, from NASA’s Human Research Program.">
        <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          {hazards.map((h) => (
            <li key={h.label}>
              <button
                type="button"
                onClick={() => setHazard(h)}
                className="group flex h-full w-full flex-col gap-3 rounded-2xl border border-line bg-white/3 p-4 text-left transition-[background-color,border-color,transform] duration-150 hover:border-accent/30 hover:bg-white/6 active:scale-[0.98]"
              >
                <span className="flex items-center justify-between">
                  <span className="grid size-9 place-items-center rounded-full bg-sea/15 text-accent" aria-hidden>
                    <Icon name={hazardIcon(h.label)} className="size-4.5" />
                  </span>
                  <Icon name="chevron" className="size-4 text-fg-subtle transition-transform duration-150 group-hover:translate-x-0.5" />
                </span>
                <span className="font-display text-[15px] leading-tight font-semibold text-fg">{h.label}</span>
                <span className="text-xs leading-relaxed text-fg-muted">{h.summary}</span>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Sheet open={!!hazard} onClose={() => setHazard(null)} title={hazard?.label ?? ''} description={hazard?.summary}>
        {hazard && (
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="eyebrow">What it does</h3>
              <p className="mt-1.5 text-fg">{hazard.effects}</p>
            </section>
            <section>
              <h3 className="eyebrow">What you can do</h3>
              <p className="mt-1.5 text-fg">{hazard.actions}</p>
            </section>
            <p className="rounded-xl bg-sea/10 px-3.5 py-3 text-fg">
              <span className="font-medium text-accent">NASA data: </span>
              {hazard.nasa}
            </p>
            <section>
              <h3 className="eyebrow">Body systems it affects</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {config.regions
                  .filter((r) => r.hazards.includes(hazard.label))
                  .map((r) => (
                    <span key={r.id} className="rounded-full bg-white/6 px-2.5 py-1 text-xs text-fg-muted">
                      {r.label}
                    </span>
                  ))}
              </div>
            </section>
          </div>
        )}
      </Sheet>
    </div>
  )
}
