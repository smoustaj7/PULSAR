import { describe, expect, it } from 'vitest'
import { REVIEW_MS, commsProgress, onBoardSteps, sendTransmission, setSpeed, surgeonReply, type FlaggedItem } from './comms'

const MIN = 60_000
const T0 = Date.UTC(2026, 10, 15, 12)
const flagged: FlaggedItem[] = [
  { id: 'cut', label: 'Cut on Shin (left)', status: 'injury', guidance: '' },
  { id: 'sleep', label: 'Sleep duration', status: 'caution', guidance: 'Protect your sleep window.' },
  { id: 'spo2', label: 'Blood oxygen', status: 'critical', guidance: 'Re-measure and tell the CMO.' },
]

describe('the round trip to Earth', () => {
  const t = sendTransmission(T0, 10 * MIN, flagged)

  it('goes out, is reviewed, and comes back', () => {
    expect(commsProgress(t, T0 + 4 * MIN)).toMatchObject({ phase: 'outbound', phaseLeft: 6 * MIN, replyIn: 16 * MIN + REVIEW_MS })
    expect(commsProgress(t, T0 + 11 * MIN).phase).toBe('review')
    expect(commsProgress(t, T0 + 10 * MIN + REVIEW_MS + MIN)).toMatchObject({ phase: 'inbound', phaseLeft: 9 * MIN })
    expect(commsProgress(t, T0 + 30 * MIN)).toMatchObject({ phase: 'arrived', replyIn: 0 })
  })

  it('speeds up for a demo without losing the progress made', () => {
    const fast = setSpeed(t, 30, T0 + 5 * MIN)
    expect(commsProgress(fast, T0 + 5 * MIN).elapsed).toBe(5 * MIN)
    // 10 s of wall time at 30x is 5 min of round trip; the countdown is in wall time.
    expect(commsProgress(fast, T0 + 5 * MIN + 10_000)).toMatchObject({ phase: 'review', elapsed: 10 * MIN })
    expect(commsProgress(fast, T0 + 5 * MIN).phaseLeft).toBe(10_000)
  })
})

describe('what to do and what Earth says', () => {
  it('puts the most serious first', () => {
    expect(onBoardSteps(sendTransmission(T0, MIN, flagged)).map((s) => s.id)).toEqual(['spo2', 'sleep', 'cut'])
  })

  it('answers each flagged item, or confirms all is well', () => {
    const reply = surgeonReply(sendTransmission(T0, MIN, flagged))
    expect(reply[0]).toMatch(/all 3 items/)
    expect(reply[1]).toMatch(/^Blood oxygen: the CMO leads/)
    expect(reply.at(-1)).toMatch(/Next report/)
    expect(surgeonReply(sendTransmission(T0, MIN, []))[0]).toMatch(/nothing needs action/)
  })
})
