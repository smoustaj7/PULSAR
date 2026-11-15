import { describe, expect, it } from 'vitest'
import { speechBands } from './voiceSpectrum'

const sampleRate = 48000
const fftSize = 2048
function spectrumAt(frequency: number, db = -30) {
  const data = new Float32Array(fftSize / 2).fill(-Infinity)
  data[Math.round((frequency * fftSize) / sampleRate)] = db
  return data
}

describe('speech-frequency waveform', () => {
  it('rests at the baseline for digital silence and quiet background noise', () => {
    expect(speechBands(new Float32Array(1024).fill(-Infinity), sampleRate, fftSize, 50)).toEqual(Array(50).fill(0))
    expect(speechBands(new Float32Array(1024).fill(-85), sampleRate, fftSize, 50)).toEqual(Array(50).fill(0))
  })
  it('maps low and high frequency input to the corresponding sides of the strip', () => {
    const low = speechBands(spectrumAt(220), sampleRate, fftSize, 50)
    const high = speechBands(spectrumAt(3000), sampleRate, fftSize, 50)
    expect(Math.max(...low)).toBeGreaterThan(0)
    expect(Math.max(...high)).toBeGreaterThan(0)
    expect(low.indexOf(Math.max(...low))).toBeLessThan(20)
    expect(high.indexOf(Math.max(...high))).toBeGreaterThan(35)
  })
  it('reacts to stronger speech and clamps loud input', () => {
    const quiet = speechBands(spectrumAt(500, -60), sampleRate, fftSize, 40)
    const loud = speechBands(spectrumAt(500, -20), sampleRate, fftSize, 40)
    expect(Math.max(...loud)).toBeGreaterThan(Math.max(...quiet))
    expect(loud.every((value) => value >= 0 && value <= 1)).toBe(true)
  })
  it('ignores DC/rumble below speech and ultrasonic bins', () => {
    expect(speechBands(spectrumAt(0), sampleRate, fftSize, 50)).toEqual(Array(50).fill(0))
    expect(speechBands(spectrumAt(14000), sampleRate, fftSize, 50)).toEqual(Array(50).fill(0))
  })
})
