// Fill one-sided gaps in the muscles and the skeleton by mirroring. The model's muscle system
// came in four patchy chunks, and a few muscles (a thigh, a shoulder, parts of a hand and
// foot) exist on one side of the body only. Each group is flipped across the body's centre
// plane, and the flipped triangles are kept only where the original has nothing nearby, in
// patches of some size, so existing tissue is not doubled. The fill lands in new meshes, "Muscle_mirror" and
// "Skeleton_mirror". Running it again changes nothing. See models-src/README.md.
// Usage: node scripts/mirror-fill.mjs <in.glb> <out.glb>
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dequantize, getBounds, meshopt, prune } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'
import { Matrix3, Matrix4, Vector3 } from 'three'

const GROUPS = [
  { out: 'Muscle_mirror', nodes: ['Immune', 'Meat', 'Object_4', 'Object_7'] },
  { out: 'Skeleton_mirror', nodes: ['Skeleton', 'Skeleton_hand_foot'] },
]
/** Grid cell, in model units (the figure is about 5000 tall). Fill must land at least this far from existing tissue. */
const CELL = 22
/** Patches of fill smaller than this are specks, not a missing part. */
const MIN_TRIANGLES = 24

const [inPath, outPath] = process.argv.slice(2)
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready])
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder })
const doc = await io.read(inPath)
await doc.transform(dequantize())
const root = doc.getRoot()
const find = (name) => root.listNodes().find((n) => n.getName() === name)

// The centre plane: the skeleton stands symmetric about it.
const bones = getBounds(find('Skeleton'))
const cx = (bones.min[0] + bones.max[0]) / 2
const cell = (x, y, z) => `${Math.floor(x / CELL)},${Math.floor(y / CELL)},${Math.floor(z / CELL)}`

for (const group of GROUPS) {
  if (find(group.out)) {
    console.log(`${group.out}: already there.`)
    continue
  }
  // Every triangle of the group, in world space.
  const positions = []
  const normals = []
  for (const name of group.nodes) {
    const node = find(name)
    if (!node) continue
    const world = new Matrix4().fromArray(node.getWorldMatrix())
    const rot = new Matrix3().getNormalMatrix(world)
    for (const prim of node.getMesh().listPrimitives()) {
      const pos = prim.getAttribute('POSITION')
      const nor = prim.getAttribute('NORMAL')
      const idx = prim.getIndices().getArray()
      const v = new Vector3()
      const el = [0, 0, 0]
      for (const i of idx) {
        pos.getElement(i, el)
        v.set(el[0], el[1], el[2]).applyMatrix4(world)
        positions.push(v.x, v.y, v.z)
        nor.getElement(i, el)
        v.set(el[0], el[1], el[2]).applyMatrix3(rot).normalize()
        normals.push(v.x, v.y, v.z)
      }
    }
  }
  // Where the original has tissue. Triangles are sampled across their whole face, not just at
  // the corners, so a large flat triangle doesn't read as a hole.
  const filled = new Set()
  for (let t = 0; t < positions.length; t += 9) {
    const [ax, ay, az, bx, by, bz, qx, qy, qz] = positions.slice(t, t + 9)
    const longest = Math.max(Math.hypot(bx - ax, by - ay, bz - az), Math.hypot(qx - ax, qy - ay, qz - az), Math.hypot(qx - bx, qy - by, qz - bz))
    const n = Math.max(1, Math.ceil(longest / (CELL / 2)))
    for (let i = 0; i <= n; i++)
      for (let j = 0; j <= n - i; j++) {
        const u = i / n
        const v = j / n
        filled.add(cell(ax + (bx - ax) * u + (qx - ax) * v, ay + (by - ay) * u + (qy - ay) * v, az + (bz - az) * u + (qz - az) * v))
      }
  }
  const near = (x, y, z) => {
    for (let dx = -CELL; dx <= CELL; dx += CELL)
      for (let dy = -CELL; dy <= CELL; dy += CELL)
        for (let dz = -CELL; dz <= CELL; dz += CELL) if (filled.has(cell(x + dx, y + dy, z + dz))) return true
    return false
  }
  // Flip every triangle and keep the ones that land clear of existing tissue.
  const kept = []
  for (let t = 0; t < positions.length; t += 9) {
    const p = [0, 3, 6].map((k) => [2 * cx - positions[t + k], positions[t + k + 1], positions[t + k + 2]])
    const centre = [0, 1, 2].map((c) => (p[0][c] + p[1][c] + p[2][c]) / 3)
    if (!near(...centre) && !p.some((q) => near(...q))) kept.push(t)
  }
  // Group the kept triangles into patches (sharing a corner), and drop small specks: a real
  // missing muscle or bone is a patch of some size.
  const ids = new Map()
  const corner = (i) => {
    const k = `${positions[i].toFixed(1)},${positions[i + 1].toFixed(1)},${positions[i + 2].toFixed(1)}`
    if (!ids.has(k)) ids.set(k, ids.size)
    return ids.get(k)
  }
  const corners = kept.map((t) => [corner(t), corner(t + 3), corner(t + 6)])
  const parent = Int32Array.from({ length: ids.size }, (_, i) => i)
  const top = (a) => {
    while (parent[a] !== a) a = parent[a] = parent[parent[a]]
    return a
  }
  for (const [a, b, c] of corners) {
    parent[top(b)] = top(a)
    parent[top(c)] = top(a)
  }
  const patches = new Map()
  corners.forEach(([a], i) => {
    const r = top(a)
    if (!patches.has(r)) patches.set(r, [])
    patches.get(r).push(kept[i])
  })
  const outPos = []
  const outNor = []
  const sides = { left: 0, right: 0 }
  const added = []
  for (const tris of patches.values()) {
    if (tris.length < MIN_TRIANGLES) continue
    let sx = 0, sy = 0
    for (const t of tris) {
      // Mirroring turns a triangle inside out, so two corners swap to face it outward again.
      for (const k of [t, t + 6, t + 3]) {
        outPos.push(2 * cx - positions[k], positions[k + 1], positions[k + 2])
        outNor.push(-normals[k], normals[k + 1], normals[k + 2])
      }
      sx += 2 * cx - positions[t]; sy += positions[t + 1]
    }
    const side = sx / tris.length > cx ? 'right' : 'left'
    sides[side] += tris.length
    added.push({ tris: tris.length, side, height: ((sy / tris.length - bones.min[1]) / (bones.max[1] - bones.min[1])).toFixed(2), x: (sx / tris.length - cx).toFixed(0) })
  }
  added.sort((a, b) => b.tris - a.tris).slice(0, 14).forEach((a) => console.log(`   ${String(a.tris).padStart(6)} triangles, ${a.side} (x ${a.x}), at ${a.height} of body height`))
  if (!outPos.length) {
    console.log(`${group.out}: nothing to fill.`)
    continue
  }
  const buffer = root.listBuffers()[0]
  const prim = doc
    .createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(outPos)).setBuffer(buffer))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(outNor)).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(Uint32Array.from({ length: outPos.length / 3 }, (_, i) => i)).setBuffer(buffer))
  root.listScenes()[0].addChild(doc.createNode(group.out).setMesh(doc.createMesh(group.out).addPrimitive(prim)))
  console.log(`${group.out}: filled ${sides.left} triangles on the left (x < centre), ${sides.right} on the right, of ${positions.length / 9}.`)
}

await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: 'high' }))
await io.write(outPath, doc)
