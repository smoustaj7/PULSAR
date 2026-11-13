import { useEffect, useRef, useState, type FormEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import { Icon } from './Icon'

type Message = {
  id: number
  role: 'assistant' | 'user'
  text: string
}

type ChatProps = {
  /** The MedGemma backend (backendLLM/main.py). */
  apiUrl?: string
  /** The signed-in astronaut's readings, as plain text, sent with every question. */
  metrics?: string
  onClose?: () => void
}

/** Set VITE_CHAT_API_URL to point the app at a backend somewhere other than this machine. */
const DEFAULT_API_URL = import.meta.env.VITE_CHAT_API_URL ?? 'http://localhost:8000'

const GREETING =
  'Hi, I’m your health assistant. I can explain your readings and what they mean. I don’t diagnose; for anything urgent, contact your flight surgeon.'
/** Whether a URL points at this computer (the backend run beside a deployed page). */
const onLocalMachine = (url: string) => {
  try {
    return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname)
  } catch {
    return false
  }
}

const SUGGESTIONS = ['Summarise my readings', 'What should I watch today?', 'Why does sleep matter in space?']

/**
 * The health assistant: questions (and an optional image) go to the MedGemma backend along
 * with the astronaut's current readings, and the answer comes back as Markdown.
 */
export default function Chat({ apiUrl = DEFAULT_API_URL, metrics = '', onClose }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([{ id: 0, role: 'assistant', text: GREETING }])
  const [question, setQuestion] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const nextId = useRef(1)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isLoading])

  async function ask(text: string) {
    if (!text || isLoading) return
    setMessages((current) => [...current, { id: nextId.current++, role: 'user', text }])
    setQuestion('')
    setError('')
    setIsLoading(true)

    const formData = new FormData()
    formData.append('question', text)
    // The conversation so far (not the greeting), so follow-up questions make sense.
    const history = messages.slice(1).map(({ role, text }) => ({ role, text }))
    if (history.length) formData.append('history', JSON.stringify(history))
    if (metrics) formData.append('metrics', metrics)
    if (image) formData.append('image', image)
    setImage(null)
    if (fileRef.current) fileRef.current.value = ''

    try {
      const response = await fetch(`${apiUrl.replace(/\/$/, '')}/chat`, { method: 'POST', body: formData })
      const result: { answer?: string; detail?: string } = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.detail ?? `Request failed (${response.status}).`)
      if (typeof result.answer !== 'string') throw new Error('The server response did not contain an answer.')
      setMessages((current) => [...current, { id: nextId.current++, role: 'assistant', text: result.answer! }])
    } catch (requestError) {
      // fetch throws a TypeError when nothing answers at all: the backend isn't running.
      setError(
        requestError instanceof TypeError
          ? onLocalMachine(apiUrl) && !onLocalMachine(location.href)
            ? 'Couldn’t reach the assistant on this computer. Check the MedGemma backend is running (./backendLLM/run-mac.sh), allow this site to use your local network, and turn off ad or tracker blocking for this site: blockers stop websites from contacting your computer.'
            : 'The assistant isn’t running. Start the MedGemma backend (see backendLLM/README.md) and try again.'
          : requestError instanceof Error
            ? requestError.message
            : 'Could not reach the assistant.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void ask(question.trim())
  }

  return (
    <section className="flex h-full flex-col" aria-label="Health assistant">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent/15 text-accent" aria-hidden>
          <Icon name="chat" className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[15px] font-semibold">Health assistant</h2>
          <p className="text-xs text-fg-subtle">MedGemma · information, not diagnosis</p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="btn btn-plain size-9 min-h-0 p-0" aria-label="Close the assistant">
            <Icon name="close" className="size-4.5" />
          </button>
        )}
      </header>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-4" aria-live="polite">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`chat-markdown max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
              message.role === 'user'
                ? 'self-end rounded-br-md bg-accent text-ink-950'
                : 'self-start rounded-bl-md border border-line bg-white/5 text-fg'
            }`}
          >
            <ReactMarkdown>{message.text}</ReactMarkdown>
          </div>
        ))}
        {messages.length === 1 && !isLoading && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void ask(s)}
                className="rounded-full border border-accent/35 px-3 py-1.5 text-xs text-accent transition-colors duration-150 hover:bg-accent/10"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {isLoading && (
          <div role="status" className="flex gap-1 self-start rounded-2xl rounded-bl-md border border-line bg-white/5 px-3.5 py-3.5">
            <span className="sr-only">Thinking</span>
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-1.5 rounded-full bg-fg-subtle motion-safe:animate-pulse" style={{ animationDelay: `${i * 160}ms` }} />
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

      <form className="border-t border-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]" onSubmit={submit}>
        {image && (
          <div className="mb-2 flex items-center justify-between gap-2 text-xs text-fg-muted">
            <span className="truncate">{image.name}</span>
            <button type="button" onClick={() => setImage(null)} className="text-accent hover:underline">
              Remove
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <label className="btn btn-plain size-10 min-h-0 shrink-0 cursor-pointer p-0" title="Attach an image">
            <Icon name="plus" className="size-4.5" />
            <span className="sr-only">Attach an image</span>
            <input ref={fileRef} accept="image/*" type="file" className="sr-only" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
          </label>
          <textarea
            aria-label="Your question"
            placeholder="Ask about your readings…"
            rows={1}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }}
            className="field max-h-32 min-h-10 flex-1 resize-none py-2.5"
          />
          <button type="submit" disabled={!question.trim() || isLoading} className="btn btn-tinted size-10 min-h-0 shrink-0 p-0" aria-label="Send">
            <Icon name="arrow" className="size-4.5 -rotate-90" />
          </button>
        </div>
      </form>
    </section>
  )
}
