import { useEffect, useRef } from 'react'
import { speechBands } from '../lib/voiceSpectrum'

/** Live speech-frequency bars. No oscillator, loop, or synthetic motion. */
export function VoiceWaveform({ analyser }: { analyser: AnalyserNode | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)
  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const spectrum = new Float32Array(analyser?.frequencyBinCount ?? 0)
    const color = getComputedStyle(canvas).color
    const draw = () => {
      const { width, height } = canvas.getBoundingClientRect()
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      const pixelsWide = Math.round(width * ratio)
      const pixelsHigh = Math.round(height * ratio)
      if (canvas.width !== pixelsWide || canvas.height !== pixelsHigh) {
        canvas.width = pixelsWide
        canvas.height = pixelsHigh
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      context.clearRect(0, 0, width, height)
      const count = Math.max(1, Math.floor(width / 4.5))
      if (analyser) analyser.getFloatFrequencyData(spectrum)
      const bands = analyser ? speechBands(spectrum, analyser.context.sampleRate, analyser.fftSize, count) : []
      context.strokeStyle = color
      context.lineWidth = 2
      context.lineCap = 'round'
      for (let bar = 0; bar < count; bar++) {
        const energy = bands[bar] ?? 0
        const barHeight = 3 + energy * Math.max(0, height - 7)
        const x = ((bar + 0.5) * width) / count
        context.globalAlpha = 0.45 + energy * 0.55
        context.beginPath()
        context.moveTo(x, (height - barHeight) / 2)
        context.lineTo(x, (height + barHeight) / 2)
        context.stroke()
      }
      context.globalAlpha = 1
      // This is measured feedback, including with reduced motion; silence has no animation.
      if (analyser) frameRef.current = requestAnimationFrame(draw)
    }
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frameRef.current)
      draw()
    })
    observer.observe(canvas)
    draw()
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frameRef.current)
    }
  }, [analyser])
  return <canvas ref={canvasRef} className="voice-waveform" aria-hidden="true" />
}
