// Make the anatomy model shippable. The source (models-src/Untitled.glb, 189 MB, 8M triangles)
// is a full anatomy atlas; the app shows only some of it (the parts BodyModel3D's rules match:
// skin, muscles, vessels, organs, bones, suit) and hides the rest. This keeps what the app shows, drops the
// geometry of what it hides (nodes stay, since the rules read names along each path),
// simplifies gently and compresses with meshopt, so the file fits Cloudflare's 25 MB limit and
// downloads in seconds. Keep the rules below in step with BodyModel3D.tsx.
// Usage: node scripts/ship-model.mjs <source.glb> <out.glb> [error]
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { meshopt, prune, simplifyPrimitive, weldPrimitive } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'
import { statSync } from 'node:fs'
import { Matrix4, Vector3 } from 'three'

const [sourcePath, outPath, errArg] = process.argv.slice(2)
/** Simplification error for anatomy; the suit, seen up close, gets a fifth of it. */
const ERROR = Number(errArg ?? 0.0008)
/**
 * The muscles (2M triangles) and the veins and arteries (3M) are seen as whole layers, never
 * one at a time up close, so they take a coarser pass: it is most of what keeps the file small.
 */
const COARSE = { muscle: ERROR * 2.5, vessel: ERROR * 4 }

// ---- The app's rules (BodyModel3D.tsx), on names as three.js sees them ----
// GLTFLoader turns spaces into "_" and drops [ ] . : / from names.
const sanitize = (s) => (s ?? '').replace(/\s/g, '_').replace(/[[\].:/]/g, '')
const seg = (path, s) => path.includes(`/${s}/`)
const BONE = new Set(['Bone-4', 'Suture-1', 'Cartilage', 'Teeth', 'Teeth-roots'])
const LABEL = new Set(['Text', 'Directions', ''])
const LABEL_RE = /text|direction|label|annot|font/i
const HIDE = /Genital|Penis|Scrot|Testis|Epididym|Urogenital|Perineum/i
const SUIT = /^(BELT_LEG[LR]|BOOTS|BOTTLE(_TUBE)?|GLOVES(001)?|HELMET_(BASE|GLASS|METAL_PARTS)|SUIT_(BASE|BELT|BUTTONS|DETAILS|STRAPS))$/
const MUSCLE = new Set(['Trapezius', 'Tendon'])
const RULES = [
  // 'Skin-2.001' is the skin of the fingers.
  (p, n, m) => seg(p, 'Regions_of_human_bodyg') && (m === 'Skin-2' || m === 'Skin-2.001'),
  (p) => seg(p, 'Eyeg'),
  (p) => seg(p, 'Internal_earg'),
  (p, n) => /^((Internal|External|Anterior)_jugular_vein[lr]?|(Left|Right)_brachiocephalic_vein)$/.test(n),
  (p, n) => seg(p, 'Liver') || /^(Pancreas|Gallbladder)$/.test(n),
  (p, n) => /^(Kidney|Renal_pelvis)[lr]$/.test(n),
  (p) => seg(p, 'Heartg') || seg(p, 'Arteries_of_heartg'),
  (p) => seg(p, 'Lungsg') || seg(p, 'Tracheobronchial_treeg'),
  (p) => seg(p, 'Braing'),
  (p, n) => seg(p, 'Lymphoid_organsg') || n === 'Vermiform_appendix',
  (p) => seg(p, 'Digestive_canalg'),
  (p, n, m) => (seg(p, 'Craniumg') || seg(p, 'Extracranial_bones_of_headg')) && BONE.has(m),
  (p, n, m) => seg(p, 'Skeletal_systemg') && BONE.has(m),
  (p, n, m) => seg(p, 'Muscular_systemg') && MUSCLE.has(m) && 'muscle',
  (p, n, m) => ((seg(p, 'Systemic_veinsg') && m === 'Vein') || (seg(p, 'Systemic_arteriesg') && m === 'Artery')) && 'vessel',
]

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready])
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder })
const doc = await io.read(sourcePath)
const root = doc.getRoot()

const path = (node) => {
  const names = []
  for (let n = node; n; n = n.getParentNode()) names.push(sanitize(n.getName()))
  return `/${names.reverse().join('/')}/`
}
/** A caption: the atlas letters each group in the group's own material, and lettering has no thickness. */
const flat = (prim) => {
  const position = prim.getAttribute('POSITION')
  const lo = position.getMin([])
  const size = position.getMax([]).map((hi, i) => hi - lo[i])
  const longest = Math.max(...size)
  return longest > 0 && Math.min(...size) < longest * 1e-4
}

/** What the app shows of this node's mesh, if anything: the first rule that matches. When in doubt, keep. */
const shown = (node) => {
  const name = sanitize(node.getName())
  if (SUIT.test(name)) return 'suit'
  const p = path(node)
  if (HIDE.test(p)) return null
  for (const prim of node.getMesh().listPrimitives()) {
    const m = prim.getMaterial()?.getName() ?? ''
    if (LABEL.has(m) || LABEL_RE.test(m) || flat(prim)) continue
    for (const rule of RULES) {
      const hit = rule(p, name, m)
      if (hit) return typeof hit === 'string' ? hit : 'anatomy'
    }
  }
  return null
}

// ---- Repair: the shin bones ----
// In the source both tibias (bone and cartilage) lean 12.5 degrees back from the knee, so
// their lower ends sit 7 cm behind the ankle while the fibulas beside them stand straight.
// Turn each back about its plateau, where the menisci and the femur meet it.
const TIBIA = /^Tibia(_1)?(\.001)?$/
const KNEE = new Vector3(0, 0.428, -0.038)
const straighten = new Matrix4()
  .makeTranslation(KNEE.x, KNEE.y, KNEE.z)
  .multiply(new Matrix4().makeRotationX((-12.5 * Math.PI) / 180))
  .multiply(new Matrix4().makeTranslation(-KNEE.x, -KNEE.y, -KNEE.z))
let straightened = 0
// The left and right legs are one mesh, drawn twice (the right mirrored). The turn is about
// an axis that the mirror leaves alone, so turning the shared mesh once fixes both legs.
const turned = new Set()
for (const node of root.listNodes()) {
  if (!node.getMesh() || !TIBIA.test(node.getName()) || !seg(path(node), 'Bones_of_free_part_of_lower_limbg')) continue
  if (turned.has(node.getMesh())) continue
  turned.add(node.getMesh())
  const world = new Matrix4().fromArray(node.getWorldMatrix())
  // In the node's own space: out to the world, turn, and back.
  const local = world.clone().invert().multiply(straighten).multiply(world)
  const v = new Vector3()
  for (const prim of node.getMesh().listPrimitives()) {
    if (turned.has(prim.getAttribute('POSITION'))) continue
    const position = prim.getAttribute('POSITION').clone()
    turned.add(position)
    for (let i = 0; i < position.getCount(); i++) {
      position.setElement(i, v.fromArray(position.getElement(i, [])).applyMatrix4(local).toArray())
    }
    prim.setAttribute('POSITION', position)
    const normal = prim.getAttribute('NORMAL')?.clone()
    if (normal) {
      for (let i = 0; i < normal.getCount(); i++) {
        normal.setElement(i, v.fromArray(normal.getElement(i, [])).transformDirection(local).toArray())
      }
      prim.setAttribute('NORMAL', normal)
    }
  }
  straightened++
}

const kept = new Map()
const kinds = new Map()
/** Triangles before and after, by kind of part. */
const tally = {}
let dropped = 0
for (const node of root.listNodes()) {
  if (!node.getMesh()) continue
  const kind = shown(node)
  if (kind) {
    for (const prim of node.getMesh().listPrimitives()) {
      kept.set(prim, kind === 'suit' ? ERROR / 5 : (COARSE[kind] ?? ERROR))
      kinds.set(prim, kind)
    }
  } else {
    node.setMesh(null)
    dropped++
  }
}
await doc.transform(prune({ keepLeaves: true }))

let before = 0
let emptied = 0
let after = 0
for (const [prim, error] of kept) {
  if (!prim.getIndices()) continue
  const count = prim.getIndices().getCount() / 3
  before += count
  weldPrimitive(prim)
  simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, ratio: 0, error })
  after += prim.getIndices().getCount() / 3
  const t = (tally[kinds.get(prim)] ??= [0, 0])
  t[0] += count
  t[1] += prim.getIndices().getCount() / 3
  // A thin vessel can simplify away to nothing; an empty primitive can't be written.
  if (prim.getIndices().getCount() === 0) {
    for (const mesh of prim.listParents()) if (mesh.removePrimitive) mesh.removePrimitive(prim)
    prim.dispose()
    emptied++
  }
}
for (const node of root.listNodes()) {
  if (node.getMesh() && node.getMesh().listPrimitives().length === 0) node.setMesh(null)
}

await doc.transform(prune({ keepLeaves: true }), meshopt({ encoder: MeshoptEncoder, level: 'high' }))
await io.write(outPath, doc)
console.log(Object.entries(tally).map(([k, [b, a]]) => `${k}: ${Math.round(b).toLocaleString()} → ${Math.round(a).toLocaleString()}`).join('; '))
console.log(
  `Straightened ${straightened} tibia meshes; ${emptied} parts simplified away. Dropped ${dropped} hidden meshes; kept ${kept.size} parts, ${Math.round(before).toLocaleString()} → ${Math.round(after).toLocaleString()} triangles; ` +
    `${(statSync(outPath).size / 1e6).toFixed(1)} MB`,
)
