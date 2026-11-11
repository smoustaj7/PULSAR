// Give the thyroid its own mesh. In the model it is one of three loose pieces inside the airway
// mesh (`…lungh_part01`): the trachea with its bronchi (largest), the larynx, and the thyroid
// gland (smallest, just below the larynx). The app finds organs by mesh name, so the gland
// becomes a node called "Thyroid" and the airway keeps the rest. See models-src/README.md.
// Usage: node scripts/split-thyroid.mjs <in.glb> <out.glb>
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { compactPrimitive, dequantize, meshopt, prune } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'

const [inPath, outPath] = process.argv.slice(2)
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready])
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder })

const doc = await io.read(inPath)
const root = doc.getRoot()
if (root.listNodes().some((n) => n.getName() === 'Thyroid')) {
  console.log('Already split: the model has a Thyroid node.')
  process.exit(0)
}
await doc.transform(dequantize())

const airway = root.listNodes().find((n) => n.getName().includes('lungh_part01'))
if (!airway) throw new Error('No airway mesh (…lungh_part01) in the model.')
const prim = airway.getMesh().listPrimitives()[0]
const pos = prim.getAttribute('POSITION').getArray()
const idx = prim.getIndices().getArray()

// Group triangles into connected pieces, welding by position so texture seams don't split one.
const key = (i) => `${pos[i * 3].toFixed(5)},${pos[i * 3 + 1].toFixed(5)},${pos[i * 3 + 2].toFixed(5)}`
const ids = new Map()
const vert = new Int32Array(pos.length / 3)
for (let i = 0; i < vert.length; i++) {
  const k = key(i)
  if (!ids.has(k)) ids.set(k, ids.size)
  vert[i] = ids.get(k)
}
const parent = Int32Array.from({ length: ids.size }, (_, i) => i)
const find = (a) => {
  while (parent[a] !== a) a = parent[a] = parent[parent[a]]
  return a
}
for (let t = 0; t < idx.length; t += 3) {
  const a = find(vert[idx[t]])
  for (const v of [idx[t + 1], idx[t + 2]]) {
    const b = find(vert[v])
    if (a !== b) parent[b] = a
  }
}
const groups = new Map()
for (let t = 0; t < idx.length; t += 3) {
  const r = find(vert[idx[t]])
  if (!groups.has(r)) groups.set(r, [])
  groups.get(r).push(idx[t], idx[t + 1], idx[t + 2])
}
const pieces = [...groups.values()].sort((a, b) => b.length - a.length)
const meanY = (list) => list.reduce((s, v) => s + pos[v * 3 + 1], 0) / list.length
if (pieces.length !== 3) throw new Error(`Expected 3 pieces in the airway mesh, found ${pieces.length}.`)
const [trachea, larynx, thyroid] = pieces
if (meanY(thyroid) >= meanY(larynx)) throw new Error('The smallest piece is not below the larynx; check the model.')

// The airway keeps the trachea and larynx; the thyroid gets a node of its own, in the same place.
const buffer = root.listBuffers()[0]
const indices = (list) => doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(list)).setBuffer(buffer)
const gland = prim.clone().setIndices(indices(thyroid))
prim.setIndices(indices([...trachea, ...larynx]))
const node = doc.createNode('Thyroid').setMesh(doc.createMesh('Thyroid').addPrimitive(gland)).setMatrix(airway.getMatrix())
;(airway.getParentNode() ?? root.listScenes()[0]).addChild(node)
compactPrimitive(prim)
compactPrimitive(gland)

await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: 'high' }))
await io.write(outPath, doc)
console.log(`Thyroid: ${thyroid.length / 3} triangles; airway keeps ${(trachea.length + larynx.length) / 3}.`)
