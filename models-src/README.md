# 3D model sources

Full-size originals of the body models. They are **not shipped**: `public/` is copied
into every build, and Cloudflare Pages rejects files over 25 MB (these are 102 MB and 80 MB).

The app loads `public/models/astronaut.glb`, made from `astronaut222.glb` with:

```bash
npx @gltf-transform/cli@4 optimize models-src/astronaut222.glb public/models/astronaut.glb \
  --compress meshopt --texture-compress webp --texture-size 1024 \
  --join false --flatten false --instance false --palette false \
  --simplify true --simplify-error 0.0005
```

That pass simplifies the suit too hard (its fabric goes blocky), so the suit is then rebuilt
from the source at higher fidelity, leaving the organs and textures as they are:

```bash
npm i --no-save @gltf-transform/core@4 @gltf-transform/extensions@4 @gltf-transform/functions@4 meshoptimizer
node scripts/suit-detail.mjs public/models/astronaut.glb models-src/astronaut222.glb public/models/astronaut.glb 0.0001
```

At `0.0001` the suit is about 740k triangles and the file about 7.4 MB. The suit's look
(white fabric, gold visor, metal fittings) is set in code, in `BodyModel3D.tsx`, since the
model gives every suit part the same flat clay material.

`--join`, `--flatten` and `--instance` stay off because the model component finds the heart,
lungs, brain and the suit parts by **mesh name**; merging meshes would break that.
`human.glb` is the variant without the suit and is not used yet.
