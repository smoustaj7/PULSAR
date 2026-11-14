/** Log-spaced speech bands, ordered low to high. Values are normalized dB energy, not decorative motion. */
export function speechBands(spectrum: Float32Array, sampleRate: number, fftSize: number, count: number): number[] {
  const low = 100
  const high = Math.min(6000, sampleRate / 2)
  const binWidth = sampleRate / fftSize
  return Array.from({ length: count }, (_, band) => {
    const start = Math.max(1, Math.floor((low * (high / low) ** (band / count)) / binWidth))
    const end = Math.min(spectrum.length, Math.max(start + 1, Math.ceil((low * (high / low) ** ((band + 1) / count)) / binWidth)))
    let power = 0
    for (let bin = start; bin < end; bin++) power += 10 ** (spectrum[bin] / 10)
    const db = 10 * Math.log10(power / Math.max(1, end - start))
    // Quiet room / digital silence settles at zero; normal speech uses the available height.
    return Number.isFinite(db) ? Math.min(1, Math.max(0, (db + 70) / 45)) : 0
  })
}
