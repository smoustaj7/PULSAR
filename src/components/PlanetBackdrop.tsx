import { useEffect, useRef, useState } from 'react'

const IMAGE = `${import.meta.env.BASE_URL}hero/planet.webp`

/**
 * The planet in the photo, measured in its own pixels (1672 x 941): the limb is a circle
 * whose top touches the horizon at y 347 and which leaves the frame at y ~770 on both edges.
 */
const PLANET = { cx: 836, cy: 1385, r: 1038 }
const IMAGE_SIZE = { w: 1672, h: 941 }

/** One full turn of the spin angle. About 0.01 rad/s: craters drift ~10 px a second, like orbit. */
const SPIN_PERIOD_S = 600

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`

/**
 * Spins the planet's surface about its vertical axis while keeping the photo's lighting
 * where it is. Each pixel on the disk looks up the surface point that has rotated into it,
 * takes only that point's *detail* (its luminance over its own blurred luminance), and
 * multiplies it onto the original pixel's blurred color. So the craters travel, but the
 * orange dawn on the left and the blue rim on the right stay put. Outside the disk the
 * photo is drawn as is, with the stars twinkling and the sunrise slowly breathing.
 */
const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uImage;
uniform vec2 uCanvas;      // device px
uniform vec2 uImageSize;   // image px
uniform vec3 uPlanet;      // cx, cy, r in image px
uniform float uTime;
uniform float uSpin;       // radians of rotation so far
uniform vec2 uParallax;    // image px
uniform float uIntro;      // 0..1
uniform float uAnchor;     // 0: photo anchored to the bottom; else the horizon's height as a share of the canvas
out vec4 outColor;

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

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
    // The photo only shows part of each latitude ring; fold the rotation back and forth
    // inside what it shows, so there is always real surface to sample.
    float edge = min(uPlanet.x, uImageSize.x - uPlanet.x) / uPlanet.z - 0.02;
    float lmax = asin(clamp(edge / ring, 0.0, 1.0));
    float span = 2.0 * lmax;
    float m = mod(lambda0 + uSpin + lmax, 2.0 * span);
    float lf = (m > span ? 2.0 * span - m : m) - lmax;
    vec2 src = (uPlanet.xy + vec2(sin(lf) * ring, y) * uPlanet.z) / uImageSize;

    float detail = luma(texture(uImage, src).rgb) / max(luma(textureLod(uImage, src, 4.5).rgb), 0.025);
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
  color += vec3(1.0, 0.55, 0.18) * exp(-d * d) * 0.07 * (0.5 + 0.5 * sin(uTime * 0.6));

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

    // Mutable loop state lives on one object the effect owns.
    const life = { ready: false, disposed: false, raf: 0, visible: true, start: 0 }
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
      if (!life.start) life.start = now
      const t = reduceMotion ? 0 : (now - life.start) / 1000
      // Ease out over 1.8 s: the planet arrives, then holds.
      const k = reduceMotion ? 1 : Math.min(1, t / 1.8)
      const intro = 1 - Math.pow(1 - k, 3)
      eased.x += (pointer.x - eased.x) * 0.04
      eased.y += (pointer.y - eased.y) * 0.04
      gl.uniform1f(uTime, t)
      gl.uniform1f(uSpin, (t / SPIN_PERIOD_S) * Math.PI * 2)
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
