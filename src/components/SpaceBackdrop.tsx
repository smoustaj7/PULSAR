import { useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import av1 from '../assets/space/nebula-loop-av1.mp4'
import hevc from '../assets/space/nebula-loop-hevc.mp4'
import poster from '../assets/space/nebula-poster.webp'

const AV1 = 'video/mp4; codecs="av01.0.08M.10"'
/** The loop's length, and how often it has a keyframe (scripts/space-loop.mjs). */
const LOOP_S = 18
const KEYFRAME_S = 9

/** Whether the visitor asked their browser to use less data. */
const savingData = () => (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true

/** Whether this browser can stream the AV1 loop through Media Source. */
const canStream = () => typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported(AV1)

/**
 * Plays the AV1 loop with no stall where it wraps. A native `loop` seeks back to the start,
 * and Chrome then holds the last frame for an extra frame and skips the first. Here the file
 * is appended to Media Source copy after copy, each timed to follow the one before, so
 * playback runs straight on: about one copy is kept ahead, and what has played is dropped.
 * Returns the cleanup; `fail` is called if the browser rejects the stream.
 */
function streamLoop(video: HTMLVideoElement, url: string, fail: () => void): () => void {
  const source = new MediaSource()
  const objectUrl = URL.createObjectURL(source)
  const s: { disposed: boolean; copies: number; buffer: SourceBuffer | null; data: ArrayBuffer | null } = {
    disposed: false,
    copies: 0,
    buffer: null,
    data: null,
  }

  const topUp = () => {
    const { buffer, data } = s
    if (s.disposed || !buffer || !data || buffer.updating) return
    const t = video.currentTime
    // Drop what played more than a keyframe interval ago, so the buffer never grows.
    if (buffer.buffered.length && buffer.buffered.start(0) < t - LOOP_S) {
      buffer.remove(0, t - KEYFRAME_S - 1)
    } else if (s.copies * LOOP_S - t < LOOP_S) {
      buffer.timestampOffset = s.copies * LOOP_S
      buffer.appendBuffer(data)
      s.copies += 1
    }
  }

  source.addEventListener(
    'sourceopen',
    async () => {
      try {
        const response = await fetch(url)
        if (!response.ok) throw new Error(`${response.status}`)
        s.data = await response.arrayBuffer()
        if (s.disposed) return
        s.buffer = source.addSourceBuffer(AV1)
        s.buffer.addEventListener('updateend', topUp)
        s.buffer.addEventListener('error', fail)
        topUp()
      } catch {
        if (!s.disposed) fail()
      }
    },
    { once: true },
  )
  video.addEventListener('timeupdate', topUp)
  video.src = objectUrl

  return () => {
    s.disposed = true
    video.removeEventListener('timeupdate', topUp)
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(objectUrl)
  }
}

/**
 * The hero's backdrop: a slow flight through a nebula, 18 seconds looped without a seam (its
 * last seconds dissolve into its first; scripts/space-loop.mjs cuts it).
 *
 * The still first frame paints at once and stays for anyone who asked for reduced motion or
 * to save data, or whose browser won't play the video. The video fades in over it only once
 * it is playing; as it starts on that same frame, the change can't be seen. It pauses while
 * off screen or in a hidden tab. AV1 is offered first (about 1.9 MB) and HEVC for Safari
 * without AV1 (about 2.3 MB); each visitor downloads one.
 */
export function SpaceBackdrop({ className = '' }: { className?: string }) {
  const reduceMotion = useReducedMotion()
  const [still] = useState(savingData)
  const [stream] = useState(canStream)
  const animate = !reduceMotion && !still
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !animate) return
    // React sets `muted` as a property, not the attribute some browsers check before autoplaying.
    video.muted = true
    const seen = { onScreen: true }
    const sync = () => {
      if (seen.onScreen && document.visibilityState === 'visible') video.play().catch(() => {})
      else video.pause()
    }
    // If streaming fails, the same file plays with a plain loop.
    const stopStream = stream
      ? streamLoop(video, av1, () => {
          video.src = av1
          video.loop = true
          sync()
        })
      : undefined
    const io = new IntersectionObserver(([entry]) => {
      seen.onScreen = entry.isIntersecting
      sync()
    })
    io.observe(video)
    document.addEventListener('visibilitychange', sync)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', sync)
      stopStream?.()
    }
  }, [animate, stream])

  return (
    <div aria-hidden className={`overflow-hidden ${className}`}>
      <img src={poster} alt="" decoding="async" fetchPriority="high" className="absolute inset-0 size-full object-cover" />
      {animate && (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop={!stream}
          playsInline
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          onPlaying={() => setPlaying(true)}
          className={`absolute inset-0 size-full object-cover transition-opacity duration-300 ${playing ? 'opacity-100' : 'opacity-0'}`}
        >
          {!stream && (
            <>
              <source src={av1} type={AV1} />
              <source src={hevc} type="video/mp4" />
            </>
          )}
        </video>
      )}
    </div>
  )
}
