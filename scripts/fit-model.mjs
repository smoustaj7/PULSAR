// Two repairs to the shipped model. See models-src/README.md.
//   1. The gloves sat where the hand bones are, but the suit's baggy sleeves end further back
//      (and the right one further out), so the gloves poked out of the front of the cuffs.
//      Each glove moves into its cuff.
//   2. The skeleton had no left hand or foot: they are a separate mesh in the source
//      (Object_11.001) that the first export left out. It comes back as "Skeleton_hand_foot".
// Running it again changes nothing.
// Usage: node scripts/fit-model.mjs <shipped.glb> <source.glb> <out.glb>
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dequantize, meshopt, prune, simplifyPrimitive, transformPrimitive, weldPrimitive } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'
import { Matrix4, Vector3 } from 'three'

/** How far each glove moves, in the model's world units (the figure is about 5000 tall). */
const GLOVE_SHIFT = { right: new Vector3(70, 0, -113), left: new Vector3(10, 0, -113) }

const [shippedPath, sourcePath, outPath] = process.argv.slice(2)
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready])
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder })

const doc = await io.read(shippedPath)
await doc.transform(dequantize())
const root = doc.getRoot()
const find = (name) => root.listNodes().find((n) => n.getName() === name)

const gloves = find('GLOVES')
if (gloves.getExtras().fitted) {
  console.log('Gloves already fitted.')
} else {
  const world = new Matrix4().fromArray(gloves.getWorldMatrix())
  const toLocal = world.clone().invert()
  const pos = gloves.getMesh().listPrimitives()[0].getAttribute('POSITION')
  const v = new Vector3()
  const el = [0, 0, 0]
  for (let i = 0; i < pos.getCount(); i++) {
    pos.getElement(i, el)
    v.set(el[0], el[1], el[2]).applyMatrix4(world)
    v.add(v.x > 0 ? GLOVE_SHIFT.right : GLOVE_SHIFT.left).applyMatrix4(toLocal)
    pos.setElement(i, [v.x, v.y, v.z])
  }
  gloves.setExtras({ ...gloves.getExtras(), fitted: true })
  console.log('Gloves moved into the cuffs.')
}

if (find('Skeleton_hand_foot')) {
  console.log('Left hand and foot bones already there.')
} else {
  const src = await io.read(sourcePath)
  const from = src.getRoot().listNodes().find((n) => n.getName() === 'Object_11.001')
  const sp = from.getMesh().listPrimitives()[0]
  const buffer = root.listBuffers()[0]
  const prim = doc.createPrimitive()
  for (const sem of ['POSITION', 'NORMAL']) {
    const a = sp.getAttribute(sem)
    prim.setAttribute(sem, doc.createAccessor().setType(a.getType()).setArray(a.getArray().slice()).setBuffer(buffer))
  }
  prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(sp.getIndices().getArray().slice()).setBuffer(buffer))
  weldPrimitive(prim)
  simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, ratio: 0, error: 0.0005 })
  // Bake the source's placement in, so the new node needs no transform of its own.
  transformPrimitive(prim, from.getWorldMatrix())
  const node = doc.createNode('Skeleton_hand_foot').setMesh(doc.createMesh('Skeleton_hand_foot').addPrimitive(prim))
  root.listScenes()[0].addChild(node)
  console.log(`Left hand and foot bones restored: ${prim.getIndices().getCount() / 3} triangles.`)
}

await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: 'high' }))
await io.write(outPath, doc)
