// Builds the female crew's body model: the shipped body (public/models/Untitled.glb, from
// scripts/ship-model.mjs) with the female reproductive organs added in the pelvis. The organs
// come from a model that already holds them in place (`Female_genital_system`, under
// `Visceral_systemsg/Genital_systemsg`, the group that holds the genital organs in both files).
// Their group moves across as it is, so whatever is fixed in the shipped body (the layers, the
// shin bones) reaches female crew too.
//
//   node scripts/female-model.mjs <body.glb> <with-organs.glb> <out.glb>
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { copyToDocument, meshopt, prune, unpartition } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'
import { statSync } from 'node:fs'

const [bodyPath, organsPath, outPath] = process.argv.slice(2)
const GROUP = 'Female_genital_system'
const PARENT = 'Genital_systemsg'

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready])
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder })
const body = await io.read(bodyPath)
const organs = await io.read(organsPath)

const named = (doc, name) => {
  const found = doc.getRoot().listNodes().filter((n) => n.getName() === name)
  if (found.length !== 1) throw new Error(`${name}: expected one node, found ${found.length}`)
  return found[0]
}
const group = named(organs, GROUP)
const from = named(organs, PARENT)
const to = named(body, PARENT)
if (body.getRoot().listNodes().some((n) => n.getName() === GROUP)) throw new Error(`${bodyPath} already has ${GROUP}`)

// The group keeps its local transform, so its parent must sit in the same place in both files.
const same = from.getWorldMatrix().every((v, i) => Math.abs(v - to.getWorldMatrix()[i]) < 1e-5)
if (!same) throw new Error(`${PARENT} is not in the same place in both files; the organs would land in the wrong spot`)

// Everything under the group: nodes, and the meshes, materials and buffers they use.
const nodes = []
group.traverse((n) => nodes.push(n))
const copied = copyToDocument(body, organs, nodes)
to.addChild(copied.get(group))

// The copied parts bring their own buffer; a .glb holds one.
await body.transform(unpartition(), prune({ keepLeaves: true }), meshopt({ encoder: MeshoptEncoder, level: 'high' }))
await io.write(outPath, body)
let meshes = 0
copied.get(group).traverse((n) => n.getMesh() && meshes++)
console.log(`Added ${GROUP} (${meshes} meshes) to ${bodyPath}; ${outPath} is ${(statSync(outPath).size / 1e6).toFixed(1)} MB`)
