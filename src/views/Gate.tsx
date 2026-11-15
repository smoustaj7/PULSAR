import { motion, useReducedMotion } from 'framer-motion'
import { Suspense, lazy, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { CYCLE_LIMITS, HORMONAL, startOfDay, type Cycle, type CyclePattern, type Hormonal } from '../engine/cycle'
import { Icon } from '../components/Icon'
import { ModelBoundary } from '../components/ModelBoundary'
import { SpaceBackdrop } from '../components/SpaceBackdrop'
import { Wordmark } from '../components/TopBar'
import { config } from '../config'
import watchImage from '../assets/devices/pulsar-watch.png'
import { useAccountStore, type Profile } from '../store/useAccountStore'
import { useHealthStore, type Sex } from '../store/useHealthStore'

const BodyModel3D = lazy(() => import('../components/BodyModel3D'))

type Step = 'intro' | 'name' | 'place' | 'start' | 'pin' | 'sex' | 'cycle' | 'lastPeriod' | 'lengths' | 'hormonal' | 'watch' | 'who' | 'unlock'
/**
 * The questions, in order; the progress bar counts through them. Female crew are asked about
 * their cycle too, all four questions unless they have none. The PIN comes last, and
 * finishing it (or skipping it) creates the profile.
 */
const questionsFor = (sex: Sex | null, pattern: CyclePattern | null): Step[] => [
  'name',
  'place',
  'start',
  'sex',
  ...(sex === 'female' ? (['cycle', ...(pattern === 'none' ? [] : ['lastPeriod', 'lengths', 'hormonal'])] as Step[]) : []),
  'watch',
  'pin',
]
/** Spaceflight affects female and male bodies differently, so the app asks, and Finish waits for an answer. */
const SEXES: { id: Sex; label: string }[] = [
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
]
const PATTERNS: { id: CyclePattern; label: string }[] = [
  { id: 'regular', label: 'Yes' },
  { id: 'irregular', label: 'Irregular' },
  { id: 'none', label: 'No' },
]
const SPRING = { type: 'spring', bounce: 0, duration: 0.45 } as const

const toDateInput = (t: number) => {
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?'

/**
 * What you see before the dashboard: a short setup for a new astronaut (one question a
 * screen, one button to move on), or a pick-your-profile screen once profiles exist.
 */
export function Gate() {
  const profiles = useAccountStore((s) => s.profiles)
  const create = useAccountStore((s) => s.create)
  const signIn = useAccountStore((s) => s.signIn)
  const reduce = useReducedMotion()

  const [step, setStep] = useState<Step>(profiles.length ? 'who' : 'intro')
  // +1 moving on, -1 going back: the next screen slides in from that side.
  const [direction, setDirection] = useState(1)
  const [name, setName] = useState('')
  const [environmentId, setEnvironmentId] = useState(config.environments[0].id)
  const [today] = useState(() => toDateInput(Date.now()))
  const [start, setStart] = useState(today)
  const [pin, setPin] = useState('')
  const [sex, setSex] = useState<Sex | null>(null)
  const [pattern, setPattern] = useState<CyclePattern | null>(null)
  const [lastPeriod, setLastPeriod] = useState('')
  const [cycleLength, setCycleLength] = useState(28)
  const [periodLength, setPeriodLength] = useState(5)
  const [onHormones, setOnHormones] = useState<boolean | null>(null)
  const [hormonal, setHormonal] = useState<Hormonal | null>(null)
  const [unlocking, setUnlocking] = useState<Profile | null>(null)
  const [wrong, setWrong] = useState(false)
  const [connection, setConnection] = useState<'idle' | 'connecting' | 'connected'>('idle')
  useEffect(() => {
    if (connection !== 'connecting' || step !== 'watch') return
    const timer = setTimeout(() => setConnection('connected'), 1500)
    return () => clearTimeout(timer)
  }, [connection, step])

  const go = (to: Step, dir = 1) => {
    setDirection(dir)
    setStep(to)
  }
  const questions = questionsFor(sex, pattern)
  const index = questions.indexOf(step)
  const back = () => {
    if (step === 'unlock') return go('who', -1)
    if (index > 0) return go(questions[index - 1], -1)
    go(profiles.length ? 'who' : 'intro', -1)
  }
  /** Make the profile. `lock` is false when the astronaut skipped the PIN. */
  const finish = (lock = true) => {
    const t = new Date(`${start}T00:00`).getTime()
    const period = new Date(`${lastPeriod}T00:00`).getTime()
    const cycle: Cycle | undefined =
      sex === 'female' && pattern
        ? {
            pattern,
            starts: pattern !== 'none' && Number.isFinite(period) ? [startOfDay(period)] : [],
            cycleLength,
            periodLength,
            hormonal: onHormones ? hormonal : null,
          }
        : undefined
    create({
      name: name.trim(),
      pin: lock && pin.length === 4 ? pin : null,
      mission: { environmentId, missionStart: Number.isFinite(t) ? t : Date.now(), sex: sex ?? 'unspecified', cycle },
    })
    if (connection === 'connected') useHealthStore.getState().connectWatch()
  }
  const pick = (profile: Profile) => {
    if (!profile.pin) return void signIn(profile.id)
    setUnlocking(profile)
    setPin('')
    setWrong(false)
    go('unlock')
  }
  const tryPin = (value: string) => {
    setPin(value)
    setWrong(false)
    if (value.length === 4 && unlocking && !signIn(unlocking.id, value)) {
      setWrong(true)
      setPin('')
    }
  }

  const valid =
    step === 'name'
      ? name.trim().length > 0
      : step === 'start'
        ? start !== ''
        : step === 'pin'
          ? pin.length === 4
          : step === 'sex'
            ? sex !== null
            : step === 'cycle'
              ? pattern !== null
              : step === 'lastPeriod'
                ? lastPeriod !== ''
                : step === 'hormonal'
                  ? onHormones === false || (onHormones === true && hormonal !== null)
                  : true
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    if (step === 'watch') return
    if (step === 'pin') return finish()
    if (index >= 0) go(questions[index + 1])
  }

  const firstName = name.trim().split(/\s+/)[0]
  const slide = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } }
    : { initial: { opacity: 0, x: 28 * direction }, animate: { opacity: 1, x: 0 }, transition: SPRING }

  return (
    <div className="relative isolate flex min-h-svh flex-col overflow-hidden">
      <SpaceBackdrop className="absolute inset-0 -z-20 size-full" />
      {/* The questions sit on a deeper shade than the welcome, so the page reads as a form. */}
      <motion.div
        aria-hidden
        className="absolute inset-0 -z-10 bg-ink-950"
        initial={false}
        animate={{ opacity: step === 'intro' ? 0.35 : 0.8 }}
        transition={{ duration: 0.4 }}
      />

      <header className="mx-auto flex h-16 w-full max-w-xl items-center gap-4 px-4 pt-[env(safe-area-inset-top)] sm:px-6">
        {step === 'intro' || step === 'who' ? (
          <Wordmark />
        ) : (
          <>
            <button type="button" onClick={back} aria-label="Back" className="btn btn-plain size-10 min-h-0 shrink-0 p-0">
              <Icon name="chevron" className="size-4.5 rotate-180" />
            </button>
            {index >= 0 && (
              <div
                role="progressbar"
                aria-label="Setup progress"
                aria-valuemin={0}
                aria-valuemax={questions.length}
                aria-valuenow={index + 1}
                className="h-2.5 flex-1 overflow-hidden rounded-full bg-mist/12"
              >
                <motion.div
                  className="h-full rounded-full bg-accent"
                  initial={false}
                  animate={{ width: `${((index + 1) / questions.length) * 100}%` }}
                  transition={SPRING}
                />
              </div>
            )}
          </>
        )}
      </header>

      <form onSubmit={submit} className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6">
        <motion.div key={step} {...slide} className="flex flex-1 flex-col justify-center py-6">
          {step === 'intro' && (
            <div className="text-center">
              <div className="mx-auto h-[min(46svh,26rem)] w-full max-w-sm">
                <ModelBoundary fallback={null}>
                  <Suspense fallback={null}>
                    <BodyModel3D regions={[]} selectedId={null} showSuit heartRate={68} stars={false} interactive={false} onSelect={() => {}} />
                  </Suspense>
                </ModelBoundary>
              </div>
              <h1 className="display mt-4 text-[clamp(2.5rem,9vw,4rem)] text-fg">
                Your mission
                <br />
                starts with you<span className="text-accent">.</span>
              </h1>
            </div>
          )}

          {step === 'name' && (
            <Question title="What should we call you?">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                autoComplete="off"
                maxLength={40}
                aria-label="Your name"
                placeholder="Your name"
                className="field h-14 text-lg"
              />
            </Question>
          )}

          {step === 'place' && (
            <Question title={`Where are you, ${firstName}?`}>
              <div role="radiogroup" aria-label="Where you are" className="grid gap-2.5">
                {config.environments.map((env) => (
                  <Choice key={env.id} label={env.label} on={env.id === environmentId} onPick={() => setEnvironmentId(env.id)} />
                ))}
              </div>
            </Question>
          )}

          {step === 'start' && (
            <Question title="When did your mission start?">
              <input
                type="date"
                value={start}
                max={today}
                onChange={(e) => setStart(e.target.value)}
                aria-label="Mission start date"
                className="field h-14 text-lg"
              />
            </Question>
          )}

          {step === 'pin' && (
            <Question title="Lock your data with a PIN?">
              <PinField value={pin} onChange={setPin} label="Choose a 4-digit PIN" />
            </Question>
          )}

          {step === 'sex' && (
            <Question title="What’s your sex?">
              <p className="-mt-4 mb-6 text-[15px] leading-relaxed text-fg-muted">
                Spaceflight affects female and male bodies differently, so Dr.Jarvis can take it into account. Only this
                device keeps it.
              </p>
              <div role="radiogroup" aria-label="Your sex" className="grid gap-2.5">
                {SEXES.map((option) => (
                  <Choice key={option.id} label={option.label} on={sex === option.id} onPick={() => setSex(option.id)} />
                ))}
              </div>
            </Question>
          )}

          {step === 'cycle' && (
            <Question title="Do you have a menstrual cycle?">
              <p className="-mt-4 mb-6 text-[15px] leading-relaxed text-fg-muted">
                PULSAR follows it so a normal cycle change isn’t mistaken for a health one, and tells you what each phase
                means on a mission. Only this device keeps it.
              </p>
              <div role="radiogroup" aria-label="Menstrual cycle" className="grid gap-2.5">
                {PATTERNS.map((option) => (
                  <Choice key={option.id} label={option.label} on={pattern === option.id} onPick={() => setPattern(option.id)} />
                ))}
              </div>
            </Question>
          )}

          {step === 'lastPeriod' && (
            <Question title="When did your last period start?">
              <input
                type="date"
                value={lastPeriod}
                max={today}
                onChange={(e) => setLastPeriod(e.target.value)}
                aria-label="First day of your last period"
                className="field h-14 text-lg"
              />
            </Question>
          )}

          {step === 'lengths' && (
            <Question title="How long are your cycle and period?">
              <p className="-mt-4 mb-6 text-[15px] leading-relaxed text-fg-muted">
                A cycle runs from the first day of one period to the first day of the next. Not sure? Keep the typical
                values; PULSAR learns yours as you log.
              </p>
              <div className="grid gap-2.5">
                <Stepper label="Cycle length" value={cycleLength} range={CYCLE_LIMITS.cycleLength} onChange={setCycleLength} />
                <Stepper label="Period length" value={periodLength} range={CYCLE_LIMITS.periodLength} onChange={setPeriodLength} />
              </div>
            </Question>
          )}

          {step === 'hormonal' && (
            <Question title="Using hormonal contraception?">
              <p className="-mt-4 mb-6 text-[15px] leading-relaxed text-fg-muted">
                Or anything to suppress your periods. Hormones change how your temperature and pulse move through the
                month, so PULSAR adjusts your baselines to match.
              </p>
              <div role="radiogroup" aria-label="Hormonal contraception" className="grid grid-cols-2 gap-2.5">
                <Choice label="Yes" on={onHormones === true} onPick={() => setOnHormones(true)} />
                <Choice label="No" on={onHormones === false} onPick={() => setOnHormones(false)} />
              </div>
              {onHormones && (
                <motion.div
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={SPRING}
                  className="mt-6"
                >
                  <h2 className="mb-2.5 text-sm font-medium text-fg-muted">Which type?</h2>
                  <div role="radiogroup" aria-label="Type of hormonal contraception" className="grid gap-2 sm:grid-cols-2">
                    {HORMONAL.map((option) => (
                      <Choice
                        key={option.id}
                        label={option.label}
                        detail={option.detail}
                        on={hormonal === option.id}
                        onPick={() => setHormonal(option.id)}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </Question>
          )}

          {step === 'watch' && (
            <Question title={connection === 'connected' ? 'Your watch is connected' : connection === 'connecting' ? 'Connecting your watch…' : 'Connect your watch'}>
              <p className="-mt-4 mb-6 text-[15px] leading-relaxed text-fg-muted">
                {connection === 'connected' ? 'You’re ready to track your readings.' : 'Bring your health readings together. Connect your watch now, or set it up later.'}
              </p>
              <div className="relative mx-auto w-full max-w-sm">
                <img
                  src={watchImage}
                  alt="Graphite astronaut smartwatch with a glowing teal heartbeat display"
                  width={1280}
                  height={1280}
                  className="relative mx-auto h-[clamp(12rem,36svh,23rem)] w-auto max-w-full object-contain"
                />
              </div>
              <span role="status" className="sr-only">{connection === 'connecting' ? 'Connecting your watch' : connection === 'connected' ? 'Your watch is connected' : ''}</span>
            </Question>
          )}

          {step === 'who' && (
            <Question title="Who’s logging?">
              <ul className="grid gap-2.5">
                {profiles.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => pick(p)}
                      className="flex min-h-16 w-full items-center gap-3.5 rounded-xl border-2 border-mist/15 bg-ink-950/40 px-4 text-left transition-[border-color,transform] duration-150 hover:border-accent active:scale-[0.98]"
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/15 text-sm font-semibold text-accent" aria-hidden>
                        {initials(p.name)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[17px] font-medium">{p.name}</span>
                      {p.pin && <Icon name="shield" className="size-4.5 shrink-0 text-fg-subtle" aria-label="PIN protected" aria-hidden={false} />}
                      <Icon name="chevron" className="size-4 shrink-0 text-fg-subtle" />
                    </button>
                  </li>
                ))}
              </ul>
            </Question>
          )}

          {step === 'unlock' && unlocking && (
            <Question title={`Enter your PIN, ${unlocking.name.split(/\s+/)[0]}`}>
              <PinField value={pin} onChange={tryPin} label="Your PIN" wrong={wrong} />
              <p role="alert" className="mt-3 h-5 text-center text-sm text-critical">
                {wrong && 'That PIN doesn’t match.'}
              </p>
            </Question>
          )}
        </motion.div>

        <div className="grid gap-2">
          {step === 'intro' && (
            <button type="button" onClick={() => go('name')} className="btn btn-primary min-h-14 w-full text-base">
              Get started
            </button>
          )}
          {step === 'watch' && (
            <div className="grid gap-2">
              <button type="button" disabled={connection === 'connecting'} aria-busy={connection === 'connecting'} onClick={() => connection === 'connected' ? go('pin') : setConnection('connecting')} className="btn btn-primary min-h-14 w-full text-base">
                {connection === 'connecting' && <span aria-hidden className="size-4 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin" />}
                {connection === 'connected' ? 'Continue' : connection === 'connecting' ? 'Connecting…' : 'Connect watch'}
              </button>
              {connection !== 'connected' && <button type="button" onClick={() => go('pin')} className="btn btn-plain min-h-12 w-full">Set up later</button>}
            </div>
          )}
          {index >= 0 && step !== 'watch' && (
            <button type="submit" disabled={!valid} className="btn btn-primary min-h-14 w-full text-base">
              {step === 'pin' ? 'Set PIN' : 'Continue'}
            </button>
          )}
          {step === 'pin' && (
            <button
              type="button"
              onClick={() => finish(false)}
              className="btn btn-plain min-h-12 w-full"
            >
              Skip
            </button>
          )}
          {step === 'lastPeriod' && (
            <button
              type="button"
              onClick={() => {
                setLastPeriod('')
                go('lengths')
              }}
              className="btn btn-plain min-h-12 w-full"
            >
              I don’t remember
            </button>
          )}
          {step === 'who' && (
            <button type="button" onClick={() => go('name')} className="btn btn-plain min-h-14 w-full text-base">
              <Icon name="plus" className="size-4.5" /> New astronaut
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

/** One option of a single-choice question, with a check when picked. */
function Choice({ label, detail, on, onPick }: { label: string; detail?: string; on: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onPick}
      className={`flex min-h-14 items-center justify-between gap-3 rounded-xl border-2 px-4 text-left transition-[border-color,background-color,transform] duration-150 active:scale-[0.98] ${
        on ? 'border-accent bg-accent/12' : 'border-mist/15 bg-ink-950/40 hover:border-mist/35'
      }`}
    >
      <span className="min-w-0 py-2">
        <span className="block text-[15px] font-medium">{label}</span>
        {detail && <span className="block text-[13px] text-fg-subtle">{detail}</span>}
      </span>
      <span
        className={`grid size-6 shrink-0 place-items-center rounded-full transition-colors duration-150 ${on ? 'bg-accent text-ink-950' : 'bg-mist/10 text-transparent'}`}
        aria-hidden
      >
        <Icon name="check" className="size-3.5" strokeWidth={2.6} />
      </span>
    </button>
  )
}

/** A whole number picked with minus and plus, for small counts like days. */
function Stepper({
  label,
  value,
  range: [min, max],
  onChange,
}: {
  label: string
  value: number
  range: readonly [number, number]
  onChange: (value: number) => void
}) {
  const step = (by: number) => onChange(Math.min(max, Math.max(min, value + by)))
  return (
    <div role="group" aria-label={label} className="flex min-h-16 items-center justify-between gap-3 rounded-xl border-2 border-mist/15 bg-ink-950/40 pr-2 pl-4">
      <span className="text-[15px] font-medium" aria-hidden>
        {label}
      </span>
      <div className="flex items-center gap-1">
        <button type="button" aria-label="One day less" onClick={() => step(-1)} disabled={value <= min} className="btn btn-plain size-11 min-h-0 p-0 text-xl">
          −
        </button>
        <output aria-live="polite" className="w-16 text-center tabular-nums">
          <span className="display text-[1.75rem] leading-none">{value}</span>
          <span className="ml-1 text-xs text-fg-subtle">days</span>
        </output>
        <button type="button" aria-label="One day more" onClick={() => step(1)} disabled={value >= max} className="btn btn-plain size-11 min-h-0 p-0 text-xl">
          +
        </button>
      </div>
    </div>
  )
}

function Question({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <h1 className="display mb-7 text-[clamp(2rem,7vw,2.75rem)] text-fg">{title}</h1>
      {children}
    </>
  )
}

/** Four boxes over one real field, so the phone shows its number pad and paste works. */
function PinField({
  value,
  onChange,
  label,
  wrong = false,
}: {
  value: string
  onChange: (pin: string) => void
  label: string
  wrong?: boolean
}) {
  return (
    <label className="relative mx-auto block w-fit">
      <span className="sr-only">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
        type="password"
        inputMode="numeric"
        autoComplete="off"
        autoFocus
        className="peer absolute inset-0 size-full cursor-pointer opacity-0"
      />
      <motion.span
        className="flex gap-3"
        animate={wrong ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
        transition={{ duration: 0.35 }}
        aria-hidden
      >
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`grid size-16 place-items-center rounded-xl border-2 bg-ink-950/50 transition-colors duration-150 ${
              wrong ? 'border-critical' : i === value.length ? 'border-accent peer-focus:border-accent' : i < value.length ? 'border-mist/40' : 'border-mist/15'
            }`}
          >
            {i < value.length && <span className="size-3.5 rounded-full bg-fg" />}
          </span>
        ))}
      </motion.span>
    </label>
  )
}
