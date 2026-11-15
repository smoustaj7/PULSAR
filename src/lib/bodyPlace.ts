/**
 * The model's skin is cut into anatomical regions, each a mesh named in anatomists' terms
 * ("Posterior_region_of_leg", "Cubital_fossa"). This turns the region under a tap into the
 * words a crew member would use for it. First match wins, so narrower names come first.
 */
const PLACES: [RegExp, string][] = [
  // Head
  [/auricl|auricular|heli[xc]|tragus|concha|scapha|lobule|triangular|eminentia|intertragic/i, 'ear'],
  // Anchored: the neck's 'sternocleidomastoid' ends the same way.
  [/^mastoid/i, 'behind the ear'],
  [/frontal_region/i, 'forehead'],
  [/temporal/i, 'temple'],
  [/parietal/i, 'top of the head'],
  [/occipital/i, 'back of the head'],
  [/orbital|eyebrow/i, 'around the eye'],
  [/nasal_region/i, 'nose'],
  [/nasolabial|buccal|zygomatic|parotid/i, 'cheek'],
  [/mental|mentolabial/i, 'chin'],
  // Anchored: 'oral' is also the end of 'pectoral'.
  [/^oral|_lip|mouth|philtrum|labial/i, 'mouth'],
  // Neck
  [/posterior_region_of_neck/i, 'back of the neck'],
  [/neck|carotid|muscular_triangle|submandibular|sternocleidomastoid|supraclavicular/i, 'neck'],
  // Arm and hand
  [/deltoid/i, 'shoulder'],
  [/posterior_region_of_arm/i, 'back of the upper arm'],
  [/region_of_arm|bicipital/i, 'upper arm'],
  [/cubital|anterior_region_of_elbow/i, 'inside of the elbow'],
  [/elbow/i, 'elbow'],
  [/forearm/i, 'forearm'],
  [/wrist|radial_foveola/i, 'wrist'],
  [/dorsum_of_hand/i, 'back of the hand'],
  // Before the palm: the finger pads are 'palmar surfaces of digits'.
  [/digits_of_hand/i, 'fingers'],
  [/^palm/i, 'palm'],
  // Trunk, front
  [/pectoral|mammary|presternal|infraclavicular/i, 'chest'],
  [/lateral_region_of_thorax/i, 'side of the chest'],
  [/lateral_region_of_abdomen/i, 'side of the abdomen'],
  [/hypogastric/i, 'lower abdomen'],
  [/epigastric|umbilic|hypochondriac/i, 'abdomen'],
  [/inguinal|urogenital|anal_region/i, 'groin'],
  // Trunk, back
  [/scapular|auscultation/i, 'upper back'],
  [/vertebral/i, 'spine'],
  [/lumbar|sacral/i, 'lower back'],
  [/gluteal/i, 'buttock'],
  [/hip_region/i, 'hip'],
  // Leg and foot
  [/posterior_region_of_thigh/i, 'back of the thigh'],
  [/thigh|femoral/i, 'thigh'],
  [/popliteal|posterior_region_of_knee/i, 'back of the knee'],
  [/knee/i, 'knee'],
  [/anterior_region_of_leg/i, 'shin'],
  [/posterior_region_of_leg/i, 'calf'],
  [/ankle|malleol/i, 'ankle'],
  [/heel/i, 'heel'],
  [/dorsum_of_foot/i, 'top of the foot'],
  [/digits_of_foot/i, 'toes'],
  [/^sole|arch_of_foot|hallucial|metatarsal|plantar/i, 'sole of the foot'],
  [/border_of_foot/i, 'side of the foot'],
]

/** Parts on the body's centre line, which have no left or right. */
const MIDLINE = new Set(['spine', 'nose', 'mouth', 'chin', 'forehead', 'top of the head', 'back of the head', 'back of the neck', 'groin'])
/** How far from the centre line (in metres) a point must be to be called left or right. */
const OFF_CENTRE = 0.02

const capital = (s: string) => s[0].toUpperCase() + s.slice(1)

/**
 * Where a tap on the skin landed, in plain words: "Shin (left)", "Back of the knee (right)",
 * "Chest". `x` is the point's distance from the body's centre line; the body's left is +x.
 */
export function bodyPlace(skinName: string, x: number): string {
  const place =
    PLACES.find(([re]) => re.test(skinName))?.[1] ??
    // An unlisted region keeps its own name, minus the numbering and the side letter.
    skinName
      .replace(/(_\d+)?(\d{3})?$/, '')
      .replace(/(?<=[a-z])[lr]$/, '')
      .replaceAll('_', ' ')
      .toLowerCase()
  if (MIDLINE.has(place) || Math.abs(x) < OFF_CENTRE) return capital(place)
  return `${capital(place)} (${x > 0 ? 'left' : 'right'})`
}

export const INJURY_KINDS = [
  { id: 'scratch', label: 'Scratch' },
  { id: 'cut', label: 'Cut' },
  { id: 'bruise', label: 'Bruise' },
  { id: 'burn', label: 'Burn' },
  { id: 'rash', label: 'Rash' },
  { id: 'other', label: 'Other' },
] as const
export type InjuryKind = (typeof INJURY_KINDS)[number]['id']
export const injuryLabel = (kind: InjuryKind) => INJURY_KINDS.find((k) => k.id === kind)?.label ?? 'Injury'
