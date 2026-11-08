/**
 * NASA Lifetime Surveillance of Astronaut Health (LSAH), summarized from the NASA Life Sciences
 * Portal (https://nlsp.nasa.gov/resources/lsah, read 2026-11-08). Descriptions are our own
 * wording; requirement titles and document counts are as listed by NASA.
 *
 * PubMed IDs were checked against PubMed itself: most of the portal's own PubMed links point to
 * unrelated papers, so the ids below are the verified ones, not copies of those links.
 */

export const LSAH_LINKS = {
  overview: 'https://nlsp.nasa.gov/resources/lsah',
  researchDetails: 'https://nlsp.nasa.gov/resources/lsah/research-details',
  newsletters: 'https://nlsp.nasa.gov/resources/lsah/newsletters',
  dataRequest: 'https://nlsp.nasa.gov/data-request',
  explore: 'https://nlsp.nasa.gov/explore',
  standardMeasures: 'https://nlsp.nasa.gov/resources/standard-measures',
  contact: 'mailto:jsc-lsah@mail.nasa.gov',
} as const

export interface LsahSystem {
  id: string
  label: string
  summary: string
  /** Number of medical requirement documents NASA lists for this system. */
  documents: number
  /** A few of NASA's requirement titles, to show what is actually measured. */
  examples: string[]
  /** AstroPulse body regions that track part of this system. */
  regionIds: string[]
}

export const LSAH_SYSTEMS: LsahSystem[] = [
  {
    id: 'behavioral',
    label: 'Behavioral Health & Performance',
    summary: 'Psychological check-ins and cognitive testing before, during and after flight.',
    documents: 6,
    examples: ['Cognitive Assessment', 'Preflight Psychiatric/Psychological Status Check', 'Private Psychological Conferences'],
    regionIds: ['brain'],
  },
  {
    id: 'musculoskeletal',
    label: 'Bone, Muscle & Exercise',
    summary: 'Bone density, strength and fitness tests that show whether exercise countermeasures are working.',
    documents: 12,
    examples: ['Bone Densitometry', 'On-Orbit Strength & Conditioning Monitoring', 'Postflight Reconditioning'],
    regionIds: ['musculoskeletal'],
  },
  {
    id: 'cardiovascular',
    label: 'Cardiovascular',
    summary: 'Heart rhythm, blood pressure and aerobic capacity, including how well crew tolerate standing up after flight.',
    documents: 3,
    examples: ['Resting ECG', '24-Hour Ambulatory ECG Monitoring', 'Cycle Ergometer Test / Aerobic Functional Capacity'],
    regionIds: ['cardiovascular'],
  },
  {
    id: 'environmental',
    label: 'Environmental Health',
    summary: 'Air, water, surface microbes, CO₂ and noise inside the spacecraft, kept within crew exposure limits.',
    documents: 12,
    examples: ['Air Quality Monitor (AQM)', 'ISS Potable Water Quality Monitoring', 'Acoustic Monitoring & Countermeasures'],
    regionIds: ['respiratory'],
  },
  {
    id: 'eva',
    label: 'Extravehicular Activity (EVA)',
    summary: 'Spacewalk medicine: suit fitness, pre-breathe protocols against decompression sickness, and checks after the walk.',
    documents: 4,
    examples: ['EVA Medical Monitoring', 'In-Suit Light Exercise Prebreathe Protocol'],
    regionIds: [],
  },
  {
    id: 'immunology',
    label: 'Immunology',
    summary: 'Immune changes in microgravity, such as dormant viruses reactivating, plus infection screening.',
    documents: 6,
    examples: ['Crew Microbiology', 'MRSA Nasal Screen and Suppression', 'Photodocumentation of Skin Injuries and Allergic Reactions'],
    regionIds: ['immune'],
  },
  {
    id: 'neurology',
    label: 'Neurology',
    summary: 'Balance and sensorimotor adaptation, hearing, and brain imaging for pressure changes inside the skull.',
    documents: 5,
    examples: ['Neurovestibular Platform Test', 'MRI Brain and MR Angiography', 'Hearing Assessment'],
    regionIds: ['brain'],
  },
  {
    id: 'nutrition',
    label: 'Nutrition',
    summary: 'Checks that crew get enough energy, protein, vitamins and minerals while flying.',
    documents: 1,
    examples: ['Nutritional Assessments'],
    regionIds: ['metabolic'],
  },
  {
    id: 'radiation',
    label: 'Radiation',
    summary: 'Dose limits and monitoring with personal and area dosimeters, against cosmic rays and solar particle events.',
    documents: 11,
    examples: ['Crew Personal Dosimetry', 'Active Radiation Environment Monitor 2 (REM2)', 'Biodosimetry Testing'],
    regionIds: [],
  },
  {
    id: 'clinical',
    label: 'Therapeutics & Clinical Care',
    summary: 'Everyday and in-flight medicine: physicals, lab work, eye and dental exams, ultrasound and private medical conferences.',
    documents: 21,
    examples: ['Annual Medical Examinations', 'Ophthalmology Examination', 'Clinical Laboratory Assessment', 'Pre- and Postflight Pulmonary Assessment'],
    regionIds: ['respiratory', 'metabolic'],
  },
]

export const LSAH_DOCUMENTS = [
  {
    title: 'Medical requirements (MRID / MEDB)',
    description: 'Every medical requirement and test protocol in one book. Older entries may carry both MRID and MEDB numbers.',
    url: 'https://nlsp.nasa.gov/doc/mrid_book.pdf',
  },
  {
    title: 'Annual preventive exam (MR089S)',
    description: 'The yearly exam that active and retired astronauts receive, filed under Therapeutics & Clinical Care.',
    url: 'https://nlsp.nasa.gov/doc/MR089S.pdf',
  },
]

/** Caveats NASA gives for reading LSAH data, in plain words. */
export const LSAH_LIMITATIONS = [
  'It is collected for clinical care, not research, so many results are recorded as “normal” rather than as a number.',
  'Requirements have changed over the decades, so older flights are not always comparable with newer ones.',
  'Annual exams happen around each astronaut’s birth month, so their timing varies.',
  'Taking part after retirement is optional, so coverage differs from year to year.',
  'Records are protected by the Privacy Act and HIPAA. Only grouped results are ever published.',
]

export const LSAH_TIMELINE = [
  {
    when: '1989',
    title: 'A research study begins',
    text: 'The Longitudinal Study of Astronaut Health asks whether astronauts get ill or die at different rates than people on the ground.',
  },
  {
    when: 'Design',
    title: 'Matched comparison group',
    text: 'Johnson Space Center employees matched by age, sex and body mass index: first three per astronaut, later five.',
  },
  {
    when: 'May 2010',
    title: 'The study closes',
    text: 'The comparison group is released and the work becomes ongoing occupational surveillance of the astronaut corps.',
  },
  {
    when: 'Today',
    title: 'Lifetime surveillance',
    text: 'Exams follow astronauts for life. The LSAH Repository supports IRB-approved research with each astronaut’s informed consent.',
  },
]

export type Topic = 'Heart' | 'Eyes & brain' | 'Radiation' | 'Bones & muscles' | 'Kidneys & metabolism' | 'Medications' | 'Whole-corps health'

export interface Publication {
  authors: string
  title: string
  venue: string
  year: number
  topics: Topic[]
  /** Verified PubMed id; absent for books and reports. */
  pmid?: string
}

export const LSAH_PUBLICATIONS: Publication[] = [
  { authors: 'Mader TH, et al.', title: 'Optic disc edema, globe flattening, choroidal folds, and hyperopic shifts observed in astronauts after long-duration space flight', venue: 'Ophthalmology', year: 2011, topics: ['Eyes & brain'], pmid: '21849212' },
  { authors: 'Scheuring RA, et al.', title: 'Musculoskeletal injuries and minor trauma in space: incidence and injury mechanisms in U.S. astronauts', venue: 'Aviation, Space, and Environmental Medicine', year: 2009, topics: ['Bones & muscles'], pmid: '19198198' },
  { authors: 'Baker E, et al.', title: 'Human Response to Spaceflight (chapter 2)', venue: 'Springer', year: 2008, topics: ['Whole-corps health'] },
  { authors: 'Jones JA, et al.', title: 'Cataract formation mechanisms and risk in aviation and space crews', venue: 'Aviation, Space, and Environmental Medicine', year: 2007, topics: ['Radiation', 'Eyes & brain'], pmid: '17511300' },
  { authors: 'Pietrzyk RA, et al.', title: 'Renal stone formation among astronauts', venue: 'Aviation, Space, and Environmental Medicine', year: 2007, topics: ['Kidneys & metabolism'], pmid: '17511294' },
  { authors: 'Hamilton DR, et al.', title: 'Cardiac health for astronauts: coronary calcification scores and CRP as criteria for selection and retention', venue: 'Aviation, Space, and Environmental Medicine', year: 2006, topics: ['Heart'], pmid: '16676648' },
  { authors: 'Hamilton DR, et al.', title: 'Cardiac health for astronauts: current selection standards and their limitations', venue: 'Aviation, Space, and Environmental Medicine', year: 2005, topics: ['Heart'], pmid: '16018343' },
  { authors: 'Longnecker DE, et al.', title: 'Review of NASA’s Longitudinal Study of Astronaut Health', venue: 'National Academies Press', year: 2004, topics: ['Whole-corps health'] },
  { authors: 'Cucinotta FA, et al.', title: 'Space radiation and cataracts in astronauts', venue: 'Radiation Research', year: 2001, topics: ['Radiation', 'Eyes & brain'], pmid: '11604058' },
  { authors: 'Hamm PB, et al.', title: 'Design and current status of the Longitudinal Study of Astronaut Health', venue: 'Aviation, Space, and Environmental Medicine', year: 2000, topics: ['Whole-corps health'], pmid: '10870814' },
  { authors: 'McMonigal KA, et al.', title: 'Thyroid function changes related to use of iodinated water in the U.S. space program', venue: 'Aviation, Space, and Environmental Medicine', year: 2000, topics: ['Kidneys & metabolism'], pmid: '11086666' },
  { authors: 'Putcha L, et al.', title: 'Pharmaceutical use by U.S. astronauts on space shuttle missions', venue: 'Aviation, Space, and Environmental Medicine', year: 1999, topics: ['Medications'], pmid: '10417009' },
  { authors: 'Hamm PB, et al.', title: 'Risk of cancer mortality among the Longitudinal Study of Astronaut Health (LSAH) participants', venue: 'Aviation, Space, and Environmental Medicine', year: 1998, topics: ['Radiation', 'Whole-corps health'], pmid: '9491253' },
  { authors: 'Billica RD, et al.', title: 'Perception of the medical risk of spaceflight', venue: 'Aviation, Space, and Environmental Medicine', year: 1996, topics: ['Whole-corps health'], pmid: '8725475' },
  { authors: 'Bagian JP, Ward DF', title: 'A retrospective study of promethazine and its failure to produce the expected incidence of sedation during space flight', venue: 'Journal of Clinical Pharmacology', year: 1994, topics: ['Medications'], pmid: '9766972' },
  { authors: 'Peterson LE, et al.', title: 'Longitudinal study of astronaut health: mortality in the years 1959–1991', venue: 'Radiation Research', year: 1993, topics: ['Whole-corps health', 'Radiation'], pmid: '8438068' },
  { authors: 'Jennings RT, et al.', title: 'Comparison of aerobic fitness and space motion sickness during the shuttle program', venue: 'Aviation, Space, and Environmental Medicine', year: 1988, topics: ['Eyes & brain', 'Heart'], pmid: '3390102' },
]

export const pubmedUrl = (pmid: string) => `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`

/** LSAH systems that overlap an AstroPulse body region. */
export const systemsForRegion = (regionId: string) => LSAH_SYSTEMS.filter((s) => s.regionIds.includes(regionId))
