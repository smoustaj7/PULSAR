/**
 * Menstrual cycle engine: pure functions, the astronaut's cycle answers in -> where she is in
 * her cycle, what to expect next, and what to do about it. No React, no storage, no clock
 * (callers pass `now`).
 */

const DAY_MS = 24 * 60 * 60 * 1000

/** The answer to "Do you have a menstrual cycle?". */
export type CyclePattern = 'regular' | 'irregular' | 'none'

/** Hormonal contraception or menstrual suppression, by how it changes bleeding and baselines. */
export type Hormonal = 'combined' | 'continuous' | 'progestin-pill' | 'iud' | 'implant' | 'injection'

export const HORMONAL: { id: Hormonal; label: string; detail: string }[] = [
  { id: 'combined', label: 'Combined pill, patch or ring', detail: 'With a break each month' },
  { id: 'continuous', label: 'Continuous pill', detail: 'No break, to suppress periods' },
  { id: 'progestin-pill', label: 'Progestin-only pill', detail: 'The mini-pill' },
  { id: 'iud', label: 'Hormonal IUD', detail: 'Levonorgestrel coil' },
  { id: 'implant', label: 'Implant', detail: 'In the arm' },
  { id: 'injection', label: 'Injection', detail: 'Every few months' },
]

export interface Cycle {
  pattern: CyclePattern
  /** Local midnight (epoch ms) of each day a period started, oldest first. */
  starts: number[]
  /** Local midnight of the day the latest period ended, once logged. */
  lastEnd?: number
  /** Typical days from one period's first day to the next's. */
  cycleLength: number
  /** Typical days of bleeding. */
  periodLength: number
  /** Null for none. */
  hormonal: Hormonal | null
}

export const CYCLE_LIMITS = { cycleLength: [21, 45], periodLength: [2, 10] } as const
export const defaultCycle = (): Cycle => ({ pattern: 'regular', starts: [], cycleLength: 28, periodLength: 5, hormonal: null })

/**
 * How the cycle is followed:
 * - natural: no hormones, so ovulation and the luteal phase happen and are predicted;
 * - withdrawal: hormones with a monthly break or a regular bleed, so only bleeds are predicted;
 * - suppressed: hormones that usually stop bleeding, so nothing is predicted.
 */
export type CycleMode = 'natural' | 'withdrawal' | 'suppressed'
export const cycleMode = (c: Cycle): CycleMode =>
  c.hormonal === null
    ? 'natural'
    : c.hormonal === 'continuous' || c.hormonal === 'implant' || c.hormonal === 'injection'
      ? 'suppressed'
      : 'withdrawal'

/** Hormones containing estrogen, which with weightlessness raise the risk of a blood clot. */
export const hasEstrogen = (c: Cycle) => c.hormonal === 'combined' || c.hormonal === 'continuous'

export type Phase = 'period' | 'follicular' | 'ovulation' | 'luteal' | 'due' | 'late' | 'active' | 'suppressed' | 'unknown'

export const PHASE_LABEL: Record<Phase, string> = {
  period: 'Period',
  follicular: 'Follicular phase',
  ovulation: 'Ovulation window',
  luteal: 'Luteal phase',
  due: 'Period due',
  late: 'Period late',
  active: 'Hormone days',
  suppressed: 'Suppressed',
  unknown: 'Not started',
}

export interface CycleState {
  mode: CycleMode
  phase: Phase
  /** Day of the current cycle, 1 on the day the latest period started; null with no period logged. */
  day: number | null
  /** The cycle length predictions use: learned from logged periods once there are two, else the typed one. */
  length: number
  /** Whether the length was learned from logged periods. */
  learned: boolean
  /** Day the next period is expected (local midnight); null when not predicted. */
  nextStart: number | null
  /** Days from today to `nextStart` (negative once it has passed). */
  daysUntil: number | null
  /** Give or take this many days on the prediction. */
  window: number
  /** Expected ovulation day of the cycle, natural cycles only. */
  ovulationDay: number | null
  /** Whether a period is going on now (started, not yet ended, within a sensible length). */
  bleeding: boolean
}

export const startOfDay = (t: number) => {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
/** Whole days from `a` to `b`, by calendar date (safe across daylight-saving changes). */
const daysBetween = (a: number, b: number) => Math.round((startOfDay(b) - startOfDay(a)) / DAY_MS)
const addDays = (t: number, days: number) => {
  const d = new Date(startOfDay(t))
  d.setDate(d.getDate() + days)
  return d.getTime()
}

/** Gaps between the last few logged periods that look like whole cycles (not a missed log). */
function cycleGaps(starts: readonly number[]) {
  const gaps: number[] = []
  for (let i = Math.max(1, starts.length - 6); i < starts.length; i++) {
    const gap = daysBetween(starts[i - 1], starts[i])
    if (gap >= 15 && gap <= 60) gaps.push(gap)
  }
  return gaps
}

/** Where the astronaut is in her cycle today. */
export function cycleState(c: Cycle, now: number): CycleState {
  const mode = cycleMode(c)
  const gaps = cycleGaps(c.starts)
  const learned = gaps.length >= 1
  const length = learned ? Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length) : c.cycleLength
  const spread = gaps.length >= 2 ? Math.max(...gaps) - Math.min(...gaps) : 0
  const window = Math.max(c.pattern === 'irregular' ? 5 : 2, Math.ceil(spread / 2))

  const last = c.starts.at(-1)
  const base = { mode, length, learned, window, ovulationDay: null, nextStart: null, daysUntil: null }
  if (last === undefined) return { ...base, phase: mode === 'suppressed' ? 'suppressed' : 'unknown', day: null, bleeding: false }

  const day = daysBetween(last, now) + 1
  const ended = c.lastEnd !== undefined && c.lastEnd >= last
  // A period nobody marked as over is taken to have ended a few days past its usual length.
  const bleeding = !ended && day >= 1 && day <= c.periodLength + 3
  if (mode === 'suppressed') return { ...base, phase: bleeding ? 'period' : 'suppressed', day, bleeding }

  const nextStart = addDays(last, length)
  const daysUntil = daysBetween(now, nextStart)
  const ovulationDay = mode === 'natural' ? Math.max(c.periodLength + 2, length - 14) : null
  const phase: Phase = bleeding
    ? 'period'
    : daysUntil < -window
      ? 'late'
      : daysUntil <= 0
        ? 'due'
        : mode === 'withdrawal'
          ? 'active'
          : day < ovulationDay! - 1
            ? 'follicular'
            : day <= ovulationDay! + 1
              ? 'ovulation'
              : 'luteal'
  return { ...base, phase, day, bleeding, nextStart, daysUntil, ovulationDay }
}

/**
 * What the luteal phase adds to a reading on top of the astronaut's usual level: after
 * ovulation progesterone lifts body temperature about 0.4 °C and resting heart rate about
 * 3 bpm. Hormonal contraception flattens that rise, so only natural cycles shift.
 */
export const LUTEAL_SHIFT: Record<string, number> = { temperature: 0.4, heartRate: 3 }

/**
 * The cycle's expected shift on `indicatorId` at time `t`, for the trend rules to allow for:
 * a temperature rise in the luteal phase is the cycle, not a fever. Zero outside natural cycles.
 */
export function cycleShift(c: Cycle | undefined, indicatorId: string, t: number): number {
  const shift = LUTEAL_SHIFT[indicatorId]
  if (!shift || !c || c.pattern === 'none' || cycleMode(c) !== 'natural' || !c.starts.length) return 0
  // The period that started on or before `t`; before the first one logged, count back from it.
  const first = c.starts[0]
  const start = c.starts.findLast((s) => s <= startOfDay(t)) ?? addDays(first, -Math.ceil(daysBetween(t, first) / c.cycleLength) * c.cycleLength)
  const { length } = cycleState(c, t)
  const day = daysBetween(start, t) + 1
  const ovulationDay = Math.max(c.periodLength + 2, length - 14)
  return day > ovulationDay && day <= length ? shift : 0
}

/** Log a period starting on `day` (any time that day). Returns the updated cycle. */
export function logPeriodStart(c: Cycle, day: number): Cycle {
  const t = startOfDay(day)
  // A start within a week of one already logged corrects it rather than adding another.
  const starts = [...c.starts.filter((s) => Math.abs(daysBetween(s, t)) >= 7), t].sort((a, b) => a - b)
  // An end logged before the latest start belonged to an earlier period.
  const latest = starts.at(-1)!
  return { ...c, starts, lastEnd: c.lastEnd !== undefined && c.lastEnd >= latest ? c.lastEnd : undefined }
}

export const logPeriodEnd = (c: Cycle, day: number): Cycle => ({ ...c, lastEnd: startOfDay(day) })

/** Each day of the current cycle, for drawing it as a strip. */
export function cycleDays(c: Cycle, s: CycleState): Phase[] {
  const length = Math.max(s.length, s.day ?? 0)
  return Array.from({ length }, (_, i) => {
    const day = i + 1
    if (day <= c.periodLength) return 'period'
    if (s.ovulationDay === null) return 'active'
    if (day < s.ovulationDay - 1) return 'follicular'
    if (day <= s.ovulationDay + 1) return 'ovulation'
    return day <= s.length ? 'luteal' : 'late'
  })
}

export interface Advice {
  id: string
  title: string
  body: string
}

/**
 * What to do today, most pressing first: preparing for a period, looking after the body
 * through it, and what each phase changes on a mission. Written for life on a spacecraft,
 * where supplies are counted, water is recycled and the flight surgeon is a call away.
 */
export function cycleAdvice(c: Cycle, s: CycleState): Advice[] {
  const out: Advice[] = []
  const days = (n: number) => `${n} day${n === 1 ? '' : 's'}`

  if (s.phase === 'unknown')
    out.push({ id: 'log-first', title: 'Log your next period', body: 'Tap Period started on its first day. From then on PULSAR predicts the next one and tells you what each phase changes.' })

  if (s.phase === 'period') {
    out.push(
      { id: 'supplies', title: 'Keep supplies within reach', body: 'Stow enough pads, tampons or period underwear for the next few days where you sleep and work. Used products go sealed into the wet trash.' },
      { id: 'iron', title: 'Drink and eat iron', body: 'Bleeding adds to the red blood cells spaceflight already costs you. Drink to your daily target and pick iron-rich menu items. Tell the crew medical officer if you feel dizzy or unusually tired.' },
      { id: 'cramps', title: 'Ease cramps early', body: 'Take pain relief from the medical kit as your flight surgeon has cleared it, before the pain builds. Light cycling can help too.' },
    )
  }

  if (s.daysUntil !== null && s.daysUntil > 0 && s.daysUntil <= 3 && !s.bleeding)
    out.push({ id: 'prepare', title: `Period due in ${days(s.daysUntil)}`, body: 'Move supplies into your sleep station and work bag now, so you are ready wherever it starts.' })

  if (s.phase === 'due')
    out.push({ id: 'due', title: 'Your period is due', body: 'It could start any day now. Keep supplies close and tap Period started when it does.' })

  if (s.phase === 'late' && s.daysUntil !== null) {
    const late = -s.daysUntil
    out.push({
      id: 'late',
      title: `${days(late)} later than expected`,
      body:
        late >= 7
          ? 'Stress, shifted sleep and spaceflight itself can delay a period. As it is a week or more late, raise it with your flight surgeon at the next private medical conference.'
          : 'Stress, shifted sleep and spaceflight itself can delay a period. Log it when it starts; if it is a week late, raise it with your flight surgeon.',
    })
  }

  if (s.phase === 'follicular')
    out.push({ id: 'train', title: 'A good window for hard training', body: 'Energy and recovery often run highest now. Plan heavy resistance sessions for these days to protect bone and muscle.' })

  if (s.phase === 'ovulation')
    out.push({ id: 'ovulation', title: 'Ovulation around now', body: 'Some feel a brief one-sided ache. Afterwards your temperature and pulse rise a little and stay up until your next period.' })

  if (s.phase === 'luteal') {
    out.push(
      { id: 'baseline', title: 'Temperature and pulse run higher', body: `About +${LUTEAL_SHIFT.temperature} °C and +${LUTEAL_SHIFT.heartRate} bpm is normal in this phase. PULSAR allows for it, so it isn’t flagged as a trend; a real fever still is.` },
      { id: 'fluid', title: 'Go easy on salt', body: 'Water retention adds to the fluid shift toward your head in weightlessness: puffiness and headaches. Keep drinking and pick less salty food.' },
      { id: 'mood', title: 'Sleep and mood may dip', body: 'Lighter sleep and a lower mood before a period are common. Protect your sleep window, and tell a crewmate or the psychologist if it weighs on you.' },
    )
  }

  if (s.mode !== 'natural' && hasEstrogen(c))
    out.push({ id: 'clot', title: 'Watch for swelling in the neck or a leg', body: 'Estrogen and weightlessness both slow blood flow; NASA has found clots in the neck vein in flight. Tell your flight surgeon at once about one-sided swelling, pain or a new headache.' })

  if (s.mode === 'suppressed' && !s.bleeding)
    out.push({ id: 'breakthrough', title: 'Spotting can still happen', body: 'Breakthrough bleeding is common, most of all in the first months. Log it with Period started so the pattern is visible to you and your flight surgeon.' })

  if (c.hormonal === 'combined' || c.hormonal === 'continuous' || c.hormonal === 'progestin-pill')
    out.push({ id: 'pill', title: 'Same time every day, by GMT', body: 'Take your pill at a fixed GMT time, whatever the shift schedule says, and check the stock covers the rest of the mission with spare.' })

  if (s.mode === 'withdrawal' && s.phase === 'active' && c.hormonal !== 'combined')
    out.push({ id: 'hormonal-bleed', title: 'Bleeding can be lighter or irregular', body: 'Your contraception changes how periods come. Log each bleed so PULSAR learns your pattern.' })

  return out
}

/** One line on the cycle for the health assistant. */
export function cycleSummary(c: Cycle, s: CycleState): string {
  const method = c.hormonal ? `uses ${HORMONAL.find((h) => h.id === c.hormonal)!.label.toLowerCase()}` : 'no hormonal contraception'
  const parts = [`Menstrual cycle: ${c.pattern}, ${method}`]
  if (s.day !== null) parts.push(`day ${s.day} of about ${s.length}, ${PHASE_LABEL[s.phase].toLowerCase()}`)
  else parts.push(s.mode === 'suppressed' ? 'periods suppressed' : 'no period logged yet')
  if (s.nextStart !== null && s.daysUntil !== null) {
    const when = new Date(s.nextStart).toLocaleDateString('en', { month: 'short', day: 'numeric' })
    parts.push(s.daysUntil >= 0 ? `next period expected ${when} (±${s.window} days)` : `period ${-s.daysUntil} days later than expected`)
  }
  if (s.phase === 'luteal') parts.push(`luteal +${LUTEAL_SHIFT.temperature} °C temperature and +${LUTEAL_SHIFT.heartRate} bpm resting heart rate are expected and already allowed for in trends`)
  return parts.join('; ')
}
