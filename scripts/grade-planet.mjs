// Grades the hero photo into the site's teal palette.
//   node scripts/grade-planet.mjs
// Reads art-src/planet-original.webp, writes public/hero/planet.webp. Needs ffmpeg and cwebp.
//
// A two-tone gradient map: every pixel keeps its brightness and takes its color from a ramp
// through the palette. Pixels that were warm in the original (the sunlit side) ride a
// greener ramp than the cool ones, so the planet keeps its two-sided light without the orange.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const SRC = 'art-src/planet-original.webp'
const OUT = 'public/hero/planet.webp'
const W = 1672
const H = 941

const COOL = [
  [0.0, [3, 15, 20]],
  [0.16, [9, 48, 60]],
  [0.4, [24, 124, 129]], // #187C81
  [0.68, [168, 218, 220]], // #A8DADC
  [1.0, [247, 255, 253]], // #F7FFFD
]
const WARM = [
  [0.0, [3, 15, 20]],
  [0.16, [15, 76, 92]], // #0F4C5C
  [0.44, [42, 157, 143]], // #2A9D8F
  [0.74, [168, 218, 220]], // #A8DADC
  [0.9, [224, 247, 244]], // #E0F7F4
  [1.0, [247, 255, 253]], // #F7FFFD
]

const ramp = (stops, l) => {
  for (let i = 1; i < stops.length; i++) {
    const [l1, c1] = stops[i]
    if (l <= l1) {
      const [l0, c0] = stops[i - 1]
      const t = (l - l0) / (l1 - l0)
      return c0.map((v, k) => v + (c1[k] - v) * t)
    }
  }
  return stops[stops.length - 1][1]
}

const dir = mkdtempSync(join(tmpdir(), 'planet-'))
const raw = join(dir, 'in.rgb')
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', SRC, '-f', 'rawvideo', '-pix_fmt', 'rgb24', raw])
const px = readFileSync(raw)
if (px.length !== W * H * 3) throw new Error(`expected ${W}x${H}, got ${px.length / 3} pixels`)

for (let i = 0; i < px.length; i += 3) {
  const r = px[i]
  const g = px[i + 1]
  const b = px[i + 2]
  const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  const warmth = Math.min(1, Math.max(0, ((r - b) / (Math.max(r, g, b) + 24)) * 1.6 + 0.2))
  const cool = ramp(COOL, l)
  const warm = ramp(WARM, l)
  for (let k = 0; k < 3; k++) px[i + k] = Math.round(cool[k] + (warm[k] - cool[k]) * warmth)
}

const graded = join(dir, 'out.rgb')
const png = join(dir, 'out.png')
writeFileSync(graded, px)
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${W}x${H}`, '-i', graded, png])
execFileSync('cwebp', ['-quiet', '-q', '88', '-m', '6', png, '-o', OUT])
rmSync(dir, { recursive: true })
console.log(`wrote ${OUT}`)
