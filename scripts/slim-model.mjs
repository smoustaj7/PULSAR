// Take out of the shipped model what the app never shows, so it downloads faster:
//   - every texture, and the texture coordinates that map them: the app gives each organ,
//     the muscles and the suit its own material in code, so the images were never drawn;
//   - meshes it hides: a second copy of the brain, and 4-triangle leftover planes.
// See models-src/README.md. Usage: node scripts/slim-model.mjs <in.glb> <out.glb>
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dequantize, meshopt, prune } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'
import { statSync } from 'node:fs'

const UNUSED_MESHES = new Set(['Object_5.001', 'Mesh_1', 'Mesh_1.001', 'Object_103', 'Object_103.001', 'Object_103.002'])

const [inPath, outPath] = process.argv.slice(2)
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready])
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder })

const before = statSync(inPath).size
const doc = await io.read(inPath)
await doc.transform(dequantize())
const root = doc.getRoot()

const textures = root.listTextures().length
for (const texture of root.listTextures()) texture.dispose()
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    for (const semantic of prim.listSemantics()) {
      if (/^(TEXCOORD|TANGENT)/.test(semantic)) prim.setAttribute(semantic, null)
    }
  }
}
let dropped = 0
for (const node of root.listNodes()) {
  if (UNUSED_MESHES.has(node.getName())) {
    node.dispose()
    dropped++
  }
}

await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: 'high' }))
await io.write(outPath, doc)
const after = statSync(outPath).size
console.log(`Removed ${textures} textures and ${dropped} unused meshes: ${(before / 1e6).toFixed(2)} → ${(after / 1e6).toFixed(2)} MB`)
