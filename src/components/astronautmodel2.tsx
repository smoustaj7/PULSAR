import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ElementRef, RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Html, Stars, useGLTF } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import '../pages/Bodypage.css';
export type Status = "green" | "amber" | "red";
export type DomainName =
  | "Cardiovascular" | "Immune" | "Sleep" | "Cognition"
  | "Behavioral" | "Bone/Muscle" | "Radiation" | "Environment" | "Digestive";
export type DomainMap = Record<DomainName, { status: Status; score: number; drivers?: string[] }>;

const COLOR: Record<Status, string> = { green: "#2e9e5b", amber: "#e8a317", red: "#d64545" };
const RANK: Record<Status, number> = { green: 0, amber: 1, red: 2 };

const ORGAN_COLOR: Record<string, string> = {
  heart: "#c94b55", lungs: "#d98791", brain: "#d98ba2", immune: "#5c9a80", stomach: "#d78b55",
  eyes: "#8fa9bf", ears: "#b8998b", kidneys: "#a84e42",
  neckveins: "#4a5f9e", liver: "#8a4b34", skull: "#d2c6ae",
};
const ORGAN_BRIGHT: Record<string, string> = {
  heart: "#ff3b4e", lungs: "#ff8fa3", brain: "#ff7ac8", immune: "#6fae92", stomach: "#ffa24a",
  eyes: "#9db4c8", ears: "#c8a89a", kidneys: "#b85a4c",
  neckveins: "#5a74b8", liver: "#9c5a3f", skull: "#e3d9c4",
};
const TMP_COLOR = new THREE.Color();
const SOFT_GLOW = new Set(["immune", "eyes", "ears", "kidneys", "neckveins", "liver", "skull"]);


const LABEL_MATS = new Set(["Text", "Directions", ""]);
const LABEL_MAT_RE = /text|direction|label|annot|font/i;
const BONE_MATS = new Set(["Bone-4", "Suture-1", "Cartilage", "Teeth", "Teeth-roots"]);
const HIDE_PATH = /Genital|Penis|Scrot|Testis|Epididym|Urogenital|Perineum/i;
const BOOST: Record<string, { scale: number; maxSize: number }> = {
  ears: { scale: 5, maxSize: 1 },
  immune: { scale: 3.5, maxSize: 0.1 },   
};
const SUIT_NAME = /^(BELT_LEG[LR]|BOOTS|BOTTLE(_TUBE)?|GLOVES(001)?|HELMET_(BASE|GLASS|METAL_PARTS)|SUIT_(BASE|BELT|BUTTONS|DETAILS|STRAPS))$/;

interface SuitStyle { color: string; roughness: number; metalness: number; opacity?: number }
const SUIT_STYLES: [RegExp, SuitStyle][] = [
  [/^HELMET_GLASS$/,        { color: "#c9a24a", roughness: 0.12, metalness: 0.9, opacity: 0.55 }],  // visière dorée
  [/^HELMET_METAL_PARTS$/,  { color: "#9aa3ad", roughness: 0.35, metalness: 0.8 }],                 // anneaux / métal
  [/^HELMET_BASE$/,         { color: "#dde1e7", roughness: 0.5,  metalness: 0.05 }],
  [/^SUIT_BASE$/,           { color: "#dde1e7", roughness: 0.65, metalness: 0.0 }],                 // blanc NASA
  [/^SUIT_STRAPS$/,         { color: "#e0661f", roughness: 0.6,  metalness: 0.0 }],                 // orange
  [/^SUIT_BELT$/,           { color: "#3b4350", roughness: 0.6,  metalness: 0.2 }],
  [/^SUIT_BUTTONS$/,        { color: "#b7bcc4", roughness: 0.3,  metalness: 0.8 }],
  [/^SUIT_DETAILS$/,        { color: "#8a919c", roughness: 0.5,  metalness: 0.4 }],
  [/^GLOVES/,               { color: "#c3c8d0", roughness: 0.85, metalness: 0.0 }],
  [/^BOOTS$/,               { color: "#2f343c", roughness: 0.7,  metalness: 0.1 }],
  [/^BELT_LEG/,             { color: "#3b4350", roughness: 0.6,  metalness: 0.2 }],
  [/^BOTTLE_TUBE$/,         { color: "#4a515c", roughness: 0.6,  metalness: 0.2 }],
  [/^BOTTLE$/,              { color: "#3d6fb5", roughness: 0.4,  metalness: 0.4 }],                 // bouteille bleue
];

interface Rule {
  id: string; label: string; role: "shell" | "organ" | "bone"; domains: DomainName[];
  test: (path: string, name: string, mat: string) => boolean;
}
const seg = (path: string, s: string) => path.includes(`/${s}/`);

// L'ordre compte : la première règle qui matche gagne.
const RULES: Rule[] = [
  { id: "shell", label: "Skin", role: "shell", domains: [],
    test: (p, _n, m) => seg(p, "Regions_of_human_bodyg") && m === "Skin-2" },
  { id: "eyes", label: "Eyes", role: "organ", domains: ["Radiation", "Cognition"],
    test: (p) => seg(p, "Eyeg") },
  { id: "ears", label: "Inner ears", role: "organ", domains: ["Cognition"],
    test: (p) => seg(p, "Internal_earg") },
  { id: "neckveins", label: "Neck veins", role: "organ", domains: ["Cardiovascular"],
    test: (_p, n) => /^((Internal|External|Anterior)_jugular_vein[lr]?|(Left|Right)_brachiocephalic_vein)$/.test(n) },
  { id: "liver", label: "Liver & pancreas", role: "organ", domains: ["Digestive"],
    test: (p, n) => seg(p, "Liver") || /^(Pancreas|Gallbladder)$/.test(n) },
  { id: "kidneys", label: "Kidneys", role: "organ", domains: ["Environment", "Bone/Muscle"],
    test: (_p, n) => /^(Kidney|Renal_pelvis)[lr]$/.test(n) },
  { id: "heart", label: "Heart", role: "organ", domains: ["Cardiovascular"],
    test: (p) => seg(p, "Heartg") || seg(p, "Arteries_of_heartg") },
  { id: "lungs", label: "Lungs", role: "organ", domains: ["Environment"],
    test: (p) => seg(p, "Lungsg") || seg(p, "Tracheobronchial_treeg") },
  { id: "brain", label: "Brain", role: "organ", domains: ["Cognition", "Behavioral", "Sleep"],
    test: (p) => seg(p, "Braing") },
  // l'appendice est dans le tube digestif : l'immunité passe AVANT l'estomac
  { id: "immune", label: "Immune organs", role: "organ", domains: ["Immune"],
    test: (p, n) => seg(p, "Lymphoid_organsg") || n === "Vermiform_appendix" },
  { id: "stomach", label: "Stomach", role: "organ", domains: ["Digestive"],
    test: (p) => seg(p, "Digestive_canalg") },
  // le crâne AVANT le squelette ; os uniquement (le groupe contient aussi des muscles)
  { id: "skull", label: "Skull", role: "organ", domains: ["Bone/Muscle"],
    test: (p, _n, m) => (seg(p, "Craniumg") || seg(p, "Extracranial_bones_of_headg")) && BONE_MATS.has(m) },
  { id: "skeleton", label: "Skeleton", role: "bone", domains: ["Bone/Muscle"],
    test: (p, _n, m) => seg(p, "Skeletal_systemg") && BONE_MATS.has(m) },
];
// petits organes d'abord (ils sont à l'intérieur du crâne / du torse)
const PICK_ORDER = ["eyes", "ears", "neckveins", "heart", "lungs", "brain", "liver", "kidneys", "stomach", "immune", "skull", "skeleton"];

// chemin racine -> mesh, avec "/" au début et à la fin
function fullPath(o: THREE.Object3D): string {
  const names: string[] = [];
  for (let n: THREE.Object3D | null = o; n; n = n.parent) names.push(n.name);
  return "/" + names.reverse().join("/") + "/";
}
function matNameOf(m: THREE.Mesh): string {
  const mt = Array.isArray(m.material) ? m.material[0] : m.material;
  return mt?.name ?? "";
}
// boîte englobante du mesh SEUL (Box3.setFromObject inclurait aussi ses enfants)
function meshBox(m: THREE.Mesh, target: THREE.Box3): THREE.Box3 {
  if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
  return target.copy(m.geometry.boundingBox!).applyMatrix4(m.matrixWorld);
}

const FRESNEL_VS = `varying vec3 vN; varying vec3 vV;
void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0);
  vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`;
const FRESNEL_FS = `uniform vec3 uColor; uniform float uPow; uniform float uI; uniform float uA; varying vec3 vN; varying vec3 vV;
void main(){ float f = pow(1.0-abs(dot(normalize(vN),normalize(vV))), uPow);
  float soft = 0.10 + f*0.75;
  gl_FragColor = vec4(uColor*(0.25 + f*uI)*uA, soft*uA); }`;

interface Organ { id: string; label: string; domains: DomainName[]; mats: THREE.Material[]; meshes: THREE.Mesh[]; center: THREE.Vector3; radius: number }
interface Focus { point: THREE.Vector3; dist: number }

function worst(d: DomainName[], m: DomainMap): Status {
  return d.reduce<Status>((w, n) => (RANK[m[n].status] > RANK[w] ? m[n].status : w), "green");
}

function Model({ url, domains, heartRate, respiration, skinColor, selected, showSuit, onSelect }: {
  url: string; domains: DomainMap; heartRate: number; respiration: number; skinColor: string;
  selected: string | null; showSuit: boolean;
  onSelect: (id: string | null, d: DomainName[], f: Focus | null) => void;
}) {
  const gltf = useGLTF(url);
  const [reportOpenFor, setReportOpenFor] = useState<string | null>(null);
  const reportOpen = selected !== null && reportOpenFor === selected;

  const prep = useMemo(() => {
    const scene = gltf.scene.clone(true);
    scene.updateMatrixWorld(true);
    const organs: Record<string, Organ> = {};
    const sharedMats: Record<string, THREE.Material> = {};      // 1 matériau par organe (au lieu de 1 par mesh)
    const suitParts: THREE.Object3D[] = [];
    const anatomyMeshes: THREE.Mesh[] = [];
    const labelMeshes: THREE.Mesh[] = [];
    const fitMeshes: THREE.Mesh[] = [];
    const pivots: THREE.Group[] = [];
    const noRay = () => {};
    const suitMats: THREE.Material[] = [];
    const suitMaterial = (name: string): THREE.Material | null => {
      const st = SUIT_STYLES.find(([re]) => re.test(name))?.[1];
      if (!st) return null;
      const mt = new THREE.MeshStandardMaterial({ color: st.color, roughness: st.roughness, metalness: st.metalness });
      if (st.opacity !== undefined) { mt.transparent = true; mt.opacity = st.opacity; mt.depthWrite = false; }
      suitMats.push(mt);
      return mt;
    };

    const shellMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(skinColor) }, uPow: { value: 1.3 }, uI: { value: 1.0 }, uA: { value: 1 } },
      vertexShader: FRESNEL_VS, fragmentShader: FRESNEL_FS,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    // meshes inutiles ET textes : matériau invisible (NE cache PAS leurs enfants, contrairement à mesh.visible = false)
    const hideMat = new THREE.MeshBasicMaterial({ visible: false });

    const meshes: THREE.Mesh[] = [];
    scene.traverse((o) => {
      const any = o as unknown as { isMesh?: boolean; isLine?: boolean; isPoints?: boolean; isSprite?: boolean };
      if (any.isMesh) meshes.push(o as THREE.Mesh);
      else if (any.isLine || any.isPoints || any.isSprite) { o.visible = false; (o as THREE.Mesh).raycast = noRay; }
    });

    const counts: Record<string, number> = { label: 0, suit: 0, hidden: 0 };

    meshes.forEach((mesh) => {
      const name = mesh.name;
      const mat = matNameOf(mesh);          
      const path = fullPath(mesh);

      if (SUIT_NAME.test(name)) {
        if (/^GLOVES/.test(name) && !mesh.geometry.userData.smoothed) {
          mesh.geometry = mesh.geometry.clone();
          mesh.geometry.computeVertexNormals();
          mesh.geometry.userData.smoothed = true;
        }
        const sm = suitMaterial(name); if (sm) mesh.material = sm; suitParts.push(mesh); fitMeshes.push(mesh); mesh.raycast = noRay; counts.suit++; return; }

      if (LABEL_MATS.has(mat) || LABEL_MAT_RE.test(mat)) {
        mesh.material = hideMat; mesh.raycast = noRay;
        labelMeshes.push(mesh); counts.label++; return;
      }

     
      if (HIDE_PATH.test(path)) { mesh.material = hideMat; mesh.raycast = noRay; counts.hidden++; return; }

      const rule = RULES.find((r) => r.test(path, name, mat));
      if (!rule) { mesh.material = hideMat; mesh.raycast = noRay; counts.hidden++; return; }

      mesh.frustumCulled = false;   // les meshes Z-Anatomy ont souvent de mauvaises bounds
      counts[rule.id] = (counts[rule.id] ?? 0) + 1;

      if (rule.role === "shell") {
        mesh.material = shellMat; mesh.renderOrder = 10; mesh.raycast = noRay;
        anatomyMeshes.push(mesh); fitMeshes.push(mesh);
        return;
      }

      let m = sharedMats[rule.id];
      if (!m) {
        m = rule.role === "bone"
          ? new THREE.MeshPhysicalMaterial({ color: "#efe9df", roughness: 0.4, emissive: "#cdd6e4", emissiveIntensity: 0.15 })
          : new THREE.MeshStandardMaterial({ roughness: 0.45 });
        m.transparent = true; m.depthWrite = false; m.opacity = 1; m.side = THREE.DoubleSide;
        sharedMats[rule.id] = m;
      }
      mesh.material = m;
      mesh.renderOrder = rule.role === "bone" ? 2 : 5;
      mesh.userData.organ = rule.id;
      anatomyMeshes.push(mesh); fitMeshes.push(mesh);
      const org = (organs[rule.id] ??= { id: rule.id, label: rule.label, domains: rule.domains, mats: [m], meshes: [], center: new THREE.Vector3(), radius: 1 });
      org.meshes.push(mesh);
    });

    const known = new Set<THREE.Object3D>([...anatomyMeshes, ...suitParts]);
    scene.traverse((o) => {
      const mm = o as THREE.Mesh;
      if (mm.isMesh && !known.has(o)) { mm.material = hideMat; mm.raycast = noRay; }
    });

    console.log("Classification Startup.glb :", counts);

    Object.entries(BOOST).forEach(([id, cfg]) => {
      const org = organs[id];
      if (!org) return;
      const tb = new THREE.Box3();
      org.meshes.forEach((m) => {
        meshBox(m, tb);
        if (tb.getSize(new THREE.Vector3()).length() > cfg.maxSize) return;
        const pivot = new THREE.Group();
        scene.add(pivot);
        pivot.position.copy(scene.worldToLocal(tb.getCenter(new THREE.Vector3())));
        pivot.updateMatrixWorld(true);
        pivot.attach(m);
        pivot.scale.setScalar(cfg.scale);
        pivot.updateMatrixWorld(true);
      });
    });

    ["heart", "lungs"].forEach((id) => {
      const org = organs[id];
      if (!org) return;
      const b = new THREE.Box3(), tmp = new THREE.Box3();
      org.meshes.forEach((m) => b.union(meshBox(m, tmp)));
      const pivot = new THREE.Group();
      pivot.userData.kind = id;
      scene.add(pivot);
      pivot.position.copy(scene.worldToLocal(b.getCenter(new THREE.Vector3())));
      pivot.updateMatrixWorld(true);
      org.meshes.forEach((m) => pivot.attach(m));     
      pivots.push(pivot);
    });
    scene.updateMatrixWorld(true);

    const tmp = new THREE.Box3();
    Object.values(organs).forEach((org) => {
      const b = new THREE.Box3();
      org.meshes.forEach((m) => b.union(meshBox(m, tmp)));
      b.getCenter(org.center);
      org.radius = b.getSize(new THREE.Vector3()).length() / 2;
    });

    const box = new THREE.Box3();
    fitMeshes.forEach((m) => box.union(meshBox(m, tmp)));
    const size = box.getSize(new THREE.Vector3());
    const k = 2.2 / (size.y || 1);
    const centre = box.getCenter(new THREE.Vector3());
    return { scene, organs, pivots, suitParts, anatomyMeshes, shellMat, hideMat, sharedMats, suitMats, k, centre };
  }, [gltf, skinColor]);

  useEffect(() => () => {
    prep.shellMat.dispose(); prep.hideMat.dispose();
    Object.values(prep.sharedMats).forEach((m) => m.dispose());
    prep.suitMats.forEach((m) => m.dispose());
  }, [prep]);

  useLayoutEffect(() => {
    prep.suitParts.forEach((p) => { p.visible = showSuit; });
    prep.anatomyMeshes.forEach((m) => { m.visible = !showSuit; });
    if (!showSuit) {
      prep.anatomyMeshes.forEach((m) => m.traverseAncestors((a) => { a.visible = true; }));
    }
  }, [prep, showSuit]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const has = selected !== null;
    const u = prep.shellMat.uniforms;
    const rad = domains.Radiation.status;
    u.uColor.value.set(rad === "green" ? skinColor : COLOR[rad]);
    u.uA.value += ((has ? 0.15 : 1) - u.uA.value) * 0.1;
    Object.values(prep.organs).forEach((org) => {
      const isSel = selected === org.id;
      const isBone = org.id === "skeleton";
      const isSkull = org.id === "skull";
      const s = worst(org.domains, domains);
      const targetOpacity = !has ? (isBone ? 0.6 : isSkull ? 0.45 : 0.95) : isSel ? 1 : 0.06;
      const soft = SOFT_GLOW.has(org.id) ? 0.35 : 1;
      const targetGlow = (!has ? (isBone ? 0.35 : isSkull ? 0.6 : 1.0) : isSel ? 1.1 : 0.03) * soft;
      org.mats.forEach((m) => {
        const mm = m as THREE.MeshStandardMaterial;
        mm.opacity += (targetOpacity - mm.opacity) * 0.12;
        mm.depthWrite = isSel && !isBone;
        if (!isBone) {
          TMP_COLOR.set(has ? (ORGAN_COLOR[org.id] ?? "#6d77c7") : (ORGAN_BRIGHT[org.id] ?? "#8a96ff"));
          mm.color.lerp(TMP_COLOR, 0.12);
          mm.emissive.lerp(TMP_COLOR, 0.12);
        }
        const g = !isBone && s === "red" && (!has || isSel) ? targetGlow + 0.4 * Math.sin(t * 6) : targetGlow;
        mm.emissiveIntensity += (g - mm.emissiveIntensity) * 0.2;
      });
    });
    prep.pivots.forEach((p) => {
      if (p.userData.kind === "heart")
        p.scale.setScalar(1 + 0.07 * Math.max(0, Math.sin(t * (heartRate / 60) * Math.PI * 2)));
      else
        p.scale.setScalar(1 + 0.035 * Math.sin(t * (respiration / 60) * Math.PI * 2));
    });
  });

  const toWorld = (v: THREE.Vector3) => v.clone().sub(prep.centre).multiplyScalar(prep.k);

  const pickOrgan = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const ids = e.intersections.map((i) => i.object.userData.organ as string | undefined).filter((x): x is string => !!x);
    const id = PICK_ORDER.find((p) => ids.includes(p));
    if (!id) return onSelect(null, [], null);
    const org = prep.organs[id];
    onSelect(id, org.domains, { point: toWorld(org.center), dist: THREE.MathUtils.clamp(org.radius * prep.k * 4, 0.9, 4.2) });
  };

  const sel = selected ? prep.organs[selected] : null;
  return (
    <group scale={prep.k}>
      <group position={prep.centre.clone().multiplyScalar(-1)} onClick={pickOrgan}>
        <primitive object={prep.scene} />
      </group>
      {sel && (
        <Html position={sel.center.clone().sub(prep.centre)} zIndexRange={[10, 0]}>
          <section className="organ-detail-card" aria-label={`${sel.label} details`}>
            <div className="organ-card-kicker">{sel.domains[0]} · ORGAN HEALTH</div>
            <h3>{sel.label} status</h3>
            <p className="organ-card-summary">
              Health indicators and contributing signals for this organ.
            </p>
            <div className="organ-card-status">
              <span className="organ-status-dot" style={{ backgroundColor: COLOR[worst(sel.domains, domains)] }} />
              <span>{worst(sel.domains, domains).toUpperCase()}</span>
              <strong>{sel.domains.length} {sel.domains.length === 1 ? "domain" : "domains"}</strong>
            </div>
            {reportOpen && sel.domains.map((domain) => {
              const detail = domains[domain];
              return (
                <article className="organ-domain-detail" key={domain}>
                  <div className="organ-domain-heading">
                    <strong>{domain}</strong>
                    <span className="organ-domain-status" style={{ color: COLOR[detail.status] }}>
                      {detail.status.toUpperCase()} · {detail.score.toFixed(1)}
                    </span>
                  </div>
                  {detail.drivers && (
                    <ul>{detail.drivers.map((driver) => <li key={driver}>{driver}</li>)}</ul>
                  )}
                </article>
              );
            })}
            <button
              type="button"
              className="organ-report-button"
              aria-expanded={reportOpen}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                setReportOpenFor((openFor) => openFor === selected ? null : selected);
              }}
            >
              {reportOpen ? "Close report" : "View report"}
            </button>
          </section>
        </Html>
      )}
    </group>
  );
}

function CameraRig({ focus, controls }: { focus: Focus | null; controls: RefObject<ElementRef<typeof OrbitControls> | null> }) {
  const { camera } = useThree();
  const timer = useRef(99);
  const previousFocus = useRef(focus);
  useEffect(() => {
    if (previousFocus.current === focus) return;
    previousFocus.current = focus;
    timer.current = 0;
  }, [focus]);
  useFrame((_, dt) => {
    const c = controls.current;
    if (!c || timer.current > 1.4) return;
    timer.current += dt;
    const tgt = focus ? focus.point : new THREE.Vector3(0, 0, 0);
    const dist = focus ? focus.dist : 4.2;
    c.target.lerp(tgt, 0.08);
    const dir = camera.position.clone().sub(c.target).normalize();
    const d = camera.position.distanceTo(c.target);
    camera.position.copy(c.target).addScaledVector(dir, d + (dist - d) * 0.08);
    c.update();
  });
  return null;
}

export default function Astronautmodel2({ url = "models/Untitled.glb", domains, heartRate = 68, respiration = 16,
  showSuit = true,
  skinColor = "#e6ecf5", onSelect, height = "100%" }: {
  url?: string; domains: DomainMap; heartRate?: number; respiration?: number; skinColor?: string;
  showSuit?: boolean;
  height?: number | string; onSelect?: (organId: string | null, domains: DomainName[]) => void;
}) {
  const [sel, setSel] = useState<string | null>(null);
  const [focus, setFocus] = useState<Focus | null>(null);
  const controls = useRef<ElementRef<typeof OrbitControls>>(null);
  const pick = (id: string | null, d: DomainName[], f: Focus | null) => { setSel(id); setFocus(f); onSelect?.(id, d); };
  return (
    <div style={{ width: "100%", height, background: "transparent" }}>
      <Canvas camera={{ position: [0, 0.9, 1.95], fov: 38 }} dpr={[1, 2]} onPointerMissed={() => pick(null, [], null)}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 4, 5]} intensity={1.2} />
        <Stars radius={30} depth={20} count={1500} factor={2} fade />
        <Suspense fallback={<Html center style={{ color: "#ddd" }}>Loading anatomy...</Html>}>
          <Model url={url} domains={domains} heartRate={heartRate} respiration={respiration}
                 skinColor={skinColor} selected={sel} showSuit={showSuit} onSelect={pick} />
        </Suspense>
        <OrbitControls ref={controls} target={[0, 0.62, 0]} enablePan={false} minDistance={0.6} maxDistance={7} />
        <CameraRig focus={focus} controls={controls} />
        <EffectComposer>
          <Bloom intensity={1.3} luminanceThreshold={0.12} luminanceSmoothing={0.7} radius={0.85} mipmapBlur />
        </EffectComposer>
      </Canvas>
    </div>
  );
}