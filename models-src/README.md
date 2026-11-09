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

`--join`, `--flatten` and `--instance` stay off because the model component finds the heart,
lungs, brain and the suit parts by **mesh name**; merging meshes would break that.
`human.glb` is the variant without the suit and is not used yet.
