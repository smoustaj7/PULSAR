import { OrbitControls, Stars, useGLTF } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentRef, type RefObject } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { RegionAssessment, Status } from '../engine/types'
import { ORGAN_REGION } from './SystemsNav'

const MODEL_URL = `${import.meta.env.BASE_URL}models/Untitled.glb`

const LABEL_MATS = new Set(['Text', 'Directions', ''])
const LABEL_MAT_RE = /text|direction|label|annot|font/i
const BONE_MATS = new Set(['Bone-4', 'Suture-1', 'Cartilage', 'Teeth', 'Teeth-roots'])
const HIDE_PATH = /Genital|Penis|Scrot|Testis|Epididym|Urogenital|Perineum/i
// Tiny organs are enlarged around their own centre so they can be seen and clicked. Lymph nodes
// only double: many lie just under the skin, and any larger they stand out through it. The
// bigger immune organs (thymus, spleen, appendix) are left at their real size.
const BOOST: Record<string, { scale: number; maxSize: number }> = {
  ears: { scale: 5, maxSize: 1 },
  immune: { scale: 2, maxSize: 0.04 },
}

/** What can be shown or hidden of the body under the suit. */
export type Layer = 'skin' | 'muscles' | 'skeleton' | 'vessels' | 'organs'
export type Layers = Record<Layer, boolean>
/** The layer each part belongs to; anything not listed is an organ. */
const LAYER_OF: Record<string, Layer> = {
  muscles: 'muscles',
  skeleton: 'skeleton',
  skull: 'skeleton',
  vessels: 'vessels',
  neckveins: 'vessels',
}
const layerOf = (organId: string): Layer => LAYER_OF[organId] ?? 'organs'
/** Parts that run through the whole body: they don't say where their system is, so the camera ignores them. */
const BODY_WIDE = new Set(['muscles', 'vessels'])

/** A mark on the skin (a scratch, a cut...), where the astronaut placed it. Metres, in the model's own space. */
export interface SkinMark {
  id: string
  point: [number, number, number]
  /** Which way the skin faces there, so the mark lies flat on it and the camera can come round to it. */
  normal: [number, number, number]
}
const SUIT_NAME = /^(BELT_LEG[LR]|BOOTS|BOTTLE(_TUBE)?|GLOVES(001)?|HELMET_(BASE|GLASS|METAL_PARTS)|SUIT_(BASE|BELT|BUTTONS|DETAILS|STRAPS))$/

interface SuitStyle {
  color: string
  roughness: number
  metalness: number
  opacity?: number
}
const SUIT_STYLES: [RegExp, SuitStyle][] = [
  [/^HELMET_GLASS$/, { color: '#c9a24a', roughness: 0.12, metalness: 0.9, opacity: 0.55 }],
  [/^HELMET_METAL_PARTS$/, { color: '#9aa3ad', roughness: 0.35, metalness: 0.8 }],
  [/^HELMET_BASE$/, { color: '#dde1e7', roughness: 0.5, metalness: 0.05 }],
  [/^SUIT_BASE$/, { color: '#dde1e7', roughness: 0.65, metalness: 0 }],
  [/^SUIT_STRAPS$/, { color: '#e0661f', roughness: 0.6, metalness: 0 }],
  [/^SUIT_BELT$/, { color: '#3b4350', roughness: 0.6, metalness: 0.2 }],
  [/^SUIT_BUTTONS$/, { color: '#b7bcc4', roughness: 0.3, metalness: 0.8 }],
  [/^SUIT_DETAILS$/, { color: '#8a919c', roughness: 0.5, metalness: 0.4 }],
  [/^GLOVES/, { color: '#c3c8d0', roughness: 0.85, metalness: 0 }],
  [/^BOOTS$/, { color: '#2f343c', roughness: 0.7, metalness: 0.1 }],
  [/^BELT_LEG/, { color: '#3b4350', roughness: 0.6, metalness: 0.2 }],
  [/^BOTTLE_TUBE$/, { color: '#4a515c', roughness: 0.6, metalness: 0.2 }],
  [/^BOTTLE$/, { color: '#3d6fb5', roughness: 0.4, metalness: 0.4 }],
]

interface Rule {
  id: string
  role: 'shell' | 'organ' | 'bone' | 'muscle'
  test: (path: string, name: string, mat: string) => boolean
}
const seg = (path: string, s: string) => path.includes(`/${s}/`)

// Order matters: the first matching rule wins.
const RULES: Rule[] = [
  // 'Skin-2.001' is the skin of the fingers.
  { id: 'shell', role: 'shell', test: (p, _n, m) => seg(p, 'Regions_of_human_bodyg') && (m === 'Skin-2' || m === 'Skin-2.001') },
  { id: 'eyes', role: 'organ', test: (p) => seg(p, 'Eyeg') },
  { id: 'ears', role: 'organ', test: (p) => seg(p, 'Internal_earg') },
  {
    id: 'neckveins',
    role: 'organ',
    test: (_p, n) => /^((Internal|External|Anterior)_jugular_vein[lr]?|(Left|Right)_brachiocephalic_vein)$/.test(n),
  },
  { id: 'liver', role: 'organ', test: (p, n) => seg(p, 'Liver') || /^(Pancreas|Gallbladder)$/.test(n) },
  { id: 'kidneys', role: 'organ', test: (_p, n) => /^(Kidney|Renal_pelvis)[lr]$/.test(n) },
  { id: 'heart', role: 'organ', test: (p) => seg(p, 'Heartg') || seg(p, 'Arteries_of_heartg') },
  { id: 'lungs', role: 'organ', test: (p) => seg(p, 'Lungsg') || seg(p, 'Tracheobronchial_treeg') },
  { id: 'brain', role: 'organ', test: (p) => seg(p, 'Braing') },
  // the appendix sits in the digestive canal: immune comes BEFORE stomach
  { id: 'immune', role: 'organ', test: (p, n) => seg(p, 'Lymphoid_organsg') || n === 'Vermiform_appendix' },
  { id: 'stomach', role: 'organ', test: (p) => seg(p, 'Digestive_canalg') },
  // skull BEFORE skeleton; bones only (the group also holds muscles)
  {
    id: 'skull',
    role: 'organ',
    test: (p, _n, m) => (seg(p, 'Craniumg') || seg(p, 'Extracranial_bones_of_headg')) && BONE_MATS.has(m),
  },
  { id: 'skeleton', role: 'bone', test: (p, _n, m) => seg(p, 'Skeletal_systemg') && BONE_MATS.has(m) },
  { id: 'muscles', role: 'muscle', test: (p, _n, m) => seg(p, 'Muscular_systemg') && (m === 'Trapezius' || m === 'Tendon') },
  // The neck veins above are picked out first; these are the rest of the veins, and the arteries.
  {
    id: 'vessels',
    role: 'organ',
    test: (p, _n, m) => (seg(p, 'Systemic_veinsg') && m === 'Vein') || (seg(p, 'Systemic_arteriesg') && m === 'Artery'),
  },
]

// Small organs first (they sit inside the skull / torso).
const PICK_ORDER = ['eyes', 'ears', 'neckveins', 'heart', 'lungs', 'brain', 'liver', 'kidneys', 'stomach', 'immune', 'skull', 'skeleton', 'vessels', 'muscles']

// Natural colour once something is selected / vivid colour when idle.
// The look is an X-ray in blue light: glass skin with a bright rim, blue-white bones, cyan
// vessels, and the heart glowing red-orange at the centre of it.
const ORGAN_COLOR: Record<string, string> = {
  heart: '#d9523f', lungs: '#d98791', brain: '#d98ba2', immune: '#5c9a80', stomach: '#d78b55',
  eyes: '#8fa9bf', ears: '#b8998b', kidneys: '#a84e42', neckveins: '#2f8fd6', liver: '#8a4b34', skull: '#dfe8f5',
  vessels: '#2f9be0', muscles: '#b0524c',
}
const ORGAN_BRIGHT: Record<string, string> = {
  heart: '#ff5a3c', lungs: '#ff8fa3', brain: '#ff7ac8', immune: '#6fae92', stomach: '#ffa24a',
  eyes: '#9db4c8', ears: '#c8a89a', kidneys: '#b85a4c', neckveins: '#38b6ff', liver: '#9c5a3f', skull: '#eaf1fb',
  vessels: '#38b6ff', muscles: '#c25a52',
}
const SOFT_GLOW = new Set(['immune', 'eyes', 'ears', 'kidneys', 'neckveins', 'liver', 'skull', 'vessels', 'muscles'])
const OUTLINE = '#58b4ff'
const MARK = '#ff4d5e'
const TMP_COLOR = new THREE.Color()

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

// root -> mesh path, with "/" at both ends
function fullPath(o: THREE.Object3D): string {
  const names: string[] = []
  for (let n: THREE.Object3D | null = o; n; n = n.parent) names.push(n.name)
  return '/' + names.reverse().join('/') + '/'
}
function matNameOf(m: THREE.Mesh): string {
  const mt = Array.isArray(m.material) ? m.material[0] : m.material
  return mt?.name ?? ''
}
// bounding box of the mesh ALONE (Box3.setFromObject would include its children)
function meshBox(m: THREE.Mesh, target: THREE.Box3): THREE.Box3 {
  if (!m.geometry.boundingBox) m.geometry.computeBoundingBox()
  return target.copy(m.geometry.boundingBox!).applyMatrix4(m.matrixWorld)
}

/** Whether a mesh has no thickness at all, as the atlas's captions do. */
function isFlat(m: THREE.Mesh): boolean {
  if (!m.geometry.boundingBox) m.geometry.computeBoundingBox()
  const size = m.geometry.boundingBox!.getSize(new THREE.Vector3())
  const longest = Math.max(size.x, size.y, size.z)
  return longest > 0 && Math.min(size.x, size.y, size.z) < longest * 1e-4
}

interface Organ {
  id: string
  regionId: string
  mats: THREE.MeshStandardMaterial[]
  meshes: THREE.Mesh[]
  /** Centre and size of this organ alone (camera focus when it is picked). */
  center: THREE.Vector3
  radius: number
}
interface RegionBounds {
  center: THREE.Vector3
  radius: number
}
interface Focus {
  point: THREE.Vector3
  dist: number
  /** Where to look from (a unit vector out of the point); the camera keeps its side when not given. */
  from?: THREE.Vector3
}

/** The resting frame: the whole figure with a little air around it. */
const FULL_BODY: Focus = { point: new THREE.Vector3(0, -0.1, 0), dist: 4.3 }

function Model({
  regions,
  selectedId,
  organId,
  showSuit,
  layers,
  marks,
  markId,
  placing,
  heartRate,
  respiration,
  reduceMotion,
  onSelect,
  onPlace,
  onFocus,
}: {
  regions: RegionAssessment[]
  selectedId: string | null
  organId: string | null
  showSuit: boolean
  layers: Layers
  marks: SkinMark[]
  markId: string | null
  placing: boolean
  heartRate: number
  respiration: number
  reduceMotion: boolean
  onSelect: (regionId: string | null, organId?: string | null) => void
  onPlace?: (mark: Omit<SkinMark, 'id'>, skinName: string) => void
  onFocus: (focus: Focus) => void
}) {
  const gltf = useGLTF(MODEL_URL, false, true)
  // A soft studio room, used only for the suit's reflections.
  const studio = useRef<THREE.WebGLRenderTarget | null>(null)
  useEffect(
    () => () => {
      studio.current?.dispose()
      studio.current = null
    },
    [],
  )
  const colors = useMemo(() => ({ status: readStatusColors(), outline: new THREE.Color(OUTLINE) }), [])
  const status = useMemo(
    () => Object.fromEntries(regions.map((r) => [r.region.id, r.status])) as Record<string, Status>,
    [regions],
  )

  const prep = useMemo(() => {
    const scene = gltf.scene.clone(true)
    scene.updateMatrixWorld(true)
    const organs: Record<string, Organ> = {}
    const sharedMats: Record<string, THREE.Material> = {}
    const suitParts: THREE.Object3D[] = []
    const anatomyMeshes: THREE.Mesh[] = []
    const shellMeshes: THREE.Mesh[] = [] // skin outline: visible only with the suit off
    const fitMeshes: THREE.Mesh[] = []
    const pivots: THREE.Group[] = []
    const suitMats: THREE.MeshStandardMaterial[] = []
    const noRay = () => {}

    const suitMaterial = (name: string) => {
      const st = SUIT_STYLES.find(([re]) => re.test(name))?.[1]
      if (!st) return null
      const mt = new THREE.MeshStandardMaterial({ color: st.color, roughness: st.roughness, metalness: st.metalness })
      if (st.opacity !== undefined) {
        mt.transparent = true
        mt.opacity = st.opacity
        mt.depthWrite = false
      }
      suitMats.push(mt)
      return mt
    }

    const shellMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(OUTLINE) }, uPow: { value: 1.5 }, uI: { value: 1.5 }, uA: { value: 1 } },
      vertexShader: FRESNEL_VS,
      fragmentShader: FRESNEL_FS,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    // Useless meshes and labels: invisible material (unlike visible=false, it keeps their children).
    const hideMat = new THREE.MeshBasicMaterial({ visible: false })

    // Collect first, then process: re-parenting onto pivots mid-traversal skips siblings.
    const meshes: THREE.Mesh[] = []
    scene.traverse((o) => {
      const any = o as unknown as { isMesh?: boolean; isLine?: boolean; isPoints?: boolean; isSprite?: boolean }
      if (any.isMesh) meshes.push(o as THREE.Mesh)
      else if (any.isLine || any.isPoints || any.isSprite) {
        o.visible = false
        ;(o as THREE.Mesh).raycast = noRay
      }
    })

    meshes.forEach((mesh) => {
      const name = mesh.name
      const mat = matNameOf(mesh) // read BEFORE replacing the material
      const path = fullPath(mesh)

      // 1) suit
      if (SUIT_NAME.test(name)) {
        // Draco-compressed normals make the gloves look lumpy: recompute them.
        if (/^GLOVES/.test(name) && !mesh.geometry.userData.smoothed) {
          mesh.geometry = mesh.geometry.clone()
          mesh.geometry.computeVertexNormals()
          mesh.geometry.userData.smoothed = true
        }
        const sm = suitMaterial(name)
        if (sm) mesh.material = sm
        mesh.castShadow = true
        mesh.receiveShadow = true
        mesh.raycast = noRay
        suitParts.push(mesh)
        fitMeshes.push(mesh)
        return
      }

      // 2) labels / direction arrows. The atlas also hangs a caption on each group, in whatever
      // material the group uses; lettering is the only thing in a body that is perfectly flat.
      if (LABEL_MATS.has(mat) || LABEL_MAT_RE.test(mat) || isFlat(mesh)) {
        mesh.material = hideMat
        mesh.raycast = noRay
        return
      }

      // 3) genital area: hidden
      if (HIDE_PATH.test(path)) {
        mesh.material = hideMat
        mesh.raycast = noRay
        return
      }

      // 4) anatomical rule
      const rule = RULES.find((r) => r.test(path, name, mat))
      if (!rule) {
        mesh.material = hideMat
        mesh.raycast = noRay
        return
      }

      mesh.frustumCulled = false // Z-Anatomy meshes often have bad bounds

      if (rule.role === 'shell') {
        mesh.material = shellMat
        mesh.renderOrder = 10
        // The skin answers a tap only while an injury is being placed (`userData.taps`); the
        // rest of the time taps go through it to the organs.
        const hit = THREE.Mesh.prototype.raycast
        mesh.raycast = (raycaster, intersects) => {
          if (mesh.userData.taps) hit.call(mesh, raycaster, intersects)
        }
        mesh.userData.skin = true
        shellMeshes.push(mesh)
        fitMeshes.push(mesh)
        return
      }

      let m = sharedMats[rule.id] as THREE.MeshStandardMaterial | undefined
      if (!m) {
        m =
          rule.role === 'bone'
            ? new THREE.MeshPhysicalMaterial({ color: '#eef3fb', roughness: 0.4, emissive: '#9fc4ff', emissiveIntensity: 0.15 })
            : new THREE.MeshStandardMaterial({ roughness: rule.role === 'muscle' ? 0.6 : 0.45 })
        m.transparent = true
        m.depthWrite = false
        m.opacity = 1
        m.side = THREE.DoubleSide
        sharedMats[rule.id] = m
      }
      mesh.material = m
      mesh.renderOrder = rule.role === 'bone' ? 2 : rule.role === 'muscle' ? 3 : 5
      mesh.userData.organ = rule.id
      anatomyMeshes.push(mesh)
      fitMeshes.push(mesh)
      const org = (organs[rule.id] ??= {
        id: rule.id,
        regionId: ORGAN_REGION[rule.id],
        mats: [m],
        meshes: [],
        center: new THREE.Vector3(),
        radius: 1,
      })
      org.meshes.push(mesh)
    })

    // Anything that is neither anatomy, skin nor suit is made invisible.
    const known = new Set<THREE.Object3D>([...anatomyMeshes, ...shellMeshes, ...suitParts])
    scene.traverse((o) => {
      const mm = o as THREE.Mesh
      if (mm.isMesh && !known.has(o)) {
        mm.material = hideMat
        mm.raycast = noRay
      }
    })

    // Inner ears / lymph nodes: one pivot per mesh, scaled around its own centre.
    Object.entries(BOOST).forEach(([id, cfg]) => {
      const org = organs[id]
      if (!org) return
      const tb = new THREE.Box3()
      org.meshes.forEach((m) => {
        meshBox(m, tb)
        if (tb.getSize(new THREE.Vector3()).length() > cfg.maxSize) return
        if (/appendix|thymus|spleen/i.test(m.name)) return
        const pivot = new THREE.Group()
        scene.add(pivot)
        pivot.position.copy(scene.worldToLocal(tb.getCenter(new THREE.Vector3())))
        pivot.updateMatrixWorld(true)
        pivot.attach(m)
        pivot.scale.setScalar(cfg.scale)
        pivot.updateMatrixWorld(true)
      })
    })

    // Heart / lungs: ONE pivot per organ, so heartbeat and breathing scale in place.
    ;['heart', 'lungs'].forEach((id) => {
      const org = organs[id]
      if (!org) return
      const b = new THREE.Box3()
      const t = new THREE.Box3()
      org.meshes.forEach((m) => b.union(meshBox(m, t)))
      const pivot = new THREE.Group()
      pivot.userData.kind = id
      scene.add(pivot)
      pivot.position.copy(scene.worldToLocal(b.getCenter(new THREE.Vector3())))
      pivot.updateMatrixWorld(true)
      org.meshes.forEach((m) => pivot.attach(m)) // attach keeps the world position
      pivots.push(pivot)
    })
    scene.updateMatrixWorld(true)

    // Centre and size of each organ (camera focus) and of each body system.
    const tmp = new THREE.Box3()
    const regionBoxes: Record<string, THREE.Box3> = {}
    Object.values(organs).forEach((org) => {
      const ob = new THREE.Box3()
      org.meshes.forEach((m) => ob.union(meshBox(m, tmp)))
      ob.getCenter(org.center)
      org.radius = ob.getSize(new THREE.Vector3()).length() / 2
      if (BODY_WIDE.has(org.id)) return
      const rb = (regionBoxes[org.regionId] ??= new THREE.Box3())
      rb.union(ob)
    })
    const bounds: Record<string, RegionBounds> = {}
    Object.entries(regionBoxes).forEach(([id, b]) => {
      bounds[id] = { center: b.getCenter(new THREE.Vector3()), radius: b.getSize(new THREE.Vector3()).length() / 2 }
    })

    // Framing: suit + skin + anatomy only.
    const box = new THREE.Box3()
    fitMeshes.forEach((m) => box.union(meshBox(m, tmp)))
    const k = 2.2 / (box.getSize(new THREE.Vector3()).y || 1)
    const centre = box.getCenter(new THREE.Vector3())
    return { scene, organs, bounds, pivots, suitParts, anatomyMeshes, shellMeshes, shellMat, hideMat, sharedMats, suitMats, k, centre }
  }, [gltf])

  useEffect(
    () => () => {
      prep.shellMat.dispose()
      prep.hideMat.dispose()
      Object.values(prep.sharedMats).forEach((m) => m.dispose())
      prep.suitMats.forEach((m) => m.dispose())
    },
    [prep],
  )

  // The light is fixed to the model and only the camera turns, so the suit's shadows are
  // drawn once, whenever what is shown changes, rather than every frame.
  const shadowsStale = useRef(true)
  useLayoutEffect(() => {
    prep.suitParts.forEach((p) => {
      p.visible = showSuit
    })
    // Under the suit nothing shows. Without it, each part follows its layer, and whatever is
    // selected shows even when its layer is off.
    prep.shellMeshes.forEach((m) => {
      m.visible = !showSuit && (layers.skin || placing)
      m.userData.taps = placing
    })
    prep.anatomyMeshes.forEach((m) => {
      const id = m.userData.organ as string
      const picked = organId ? organId === id : selectedId !== null && selectedId === ORGAN_REGION[id] && !BODY_WIDE.has(id)
      m.visible = !showSuit && (layers[layerOf(id)] || picked)
    })
    if (!showSuit) {
      // a hidden ancestor would swallow its children
      ;[...prep.shellMeshes, ...prep.anatomyMeshes].forEach((m) =>
        m.traverseAncestors((a) => {
          a.visible = true
        }),
      )
    }
    shadowsStale.current = true
  }, [prep, showSuit, layers, placing, selectedId, organId])


  // Turn the camera toward the picked organ, or the selected system, wherever the selection came from.
  useEffect(() => {
    const org = organId ? prep.organs[organId] : null
    const reg = selectedId ? prep.bounds[selectedId] : null
    const mark = markId ? marks.find((m) => m.id === markId) : null
    if (mark) {
      onFocus({
        point: new THREE.Vector3(...mark.point).sub(prep.centre).multiplyScalar(prep.k),
        dist: 1.3,
        from: new THREE.Vector3(...mark.normal).normalize(),
      })
    } else if (org && BODY_WIDE.has(org.id)) {
      onFocus(FULL_BODY)
    } else if (org) {
      onFocus({
        point: org.center.clone().sub(prep.centre).multiplyScalar(prep.k),
        dist: THREE.MathUtils.clamp(org.radius * prep.k * 4, 0.9, 4.2),
      })
    } else if (reg) {
      onFocus({
        point: reg.center.clone().sub(prep.centre).multiplyScalar(prep.k),
        dist: THREE.MathUtils.clamp(reg.radius * prep.k * 4, 1.1, 4.2),
      })
    } else {
      onFocus(FULL_BODY)
    }
  }, [selectedId, organId, markId, marks, prep, onFocus])

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
    const env = studio.current.texture
    for (const m of prep.suitMats) if (m.envMap !== env) m.setValues({ envMap: env })
    if (shadowsStale.current) {
      gl.shadowMap.needsUpdate = true
      shadowsStale.current = false
    }

    const t = clock.getElapsedTime()
    // A system with nothing to show in the model leaves the body as it is.
    const hasOrgan = organId !== null && organId in prep.organs
    const has = hasOrgan || (selectedId !== null && selectedId in prep.bounds)

    const u = prep.shellMat.uniforms
    // With the muscles showing the skin is only a faint rim over them.
    u.uA.value += ((has ? 0.15 : layers.muscles && !placing ? 0.45 : 1) - u.uA.value) * 0.1

    for (const org of Object.values(prep.organs)) {
      const s = status[org.regionId] ?? 'unknown'
      const flagged = s === 'caution' || s === 'critical'
      // an organ picked on its own wins; otherwise the whole selected system lights up
      // Muscles run through everything, so their system lights them only when their layer is on.
      const withSystem = org.id === 'muscles' ? layers.muscles : true
      const isSel = hasOrgan ? organId === org.id : selectedId === org.regionId && withSystem
      const isBone = org.id === 'skeleton'
      const isSkull = org.id === 'skull'
      const isMuscle = org.id === 'muscles'
      const isVessel = org.id === 'vessels'
      // the skull stays semi-transparent so the brain and eyes show through
      const idle = isBone ? 0.7 : isSkull ? 0.45 : isVessel ? 0.8 : 0.95
      const targetOpacity = !has ? idle : isSel ? 1 : isMuscle ? 0.03 : 0.06
      const soft = SOFT_GLOW.has(org.id) ? 0.35 : 1
      const targetGlow = (!has ? (isBone ? 0.35 : isSkull ? 0.6 : 1) : isSel ? 1.1 : 0.03) * soft
      const pulse = !isBone && s === 'critical' && !reduceMotion && (!has || isSel) ? 0.4 * Math.sin(t * 6) : 0
      for (const m of org.mats) {
        m.opacity += (targetOpacity - m.opacity) * 0.12
        // Solid tissue hides what is behind it: a selected organ, or the muscle layer at rest.
        m.depthWrite = (isSel && !isBone && !isVessel) || (isMuscle && !has)
        if (!isBone) {
          if (flagged) TMP_COLOR.copy(colors.status[s])
          else TMP_COLOR.set(has ? (ORGAN_COLOR[org.id] ?? '#6d77c7') : (ORGAN_BRIGHT[org.id] ?? '#8a96ff'))
          m.color.lerp(TMP_COLOR, 0.12)
          m.emissive.lerp(TMP_COLOR, 0.12)
        }
        m.emissiveIntensity += (targetGlow + pulse - m.emissiveIntensity) * 0.2
      }
    }

    if (reduceMotion) return
    for (const p of prep.pivots) {
      if (p.userData.kind === 'heart') p.scale.setScalar(1 + 0.07 * Math.max(0, Math.sin(t * (heartRate / 60) * Math.PI * 2)))
      else p.scale.setScalar(1 + 0.035 * Math.sin(t * (respiration / 60) * Math.PI * 2))
    }
  })

  const pick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (placing) {
      // The nearest skin under the pointer, in the model's own space.
      const hit = e.intersections.find((i) => i.object.userData.skin)
      if (!hit || !onPlace) return
      const point = prep.scene.worldToLocal(hit.point.clone())
      const normal = (hit.face?.normal.clone() ?? new THREE.Vector3(0, 0, 1)).transformDirection(hit.object.matrixWorld)
      // Mirrored meshes (the right side of the body) report the normal inside out.
      if (normal.dot(e.ray.direction) > 0) normal.negate()
      onPlace({ point: point.toArray(), normal: normal.toArray() }, hit.object.name)
      return
    }
    // With the muscles showing solid, what you tap is what you see: the muscle in front.
    const front = e.intersections.find((i) => i.object.visible && i.object.userData.organ)
    if (front?.object.userData.organ === 'muscles' && !(selectedId || organId)) {
      onSelect(ORGAN_REGION.muscles, 'muscles')
      return
    }
    const ids = e.intersections
      .filter((i) => i.object.visible)
      .map((i) => i.object.userData.organ as string | undefined)
      .filter((x): x is string => !!x)
    const id = PICK_ORDER.find((p) => ids.includes(p))
    if (!id) onSelect(null, null)
    else onSelect(ORGAN_REGION[id], id)
  }

  return (
    <group scale={prep.k}>
      <group position={prep.centre.clone().multiplyScalar(-1)} onClick={pick}>
        <primitive object={prep.scene} />
        {!showSuit && marks.map((m) => <Mark key={m.id} mark={m} active={m.id === markId} still={reduceMotion} />)}
      </group>
    </group>
  )
}

const UP = new THREE.Vector3(0, 0, 1)

/** An injury on the skin: a red dot lying on it, with a ring that breathes so it can be found. */
function Mark({ mark, active, still }: { mark: SkinMark; active: boolean; still: boolean }) {
  const ring = useRef<THREE.Mesh>(null)
  const turn = useMemo(() => new THREE.Quaternion().setFromUnitVectors(UP, new THREE.Vector3(...mark.normal).normalize()), [mark.normal])
  // Lifted a hair off the skin, so the two don't fight for the same depth.
  const at = useMemo(() => new THREE.Vector3(...mark.point).addScaledVector(new THREE.Vector3(...mark.normal).normalize(), 0.004), [mark])
  useFrame(({ clock }) => {
    if (!ring.current) return
    const beat = still ? 0.5 : (clock.getElapsedTime() * 0.8) % 1
    ring.current.scale.setScalar((active ? 1.5 : 1) * (1 + beat * 1.2))
    ;(ring.current.material as THREE.MeshBasicMaterial).opacity = (still ? 0.6 : 1 - beat) * 0.9
  })
  return (
    <group position={at} quaternion={turn} renderOrder={20}>
      <mesh renderOrder={20}>
        <circleGeometry args={[active ? 0.016 : 0.012, 32]} />
        <meshBasicMaterial color={MARK} toneMapped={false} depthTest={false} transparent side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ring} renderOrder={20}>
        <ringGeometry args={[0.015, 0.019, 48]} />
        <meshBasicMaterial color={MARK} toneMapped={false} depthTest={false} transparent side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

/** The model stands 2.2 units tall, centred on the origin. */
const FLOOR = -1.1

/** A soft round glow, drawn once: white at the centre fading to nothing at the edge. */
const makeGlow = () => {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,0.9)')
  g.addColorStop(0.45, 'rgba(255,255,255,0.28)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

/** What the astronaut stands on: a small disk of light rather than a solid thing. */
function Pedestal() {
  const glow = useMemo(() => makeGlow(), [])
  useEffect(() => () => glow.dispose(), [glow])
  const flat: [number, number, number] = [-Math.PI / 2, 0, 0]
  return (
    <group position={[0, FLOOR, 0]}>
      <mesh rotation={flat}>
        <ringGeometry args={[0.535, 0.55, 128]} />
        <meshBasicMaterial color="#8fdcff" transparent opacity={0.9} toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh rotation={flat}>
        <ringGeometry args={[0.4, 0.404, 128]} />
        <meshBasicMaterial color="#6cc4f5" transparent opacity={0.4} toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh position={[0, -0.001, 0]} rotation={flat}>
        <circleGeometry args={[0.535, 96]} />
        <meshBasicMaterial color="#3d9bea" transparent opacity={0.16} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.002, 0]} rotation={flat}>
        <circleGeometry args={[0.55, 96]} />
        <meshBasicMaterial map={glow} color="#59b6ff" transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh position={[0, -0.05, 0]} rotation={flat}>
        <circleGeometry args={[1.05, 64]} />
        <meshBasicMaterial map={glow} color="#2b8cff" transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  )
}

/** Where the camera rests: in front, a little above the waist. */
const HOME = new THREE.Vector3(0, 0.55, FULL_BODY.dist)

/**
 * Eases the orbit target and distance toward the current focus for a moment after it changes.
 * With `home` set (the small card) it also swings the camera back round to the front.
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
    if (home || focus === FULL_BODY || focus.from) {
      const now = new THREE.Spherical().setFromVector3(camera.position.clone().sub(c.target))
      // Home is in front of the whole figure; a mark on the skin is met face on.
      const rest = new THREE.Spherical().setFromVector3(
        focus.from && !home ? focus.from.clone().multiplyScalar(focus.dist) : HOME.clone().sub(focus.point),
      )
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

/** Says the model has loaded; mounts only once the model file has arrived and been prepared. */
function Ready({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    const frame = requestAnimationFrame(onReady)
    return () => cancelAnimationFrame(frame)
  }, [onReady])
  return null
}

const ALL_BUT_MUSCLES: Layers = { skin: true, muscles: false, skeleton: true, vessels: true, organs: true }
const NO_MARKS: SkinMark[] = []

export default function BodyModel3D({
  regions,
  selectedId,
  organId = null,
  showSuit,
  layers = ALL_BUT_MUSCLES,
  marks = NO_MARKS,
  markId = null,
  placing = false,
  heartRate,
  respiration = 16,
  stars = true,
  interactive,
  onSelect,
  onPlace,
  onReady,
}: {
  regions: RegionAssessment[]
  /** The selected body system, if any. */
  selectedId: string | null
  /** The single organ in focus, if any (it belongs to `selectedId`). */
  organId?: string | null
  showSuit: boolean
  /** Which parts of the body show once the suit is off. */
  layers?: Layers
  /** Injuries marked on the skin. */
  marks?: SkinMark[]
  /** The mark in focus, if any: the camera comes round to face it. */
  markId?: string | null
  /** While true a tap lands on the skin and calls `onPlace`, rather than picking an organ. */
  placing?: boolean
  /** Latest logged heart rate, which the heart beats at. */
  heartRate: number
  /** Breaths per minute, which the lungs follow. */
  respiration?: number
  /** A star field behind the model; off when it stands unframed on the page's own sky. */
  stars?: boolean
  /** Whether the model can be turned and its organs picked; off while it is a small preview. */
  interactive: boolean
  /** A click on the model: the organ's system, and the organ itself. Both null for empty space. */
  onSelect: (regionId: string | null, organId?: string | null) => void
  /** A tap on the skin while `placing`: where, which way the skin faces, and the skin region's mesh name. */
  onPlace?: (mark: Omit<SkinMark, 'id'>, skinName: string) => void
  /** Called once the model has loaded and drawn, so the page can reveal it. */
  onReady?: () => void
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
      resize={{ offsetSize: true }}
      onPointerMissed={() => interactive && !placing && onSelect(null, null)}
      style={{ touchAction: interactive ? 'none' : 'pan-y' }}
      aria-hidden
    >
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[3, 4, 5]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.015}
        shadow-camera-left={-1.8}
        shadow-camera-right={1.8}
        shadow-camera-top={1.8}
        shadow-camera-bottom={-1.8}
        shadow-camera-near={1}
        shadow-camera-far={14}
      />
      <directionalLight position={[-4, 2.5, -4]} intensity={1.1} color="#bfe3ff" />
      <directionalLight position={[-3, -1, 3]} intensity={0.25} color="#dfefff" />
      {stars && <Stars radius={30} depth={20} count={900} factor={2} fade speed={reduceMotion ? 0 : 1} />}
      <Suspense fallback={null}>
        <Model
          regions={regions}
          selectedId={selectedId}
          organId={organId}
          showSuit={showSuit}
          layers={layers}
          marks={marks}
          markId={markId}
          placing={placing}
          heartRate={heartRate}
          respiration={respiration}
          reduceMotion={reduceMotion}
          onSelect={onSelect}
          onPlace={onPlace}
          onFocus={setFocus}
        />
        {onReady && <Ready onReady={onReady} />}
      </Suspense>
      <Pedestal />
      <OrbitControls
        ref={controls}
        enablePan={false}
        enableZoom={false}
        enableRotate={interactive}
        autoRotate={!interactive && !reduceMotion}
        autoRotateSpeed={-1.4}
      />
      <CameraRig focus={focus} home={!interactive} controls={controls} />
    </Canvas>
  )
}