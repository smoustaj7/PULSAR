// Cuts the hero's background loop from the hour-long nebula video.
//   node scripts/space-loop.mjs "Blue Infinite Star Tunnel - 1 Hour 4k Galaxy Loop [Um2JFPX-uH0].webm"
// Writes src/assets/space/: the loop as AV1 and as HEVC, and its first frame as the poster.
// Needs ffmpeg (with libsvtav1 and libx265) and cwebp. The source (4K, 1.1 GB) isn't committed.
//
// The source is one 90-second flight repeated; nothing shorter repeats. So the loop is LENGTH
// seconds of it whose last FADE seconds dissolve into the FADE seconds before its first frame:
// the last frame then leads straight into the first, with no jump. START is where, in the
// cycle, that dissolve blends the two most alike views (measured on 32x18 greyscale frames).
//
// Encoding keeps the faint stars: SVT-AV1's temporal filter smooths them away as noise, so it's
// off. Both files are 1920x1080, 30 fps, silent, and start on a keyframe.
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const START = 80.4
const LENGTH = 18
const FADE = 4
const OUT = 'src/assets/space'

const source = process.argv[2]
if (!source) {
  console.error('Usage: node scripts/space-loop.mjs <the hour-long source video>')
  process.exit(1)
}

const run = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'ignore', 'inherit'] })
const ffmpeg = (...args) => run('ffmpeg', ['-v', 'error', '-y', ...args])

const work = mkdtempSync(join(tmpdir(), 'space-loop-'))
mkdirSync(OUT, { recursive: true })
try {
  // A lossless master of the loop, so each encode starts from the same frames.
  const master = join(work, 'master.mkv')
  ffmpeg(
    '-ss', String(START), '-t', String(LENGTH + FADE), '-i', source, '-an',
    '-filter_complex',
    `[0:v]scale=1920:1080:flags=lanczos,setsar=1,fps=30,format=yuv420p10le,split[a][b];` +
      `[a]trim=start=${FADE}:end=${LENGTH + FADE},setpts=PTS-STARTPTS[main];` +
      `[b]trim=start=0:end=${FADE},setpts=PTS-STARTPTS[head];` +
      `[main][head]xfade=transition=fade:duration=${FADE}:offset=${LENGTH - FADE}[v]`,
    '-map', '[v]', '-c:v', 'ffv1', '-level', '3', master,
  )

  // AV1 for the browsers that decode it (Chrome, Firefox, Edge, recent Apple devices).
  // Fragmented, so the page can stream it into Media Source copy after copy (SpaceBackdrop).
  ffmpeg(
    '-i', master, '-an', '-c:v', 'libsvtav1', '-preset', '4', '-crf', '38', '-g', '270', '-pix_fmt', 'yuv420p10le',
    '-svtav1-params', 'tune=0:scd=0:enable-tf=0', '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
    join(OUT, 'nebula-loop-av1.mp4'),
  )
  // HEVC for Safari on devices without AV1. A closed GOP, so the loop restarts cleanly.
  ffmpeg(
    '-i', master, '-an', '-c:v', 'libx265', '-preset', 'slow', '-crf', '28', '-pix_fmt', 'yuv420p', '-tag:v', 'hvc1',
    '-x265-params', 'keyint=270:min-keyint=270:no-open-gop=1:scenecut=0:log-level=error',
    '-movflags', '+faststart', join(OUT, 'nebula-loop-hevc.mp4'),
  )

  // The first frame, shown before the video plays and instead of it when motion is off.
  const first = join(work, 'first.png')
  ffmpeg('-i', master, '-frames:v', '1', '-vf', 'format=rgb24', first)
  run('cwebp', ['-quiet', '-q', '72', '-m', '6', first, '-o', join(OUT, 'nebula-poster.webp')])
} finally {
  rmSync(work, { recursive: true, force: true })
}
console.log(`Wrote ${OUT}/nebula-loop-av1.mp4, nebula-loop-hevc.mp4 and nebula-poster.webp`)
