import { OrbitControls, Stars, useGLTF } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentRef, type RefObject } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { RegionAssessment, Status } from '../engine/types'

/**
 * The 3D body model: the astronaut, suited by default; with the suit off the organs show,
 * each colored by its body system's status. Built on FazOuard's model and scene
 * (`astronautmodel.tsx`), wired to the app's real assessments instead of demo data.
 *
 * Organs are found by **mesh name**, so the shipped model keeps every mesh separate
 * (see `models-src/README.md`).
 */

const MODEL_URL = `${import.meta.env.BASE_URL}models/astronaut.glb`

type Role = 'shell' | 'organ' | 'suit' | 'accessory'
interface Rule {
  match: RegExp
  role: Role
  /** The AstroPulse body region an organ stands for. */
  regionId?: string
}

const SUIT_PART = /suit_(base|belt|buttons|details|straps)|boots?|gloves?|bottle|helmet|visor|belt_leg|backpack|bagpack|accessor/i
const RULES: Rule[] = [
  { match: /boots?|gloves?|bottle|helmet|visor|belt_leg|suit_belt|suit_straps|backpack|bagpack|accessor/i, role: 'accessory' },
  { match: /suit_(base|buttons|details)/i, role: 'suit' },
  { match: /skin|meat|body_shell|^body$/i, role: 'shell' },
  { match: /heart|cardi/i, role: 'organ', regionId: 'cardiovascular' },
  { match: /lung|bronch|trachea/i, role: 'organ', regionId: 'respiratory' },
  { match: /brain|cerebr/i, role: 'organ', regionId: 'brain' },
  { match: /stomach|gastric|interstain/i, role: 'organ', regionId: 'metabolic' },
  { match: /spleen|thymus|immune/i, role: 'organ', regionId: 'immune' },
  { match: /skelet|bone|rib|spine|skull|femur|pelvis|vertebra/i, role: 'organ', regionId: 'musculoskeletal' },
]
/**
 * The suit's finish, by mesh name (first match wins). The model ships every suit part in one
 * flat clay material; this dresses it as an EVA suit: layered white fabric with a soft sheen,
 * a glossy white helmet shell, a gold-coated visor, and metal fittings.
 */
const FABRIC: THREE.MeshPhysicalMaterialParameters = {
  color: '#e2e0d9',
  roughness: 0.88,
  sheen: 0.7,
  sheenRoughness: 0.6,
  sheenColor: '#ffffff',
  envMapIntensity: 0.22,
}
const SUIT_FINISH: [RegExp, THREE.MeshPhysicalMaterialParameters][] = [
  [/helmet_glass|visor/i, { color: '#d9a441', metalness: 1, roughness: 0.07, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.5 }],
  [/helmet_metal/i, { color: '#c3c9cf', metalness: 1, roughness: 0.3 }],
  [/helmet/i, { color: '#efeee9', roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 0.5 }],
  [/bottle_tube/i, { color: '#5d6873', roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.3 }],
  [/bottle/i, { color: '#c8ced4', metalness: 0.9, roughness: 0.3 }],
  [/suit_buttons/i, { color: '#b3bac1', metalness: 0.85, roughness: 0.28 }],
  [/suit_straps|suit_belt|belt_leg/i, { color: '#9199a1', roughness: 0.72, sheen: 0.4, sheenRoughness: 0.6, envMapIntensity: 0.3 }],
  [/gloves?/i, { ...FABRIC, color: '#d9d8d2', roughness: 0.8 }],
  [/boots?/i, { color: '#cfcdc6', roughness: 0.7, envMapIntensity: 0.3 }],
  [/suit_details/i, { ...FABRIC, color: '#d3d1c9' }],
  [/suit_base/i, FABRIC],
]

/** When a click passes through several organs, the one a reader most likely meant. */
const PICK_ORDER = ['cardiovascular', 'respiratory', 'brain', 'metabolic', 'immune', 'musculoskeletal']

const FRESNEL_VS = `varying vec3 vN; varying vec3 vV;
void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0);
  vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`
const FRESNEL_FS = `uniform vec3 uColor; uniform float uPow; uniform float uI; uniform float uA; varying vec3 vN; varying vec3 vV;
void main(){ float f = pow(1.0-abs(dot(normalize(vN),normalize(vV))), uPow);
  gl_FragColor = vec4(uColor*(0.25 + f*uI)*uA, (0.10 + f*0.75)*uA); }`

/** Status colors come from the design tokens, so the model matches every badge on the page. */
const readStatusColors = (): Record<Status, THREE.Color> => {
  const style = getComputedStyle(document.documentElement)
  const color = (name: string, fallback: string) => new THREE.Color(style.getPropertyValue(name).trim() || fallback)
  return {
    nominal: color('--status-nominal', '#6fdc8c'),
    caution: color('--status-caution', '#f4d35e'),
    critical: color('--status-critical', '#f26d6d'),
    unknown: color('--status-unknown', '#82a3a8'),
  }
}

/** Natural colors for systems that are fine, so only what needs attention stands out. */
const NATURAL: Record<string, string> = {
  cardiovascular: '#c94b55',
  respiratory: '#d98791',
  brain: '#d98ba2',
  immune: '#ba7181',
  metabolic: '#cf8f86',
  musculoskeletal: '#efe9df',
}

const fullName = (o: THREE.Object3D) => {
  const names: string[] = []
  for (let n: THREE.Object3D | null = o; n; n = n.parent) names.push(n.name)
  return names.join('/')
}

interface Organ {
  regionId: string
  mats: THREE.MeshStandardMaterial[]
  center: THREE.Vector3
  radius: number
}
interface Focus {
  point: THREE.Vector3
  dist: number
}

/** The resting frame: the whole figure with a little air around it. */
const FULL_BODY: Focus = { point: new THREE.Vector3(0, 0, 0), dist: 3.8 }

function Model({
  regions,
  selectedId,
  showSuit,
  heartRate,
  reduceMotion,
  onSelect,
  onFocus,
}: {
  regions: RegionAssessment[]
  selectedId: string | null
  showSuit: boolean
  heartRate: number
  reduceMotion: boolean
  onSelect: (regionId: string | null) => void
  onFocus: (focus: Focus) => void
}) {
  const gltf = useGLTF(MODEL_URL, false, true)
  // A soft studio room, used only for the suit's reflections: the visor and fittings need
  // something to mirror, while the organs keep their own look. Built on the first frame and
  // dropped on unmount, so a remount builds a fresh one.
  const studio = useRef<THREE.WebGLRenderTarget | null>(null)
  useEffect(
    () => () => {
      studio.current?.dispose()
      studio.current = null
    },
    [],
  )
  const colors = useMemo(() => {
    const status = readStatusColors()
    const natural = Object.fromEntries(Object.entries(NATURAL).map(([id, hex]) => [id, new THREE.Color(hex)]))
    return { status, natural }
  }, [])
  const status = useMemo(() => Object.fromEntries(regions.map((r) => [r.region.id, r.status])) as Record<string, Status>, [regions])

  const prep = useMemo(() => {
    const scene = gltf.scene.clone(true)
    scene.updateMatrixWorld(true)
    const organs: Record<string, Organ> = {}
    const suitParts: THREE.Object3D[] = []
    const anatomy: THREE.Mesh[] = []
    const pivots: THREE.Group[] = []
    const suitMats: THREE.MeshPhysicalMaterial[] = []
    const shellMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color('#e6ecf5') }, uPow: { value: 1.3 }, uI: { value: 1 }, uA: { value: 1 } },
      vertexShader: FRESNEL_VS,
      fragmentShader: FRESNEL_FS,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const noRay = () => {}

    // Collect first, then process: re-parenting the heart and lungs onto their pivots
    // mid-traversal made `traverse` skip the next sibling, which left a lung half with its
    // original material and the helmet base out of the suit toggle.
    const nodes: THREE.Object3D[] = []
    scene.traverse((o) => nodes.push(o))
    for (const o of nodes) {
      if (SUIT_PART.test(fullName(o))) suitParts.push(o)
    }
    nodes.forEach((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const rule = RULES.find((r) => r.match.test(fullName(mesh)))
      if (!rule) {
        mesh.visible = false
        mesh.raycast = noRay
        return
      }
      if (rule.role === 'accessory' || rule.role === 'suit') {
        mesh.raycast = noRay
        const finish = SUIT_FINISH.find(([match]) => match.test(fullName(mesh)))?.[1]
        if (finish) {
          const mat = new THREE.MeshPhysicalMaterial(finish)
          mesh.material = mat
          suitMats.push(mat)
        }
        mesh.castShadow = true
        mesh.receiveShadow = true
        return
      }
      if (rule.role === 'shell') {
        mesh.material = shellMat
        mesh.renderOrder = 10
        mesh.raycast = noRay
        anatomy.push(mesh)
        return
      }
      const mat = new THREE.MeshStandardMaterial({ roughness: 0.45, transparent: true, depthWrite: false })
      mesh.material = mat
      mesh.userData.regionId = rule.regionId
      anatomy.push(mesh)
      const organ = (organs[rule.regionId!] ??= { regionId: rule.regionId!, mats: [], center: new THREE.Vector3(), radius: 1 })
      organ.mats.push(mat)

      // A pivot at the organ's own centre, so the heartbeat and breathing scale in place.
      if (rule.regionId === 'cardiovascular' || rule.regionId === 'respiratory') {
        const c = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3())
        const pivot = new THREE.Group()
        pivot.userData.kind = rule.regionId
        mesh.parent!.add(pivot)
        pivot.position.copy(mesh.parent!.worldToLocal(c.clone()))
        pivot.attach(mesh)
        pivots.push(pivot)
      }
    })

    scene.updateMatrixWorld(true)
    for (const organ of Object.values(organs)) {
      const box = new THREE.Box3()
      scene.traverse((o) => {
        if (o.userData.regionId === organ.regionId) box.expandByObject(o)
      })
      box.getCenter(organ.center)
      organ.radius = box.getSize(new THREE.Vector3()).length() / 2
    }

    const box = new THREE.Box3()
    scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && o.visible) box.expandByObject(o)
    })
    const k = 2.2 / (box.getSize(new THREE.Vector3()).y || 1)
    const centre = box.getCenter(new THREE.Vector3())
    return { scene, organs, suitParts, anatomy, pivots, shellMat, suitMats, k, centre }
  }, [gltf])

  useEffect(
    () => () => {
      prep.shellMat.dispose()
      // The suit's finishes are the only physical materials in the scene.
      prep.scene.traverse((o) => {
        const m = (o as THREE.Mesh).material
        if (m instanceof THREE.MeshPhysicalMaterial) m.dispose()
      })
    },
    [prep],
  )
  // The light is fixed to the model and only the camera turns, so the suit's shadows are
  // drawn once, whenever what is shown changes, rather than every frame.
  const shadowsStale = useRef(true)
  useLayoutEffect(() => {
    prep.suitParts.forEach((p) => (p.visible = showSuit))
    prep.anatomy.forEach((m) => (m.visible = !showSuit))
    shadowsStale.current = true
  }, [prep, showSuit])

  // Turn the camera toward whichever system is selected, wherever the selection came from.
  useEffect(() => {
    const organ = selectedId ? prep.organs[selectedId] : null
    onFocus(
      organ
        ? {
            point: organ.center.clone().sub(prep.centre).multiplyScalar(prep.k),
            dist: THREE.MathUtils.clamp(organ.radius * prep.k * 4, 1.1, 4.2),
          }
        : FULL_BODY,
    )
  }, [selectedId, prep, onFocus])

  // The frame loop mutates three.js materials, so it reads the prepared scene through a ref.
  const live = useRef(prep)
  useEffect(() => {
    live.current = prep
  }, [prep])

  useFrame(({ clock, gl }) => {
    const prep = live.current
    if (!studio.current) {
      const pmrem = new THREE.PMREMGenerator(gl)
      const room = new RoomEnvironment()
      studio.current = pmrem.fromScene(room, 0.04)
      room.dispose()
      pmrem.dispose()
    }
    // three sees the new envMap and recompiles the material on its own.
    const env = studio.current.texture
    for (const m of prep.suitMats) if (m.envMap !== env) m.setValues({ envMap: env })
    if (shadowsStale.current) {
      gl.shadowMap.needsUpdate = true
      shadowsStale.current = false
    }
    const t = clock.getElapsedTime()
    const has = selectedId !== null
    prep.shellMat.uniforms.uA.value += ((has ? 0.2 : 1) - prep.shellMat.uniforms.uA.value) * 0.1
    for (const organ of Object.values(prep.organs)) {
      const s = status[organ.regionId] ?? 'unknown'
      const isSel = selectedId === organ.regionId
      const bone = organ.regionId === 'musculoskeletal'
      const flagged = s === 'caution' || s === 'critical'
      const opacity = !has ? (bone ? (flagged ? 0.55 : 0.3) : 0.95) : isSel ? 1 : 0.12
      const glow = !has ? (flagged ? 0.7 : 0.2) : isSel ? 0.9 : 0.03
      const pulse = s === 'critical' && !reduceMotion && (!has || isSel) ? 0.35 * Math.sin(t * 5) : 0
      const color = flagged ? colors.status[s] : colors.natural[organ.regionId]
      for (const m of organ.mats) {
        m.color.copy(color)
        m.emissive.copy(color)
        m.opacity += (opacity - m.opacity) * 0.12
        m.emissiveIntensity += (glow + pulse - m.emissiveIntensity) * 0.2
      }
    }
    if (reduceMotion) return
    for (const p of prep.pivots) {
      if (p.userData.kind === 'cardiovascular') p.scale.setScalar(1 + 0.07 * Math.max(0, Math.sin(t * (heartRate / 60) * Math.PI * 2)))
      else p.scale.setScalar(1 + 0.035 * Math.sin(t * (16 / 60) * Math.PI * 2))
    }
  })

  const pick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    const ids = e.intersections.map((i) => i.object.userData.regionId as string | undefined).filter(Boolean)
    onSelect(PICK_ORDER.find((id) => ids.includes(id)) ?? null)
  }

  return (
    <group scale={prep.k}>
      <group position={prep.centre.clone().multiplyScalar(-1)} onClick={pick}>
        <primitive object={prep.scene} />
      </group>
    </group>
  )
}

/** Where the camera rests: in front, a little above the waist. */
const HOME = new THREE.Vector3(0, 0.2, FULL_BODY.dist)

/**
 * Eases the orbit target and distance toward the current focus for a moment after it changes.
 * With `home` set (the small card) it also swings the camera back round to the front, along
 * the orbit rather than through the body, so the preview always shows its resting view.
 */
function CameraRig({
  focus,
  home,
  controls,
}: {
  focus: Focus
  home: boolean
  controls: RefObject<ComponentRef<typeof OrbitControls> | null>
}) {
  const { camera } = useThree()
  const timer = useRef(0)
  useEffect(() => {
    timer.current = 0
  }, [focus, home])
  useFrame((_, dt) => {
    const c = controls.current
    if (!c || timer.current > 1.4) return
    timer.current += dt
    c.target.lerp(focus.point, 0.08)
    if (home) {
      const now = new THREE.Spherical().setFromVector3(camera.position.clone().sub(c.target))
      const rest = new THREE.Spherical().setFromVector3(HOME.clone().sub(focus.point))
      const turn = Math.atan2(Math.sin(rest.theta - now.theta), Math.cos(rest.theta - now.theta))
      now.theta += turn * 0.08
      now.phi += (rest.phi - now.phi) * 0.08
      now.radius += (rest.radius - now.radius) * 0.08
      camera.position.setFromSpherical(now).add(c.target)
    } else {
      const dir = camera.position.clone().sub(c.target).normalize()
      const d = camera.position.distanceTo(c.target)
      camera.position.copy(c.target).addScaledVector(dir, d + (focus.dist - d) * 0.08)
    }
    c.update()
  })
  return null
}

export default function BodyModel3D({
  regions,
  selectedId,
  showSuit,
  heartRate,
  interactive,
  onSelect,
}: {
  regions: RegionAssessment[]
  selectedId: string | null
  showSuit: boolean
  /** Latest logged heart rate, which the heart beats at. */
  heartRate: number
  /** Whether the model can be turned and its organs picked; off while it is a small preview. */
  interactive: boolean
  onSelect: (regionId: string | null) => void
}) {
  const [focus, setFocus] = useState<Focus>(FULL_BODY)
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  const reduceMotion = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])

  return (
    <Canvas
      camera={{ position: HOME.toArray(), fov: 38 }}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      shadows="percentage"
      onCreated={({ gl }) => {
        gl.shadowMap.autoUpdate = false
      }}
      // Size from layout, not from the on-screen box: the panel scales this canvas while it
      // grows into the full-screen stage, and a mid-flight measurement would stick.
      resize={{ offsetSize: true }}
      onPointerMissed={() => interactive && onSelect(null)}
      // As a preview, a drag over the model scrolls the page; on the stage it turns the model.
      style={{ touchAction: interactive ? 'none' : 'pan-y' }}
      aria-hidden
    >
      <ambientLight intensity={0.45} />
      {/* Key light from the front right, casting the suit's own shadows (arms on the torso, the
          helmet on the chest); a cool rim from behind lifts the silhouette off the dark. */}
      <directionalLight
        position={[3, 4, 5]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.015}
        shadow-camera-left={-1.4}
        shadow-camera-right={1.4}
        shadow-camera-top={1.4}
        shadow-camera-bottom={-1.4}
        shadow-camera-near={1}
        shadow-camera-far={14}
      />
      <directionalLight position={[-4, 2.5, -4]} intensity={1.1} color="#bfe3ff" />
      <directionalLight position={[-3, -1, 3]} intensity={0.25} color="#dfefff" />
      <Stars radius={30} depth={20} count={900} factor={2} fade speed={reduceMotion ? 0 : 1} />
      <Model
        regions={regions}
        selectedId={selectedId}
        showSuit={showSuit}
        heartRate={heartRate}
        reduceMotion={reduceMotion}
        onSelect={onSelect}
        onFocus={setFocus}
      />
      <OrbitControls ref={controls} enablePan={false} enableZoom={false} enableRotate={interactive} />
      <CameraRig focus={focus} home={!interactive} controls={controls} />
    </Canvas>
  )
}
