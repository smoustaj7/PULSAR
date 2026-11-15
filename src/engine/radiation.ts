/**
 * Radiation dose tracker: pure functions, the dosimeter's readings and where the crew is in ->
 * the dose so far, how fast it is building, how much of each NASA limit it uses, and how many
 * days are left before each limit at this rate. No React, no storage, no clock (callers pass
 * `now`).
 *
 * Vital signs can't measure radiation: a dose does its harm long before a pulse or temperature
 * would show it. So the dose comes from the personal dosimeter every crew member carries, and
 * between readings (or before the first) from the typical dose rate where the crew is.
 */
import type { Reading, Status } from './types'

const DAY = 86_400_000

/** The reading the dosimeter gives: the dose since launch, in mSv. */
export const DOSE_ID = 'radiationDose'

/** Typical dose a day where the crew is, from NASA's numbers, for when the dosimeter hasn't said. */
export const DOSE_RATE: Record<string, { perDay: number; source: string }> = {
  station: { perDay: 0.5, source: 'About 0.5 mSv a day on the space station (LSAH Newsletter, 2023)' },
  transit: { perDay: 1.6, source: 'About 300 mSv in six months on the way to Mars (NASA, Space Faring)' },
  lunar: { perDay: 0.5, source: 'About 0.5 mSv a day on the lunar surface (LSAH Newsletter, 2023)' },
  mars: { perDay: 0.7, source: 'About 400 mSv in 18 months on the surface of Mars (NASA, Space Faring)' },
  rover: { perDay: 0.7, source: 'The Mars surface rate; a rover has less shielding than a base' },
}
const FALLBACK_RATE = DOSE_RATE.station

/**
 * Above this a day the dose is no longer "low dose rate" in NASA's evidence reports. In space
 * that means a solar particle event, the one time radiation can make someone sick within days.
 */
export const STORM_RATE = 10

export type LimitId = '30-day' | '1-year' | 'career'

export interface DoseLimit {
  id: LimitId
  label: string
  mSv: number
  /** The days the limit counts over; null for a whole career. */
  windowDays: number | null
  /** What the limit keeps from happening, in plain words. */
  protects: string
}

/**
 * NASA's limits (NASA-STD-3001 Vol. 1 Rev. B). The 30-day and 1-year limits are for the
 * blood-forming organs and the heart, in mGy-Eq; a dosimeter reads mSv, which in space comes
 * out higher than mGy-Eq for the same exposure, so comparing the two errs on the safe side.
 * The career limit is the same 600 mSv for every astronaut, whatever their age or sex.
 */
export const DOSE_LIMITS: DoseLimit[] = [
  { id: '30-day', label: '30-day limit', mSv: 250, windowDays: 30, protects: 'Radiation sickness and harm to blood and heart from a burst, such as a solar storm' },
  { id: '1-year', label: '1-year limit', mSv: 500, windowDays: 365, protects: 'Harm to blood-forming organs and the heart over a year' },
  { id: 'career', label: 'Career limit', mSv: 600, windowDays: null, protects: 'Long-term cancer risk, which grows with every mSv' },
]

export interface LimitUse extends DoseLimit {
  /** Dose counted against this limit now, in mSv. */
  used: number
  fraction: number
  /** Days until the limit is reached at the current rate: 0 if already reached, null if never at this rate. */
  daysLeft: number | null
  /** Epoch ms the limit is reached at this rate, when it is. */
  reachedAt: number | null
  status: Status
}

export interface RadiationState {
  /** Dose since launch, in mSv. */
  total: number
  /** Whether the total rests on a dosimeter reading rather than the typical rate alone. */
  measured: boolean
  lastReadingAt: number | null
  /** mSv a day, the rate projections use. */
  ratePerDay: number
  rateFrom: 'dosimeter' | 'typical'
  /** What the typical rate here is based on. */
  typical: { perDay: number; source: string }
  /** The dose rate jumped above STORM_RATE in the latest readings: likely a solar particle event. */
  storm: boolean
  limits: LimitUse[]
  /** The limit that will be reached first (or is fullest, if none will be). */
  nearest: LimitUse
  status: Status
}

const days = (ms: number) => ms / DAY

/** Dosimeter readings, oldest first. */
export const doseReadings = (readings: readonly Reading[]) =>
  readings.filter((r) => r.indicatorId === DOSE_ID).sort((a, b) => a.timestamp - b.timestamp)

/**
 * The rate the dosimeter shows: across the readings of the 7 days up to the latest one, or, with
 * a single reading, since launch. Null when the readings can't tell (too close together).
 */
function measuredRate(series: readonly Reading[], missionStart: number): number | null {
  const last = series.at(-1)
  if (!last) return null
  const first = series.find((r) => r.timestamp >= last.timestamp - 7 * DAY && r !== last)
  const [from, value] = first ? [first.timestamp, first.value] : [missionStart, 0]
  const span = days(last.timestamp - from)
  return span >= 0.5 ? Math.max(0, (last.value - value) / span) : null
}

/** The dose since launch at time `t`: from the readings where they reach, the rate beyond them. */
export function doseAt(t: number, series: readonly Reading[], missionStart: number, ratePerDay: number): number {
  if (t <= missionStart) return 0
  const first = series[0]
  const last = series.at(-1)
  if (!first || !last) return ratePerDay * days(t - missionStart)
  if (t >= last.timestamp) return last.value + ratePerDay * days(t - last.timestamp)
  if (t <= first.timestamp) return first.timestamp <= missionStart ? first.value : (first.value * (t - missionStart)) / (first.timestamp - missionStart)
  const after = series.findIndex((r) => r.timestamp >= t)
  const a = series[after - 1]
  const b = series[after]
  return a.value + ((b.value - a.value) * (t - a.timestamp)) / (b.timestamp - a.timestamp)
}

const statusOf = (fraction: number): Status => (fraction >= 1 ? 'critical' : fraction >= 0.5 ? 'caution' : 'nominal')
const RANK: Record<Status, number> = { unknown: 0, nominal: 1, caution: 2, critical: 3 }

export function radiationState({
  readings,
  environmentId,
  missionStart,
  now,
}: {
  readings: readonly Reading[]
  environmentId: string
  missionStart: number
  now: number
}): RadiationState {
  const series = doseReadings(readings).filter((r) => r.timestamp <= now)
  const typical = DOSE_RATE[environmentId] ?? FALLBACK_RATE
  const measured = measuredRate(series, missionStart)
  const ratePerDay = measured ?? typical.perDay
  const last = series.at(-1) ?? null
  const before = series.at(-2)

  // A jump between the last two readings, recent enough to still matter.
  const storm =
    !!last &&
    !!before &&
    now - last.timestamp <= 2 * DAY &&
    last.timestamp - before.timestamp <= 3 * DAY &&
    (last.value - before.value) / Math.max(days(last.timestamp - before.timestamp), 1 / 24) >= STORM_RATE

  const total = doseAt(now, series, missionStart, ratePerDay)
  const elapsed = days(now - missionStart)

  const limits: LimitUse[] = DOSE_LIMITS.map((limit) => {
    const used = limit.windowDays === null ? total : total - doseAt(now - limit.windowDays * DAY, series, missionStart, ratePerDay)
    // Inside a rolling window, old dose drops out as new dose comes in; once the window is
    // full it drops out at about the window's average rate. A steady rate whose window total
    // stays under the limit never reaches it.
    const dropping = limit.windowDays !== null && elapsed >= limit.windowDays ? used / limit.windowDays : 0
    const net = ratePerDay - dropping
    const reachable = limit.windowDays === null || ratePerDay * limit.windowDays >= limit.mSv
    const daysLeft = used >= limit.mSv ? 0 : reachable && net > 0 ? (limit.mSv - used) / net : null
    const fraction = used / limit.mSv
    return {
      ...limit,
      used,
      fraction,
      daysLeft,
      reachedAt: daysLeft === null ? null : now + daysLeft * DAY,
      status: statusOf(fraction),
    }
  })

  const nearest = [...limits].sort(
    (a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity) || b.fraction - a.fraction,
  )[0]
  const worst = limits.reduce<Status>((s, l) => (RANK[l.status] > RANK[s] ? l.status : s), 'nominal')

  return {
    total,
    measured: !!last,
    lastReadingAt: last?.timestamp ?? null,
    ratePerDay,
    rateFrom: measured === null ? 'typical' : 'dosimeter',
    typical,
    storm,
    limits,
    nearest,
    status: storm ? 'critical' : worst,
  }
}

export interface RadiationAdvice {
  id: string
  title: string
  body: string
  warn?: boolean
}

/** What to do about the dose today, most urgent first. */
export function radiationAdvice(s: RadiationState, now: number): RadiationAdvice[] {
  const out: RadiationAdvice[] = []
  if (s.storm)
    out.push({
      id: 'storm',
      warn: true,
      title: 'Dose rate jumped: likely a solar storm',
      body: `Above ${STORM_RATE} mSv a day. Go to the storm shelter or the most shielded module now, tell the ground, and read your dosimeter again in a few hours.`,
    })
  if (s.storm || s.limits[0].fraction >= 0.5)
    out.push({
      id: 'symptoms',
      warn: true,
      title: 'Watch for radiation sickness',
      body: 'After a large dose, nausea, vomiting, tiredness and fever can start within hours to 2 days. Log your temperature and tell the flight surgeon about any of them.',
    })
  const career = s.limits.find((l) => l.id === 'career')!
  if (career.fraction >= 1)
    out.push({
      id: 'career-over',
      warn: true,
      title: 'Over NASA’s career limit',
      body: 'Tell the flight surgeon. Sleep and work in the most shielded areas, and avoid spacewalks and rover trips that aren’t essential.',
    })
  else if (career.fraction >= 0.5)
    out.push({
      id: 'career-half',
      title: 'Over half your career limit used',
      body: 'Ask the flight surgeon how to keep the rest of the mission’s dose down: shielded sleep areas, and fewer or shorter spacewalks.',
    })
  if (!s.measured)
    out.push({
      id: 'measure',
      title: 'These are estimates',
      body: `${s.typical.source}. Log the total on your personal dosimeter to track your real dose.`,
    })
  else if (s.lastReadingAt !== null && now - s.lastReadingAt > 2 * DAY)
    out.push({
      id: 'stale',
      title: 'Read your dosimeter',
      body: `Your last reading was ${Math.floor(days(now - s.lastReadingAt))} days ago. Since then PULSAR adds the typical rate, which misses any solar storm.`,
    })
  out.push({
    id: 'how',
    title: 'Why it adds up',
    body: 'Space radiation causes no symptoms at everyday doses, but each mSv adds a little to long-term cancer risk. NASA’s limits keep that risk small; sickness only follows a large burst, such as a solar storm.',
  })
  return out
}

const round = (n: number) => (n >= 100 ? Math.round(n) : Math.round(n * 10) / 10)

/** One line for the health assistant: dose, rate, and how far each limit is. */
export function radiationSummary(s: RadiationState): string {
  const parts = [
    `Radiation: about ${round(s.total)} mSv since launch (${s.measured ? 'from the dosimeter' : 'estimated, no dosimeter reading yet'})`,
    `${round(s.ratePerDay)} mSv a day (${s.rateFrom === 'dosimeter' ? 'dosimeter' : 'typical here'})`,
    ...s.limits.map(
      (l) =>
        `${l.label} ${round(l.used)} of ${l.mSv} mSv (${Math.round(l.fraction * 100)}%), ${
          l.daysLeft === 0 ? 'reached' : l.daysLeft === null ? 'not reached at this rate' : `reached in about ${Math.round(l.daysLeft)} days`
        }`,
    ),
  ]
  if (s.storm) parts.push(`dose rate above ${STORM_RATE} mSv a day, likely a solar particle event`)
  return parts.join('; ')
}
