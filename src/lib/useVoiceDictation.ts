import { useEffect, useRef, useState } from 'react'

type Recognition = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition
  webkitSpeechRecognition?: new () => Recognition
}
type Session = {
  draft: string
  transcript: string
  recognition: Recognition | null
  stream: MediaStream | null
  context: AudioContext | null
  source: MediaStreamAudioSourceNode | null
  analyser: AnalyserNode | null
  timer?: ReturnType<typeof setTimeout>
  /** Ends the session once the astronaut has stopped talking (or never started). */
  silence?: ReturnType<typeof setTimeout>
  stopping: boolean
}
export type VoiceState = 'idle' | 'starting' | 'listening' | 'stopping'

/**
 * Continuous recognition never ends by itself, so the mic stayed open after the astronaut had
 * finished. Dictation now stops this long after the last word, or after this long with none.
 */
export const SILENCE_MS = 2000
export const NO_SPEECH_MS = 8000

const recognitionErrors: Record<string, string> = {
  'not-allowed': 'Microphone blocked. Allow access in site settings.',
  'service-not-allowed': 'Dictation is unavailable here. Try Google Chrome.',
  'audio-capture': 'No microphone found. Connect one and try again.',
  'no-speech': 'No speech detected. Tap the mic to try again.',
  network: 'Speech service unavailable. Try Google Chrome or type.',
  'language-not-supported': 'This speech service does not support English.',
}

/** Only browser recognition transcribes; the separate audio graph measures the live mic. */
export function useVoiceDictation({
  active,
  onTranscript,
  onFinished,
}: {
  active: boolean
  onTranscript: (text: string) => void
  onFinished: () => void
}) {
  const [state, setState] = useState<VoiceState>('idle')
  const [error, setError] = useState('')
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const session = useRef<Session | null>(null)
  const callbacks = useRef({ onTranscript, onFinished })
  useEffect(() => {
    callbacks.current = { onTranscript, onFinished }
  }, [onTranscript, onFinished])

  function releaseAudio(current: Session) {
    // Remove our ended handler before stopping tracks, so cleanup cannot become an error.
    current.stream?.getTracks().forEach((track) => {
      track.onended = null
      track.stop()
    })
    current.source?.disconnect()
    current.analyser?.disconnect()
    if (current.context && current.context.state !== 'closed') void current.context.close().catch(() => {})
    current.stream = current.source = current.analyser = current.context = null
    setAnalyser(null)
  }

  function finish(current: Session, message = '', focus = true) {
    if (session.current !== current) return
    session.current = null // Invalidate callbacks and pending getUserMedia promises first.
    clearTimeout(current.timer)
    clearTimeout(current.silence)
    if (current.recognition) {
      current.recognition.onstart = current.recognition.onend = current.recognition.onerror = current.recognition.onresult = null
      try {
        current.recognition.abort()
      } catch {
        /* Already ended. */
      }
    }
    releaseAudio(current)
    if (current.transcript) {
      const separator = current.draft && !/\s$/.test(current.draft) ? ' ' : ''
      callbacks.current.onTranscript(current.draft + separator + current.transcript)
    }
    setError(message)
    setState('idle')
    if (focus) callbacks.current.onFinished()
  }

  /** (Re)start the countdown that ends dictation when nothing more is said. */
  function awaitSilence(current: Session, ms: number) {
    clearTimeout(current.silence)
    current.silence = setTimeout(() => {
      if (session.current !== current || current.stopping) return
      if (current.transcript) stop()
      else finish(current, recognitionErrors['no-speech'])
    }, ms)
  }

  function cancel() {
    if (session.current) finish(session.current, '', false)
  }

  useEffect(() => {
    if (!active) return
    const hide = () => {
      if (document.hidden) cancel()
    }
    document.addEventListener('visibilitychange', hide)
    return () => {
      document.removeEventListener('visibilitychange', hide)
      cancel()
    }
    // Each session and resource is held in a ref, including during a pending permission prompt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  async function start(draft: string) {
    if (!active || session.current) return
    setError('')
    const speechWindow = window as SpeechWindow
    const Constructor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || !window.AudioContext || !Constructor) {
      setError(
        !window.isSecureContext
          ? 'Open this page over HTTPS or localhost to dictate.'
          : 'Dictation is unavailable here. Try Google Chrome.',
      )
      callbacks.current.onFinished()
      return
    }
    const current: Session = {
      draft,
      transcript: '',
      recognition: null,
      stream: null,
      context: null,
      source: null,
      analyser: null,
      stopping: false,
    }
    session.current = current
    setState('starting')
    current.timer = setTimeout(() => finish(current, 'Microphone did not start. Check access and retry.'), 20000)
    try {
      // Resume within the tap's user activation; close this graph even if permission is denied.
      const context = new AudioContext()
      current.context = context
      const resumed = context.resume()
      // Attach rejection handling immediately, before the permission prompt resolves.
      void resumed.catch(() => finish(current, 'Audio could not start. Tap the mic to retry.'))
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      if (session.current !== current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      current.stream = stream
      stream.getAudioTracks().forEach((track) => {
        track.onended = () => finish(current, 'Microphone disconnected. Reconnect and try again.')
      })
      await resumed
      if (session.current !== current) return
      const meter = context.createAnalyser()
      meter.fftSize = 2048
      meter.smoothingTimeConstant = 0.4
      current.analyser = meter
      current.source = context.createMediaStreamSource(stream)
      current.source.connect(meter) // Deliberately not connected to speakers.
      const recognition = new Constructor()
      current.recognition = recognition
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = document.documentElement.lang || 'en-US'
      recognition.onstart = () => {
        if (session.current !== current || current.stopping) return
        clearTimeout(current.timer)
        awaitSilence(current, NO_SPEECH_MS)
        setAnalyser(meter)
        setState('listening')
      }
      recognition.onresult = ({ results }) => {
        if (session.current !== current) return
        // The list contains the whole session; replace revised interim text instead of appending it.
        current.transcript = Array.from(results, (result) => result[0]?.transcript ?? '')
          .join(' ')
          .trim()
        // Words keep arriving while the astronaut talks; each one restarts the countdown.
        if (current.transcript) awaitSilence(current, SILENCE_MS)
      }
      recognition.onerror = ({ error: reason }) => {
        finish(
          current,
          reason === 'aborted' && current.stopping
            ? ''
            : (recognitionErrors[reason] ?? 'Dictation stopped. Try again or type your question.'),
        )
      }
      recognition.onend = () => finish(current, current.transcript || current.stopping ? '' : recognitionErrors['no-speech'])
      recognition.start()
    } catch (cause) {
      const name = cause instanceof Error ? cause.name : ''
      finish(
        current,
        name === 'NotAllowedError' || name === 'SecurityError'
          ? recognitionErrors['not-allowed']
          : name === 'NotFoundError'
            ? recognitionErrors['audio-capture']
            : name === 'NotReadableError'
              ? 'Microphone is busy. Close other recording apps.'
              : 'Audio could not start. Tap the mic to retry.',
      )
    }
  }

  function stop() {
    const current = session.current
    if (!current || current.stopping) return
    if (!current.recognition) {
      finish(current)
      return
    }
    current.stopping = true
    setState('stopping')
    clearTimeout(current.timer)
    clearTimeout(current.silence)
    releaseAudio(current)
    // Briefly accept the recognizer's final result, then abort even if it never emits onend.
    current.timer = setTimeout(() => finish(current), 800)
    try {
      current.recognition.stop()
    } catch {
      finish(current)
    }
  }

  return { state, error, analyser, start, stop, cancel }
}
