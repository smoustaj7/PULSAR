import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ElementRef } from "react";
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
  heart: "#c94b55",
  lungs: "#d98791",
  brain: "#d98ba2",
  immune: "#ba7181",
  stomach: "#d78b55",
};



interface Rule { match: RegExp; role: "shell" | "bone" | "organ" | "suit" | "accessory"; id?: string; label?: string; domains?: DomainName[] }
const SUIT_PART = /suit_(base|belt|buttons|details|straps)|boots?|gloves?|bottle|helmet|visor|belt_leg|backpack|bagpack|accessor|head.?suit|suit.?head|headgear/i;
const HELMET_PART = /^helmet(?:_base|_glass|_metal_parts)?(?:\.\d+)?$|^visor(?:\.\d+)?$/i;
const METAL_HELMET_PART = /^helmet_metal_parts?(?:\.\d+)?$/i;
const RULES: Rule[] = [
  { match: /boots?|gloves?|bottle|helmet|visor|belt_leg|suit_belt|suit_straps|backpack|bagpack|accessor/i, role: "accessory" },
  { match: /suit_(base|buttons|details)/i, role: "suit" },
  { match: /skin|meat|body_shell|^body$/i, role: "shell" },
  { match: /heart|cardi/i, role: "organ", id: "heart", label: "Heart", domains: ["Cardiovascular"] },
  { match: /lung|bronch|trachea/i, role: "organ", id: "lungs", label: "Lungs", domains: ["Environment"] },
  { match: /brain|cerebr/i, role: "organ", id: "brain", label: "Brain", domains: ["Cognition", "Behavioral", "Sleep"] },
  { match: /stomach|gastric|interstain/i, role: "organ", id: "stomach", label: "Stomach", domains: ["Digestive"] },
  { match: /spleen|thymus|immune/i, role: "organ", id: "immune", label: "Immune system", domains: ["Immune"] },
  { match: /skelet|bone|rib|spine|skull|femur|pelvis|vertebra/i, role: "bone", id: "skeleton", label: "Skeleton", domains: ["Bone/Muscle"] },
];
const PICK_ORDER = ["heart", "lungs", "brain", "stomach", "skeleton", "immune"];

function fullName(o: THREE.Object3D): string {
  const names: string[] = [];
  for (let n: THREE.Object3D | null = o; n; n = n.parent) names.push(n.name);
  return names.join("/");
}

const FRESNEL_VS = `varying vec3 vN; varying vec3 vV;
void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0);
  vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`;
const FRESNEL_FS = `uniform vec3 uColor; uniform float uPow; uniform float uI; uniform float uA; varying vec3 vN; varying vec3 vV;
void main(){ float f = pow(1.0-abs(dot(normalize(vN),normalize(vV))), uPow);
  float soft = 0.10 + f*0.75;
  gl_FragColor = vec4(uColor*(0.25 + f*uI)*uA, soft*uA); }`;

interface Organ { id: string; label: string; domains: DomainName[]; mats: THREE.Material[]; center: THREE.Vector3; radius: number }
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
    const suitParts = new Set<THREE.Object3D>();
    const anatomyMeshes: THREE.Mesh[] = [];
    const pivots: THREE.Group[] = [];
    const shellMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(skinColor) }, uPow: { value: 1.3 }, uI: { value: 1.0 }, uA: { value: 1 } },
      vertexShader: FRESNEL_VS, fragmentShader: FRESNEL_FS,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const names: string[] = [];
    const noRay = () => {};

    scene.traverse((o) => {
      if (SUIT_PART.test(fullName(o)) || HELMET_PART.test(o.name) || METAL_HELMET_PART.test(o.name)) {
        suitParts.add(o);
      }
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      names.push(fullName(mesh));
      const rule = RULES.find((r) => r.match.test(fullName(mesh)));
      if (!rule) { mesh.visible = false; mesh.raycast = noRay; return; }
      if (rule.role === "accessory" || rule.role === "suit") { mesh.raycast = noRay; return; }
      if (rule.role === "shell") {
        mesh.material = shellMat;
        mesh.renderOrder = 10;
        mesh.raycast = noRay;
        anatomyMeshes.push(mesh);
        return;
      }

      const mat = rule.role === "bone"
        ? new THREE.MeshPhysicalMaterial({ color: "#efe9df", roughness: 0.4, emissive: "#cdd6e4", emissiveIntensity: 0.15 })
        : new THREE.MeshStandardMaterial({ roughness: 0.45 });
      mat.transparent = true; mat.depthWrite = false; mat.opacity = 1;
      mesh.material = mat;
      mesh.userData.organ = rule.id;
      anatomyMeshes.push(mesh);
      const org = (organs[rule.id!] ??= { id: rule.id!, label: rule.label!, domains: rule.domains!, mats: [], center: new THREE.Vector3(), radius: 1 });
      org.mats.push(mat);

      if (rule.id === "heart" || rule.id === "lungs") {           // pivot for beat / breathing
        const c = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
        const pivot = new THREE.Group();
        pivot.userData.kind = rule.id;
        mesh.parent!.add(pivot);
        pivot.position.copy(mesh.parent!.worldToLocal(c.clone()));
        pivot.attach(mesh);
        pivots.push(pivot);
      }
    });

    console.log("Mesh names in model:", names);

    scene.updateMatrixWorld(true);
    Object.values(organs).forEach((org) => {                       // centre + size of each organ (for focus/zoom)
      const b = new THREE.Box3();
      scene.traverse((o) => { if (o.userData.organ === org.id) b.expandByObject(o); });
      b.getCenter(org.center);
      org.radius = b.getSize(new THREE.Vector3()).length() / 2;
    });

    const box = new THREE.Box3();                                  // fit on kept meshes only
    scene.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.visible) box.expandByObject(o); });
    const size = box.getSize(new THREE.Vector3());
    const k = 2.2 / (size.y || 1);
    const centre = box.getCenter(new THREE.Vector3());
    return { scene, organs, pivots, suitParts: [...suitParts], anatomyMeshes, shellMat, k, centre };
  }, [gltf, skinColor]);

  useEffect(() => () => prep.shellMat.dispose(), [prep]);
  useLayoutEffect(() => {
    prep.suitParts.forEach((part) => { part.visible = showSuit; });
    prep.anatomyMeshes.forEach((mesh) => { mesh.visible = !showSuit; });
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
      const s = worst(org.domains, domains);
      const targetOpacity = !has ? (isBone ? 0.6 : 0.95) : isSel ? 1 : 0.06;   // the others become ghosts
      const targetGlow = !has ? 0.45 : isSel ? 1.1 : 0.03;
      org.mats.forEach((m) => {
        const mm = m as THREE.MeshStandardMaterial;
        mm.opacity += (targetOpacity - mm.opacity) * 0.12;
        if (!isBone) {
          const color = ORGAN_COLOR[org.id] ?? "#6d77c7";
          mm.color.set(color);
          mm.emissive.set(color);
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

function CameraRig({ focus, controls }: { focus: Focus | null; controls: React.RefObject<ElementRef<typeof OrbitControls> | null> }) {
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
//human.glb is the one without the suit
export default function Astronautmodel({ url = "models/astronaut222.glb", domains, heartRate = 68, respiration = 16,
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