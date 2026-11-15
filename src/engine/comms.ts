/**
 * The round trip of a health report between Mars and Earth: out at light speed, read by the
 * flight surgeon, and a reply back at light speed. Pure: callers pass `now`.
 */
import type { Status } from './types'

/** How long the (simulated) flight surgeon takes to read a report and answer. */
export const REVIEW_MS = 3 * 60_000
/** How much faster time runs for the round trip in demo speed, so a judge sees it in a minute. */
export const DEMO_SPEED = 30

/** Something the report flagged, kept as it was when sent. */
export interface FlaggedItem {
  id: string
  label: string
  status: Exclude<Status, 'nominal' | 'unknown'> | 'injury'
  /** The on-board guidance for it: what the crew does while Earth can't answer. */
  guidance: string
}

export interface Transmission {
  sentAt: number
  /** One-way signal time when it was sent. */
  delayMs: number
  reviewMs: number
  flagged: FlaggedItem[]
  /** Round-trip time is tracked from an anchor so the speed can change mid-flight. */
  anchor: number
  elapsedAtAnchor: number
  speed: number
  /** When the reply was opened, once it has been. */
  readAt?: number
}

export type CommsPhase = 'outbound' | 'review' | 'inbound' | 'arrived'

export interface CommsProgress {
  phase: CommsPhase
  /** Round-trip time passed, in mission time (speed applied). */
  elapsed: number
  total: number
  /** Until the current phase ends (0 once the reply has arrived). */
  phaseLeft: number
  /** Until the reply arrives. */
  replyIn: number
}

export function sendTransmission(now: number, delayMs: number, flagged: FlaggedItem[], speed = 1): Transmission {
  return { sentAt: now, delayMs, reviewMs: REVIEW_MS, flagged, anchor: now, elapsedAtAnchor: 0, speed }
}

/** Change how fast the round trip runs, keeping the progress made so far. */
export function setSpeed(t: Transmission, speed: number, now: number): Transmission {
  return { ...t, elapsedAtAnchor: elapsedOf(t, now), anchor: now, speed }
}

const elapsedOf = (t: Transmission, now: number) => t.elapsedAtAnchor + Math.max(0, now - t.anchor) * t.speed

export function commsProgress(t: Transmission, now: number): CommsProgress {
  const total = 2 * t.delayMs + t.reviewMs
  const elapsed = Math.min(total, elapsedOf(t, now))
  const ends = { outbound: t.delayMs, review: t.delayMs + t.reviewMs, inbound: total }
  const phase: CommsPhase = elapsed < ends.outbound ? 'outbound' : elapsed < ends.review ? 'review' : elapsed < total ? 'inbound' : 'arrived'
  // Countdowns are shown in wall-clock time, so they tick down at the speed actually running.
  const wall = (ms: number) => ms / t.speed
  return {
    phase,
    elapsed,
    total,
    phaseLeft: phase === 'arrived' ? 0 : wall(ends[phase] - elapsed),
    replyIn: wall(total - elapsed),
  }
}

/** What to do while Earth can't answer: the most serious first, then injuries. */
export function onBoardSteps(t: Transmission): FlaggedItem[] {
  const rank = { critical: 0, caution: 1, injury: 2 }
  return [...t.flagged].sort((a, b) => rank[a.status] - rank[b.status])
}

/**
 * The flight surgeon's (simulated) answer. It confirms the on-board plan for each flagged item
 * and says when to report again, which is what a real reply across a delay has to do: the crew
 * has already acted by the time it arrives.
 */
export function surgeonReply(t: Transmission): string[] {
  const steps = onBoardSteps(t)
  if (!steps.length)
    return [
      'Report received and reviewed. Every reading is in range and nothing needs action from the ground.',
      'Keep your measurement schedule. Send the next report after tomorrow’s readings.',
    ]
  // Items of a kind share one answer, the way a person would write it.
  const of = (status: FlaggedItem['status']) => steps.filter((s) => s.status === status).map((s) => s.label)
  const [critical, caution, injuries] = [of('critical'), of('caution'), of('injury')]
  const each = (labels: string[]) => (labels.length > 1 ? ' each' : '')
  return [
    `Report received. We reviewed ${steps.length === 1 ? 'the item' : `all ${steps.length} items`} you flagged.`,
    ...(critical.length
      ? [`${list(critical)}: the CMO leads here, and your on-board plan is right. Re-measure${each(critical)} within the hour and send an updated report; don’t wait for us if it gets worse.`]
      : []),
    ...(caution.length ? [`${list(caution)}: noted. Re-measure${each(caution)} tomorrow at the same time so we can compare with your baseline.`] : []),
    ...(injuries.length
      ? [`${list(injuries)}: keep ${injuries.length > 1 ? 'them' : 'it'} clean and covered, and photograph ${injuries.length > 1 ? 'each' : 'it'} once a day. Tell the CMO about spreading redness, warmth or fever.`]
      : []),
    'Next report after tomorrow’s readings, sooner if anything changes.',
  ]
}

/** "Sleep duration, mood self-rating and cabin CO₂", the first capitalised. */
function list(labels: string[]) {
  const words = labels.map((l, i) => (i === 0 ? l : l.charAt(0).toLowerCase() + l.slice(1)))
  return words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`
}

/** One line for the health assistant on where the link to Earth stands. */
export function commsSummary(delayMs: number, t: Transmission | null, now: number): string {
  const minutes = (ms: number) => `${Math.round(ms / 60_000)} min`
  const parts = [`Signal time to Earth today: ${minutes(delayMs)} each way, so the ground cannot help in real time`]
  if (t) {
    const p = commsProgress(t, now)
    parts.push(
      p.phase === 'arrived'
        ? 'the flight surgeon has replied to the last report'
        : `a health report is on its way (reply due in ${minutes(p.replyIn)}); help the crew act on board meanwhile`,
    )
  }
  return parts.join('; ')
}
