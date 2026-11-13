import { motion, useReducedMotion } from 'framer-motion'
import { Suspense, lazy, useState, type FormEvent, type ReactNode } from 'react'
import { Icon } from '../components/Icon'
import { ModelBoundary } from '../components/ModelBoundary'
import { PlanetBackdrop } from '../components/PlanetBackdrop'
import { Logo } from '../components/TopBar'
import { config } from '../config'
import { useAccountStore, type Profile } from '../store/useAccountStore'

const BodyModel3D = lazy(() => import('../components/BodyModel3D'))

type Step = 'intro' | 'name' | 'place' | 'start' | 'pin' | 'who' | 'unlock'
/** The questions, in order; the progress bar counts through them. */
const QUESTIONS: Step[] = ['name', 'place', 'start', 'pin']
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
  const [unlocking, setUnlocking] = useState<Profile | null>(null)
  const [wrong, setWrong] = useState(false)

  const go = (to: Step, dir = 1) => {
    setDirection(dir)
    setStep(to)
  }
  const index = QUESTIONS.indexOf(step)
  const back = () => {
    if (step === 'unlock') return go('who', -1)
    if (index > 0) return go(QUESTIONS[index - 1], -1)
    go(profiles.length ? 'who' : 'intro', -1)
  }
  const finish = (withPin: string | null) => {
    const t = new Date(`${start}T00:00`).getTime()
    create({ name: name.trim(), pin: withPin, mission: { environmentId, missionStart: Number.isFinite(t) ? t : Date.now() } })
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
    step === 'name' ? name.trim().length > 0 : step === 'start' ? start !== '' : step === 'pin' ? pin.length === 4 : true
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    if (step === 'pin') return finish(pin)
    if (index >= 0) go(QUESTIONS[index + 1])
  }

  const firstName = name.trim().split(/\s+/)[0]
  const slide = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } }
    : { initial: { opacity: 0, x: 28 * direction }, animate: { opacity: 1, x: 0 }, transition: SPRING }

  return (
    <div className="relative isolate flex min-h-svh flex-col overflow-hidden">
      <PlanetBackdrop className="absolute inset-0 -z-20 size-full" />
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
          <span className="flex items-center gap-2.5">
            <Logo />
            <span className="display text-[22px] leading-none tracking-[0.03em]">PULSAR</span>
          </span>
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
                aria-valuemax={QUESTIONS.length}
                aria-valuenow={index + 1}
                className="h-2.5 flex-1 overflow-hidden rounded-full bg-mist/12"
              >
                <motion.div
                  className="h-full rounded-full bg-accent"
                  initial={false}
                  animate={{ width: `${((index + 1) / QUESTIONS.length) * 100}%` }}
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
                {config.environments.map((env) => {
                  const on = env.id === environmentId
                  return (
                    <button
                      key={env.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setEnvironmentId(env.id)}
                      className={`flex min-h-14 items-center justify-between gap-3 rounded-xl border-2 px-4 text-left transition-[border-color,background-color,transform] duration-150 active:scale-[0.98] ${
                        on ? 'border-accent bg-accent/12' : 'border-mist/15 bg-ink-950/40 hover:border-mist/35'
                      }`}
                    >
                      <span className="text-[15px] font-medium">{env.label}</span>
                      <span
                        className={`grid size-6 shrink-0 place-items-center rounded-full transition-colors duration-150 ${on ? 'bg-accent text-ink-950' : 'bg-mist/10 text-transparent'}`}
                        aria-hidden
                      >
                        <Icon name="check" className="size-3.5" strokeWidth={2.6} />
                      </span>
                    </button>
                  )
                })}
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
          {index >= 0 && (
            <button type="submit" disabled={!valid} className="btn btn-primary min-h-14 w-full text-base">
              {step === 'pin' ? 'Set PIN and finish' : 'Continue'}
            </button>
          )}
          {step === 'pin' && (
            <button type="button" onClick={() => finish(null)} className="btn btn-plain min-h-12 w-full">
              Skip
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
