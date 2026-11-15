import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import { citedSource, linkCitations, withoutCitations, type Source } from '../lib/citations'
import { CitationChip, SourceList } from './ChatSources'
import { Icon } from './Icon'
import { VoiceWaveform } from './VoiceWaveform'
import { useVoiceDictation } from '../lib/useVoiceDictation'

type Message = {
  id: number
  role: 'assistant' | 'user'
  text: string
  /** The NASA documents the answer drew on, numbered as it cites them. */
  sources?: Source[]
}

type Answer = { answer: string; sources: Source[] }

/** Links in an answer: citations become chips, any other link opens in a new tab. */
const markdownLinks = (sources: Source[]): Components => ({
  a: ({ href, children }) => {
    const source = citedSource(href, sources)
    if (source) return <CitationChip source={source} />
    return (
      <a href={href} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">
        {children}
      </a>
    )
  },
})

type ChatProps = {
  /** MedGemma backends (backendLLM/main.py), tried in order until one answers. */
  apiUrls?: string[]
  /** The signed-in astronaut's readings, as plain text, sent with every question. */
  metrics?: string
  onClose?: () => void
  active?: boolean
  /** A question asked from elsewhere in the app (see askJarvis); a new `id` asks it. */
  pending?: { id: number; text: string } | null
}

/** Whether a URL points at this computer (the backend run beside a deployed page). */
const onLocalMachine = (url: string) => {
  try {
    return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname)
  } catch {
    return false
  }
}

const LOCAL_API_URL = 'http://localhost:8000'
const pageIsLocal = typeof location === 'undefined' || onLocalMachine(location.href)

/**
 * Where to ask. The deployed site first tries its own relay to the assistant a team member
 * shares (backendLLM/share.sh), then a backend on the visitor's own computer. Set
 * VITE_CHAT_API_URL to use one backend somewhere else.
 */
const DEFAULT_API_URLS = import.meta.env.VITE_CHAT_API_URL
  ? [import.meta.env.VITE_CHAT_API_URL]
  : pageIsLocal
    ? [LOCAL_API_URL]
    : ['/api', LOCAL_API_URL]

/** The relay's answer while nobody is sharing an assistant: move on to the next backend. */
class Offline extends Error {}

/** Ask each backend in turn; the first that is running answers. */
async function askBackends(urls: string[], body: FormData): Promise<Answer> {
  for (const url of urls) {
    let response: Response
    try {
      response = await fetch(`${url.replace(/\/$/, '')}/chat`, { method: 'POST', body })
    } catch {
      continue // fetch throws when nothing answers at all: this backend isn't running
    }
    const result: { answer?: string; sources?: Source[]; detail?: string; offline?: boolean } = await response.json().catch(() => ({}))
    if (result.offline) continue
    if (!response.ok) throw new Error(result.detail ?? `Request failed (${response.status}).`)
    if (typeof result.answer !== 'string') throw new Error('The server response did not contain an answer.')
    // A backend from before the NASA library sends no sources.
    return { answer: result.answer, sources: Array.isArray(result.sources) ? result.sources : [] }
  }
  throw new Offline()
}

const GREETING = 'Hi, I’m Dr. Jarvis. What would you like to know about your mission readings?'

/**
 * The health assistant: questions (and an optional image) go to the MedGemma backend along
 * with the astronaut's current readings, and the answer comes back as Markdown.
 */
export default function Chat({ apiUrls = DEFAULT_API_URLS, metrics = '', onClose, pending, active = true }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([{ id: 0, role: 'assistant', text: GREETING }])
  const [question, setQuestion] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const nextId = useRef(1)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const questionRef = useRef<HTMLTextAreaElement>(null)
  const [focusRevision, setFocusRevision] = useState(0)
  const pauseRef = useRef<HTMLButtonElement>(null)
  const voice = useVoiceDictation({ active, onTranscript: setQuestion, onFinished: () => setFocusRevision((value) => value + 1) })
  const recording = ['starting', 'listening', 'stopping'].includes(voice.state)
  const startDictation = () => voice.start(question)

  useEffect(() => {
    const field = questionRef.current
    if (!active || !field) return
    field.focus({ preventScroll: true })
    field.setSelectionRange(field.value.length, field.value.length)
    field.scrollTop = field.scrollHeight
  }, [active, focusRevision])

  useEffect(() => {
    if (voice.state === 'listening') pauseRef.current?.focus({ preventScroll: true })
  }, [voice.state])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'end',
    })
  }, [messages, isLoading])

  async function ask(text: string) {
    if (!text || isLoading) return
    voice.cancel()
    setMessages((current) => [...current, { id: nextId.current++, role: 'user', text }])
    setQuestion('')
    setError('')
    setIsLoading(true)

    const formData = new FormData()
    formData.append('question', text)
    // The conversation so far (not the greeting), so follow-up questions make sense.
    const history = messages.slice(1).map(({ role, text }) => ({ role, text: withoutCitations(text) }))
    if (history.length) formData.append('history', JSON.stringify(history))
    if (metrics) formData.append('metrics', metrics)
    if (image) formData.append('image', image)
    setImage(null)
    if (fileRef.current) fileRef.current.value = ''

    try {
      const { answer, sources } = await askBackends(apiUrls, formData)
      setMessages((current) => [...current, { id: nextId.current++, role: 'assistant', text: answer, sources }])
    } catch (requestError) {
      setError(
        requestError instanceof Offline
          ? pageIsLocal
            ? 'Dr.Jarvis isn’t running. Start the MedGemma backend (see backendLLM/README.md) and try again.'
            : 'Dr.Jarvis is offline right now. To run it on this computer instead, start the MedGemma backend (./backendLLM/run-mac.sh), allow this site to use your local network, and turn off ad or tracker blocking for this site: blockers stop websites from contacting your computer.'
          : requestError instanceof Error
            ? requestError.message
            : 'Could not reach the assistant.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  // A question from elsewhere is asked at once, or left in the field while an answer is coming.
  const askPending = useEffectEvent((text: string) => (isLoading ? setQuestion(text) : void ask(text)))
  // Each question once, by id, even when an effect runs twice (as React's dev mode does).
  const askedId = useRef(0)
  useEffect(() => {
    if (!pending || pending.id === askedId.current) return
    askedId.current = pending.id
    askPending(pending.text)
  }, [pending])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!recording) void ask(question.trim())
  }

  return (
    <section className="chat-shell flex h-full min-h-0 flex-col" aria-label="Dr.Jarvis, AI health assistant">
      <header className="flex shrink-0 items-center gap-3 border-b border-line px-5 py-5">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent/15 text-accent" aria-hidden>
          <Icon name="sparkle" className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[18px] font-semibold">Dr. Jarvis</h2>
          <p className="text-xs text-fg-subtle">AI health assistant · information, not diagnosis</p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="btn btn-plain size-9 min-h-0 p-0" aria-label="Close Dr.Jarvis">
            <Icon name="close" className="size-4.5" />
          </button>
        )}
      </header>

      <div className="chat-content min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="chat-messages flex flex-col gap-3 px-[18px] py-[18px]" aria-live="polite">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-full rounded-[18px] px-[18px] py-3.5 text-[15px] leading-relaxed ${
                message.role === 'user'
                  ? 'self-end rounded-br-md bg-accent text-ink-950'
                  : 'self-start rounded-bl-md border border-line bg-white/5 text-fg'
              }`}
            >
              <div className="chat-markdown">
                <ReactMarkdown components={markdownLinks(message.sources ?? [])}>
                  {linkCitations(message.text, message.sources ?? [])}
                </ReactMarkdown>
              </div>
              {/* Beside the answer they support, so it's clear which answer they belong to. */}
              {message.sources?.length ? <SourceList sources={message.sources} /> : null}
            </div>
          ))}
          {isLoading && (
            <div role="status" className="flex gap-1 self-start rounded-2xl rounded-bl-md border border-line bg-white/5 px-3.5 py-3.5">
              <span className="sr-only">Thinking</span>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-1.5 rounded-full bg-fg-subtle motion-safe:animate-pulse"
                  style={{ animationDelay: `${i * 160}ms` }}
                />
              ))}
            </div>
          )}
          {error && (
            <p className="rounded-xl border border-critical/35 bg-critical/10 px-3 py-2 text-xs text-fg" role="alert">
              {error}
            </p>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <form noValidate className="shrink-0 border-t border-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]" onSubmit={submit}>
        {image && (
          <div className="mb-2 flex items-center justify-between gap-2 text-xs text-fg-muted">
            <span className="truncate">{image.name}</span>
            <button type="button" onClick={() => setImage(null)} className="text-accent hover:underline">
              Remove
            </button>
          </div>
        )}
        <div className="chat-composer" data-voice-state={voice.state}>
          <div className="chat-composer-fields" hidden={voice.state === 'listening' || voice.state === 'stopping'}>
            <button
              type="button"
              className="btn btn-plain chat-composer-button"
              title="Attach an image"
              aria-label="Attach an image"
              disabled={recording}
              onClick={() => fileRef.current?.click()}
            >
              <Icon name="plus" className="size-4.5" />
            </button>
            <div className="chat-field">
              <textarea
                ref={questionRef}
                aria-label="Your question"
                aria-describedby={voice.error ? 'voice-error' : undefined}
                placeholder="Ask about your readings…"
                rows={1}
                value={question}
                readOnly={recording}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && !recording) {
                    event.preventDefault()
                    event.currentTarget.form?.requestSubmit()
                  }
                }}
                className="field chat-question resize-none"
              />
              <button
                type="button"
                disabled={isLoading}
                className="chat-field-mic"
                aria-label={voice.state === 'starting' ? 'Cancel microphone request' : 'Start dictation'}
                aria-pressed={recording}
                title={voice.state === 'starting' ? 'Cancel microphone request' : 'Dictate a question'}
                onClick={voice.state === 'starting' ? voice.stop : startDictation}
              >
                <Icon name={voice.state === 'starting' ? 'close' : 'mic'} className="size-4.5" />
              </button>
            </div>
            <button
              type="submit"
              disabled={!question.trim() || isLoading || recording}
              className="btn btn-tinted chat-composer-button"
              aria-label="Send"
            >
              <Icon name="arrow" className="size-4.5 -rotate-90" />
            </button>
          </div>
          {(voice.state === 'listening' || voice.state === 'stopping') && (
            <div className="voice-strip" role="group" aria-label="Voice dictation">
              <button
                ref={pauseRef}
                type="button"
                className="btn voice-pause"
                aria-label="Pause dictation and edit text"
                title="Pause and edit"
                disabled={voice.state === 'stopping'}
                onClick={voice.stop}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                  <rect x="5" y="3" width="5" height="18" rx="2" />
                  <rect x="14" y="3" width="5" height="18" rx="2" />
                </svg>
              </button>
              <VoiceWaveform analyser={voice.analyser} />
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          accept="image/*"
          type="file"
          hidden
          aria-label="Attach an image"
          onChange={(e) => setImage(e.target.files?.[0] ?? null)}
        />
        <span className="sr-only" role="status">
          {voice.state === 'starting'
            ? 'Connecting microphone. Tap cancel to return to editing.'
            : voice.state === 'listening'
              ? 'Listening. Pause to edit your question.'
              : voice.state === 'stopping'
                ? 'Finishing dictation.'
                : ''}
        </span>
        {voice.error && (
          <p id="voice-error" className="voice-message voice-error" role="alert">
            {voice.error}
          </p>
        )}
      </form>
    </section>
  )
}
