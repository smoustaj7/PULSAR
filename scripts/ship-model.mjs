// Make the anatomy model shippable. The source (models-src/Untitled.glb, 189 MB, 8M triangles)
// is a full anatomy atlas; the app shows only some of it (the parts BodyModel3D's rules match:
// skin, organs, bones, suit) and hides the rest. This keeps what the app shows, drops the
// geometry of what it hides (nodes stay, since the rules read names along each path),
// simplifies gently and compresses with meshopt, so the file fits Cloudflare's 25 MB limit and
// downloads in seconds. Keep the rules below in step with BodyModel3D.tsx.
// Usage: node scripts/ship-model.mjs <source.glb> <out.glb> [error]
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { meshopt, prune, simplifyPrimitive, weldPrimitive } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'
import { statSync } from 'node:fs'

const [sourcePath, outPath, errArg] = process.argv.slice(2)
/** Simplification error for anatomy; the suit, seen up close, gets a fifth of it. */
const ERROR = Number(errArg ?? 0.0008)

// ---- The app's rules (BodyModel3D.tsx), on names as three.js sees them ----
// GLTFLoader turns spaces into "_" and drops [ ] . : / from names.
const sanitize = (s) => (s ?? '').replace(/\s/g, '_').replace(/[[\].:/]/g, '')
const seg = (path, s) => path.includes(`/${s}/`)
const BONE = new Set(['Bone-4', 'Suture-1', 'Cartilage', 'Teeth', 'Teeth-roots'])
const LABEL = new Set(['Text', 'Directions', ''])
const LABEL_RE = /text|direction|label|annot|font/i
const HIDE = /Genital|Penis|Scrot|Testis|Epididym|Urogenital|Perineum/i
const SUIT = /^(BELT_LEG[LR]|BOOTS|BOTTLE(_TUBE)?|GLOVES(001)?|HELMET_(BASE|GLASS|METAL_PARTS)|SUIT_(BASE|BELT|BUTTONS|DETAILS|STRAPS))$/
const RULES = [
  (p, n, m) => seg(p, 'Regions_of_human_bodyg') && m === 'Skin-2',
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
/** Whether the app shows any of this node's mesh. When in doubt, keep. */
const shown = (node) => {
  const name = sanitize(node.getName())
  if (SUIT.test(name)) return 'suit'
  const p = path(node)
  if (HIDE.test(p)) return null
  for (const prim of node.getMesh().listPrimitives()) {
    const m = prim.getMaterial()?.getName() ?? ''
    if (LABEL.has(m) || LABEL_RE.test(m)) continue
    if (RULES.some((rule) => rule(p, name, m))) return 'anatomy'
  }
  return null
}

const kept = new Map()
let dropped = 0
for (const node of root.listNodes()) {
  if (!node.getMesh()) continue
  const kind = shown(node)
  if (kind) {
    for (const prim of node.getMesh().listPrimitives()) kept.set(prim, kind === 'suit' ? ERROR / 5 : ERROR)
  } else {
    node.setMesh(null)
    dropped++
  }
}
await doc.transform(prune({ keepLeaves: true }))

let before = 0
let after = 0
for (const [prim, error] of kept) {
  if (!prim.getIndices()) continue
  before += prim.getIndices().getCount() / 3
  weldPrimitive(prim)
  simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, ratio: 0, error })
  after += prim.getIndices().getCount() / 3
}

await doc.transform(prune({ keepLeaves: true }), meshopt({ encoder: MeshoptEncoder, level: 'high' }))
await io.write(outPath, doc)
console.log(
  `Dropped ${dropped} hidden meshes; kept ${kept.size} parts, ${Math.round(before).toLocaleString()} → ${Math.round(after).toLocaleString()} triangles; ` +
    `${(statSync(outPath).size / 1e6).toFixed(1)} MB`,
)
