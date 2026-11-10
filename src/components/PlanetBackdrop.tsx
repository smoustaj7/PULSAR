import { useEffect, useRef, useState } from 'react'

const IMAGE = `${import.meta.env.BASE_URL}hero/planet.webp`

/**
 * The planet in the photo, measured in its own pixels (1672 x 941): the limb is a circle
 * whose top touches the horizon at y 347 and which leaves the frame at y ~770 on both edges.
 */
const PLANET = { cx: 836, cy: 1385, r: 1038 }
const IMAGE_SIZE = { w: 1672, h: 941 }

/** One full turn of the planet. About 0.02 rad/s: craters drift ~20 px a second. */
const SPIN_PERIOD_S = 320
const SPIN_RAD_PER_S = (Math.PI * 2) / SPIN_PERIOD_S
/**
 * The photo shows one face: a band of longitudes this many radians either side of the
 * centre line, taken where the photo is narrowest (its bottom edge) so every latitude has
 * real surface for the whole band. The spinning world is that band laid end to end, each
 * copy overlapping the last by OVERLAP radians and dissolving into it.
 */
const HALF_BAND = Math.asin(
  (Math.min(PLANET.cx, IMAGE_SIZE.w - PLANET.cx) / PLANET.r - 0.02) /
    Math.sqrt(1 - ((IMAGE_SIZE.h - PLANET.cy) / PLANET.r) ** 2),
)
const OVERLAP = 0.35
/** The map repeats after this many radians, so the spin angle can wrap there without a jump. */
const MAP_PERIOD = 2 * HALF_BAND - OVERLAP

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`

/**
 * Spins the planet's surface about its vertical axis while keeping the photo's lighting
 * where it is. Each pixel on the disk looks up the surface point that has rotated into it,
 * takes only that point's *detail* (its luminance over its own blurred luminance), and
 * multiplies it onto the original pixel's blurred color. So the craters travel, but the
 * dawn on the horizon and the lit rim stay put.
 *
 * The surface is a rigid map that turns one way for ever: the band of longitudes the photo
 * shows, repeated. Each copy overlaps the one before it and the two dissolve into each
 * other there, so there is no seam and, unlike mirroring, no line of symmetry.
 *
 * Outside the disk the photo is drawn as is, with the stars twinkling and the sunrise
 * slowly breathing.
 */
const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uImage;
uniform vec2 uCanvas;      // device px
uniform vec2 uImageSize;   // image px
uniform vec3 uPlanet;      // cx, cy, r in image px
uniform float uTime;
uniform float uSpin;       // radians turned so far
uniform float uHalfBand;   // half the band of longitudes the photo shows, radians
uniform float uOverlap;    // how far neighbouring copies of the band overlap, radians
uniform vec2 uParallax;    // image px
uniform float uIntro;      // 0..1
uniform float uAnchor;     // 0: photo anchored to the bottom; else the horizon's height as a share of the canvas
out vec4 outColor;

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

// The surface detail at photo longitude lf on the latitude ring through this pixel. The mip
// level is given, not derived, so the wrap from one copy of the band to the next leaves no seam.
float detailAt(float lf, float ring, float y, float lod) {
  vec2 src = (uPlanet.xy + vec2(sin(lf) * ring, y) * uPlanet.z) / uImageSize;
  return luma(textureLod(uImage, src, lod).rgb) / max(luma(textureLod(uImage, src, 4.5).rgb), 0.025);
}

void main() {
  // Cover-fit the photo, anchored to the bottom so the horizon and surface stay in frame.
  vec2 frag = vec2(gl_FragCoord.x, uCanvas.y - gl_FragCoord.y);
  float zoom = 1.06 + 0.05 * (1.0 - uIntro);
  float s = max(uCanvas.x / uImageSize.x, uCanvas.y / uImageSize.y) * zoom;
  vec2 offset = vec2((uCanvas.x - uImageSize.x * s) * 0.5, uCanvas.y - uImageSize.y * s * 0.985);
  // On tall screens the copy fills the frame, so the horizon is lifted to sit up by the
  // masthead and the paragraph lands on the darker surface instead of on the sunrise.
  if (uAnchor > 0.0) offset.y = uCanvas.y * uAnchor - (uPlanet.y - uPlanet.z) * s;
  vec2 px = (frag - offset) / s + uParallax;
  vec2 uv = px / uImageSize;

  vec3 orig = texture(uImage, uv).rgb;
  vec3 color = orig;

  vec2 q = (px - uPlanet.xy) / uPlanet.z;
  float r = length(q);

  if (r < 1.0) {
    float y = q.y;
    float ring = sqrt(max(1.0 - y * y, 1e-4));
    float lambda0 = asin(clamp(q.x / ring, -1.0, 1.0));
    float lod = max(0.0, -log2(s));
    // Where this point sits in its copy of the band: 0 at the copy's start.
    float period = 2.0 * uHalfBand - uOverlap;
    float along = mod(lambda0 + uSpin + uHalfBand, period);
    // Over its first stretch a copy fades in over the tail of the one before it.
    float wA = smoothstep(0.0, uOverlap, along);
    float wB = 1.0 - wA;
    float dA = detailAt(along - uHalfBand, ring, y, lod);
    float dB = detailAt(min(along, uOverlap) + period - uHalfBand, ring, y, lod);
    // Averaging the two copies where they hand over would flatten the relief; renormalise.
    float detail = 1.0 + ((dA - 1.0) * wA + (dB - 1.0) * wB) / sqrt(wA * wA + wB * wB);
    vec3 spun = textureLod(uImage, uv, 4.5).rgb * clamp(detail, 0.0, 2.6);
    // Leave the limb, where the atmosphere glows, exactly as photographed.
    float inner = 1.0 - smoothstep(0.93, 0.992, r);
    color = mix(orig, spun, inner);
  } else {
    // Stars are points: bright against their own blurred surroundings.
    float point = luma(orig) - luma(textureLod(uImage, uv, 3.0).rgb);
    float star = smoothstep(0.06, 0.22, point);
    float tw = 0.65 + 0.35 * sin(uTime * (1.2 + hash(floor(px)) * 2.4) + hash(floor(px) + 7.0) * 6.2831);
    color *= mix(1.0, tw * 1.25, star);
  }

  // The sunrise on the horizon breathes, very slightly.
  vec2 sun = vec2(uPlanet.x, uPlanet.y - uPlanet.z);
  float d = length((px - sun) / vec2(420.0, 160.0));
  color += vec3(0.66, 0.95, 0.9) * exp(-d * d) * 0.07 * (0.5 + 0.5 * sin(uTime * 0.6));

  outColor = vec4(color * uIntro, 1.0);
}`

const compile = (gl: WebGL2RenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'shader')
  return shader
}

/**
 * The hero's backdrop: the planet photo, alive. Falls back to the still photo when WebGL2
 * is missing, and holds a single settled frame for anyone who asked for reduced motion.
 */
export function PlanetBackdrop({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [fallback, setFallback] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false })
    if (!gl) {
      setFallback(true)
      return
    }
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const finePointer = window.matchMedia('(pointer: fine)').matches

    let program: WebGLProgram
    try {
      program = gl.createProgram()!
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT))
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG))
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'link')
    } catch (error) {
      console.warn('Planet backdrop unavailable, showing the still photo.', error)
      setFallback(true)
      return
    }
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(program, 'aPos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const u = (name: string) => gl.getUniformLocation(program, name)
    const uCanvas = u('uCanvas')
    const uTime = u('uTime')
    const uSpin = u('uSpin')
    const uParallax = u('uParallax')
    const uIntro = u('uIntro')
    const uAnchor = u('uAnchor')
    gl.uniform2f(u('uImageSize'), IMAGE_SIZE.w, IMAGE_SIZE.h)
    gl.uniform3f(u('uPlanet'), PLANET.cx, PLANET.cy, PLANET.r)
    gl.uniform1f(u('uHalfBand'), HALF_BAND)
    gl.uniform1f(u('uOverlap'), OVERLAP)

    // Mutable loop state lives on one object the effect owns. Motion advances by clamped
    // frame steps, so a pause (tab hidden, hero off screen) resumes where it left off
    // instead of jumping ahead.
    const life = { ready: false, disposed: false, raf: 0, visible: true, first: 0, last: 0, t: 0, spin: 0 }
    const pointer = { x: 0, y: 0 }
    const eased = { x: 0, y: 0 }

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.75)
      const w = Math.max(1, Math.round(canvas.clientWidth * ratio))
      const h = Math.max(1, Math.round(canvas.clientHeight * ratio))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      gl.viewport(0, 0, w, h)
      gl.uniform2f(uCanvas, w, h)
      gl.uniform1f(uAnchor, w / h < 0.8 ? 0.17 : 0)
    }

    const draw = (now: number) => {
      if (!life.ready) return
      const dt = reduceMotion || !life.last ? 0 : Math.min((now - life.last) / 1000, 0.25)
      if (!life.first) life.first = now
      life.last = now
      life.t += dt
      life.spin = (life.spin + dt * SPIN_RAD_PER_S) % MAP_PERIOD
      // Ease out over 1.8 s: the planet arrives, then holds. On the wall clock, so a slow
      // or throttled start never leaves the hero dark.
      const k = reduceMotion ? 1 : Math.min(1, (now - life.first) / 1800)
      const intro = 1 - Math.pow(1 - k, 3)
      // Frame-rate independent easing toward the pointer.
      const follow = dt ? 1 - Math.exp(-dt * 2.4) : 1
      eased.x += (pointer.x - eased.x) * follow
      eased.y += (pointer.y - eased.y) * follow
      gl.uniform1f(uTime, life.t)
      gl.uniform1f(uSpin, life.spin)
      gl.uniform2f(uParallax, eased.x * 18, eased.y * 10)
      gl.uniform1f(uIntro, intro)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    const loop = (now: number) => {
      draw(now)
      if (!life.disposed && life.visible && !reduceMotion) life.raf = requestAnimationFrame(loop)
    }
    const startLoop = () => {
      cancelAnimationFrame(life.raf)
      life.raf = requestAnimationFrame(loop)
    }

    const image = new Image()
    image.decoding = 'async'
    image.onload = () => {
      if (life.disposed) return
      const texture = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
      gl.generateMipmap(gl.TEXTURE_2D)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      life.ready = true
      resize()
      startLoop()
    }
    image.onerror = () => setFallback(true)
    image.src = IMAGE

    const observer = new ResizeObserver(() => {
      resize()
      if (reduceMotion || !life.visible) draw(performance.now())
    })
    observer.observe(canvas)

    // Only spend frames while the hero is on screen and the tab is in front.
    const io = new IntersectionObserver(([entry]) => {
      life.visible = entry.isIntersecting && document.visibilityState === 'visible'
      if (life.visible && !reduceMotion) startLoop()
    })
    io.observe(canvas)
    const onVisibility = () => {
      life.visible = document.visibilityState === 'visible'
      if (life.visible && !reduceMotion) startLoop()
    }
    document.addEventListener('visibilitychange', onVisibility)

    const onPointer = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    if (finePointer && !reduceMotion) window.addEventListener('pointermove', onPointer, { passive: true })

    return () => {
      life.disposed = true
      cancelAnimationFrame(life.raf)
      observer.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pointermove', onPointer)
      // No loseContext(): a remount (React dev mode mounts twice) reuses this canvas, and a
      // lost context would fail every compile after it. Deleting the program is enough.
      gl.deleteProgram(program)
      gl.deleteBuffer(buffer)
    }
  }, [])

  if (fallback) {
    return <img src={IMAGE} alt="" aria-hidden className={`object-cover object-bottom ${className}`} />
  }
  return <canvas ref={canvasRef} aria-hidden className={className} />
}
