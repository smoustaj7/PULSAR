// Rebuild the suit at higher fidelity: the shipped model's suit meshes are replaced with
// copies from the full-size source, simplified gently. Everything else (organs, textures)
// is left as it was. See models-src/README.md.
// Usage: node scripts/suit-detail.mjs <shipped.glb> <source.glb> <out.glb> [error]
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dequantize, meshopt, prune, simplifyPrimitive, transformPrimitive, weldPrimitive } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'
import { statSync } from 'node:fs'
import { Matrix4 } from 'three'

const [shippedPath, sourcePath, outPath, errArg] = process.argv.slice(2)
const ERROR = Number(errArg ?? 0.0001)
// Per-mesh overrides: the hose is already dense and gains little; the visor stays smooth.
const ERRORS = { BOTTLE_TUBE: 0.0005 }
const SUIT = /^(SUIT_(BASE|BELT|BUTTONS|DETAILS|STRAPS)|BOOTS|GLOVES|BOTTLE|BOTTLE_TUBE|HELMET_(BASE|GLASS|METAL_PARTS)|BELT_LEG\.[LR])$/

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready])
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder })

const ship = await io.read(shippedPath)
const src = await io.read(sourcePath)
await ship.transform(dequantize())

const shipNodes = new Map(ship.getRoot().listNodes().map((n) => [n.getName(), n]))
const buffer = ship.getRoot().listBuffers()[0]
let before = 0
let after = 0

for (const sNode of src.getRoot().listNodes()) {
  const name = sNode.getName()
  if (!SUIT.test(name) || !sNode.getMesh()) continue
  const tNode = shipNodes.get(name)
  if (!tNode?.getMesh()) {
    console.warn('missing in shipped:', name)
    continue
  }
  const sPrims = sNode.getMesh().listPrimitives()
  const tPrims = tNode.getMesh().listPrimitives()
  if (sPrims.length !== tPrims.length) throw new Error(`primitive count differs for ${name}`)

  // Source vertex → shipped node space: inverse(shipped world) · source world.
  const toShip = new Matrix4()
    .fromArray(tNode.getWorldMatrix())
    .invert()
    .multiply(new Matrix4().fromArray(sNode.getWorldMatrix()))

  sPrims.forEach((sp, i) => {
    const tp = tPrims[i]
    before += tp.getIndices() ? tp.getIndices().getCount() / 3 : 0
    // Rebuild the geometry in the shipped document: positions and normals only.
    for (const sem of tp.listSemantics()) tp.setAttribute(sem, null)
    for (const sem of ['POSITION', 'NORMAL']) {
      const a = sp.getAttribute(sem)
      if (!a) continue
      tp.setAttribute(
        sem,
        ship.createAccessor().setType(a.getType()).setArray(a.getArray().slice()).setBuffer(buffer),
      )
    }
    const si = sp.getIndices()
    tp.setIndices(si ? ship.createAccessor().setType('SCALAR').setArray(si.getArray().slice()).setBuffer(buffer) : null)

    weldPrimitive(tp)
    simplifyPrimitive(tp, { simplifier: MeshoptSimplifier, ratio: 0, error: ERRORS[name] ?? ERROR, lockBorder: false })
    transformPrimitive(tp, toShip.elements)
    const tris = tp.getIndices().getCount() / 3
    after += tris
    console.log(name.padEnd(20), String(tris).padStart(8), 'tris')
  })
}

await ship.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: 'high' }))
await io.write(outPath, ship)
console.log(`suit tris ${before} → ${after}; file ${(statSync(outPath).size / 1e6).toFixed(2)} MB`)
