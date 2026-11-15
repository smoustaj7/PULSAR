/**
 * How long a signal takes between Earth and Mars on a given day, from where the two planets
 * are on their orbits. Positions use JPL's approximate Keplerian elements (Standish, valid
 * 1800–2050, good to a fraction of a degree), plenty for minutes of light time.
 */

const AU_KM = 149_597_870.7
const C_KM_S = 299_792.458
const DEG = Math.PI / 180

/** [a (AU), e, I (deg), L (deg), long. perihelion (deg), long. ascending node (deg)], at J2000 and per century. */
type Elements = readonly [number, number, number, number, number, number]
const EARTH: [Elements, Elements] = [
  [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0],
  [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0],
]
const MARS: [Elements, Elements] = [
  [1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
  [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
]

/** Heliocentric ecliptic position (AU) of a planet at time `t` (epoch ms). */
export function heliocentric([at2000, rate]: [Elements, Elements], t: number): [number, number, number] {
  const T = (t / 86_400_000 + 2_440_587.5 - 2_451_545) / 36_525
  const [a, e, I, L, varpi, node] = at2000.map((v, i) => v + rate[i] * T)
  const omega = (varpi - node) * DEG
  const M = ((((L - varpi) % 360) + 540) % 360 - 180) * DEG
  // Kepler's equation by Newton's method.
  let E = M + e * Math.sin(M)
  for (let i = 0; i < 8; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
  const x1 = a * (Math.cos(E) - e)
  const y1 = a * Math.sqrt(1 - e * e) * Math.sin(E)
  const [cw, sw, cN, sN, cI, sI] = [Math.cos(omega), Math.sin(omega), Math.cos(node * DEG), Math.sin(node * DEG), Math.cos(I * DEG), Math.sin(I * DEG)]
  return [
    (cw * cN - sw * sN * cI) * x1 + (-sw * cN - cw * sN * cI) * y1,
    (cw * sN + sw * cN * cI) * x1 + (-sw * sN + cw * cN * cI) * y1,
    sw * sI * x1 + cw * sI * y1,
  ]
}

/** Earth–Mars distance in AU at time `t`. */
export function marsDistanceAu(t: number): number {
  const [ex, ey, ez] = heliocentric(EARTH, t)
  const [mx, my, mz] = heliocentric(MARS, t)
  return Math.hypot(mx - ex, my - ey, mz - ez)
}

/** One-way signal time between Earth and Mars at time `t`, in ms. */
export const marsLightTimeMs = (t: number) => ((marsDistanceAu(t) * AU_KM) / C_KM_S) * 1000

/** "9 min 36 s", "52 s", "1 h 2 min". */
export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s} s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min ${s % 60} s`
  return `${Math.floor(m / 60)} h ${m % 60} min`
}

/** "9:36" for a countdown. */
export function formatClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(s / 3600)
  const mm = String(Math.floor((s % 3600) / 60))
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${mm.padStart(2, '0')}:${ss}` : `${mm}:${ss}`
}
