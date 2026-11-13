/**
 * NASA's Lifetime Surveillance of Astronaut Health (LSAH), rewritten in plain words from the
 * program's own material on the NASA Life Sciences Portal (read 2026-11-08):
 * - the LSAH overview and research-details pages,
 * - the 76 Medical Requirements Integration Documents (MRIDs, JSC 28913) behind the ten body
 *   systems, which give what each check measures, why, when and how to prepare,
 * - the Annual Medical Examinations requirement (MR089S).
 * Schedules use NASA's notation translated to words: L- is before launch, FD/L+ is flight day,
 * R- is before landing and R+ is after landing. Codes are NASA's requirement numbers.
 */

export type Phase = 'before' | 'inflight' | 'after'

export const PHASE_LABEL: Record<Phase, string> = {
  before: 'Before flight',
  inflight: 'In flight',
  after: 'After landing',
}

export interface PhaseTiming {
  phase: Phase
  text: string
  /**
   * Rough position for sorting: days before launch (negative) for `before`, days after
   * landing for `after`. Unused in flight, where the schedule module has exact flight days.
   */
  at?: number
}

export interface Requirement {
  id: string
  /** NASA's requirement number, e.g. MR080L or MEDB 7.4. */
  code: string
  systemId: string
  title: string
  measures: string
  purpose: string
  when: PhaseTiming[]
  /** How to prepare, or rules NASA attaches to the test. */
  prep?: string
  /** PULSAR readings this check relates to. */
  indicatorIds?: string[]
}

export interface LsahSystem {
  id: string
  label: string
  summary: string
  /** Number of requirement documents NASA files under this system (some sit under two). */
  documents: number
  /** PULSAR body regions that track part of this system. */
  regionIds: string[]
}

export const LSAH_SYSTEMS: LsahSystem[] = [
  {
    id: 'behavioral',
    label: 'Behavioral Health & Performance',
    summary: 'Psychological readiness, cognition and private support calls before, during and after flight.',
    documents: 6,
    regionIds: ['brain'],
  },
  {
    id: 'musculoskeletal',
    label: 'Bone, Muscle & Exercise',
    summary: 'Bone density, strength and fitness tests that show whether the exercise countermeasures work.',
    documents: 12,
    regionIds: ['musculoskeletal'],
  },
  {
    id: 'cardiovascular',
    label: 'Cardiovascular',
    summary: 'Heart rhythm, blood pressure and aerobic capacity, including how you tolerate standing after flight.',
    documents: 3,
    regionIds: ['cardiovascular'],
  },
  {
    id: 'environmental',
    label: 'Environmental Health',
    summary: 'Air, water, microbes, CO₂ and noise inside the spacecraft, kept within crew exposure limits.',
    documents: 12,
    regionIds: ['respiratory'],
  },
  {
    id: 'eva',
    label: 'Spacewalks (EVA)',
    summary: 'Suit fitness, oxygen prebreathe against decompression sickness, and checks around each spacewalk.',
    documents: 4,
    regionIds: [],
  },
  {
    id: 'immunology',
    label: 'Immunology',
    summary: 'Infection screening before flight and follow-up of skin problems and immune changes in flight.',
    documents: 6,
    regionIds: ['immune'],
  },
  {
    id: 'neurology',
    label: 'Neurology',
    summary: 'Balance, hearing and brain imaging, including how the senses re-adapt to gravity.',
    documents: 5,
    regionIds: ['brain'],
  },
  {
    id: 'nutrition',
    label: 'Nutrition',
    summary: 'Whether energy, protein, vitamin and mineral intake keep up with the body’s needs in flight.',
    documents: 1,
    regionIds: ['metabolic'],
  },
  {
    id: 'radiation',
    label: 'Radiation',
    summary: 'Personal and area dosimeters, and blood tests that estimate dose, against cosmic rays and solar storms.',
    documents: 11,
    regionIds: [],
  },
  {
    id: 'clinical',
    label: 'Therapeutics & Clinical Care',
    summary: 'Physicals, lab work, eye exams, ultrasound and the private medical calls that follow your health in flight.',
    documents: 21,
    regionIds: ['metabolic', 'respiratory'],
  },
]

/** Unique requirement documents in NASA's MRID collection (the per-system counts overlap). */
export const LSAH_DOCUMENT_COUNT = 76

export const REQUIREMENTS: Requirement[] = [
  // Behavioral health & performance
  {
    id: 'psych-readiness',
    code: 'MEDB 7.1',
    systemId: 'behavioral',
    title: 'Psychological readiness check',
    measures: 'A conversation with a behavioral health specialist about your readiness, recent life events and the support you and your crew will have.',
    purpose: 'Confirm you are ready to fly and set up the psychological support you will use in flight.',
    when: [{ phase: 'before', text: 'About 12 months, 8–6 months and 3–1 months before launch, 60 minutes each.', at: -365 }],
    prep: 'The last session is held as close as possible to your final departure for launch.',
    indicatorIds: ['mood'],
  },
  {
    id: 'cognition',
    code: 'MEDB 7.4',
    systemId: 'behavioral',
    title: 'Cognitive assessment (WinSCAT)',
    measures: 'Memory, attention, reasoning and spatial processing, on a 30-minute laptop test.',
    purpose: 'Spot slowed thinking after a head injury, decompression sickness, a contaminated atmosphere, high CO₂ or fatigue.',
    when: [
      { phase: 'before', text: 'Practice sessions from about 13 months before launch, then baseline sessions.', at: -390 },
      { phase: 'inflight', text: 'Monthly, and after any toxic exposure, low-oxygen event or injury. You can also take it before risky tasks such as a spacewalk or docking.' },
      { phase: 'after', text: 'About 30 days after landing, to confirm you are back to baseline.', at: 30 },
    ],
    prep: 'A red-flagged session is repeated within 24 hours. A second red flag goes to the crew surgeon and psychologist.',
    indicatorIds: ['sleep', 'mood'],
  },
  {
    id: 'ppc',
    code: 'MR031L',
    systemId: 'behavioral',
    title: 'Private psychological conference',
    measures: 'A private 15-minute call with a behavioral health specialist about mood, sleep, workload, crew dynamics and working with the ground.',
    purpose: 'Catch behavioral health problems early and adjust your support.',
    when: [{ phase: 'inflight', text: 'Every 2 weeks. You, the commander, the crew surgeon or the flight director can request one at any time.' }],
    indicatorIds: ['mood', 'sleep'],
  },
  {
    id: 'pfc',
    code: 'MR032L',
    systemId: 'behavioral',
    title: 'Private family conference',
    measures: 'An unmonitored two-way video call home, at least 15 minutes long.',
    purpose: 'Staying connected to family and friends protects mood over long missions.',
    when: [{ phase: 'inflight', text: 'Weekly, plus holidays and family events such as birthdays and anniversaries.' }],
    indicatorIds: ['mood'],
  },

  // Bone, muscle & exercise
  {
    id: 'exercise-plan',
    code: 'MR082L',
    systemId: 'musculoskeletal',
    title: 'Daily exercise plan',
    measures: 'Sessions per week, and on each device: treadmill speed, harness load and heart rate; cycle work rate; resistance sets, reps and load.',
    purpose: 'Exercise is the main protection against bone, muscle and heart deconditioning. NASA records whether the prescription is followed.',
    when: [
      { phase: 'before', text: 'Training on flight-identical equipment from about 18 months before launch.', at: -540 },
      { phase: 'inflight', text: '2.5 hours every day: 1 hour aerobic (treadmill or cycle) and 1.5 hours resistance, including setup and cleanup.' },
    ],
    prep: 'Start at least 90 minutes after a meal and finish at least 2 hours before sleep. You can split it into a 1-hour and a 1.5-hour session.',
    indicatorIds: ['exercise', 'heartRate'],
  },
  {
    id: 'hr-monitor',
    code: 'MR019L',
    systemId: 'musculoskeletal',
    title: 'Heart rate monitoring during exercise',
    measures: 'Heart rate and elapsed time during treadmill and cycle sessions.',
    purpose: 'Keep exercise at the right effort and give trainers data to adjust your prescription.',
    when: [
      { phase: 'before', text: 'Worn for 2 weeks of treadmill and cycle sessions, about 45 to 15 days before launch.', at: -45 },
      { phase: 'inflight', text: 'Every treadmill and cycle session for the first 2 weeks, then during fitness tests.' },
      { phase: 'after', text: 'When the crew surgeon asks for it.', at: 1 },
    ],
    indicatorIds: ['heartRate', 'exercise'],
  },
  {
    id: 'cycle-test',
    code: 'MR080L',
    systemId: 'musculoskeletal',
    title: 'Cycle ergometer fitness test',
    measures: 'ECG, heart rate, blood pressure, perceived effort and peak oxygen uptake (VO₂ peak, your aerobic capacity).',
    purpose: 'Track aerobic fitness before, during and after flight, and confirm readiness before a spacewalk.',
    when: [
      { phase: 'before', text: 'Yearly for active astronauts, plus preflight tests.', at: -180 },
      { phase: 'inflight', text: 'Flight day 14, flight day 75 and about 2 weeks before landing. Also before a spacewalk if requested.' },
      { phase: 'after', text: '5 and 30 days after landing.', at: 5 },
    ],
    prep: 'Wear workout clothes. Blood pressure and ECG are taken after 5 minutes lying down and 3 minutes seated.',
    indicatorIds: ['heartRate', 'systolic'],
  },
  {
    id: 'handgrip',
    code: 'MR081L',
    systemId: 'musculoskeletal',
    title: 'Handgrip and pinch strength',
    measures: 'Grip and pinch strength of both hands, and grip endurance.',
    purpose: 'Spacesuit gloves tire the hands, so NASA tracks hand strength for spacewalks.',
    when: [
      { phase: 'before', text: 'Training about a year before launch.', at: -365 },
      { phase: 'inflight', text: 'Flight day 14, then every 30 days.' },
    ],
    prep: 'Three 5-second maximum squeezes per hand, with 60 seconds of rest between each.',
  },
  {
    id: 'calf',
    code: 'MEDB 5.4',
    systemId: 'musculoskeletal',
    title: 'Calf volume',
    measures: 'Calf size, measured with a fitted stocking-type device made for you.',
    purpose: 'Calf muscles shrink in microgravity. Measuring them guides your in-flight exercise.',
    when: [
      { phase: 'before', text: 'Device fitted about 6 months before launch.', at: -180 },
      { phase: 'inflight', text: 'From flight day 14, every 2 weeks.' },
    ],
    indicatorIds: ['exercise'],
  },
  {
    id: 'dxa',
    code: 'MR035L',
    systemId: 'musculoskeletal',
    title: 'Bone density scan (DXA)',
    measures: 'Bone mineral density of the whole body, hips, spine, heel and wrist.',
    purpose: 'Track bone loss and recovery, and target rehabilitation after landing.',
    when: [
      { phase: 'before', text: 'About 21–18 months and 6–1 months before launch.', at: -600 },
      { phase: 'after', text: '5 to 30 days after landing, then repeated until within about 2% of your baseline.', at: 5 },
    ],
    indicatorIds: ['exercise'],
  },
  {
    id: 'functional-fitness',
    code: 'MR078L',
    systemId: 'musculoskeletal',
    title: 'Functional fitness test',
    measures: 'Sit-and-reach, cone agility, push-ups, pull-ups, crunches, single-leg stand, leg press and grip.',
    purpose: 'Guide your training and show how well the countermeasures worked.',
    when: [
      { phase: 'before', text: 'About 6 months and 45–30 days before launch.', at: -180 },
      { phase: 'after', text: '5–7 and 30 days after landing.', at: 5 },
    ],
    prep: 'No maximal exercise in the 4 hours before and no food in the 90 minutes before. The test stops for fatigue, pain or dizziness on standing.',
  },
  {
    id: 'recon',
    code: 'MR026L',
    systemId: 'musculoskeletal',
    title: 'Postflight reconditioning',
    measures: 'Your progress through a supervised program of stretching, strength, balance and aerobic work.',
    purpose: 'Help the body re-adapt to gravity safely.',
    when: [{ phase: 'after', text: '2 hours on every duty day for the first 45 days after landing.', at: 0 }],
  },

  // Cardiovascular
  {
    id: 'ecg',
    code: 'MR011L',
    systemId: 'cardiovascular',
    title: 'Resting 12-lead ECG',
    measures: 'Heart rhythm from 10 electrodes while you lie still for 15 minutes.',
    purpose: 'Compare your heart rhythm before and after a long flight.',
    when: [
      { phase: 'before', text: 'Between about 9 months and 10 days before launch.', at: -270 },
      { phase: 'after', text: 'Within 3 days of landing.', at: 0 },
    ],
    prep: 'No caffeine or alcohol for 12 hours before.',
    indicatorIds: ['heartRate'],
  },
  {
    id: 'holter',
    code: 'MR071L',
    systemId: 'cardiovascular',
    title: '24-hour Holter ECG',
    measures: 'A full day of ECG from a wearable recorder.',
    purpose: 'Set your rhythm baseline and screen for arrhythmia before flight.',
    when: [{ phase: 'before', text: 'Within a year before launch.', at: -365 }],
    indicatorIds: ['heartRate'],
  },

  // Environmental health
  {
    id: 'co2',
    code: 'MR039L',
    systemId: 'environmental',
    title: 'Carbon dioxide checks',
    measures: 'CO₂ partial pressure (ppCO₂), with a handheld monitor where fixed sensors don’t reach.',
    purpose: 'CO₂ builds up where air doesn’t move, such as sleep stations and crowded modules.',
    when: [{ phase: 'inflight', text: 'As needed, wherever CO₂ may be high.' }],
    indicatorIds: ['cabinCO2', 'spo2'],
  },
  {
    id: 'aqm',
    code: 'MR091L',
    systemId: 'environmental',
    title: 'Air quality monitor',
    measures: 'Volatile organic compounds in the cabin air.',
    purpose: 'Keep chemical exposure within crew limits.',
    when: [{ phase: 'inflight', text: 'Runs automatically every 73 hours.' }],
    indicatorIds: ['cabinCO2'],
  },
  {
    id: 'grab-samples',
    code: 'MR036L',
    systemId: 'environmental',
    title: 'Air grab samples',
    measures: 'Air samples sent to Earth and analyzed for volatile organic compounds.',
    purpose: 'Confirm exposure levels with laboratory analysis.',
    when: [{ phase: 'inflight', text: 'Every 45 days in each major module.' }],
  },
  {
    id: 'combustion',
    code: 'MR008L',
    systemId: 'environmental',
    title: 'Combustion products check',
    measures: 'Carbon monoxide, hydrogen chloride and hydrogen cyanide in the air.',
    purpose: 'Decide when masks can come off after a suspected fire or overheating.',
    when: [{ phase: 'inflight', text: 'After a suspected fire or overheating, and during cleanup.' }],
  },
  {
    id: 'water',
    code: 'MR054L',
    systemId: 'environmental',
    title: 'Drinking water quality',
    measures: 'Chemical contaminants and microbes in the drinking water supply.',
    purpose: 'Make sure the water is safe to drink.',
    when: [{ phase: 'inflight', text: 'Samples from the water dispenser on a regular schedule.' }],
  },
  {
    id: 'microbes',
    code: 'MR052L',
    systemId: 'environmental',
    title: 'Air and surface microbes',
    measures: 'Bacteria and fungi in the cabin air and on surfaces.',
    purpose: 'Keep the closed habitat microbiologically safe.',
    when: [{ phase: 'inflight', text: 'Around each crew handover, within 30 days of a returning crew.' }],
    prep: 'Colony counts are read 5 days after sampling.',
  },
  {
    id: 'noise',
    code: 'MR084L',
    systemId: 'environmental',
    title: 'Noise exposure monitoring',
    measures: 'Noise every minute over 24 hours from a monitor you wear, plus spot surveys around the station.',
    purpose: 'Protect your hearing and guide hearing protection.',
    when: [
      { phase: 'before', text: 'Training, and fitting custom earplugs.', at: -270 },
      { phase: 'inflight', text: 'On or before flight day 21, mid-mission, then every 60 days.' },
    ],
  },

  // Spacewalks
  {
    id: 'eva-monitoring',
    code: 'MR020L',
    systemId: 'eva',
    title: 'Spacewalk medical monitoring',
    measures: 'Before and after: a health check with the crew surgeon and CMO. During: heart rate and ECG, suit pressure and CO₂, radiation, body temperature and metabolic rate.',
    purpose: 'Catch problems before, during and after a spacewalk.',
    when: [{ phase: 'inflight', text: 'Within 48 hours before suiting up and 24 hours after.' }],
    indicatorIds: ['heartRate', 'temperature'],
  },
  {
    id: 'prebreathe',
    code: 'MR087L',
    systemId: 'eva',
    title: 'Exercise prebreathe',
    measures: 'Heart rate, oxygen uptake and power output while exercising on pure oxygen.',
    purpose: 'Washing nitrogen out of the body lowers the risk of decompression sickness.',
    when: [
      { phase: 'before', text: 'Peak and submaximal cycle tests about 9 months and 45–30 days before launch.', at: -270 },
      { phase: 'inflight', text: 'Before each spacewalk, after a submaximal cycle test and a practice run.' },
    ],
  },
  {
    id: 'arm-ergometry',
    code: 'MR038L',
    systemId: 'eva',
    title: 'Arm ergometry',
    measures: 'Work rate, duration and heart rate on an arm crank.',
    purpose: 'Spacewalks are upper-body work. This checks arm strength and endurance.',
    when: [
      { phase: 'before', text: 'About 90–60 days before launch.', at: -90 },
      { phase: 'inflight', text: 'Before a spacewalk in the Russian Orlan suit.' },
    ],
  },

  // Immunology
  {
    id: 'mrsa',
    code: 'MR021L',
    systemId: 'immunology',
    title: 'MRSA nasal screen',
    measures: 'A nasal swab for antibiotic-resistant staph bacteria.',
    purpose: 'Avoid carrying resistant bacteria into the closed habitat.',
    when: [
      { phase: 'before', text: 'About 9–6 months before launch.', at: -270 },
      { phase: 'after', text: 'Landing day, or day 3.', at: 0 },
    ],
  },
  {
    id: 'tb',
    code: 'MEDB 2.3',
    systemId: 'immunology',
    title: 'Tuberculosis screen',
    measures: 'A skin test or blood test for tuberculosis.',
    purpose: 'Rule out TB that could become active in flight and infect the crew.',
    when: [{ phase: 'before', text: 'On mission assignment.', at: -630 }],
  },
  {
    id: 'skin-photos',
    code: 'MR076L',
    systemId: 'immunology',
    title: 'Skin problem photos',
    measures: 'Photos of rashes, injuries or allergic reactions, with a ruler for scale.',
    purpose: 'Let flight surgeons diagnose and follow skin problems from the ground.',
    when: [
      { phase: 'inflight', text: 'Whenever a skin problem appears. Report it at your next private medical conference, with the time it started.' },
      { phase: 'after', text: 'Landing day or the day after.', at: 0 },
    ],
    indicatorIds: ['temperature'],
  },

  // Neurology
  {
    id: 'balance',
    code: 'MR042L',
    systemId: 'neurology',
    title: 'Balance test',
    measures: 'Balance control and sensory-motor coordination on a moving platform.',
    purpose: 'Measure how quickly your balance re-adapts to gravity after landing.',
    when: [
      { phase: 'before', text: 'A practice session about 9–6 months before launch, then a baseline.', at: -270 },
      { phase: 'after', text: 'In the days after landing.', at: 1 },
    ],
    prep: 'No alcohol and no motion training (centrifuge, training aircraft) in the 24 hours before.',
  },
  {
    id: 'hearing',
    code: 'MR013L/MR086L',
    systemId: 'neurology',
    title: 'Hearing test',
    measures: 'Hearing thresholds from 250 to 10,000 Hz, plus ear-drum tests on the ground.',
    purpose: 'Detect hearing changes from cabin noise.',
    when: [
      { phase: 'before', text: 'About 90–30 days before launch.', at: -90 },
      { phase: 'inflight', text: 'On or before flight day 21 and mid-mission (every 3–4 months on longer missions), within 24 hours after a noise-monitor session.' },
      { phase: 'after', text: 'After landing.', at: 3 },
    ],
    prep: 'In flight, test at a laptop in a quiet spot, ideally the same one each time.',
  },
  {
    id: 'mri',
    code: 'MEDB 1.15',
    systemId: 'neurology',
    title: 'Brain MRI and angiography',
    measures: 'Brain structure and blood vessels.',
    purpose: 'Rule out problems that could cause sudden incapacitation on a long mission.',
    when: [{ phase: 'before', text: 'About 21–18 months before launch.', at: -600 }],
  },

  // Nutrition
  {
    id: 'nutrition',
    code: 'MR016L',
    systemId: 'nutrition',
    title: 'Nutritional assessment',
    measures: 'What you eat (a weekly food questionnaire), blood and urine nutrition markers, and body mass.',
    purpose: 'Make sure energy, protein, vitamin and mineral intake keep up, and spot muscle and bone loss.',
    when: [
      { phase: 'before', text: 'Blood draw, 48-hour urine collection and a diet questionnaire.', at: -180 },
      { phase: 'inflight', text: 'Food questionnaire weekly (10 minutes). Body mass monthly.' },
      { phase: 'after', text: 'Landing day.', at: 0 },
    ],
    indicatorIds: ['glucose'],
  },

  // Radiation
  {
    id: 'dosimeter',
    code: 'MEDB 3.1',
    systemId: 'radiation',
    title: 'Personal dosimeter',
    measures: 'Your cumulative radiation dose.',
    purpose: 'Keep exposure as low as reasonably achievable and track it against NASA’s limits.',
    when: [
      { phase: 'inflight', text: 'Carried at all times, including launch and spacewalks.' },
      { phase: 'after', text: 'Handed back on landing day.', at: 0 },
    ],
  },
  {
    id: 'area-monitors',
    code: 'MR004L/MR094L',
    systemId: 'radiation',
    title: 'Radiation area monitors',
    measures: 'The radiation environment inside the station, including during solar particle events.',
    purpose: 'Map where doses are highest and manage exposure.',
    when: [{ phase: 'inflight', text: 'Continuous. Passive monitors are swapped about every 6 months.' }],
  },
  {
    id: 'biodosimetry',
    code: 'MR003L',
    systemId: 'radiation',
    title: 'Biodosimetry blood test',
    measures: 'Chromosome damage in white blood cells.',
    purpose: 'Estimate whole-body dose biologically, to check the dosimeters and refine risk models.',
    when: [
      { phase: 'before', text: 'A blood sample about 3 months before launch.', at: -90 },
      { phase: 'after', text: 'About 2–4 weeks after landing, and again 6–18 months later.', at: 14 },
    ],
  },

  // Therapeutics & clinical care
  {
    id: 'pmc',
    code: 'MR017L',
    systemId: 'clinical',
    title: 'Private medical conference',
    measures: 'A private 15-minute call with your flight surgeon about your health, workload and living conditions.',
    purpose: 'The main way the ground follows your health in flight.',
    when: [
      {
        phase: 'inflight',
        text: 'Daily for the first 5 days, then weekly. Within 24 hours before and after each spacewalk, and daily for the last 5 days before landing. You can request one at any time.',
      },
    ],
    indicatorIds: ['heartRate', 'systolic', 'temperature', 'sleep', 'mood'],
  },
  {
    id: 'health-status',
    code: 'MR018L',
    systemId: 'clinical',
    title: 'Periodic health status exam',
    measures: 'Vital signs, a physical exam and ear images taken by the Crew Medical Officer (CMO). Blood and urine tests on 1-year missions.',
    purpose: 'Give the crew surgeon a hands-on check of your health in flight.',
    when: [
      { phase: 'before', text: 'Two CMOs per vehicle are trained about 18–15 months before launch.', at: -540 },
      { phase: 'inflight', text: 'Flight days 14–21 and 90, and 3–2 weeks before landing. On 1-year missions also days 180 and 270.' },
    ],
    prep: 'Avoid exercise that makes your muscles sore in the 24 hours before.',
    indicatorIds: ['heartRate', 'systolic', 'diastolic', 'temperature'],
  },
  {
    id: 'body-mass',
    code: 'MR024L',
    systemId: 'clinical',
    title: 'Body mass',
    measures: 'Body mass, on a spring-based mass measurement device, because scales don’t work in microgravity.',
    purpose: 'Track weight changes that reflect diet, muscle and fluid.',
    when: [{ phase: 'inflight', text: 'A baseline in the first week, then monthly.' }],
  },
  {
    id: 'eye-exam',
    code: 'MR014L',
    systemId: 'clinical',
    title: 'Eye exams',
    measures: 'In flight: near and far vision, an Amsler grid and a vision questionnaire, plus retina imaging, ultrasound and OCT. On the ground: the full eye exam and an orbital MRI.',
    purpose: 'Watch for spaceflight-associated neuro-ocular syndrome (SANS): optic disc swelling, a flattened back of the eye and vision shifts.',
    when: [
      { phase: 'before', text: 'MRI about 21–18 months before launch, full exams about 9–6 months before.', at: -600 },
      { phase: 'inflight', text: 'Days 30 and 90, and about 30 days before landing. On 1-year missions also days 180 and 270.' },
      { phase: 'after', text: 'Landing day, then within 3 days.', at: 0 },
    ],
    prep: 'After eye drops that dilate the pupils, NASA rules out flying aircraft for 24 hours.',
  },
  {
    id: 'ultrasound',
    code: 'MR015L',
    systemId: 'clinical',
    title: 'Vein ultrasound',
    measures: 'Veins of the neck, arms and legs.',
    purpose: 'Look for blood clots. A neck-vein clot was found on the ISS during a research scan.',
    when: [
      { phase: 'before', text: 'A full ultrasound survey about 21–18 months before launch.', at: -600 },
      { phase: 'inflight', text: 'On the mission schedule, and whenever needed.' },
      { phase: 'after', text: 'Whenever needed.', at: 1 },
    ],
  },
  {
    id: 'labs',
    code: 'MR010L',
    systemId: 'clinical',
    title: 'Clinical lab tests',
    measures: 'Blood counts, blood chemistry and urinalysis.',
    purpose: 'Judge your fitness to fly and your recovery after landing.',
    when: [
      { phase: 'before', text: 'About 45–30 days and 10 days before launch.', at: -45 },
      { phase: 'after', text: 'Landing day, 3–7 days and 30 days after.', at: 0 },
    ],
    prep: 'Fast for 12 hours and skip alcohol for 12 hours before the blood draw.',
    indicatorIds: ['glucose'],
  },
  {
    id: 'physical',
    code: 'MR009L',
    systemId: 'clinical',
    title: 'Physical exam',
    measures: 'Vital signs and a head-to-toe exam, including a neurological check.',
    purpose: 'Confirm you are ready to fly and track your recovery.',
    when: [
      { phase: 'before', text: 'About 9–6 months before launch.', at: -270 },
      { phase: 'after', text: 'Landing day, day 3, days 7–14 and days 45–60 (return to duty).', at: 0 },
    ],
    indicatorIds: ['heartRate', 'systolic', 'diastolic', 'temperature'],
  },
  {
    id: 'post-checks',
    code: 'MR025L',
    systemId: 'clinical',
    title: 'Daily postflight checks',
    measures: 'A 15-minute health check with the crew surgeon at the start of each duty day.',
    purpose: 'Catch problems early while your body re-adapts to gravity.',
    when: [{ phase: 'after', text: 'Daily for the first week after landing, except day 2.', at: 0 }],
  },
  {
    id: 'spirometry',
    code: 'MR029L',
    systemId: 'clinical',
    title: 'Lung function test',
    measures: 'Lung volumes, and how well your lungs pass oxygen into the blood (diffusion capacity).',
    purpose: 'Compare lung function before and after flight.',
    when: [
      { phase: 'before', text: 'At your annual exam.', at: -365 },
      { phase: 'after', text: '3 days after landing.', at: 3 },
    ],
    indicatorIds: ['spo2'],
  },
  {
    id: 'dental',
    code: 'MR012L',
    systemId: 'clinical',
    title: 'Dental exam',
    measures: 'Teeth, gums and an oral cancer screen, with X-rays as needed.',
    purpose: 'Fix problems well before launch, because dental care in flight is limited.',
    when: [{ phase: 'before', text: 'A panoramic X-ray about 21–18 months before launch, and an exam 90–30 days before.', at: -600 }],
  },
]

export const requirementsById: Record<string, Requirement> = Object.fromEntries(REQUIREMENTS.map((r) => [r.id, r]))
export const systemsById: Record<string, LsahSystem> = Object.fromEntries(LSAH_SYSTEMS.map((s) => [s.id, s]))

export const requirementsForSystem = (systemId: string) => REQUIREMENTS.filter((r) => r.systemId === systemId)

/** LSAH systems that overlap an PULSAR body region. */
export const systemsForRegion = (regionId: string) => LSAH_SYSTEMS.filter((s) => s.regionIds.includes(regionId))

/** Requirements in one phase, in the order they happen. */
export function requirementsInPhase(phase: Phase): { requirement: Requirement; timing: PhaseTiming }[] {
  return REQUIREMENTS.flatMap((r) => r.when.filter((w) => w.phase === phase).map((timing) => ({ requirement: r, timing }))).sort(
    (a, b) => (a.timing.at ?? 0) - (b.timing.at ?? 0),
  )
}

/** The yearly exam every active and retired astronaut is offered (MR089S), for life. */
export const ANNUAL_EXAM: { title: string; text: string }[] = [
  {
    title: 'Hearing',
    text: 'A 10-minute pure-tone test. A shift of 10 dB or more (averaged at 2, 3 and 4 kHz) in either ear means a retest within 30 days, after at least 14 hours of quiet below 85 dBA.',
  },
  {
    title: 'Heart and lungs',
    text: 'A resting 12-lead ECG every year. A treadmill stress test at ages 30, 35 and 40, every 2 years from 40 to 50, then yearly. Spirometry, diffusion capacity and a TB skin test.',
  },
  {
    title: 'Lab work',
    text: 'Blood and urine after a 12-hour fast: blood counts, chemistry, lipids, iron, thyroid and high-sensitivity CRP (plus PSA for men 40 and over). Bone markers every 3 years, with the bone scan.',
  },
  {
    title: 'Eyes',
    text: 'Acuity, refraction, color and depth vision, eye pressure and a dilated retina exam every year. Threshold visual fields and retinal photos every 3 years.',
  },
  { title: 'Dental', text: 'An exam and cleaning every year, and a panoramic X-ray every 5 years.' },
  {
    title: 'Physical',
    text: 'Pulse and blood pressure lying, sitting and standing, temperature, breathing rate, height and weight, then a head-to-toe exam including gait.',
  },
  {
    title: 'Behavioral health',
    text: '15 minutes of questionnaires and a 15-minute interview, within 3 months of your birth month. The annual physical isn’t final until this is done.',
  },
  {
    title: 'Imaging',
    text: 'A bone density scan at the first exam and every 3 years. Mammography every 2 years from 40 to 50, then yearly. A chest X-ray when needed.',
  },
  { title: 'Medical history', text: 'Diagnoses, hospital visits, medications and international travel since your last exam.' },
]

/** What the program does with the data, from NASA's research-details page. */
export const LSAH_PURPOSES = [
  'Clinical care and occupational surveillance for the whole astronaut corps',
  'Active surveillance for conditions of particular concern',
  'Checking that countermeasures such as exercise actually work',
  'Health requirements for new human-rated spacecraft',
  'Finding knowledge gaps for NASA’s Human Research Program',
  'Moving research results into everyday operations',
]

/** Caveats NASA gives for reading LSAH data, in plain words. */
export const LSAH_LIMITATIONS = [
  'It is collected for clinical care, not research, so many results are recorded as “normal” rather than as a number.',
  'Requirements have changed over the decades, so older flights are not always comparable with newer ones.',
  'Tests can differ by vehicle: crew landing in a Soyuz may have had different test dates or tests than Shuttle crew.',
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
    text: 'Exams follow astronauts for life. The LSAH Repository supports approved research with each astronaut’s informed consent.',
  },
]

/** Plain-text record of what this content was built from. */
export const LSAH_SOURCES = [
  'NASA Life Sciences Portal: Lifetime Surveillance of Astronaut Health overview and research details',
  'Medical Requirements Integration Documents (JSC 28913): 76 requirement documents across 10 body systems',
  'Annual Medical Examinations requirement (MR089S)',
  'LSAH newsletters, 2017 to 2026',
  'PubMed abstracts of the 15 journal papers NASA lists for LSAH',
]
