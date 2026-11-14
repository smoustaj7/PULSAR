const EVENT = 'pulsar:ask-jarvis'

/**
 * Open Dr.Jarvis and ask it a question, from anywhere in the app: the places that used to
 * link to a page of NASA's research now ask the assistant, which answers from that research.
 */
export function askJarvis(question: string) {
  window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: question }))
}

/** Listen for `askJarvis`; returns the function that stops listening. */
export function onAskJarvis(listener: (question: string) => void) {
  const handle = (e: Event) => listener((e as CustomEvent<string>).detail)
  window.addEventListener(EVENT, handle)
  return () => window.removeEventListener(EVENT, handle)
}
