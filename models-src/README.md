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
node scripts/suit-detail.mjs public/models/astronaut.glb models-src/astronaut222.glb public/models/astronaut.glb 0.0002
```

At `0.0002` the suit is about 410k triangles, and up close it looks the same as `0.0001`
(740k): the crumpled sleeves are in the source sculpt, not left by simplifying.

Last, the thyroid gets its own mesh. In the model it is one of three loose pieces inside the
airway mesh (with the trachea and the larynx), so the app couldn't colour it apart:

```bash
node scripts/split-thyroid.mjs public/models/astronaut.glb public/models/astronaut.glb
```

Finally, take out what the app never shows, which halves the download: the 19 textures and
their texture coordinates (every organ, the muscles and the suit get their material in code),
the duplicate brain and the leftover planes. The shipped file ends up about 3.7 MB.

```bash
node scripts/slim-model.mjs public/models/astronaut.glb public/models/astronaut.glb
```

Two repairs follow: the gloves move into the sleeve cuffs (they sat on the hand bones, in
front of where the baggy sleeves end), and the skeleton's left hand and foot, a separate mesh
the first export left out, come back as `Skeleton_hand_foot`:

```bash
node scripts/fit-model.mjs public/models/astronaut.glb models-src/astronaut222.glb public/models/astronaut.glb
```

What the model's meshes really are, since some names mislead: `Immune`, `Meat`, `Object_4` and
`Object_7` are four chunks of one full-body muscle system (not an immune organ, not skin);
`thairoid…part01` is the larynx, trachea and bronchi (and held the thyroid); `…part02` is the
lungs; `Division_1_stomach_0` is the whole digestive tract; `Skeleton` has no skull;
`Object_5.001` is a second copy of the brain; `Object_11.001` is the skeleton's left hand and foot; `Mesh_1`
and `Object_103*` are 4-triangle leftovers. The suit's look
(white fabric, gold visor, metal fittings) is set in code, in `BodyModel3D.tsx`, since the
model gives every suit part the same flat clay material.

`--join`, `--flatten` and `--instance` stay off because the model component finds the heart,
lungs, brain and the suit parts by **mesh name**; merging meshes would break that.
`human.glb` is the variant without the suit and is not used yet.
