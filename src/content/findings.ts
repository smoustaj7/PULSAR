/**
 * What LSAH data and LSAH-linked studies have found, summarized in our own words from the
 * PubMed abstracts of the papers NASA lists for the program and from LSAH newsletters
 * (2017–2026). Every number below appears in those sources.
 */

export type Topic =
  | 'Heart & fitness'
  | 'Eyes, ears & brain'
  | 'Bones & muscles'
  | 'Air & environment'
  | 'Radiation'
  | 'Kidneys & metabolism'
  | 'Sleep & medication'
  | 'Whole-corps health'

export interface Finding {
  id: string
  topic: Topic
  /** Headline number, short enough for a large type size. */
  stat: string
  statLabel: string
  finding: string
  /** What it means for someone using PULSAR. */
  meaning: string
  /** Plain-text citation. */
  source: string
  indicatorIds?: string[]
}

export const FINDINGS: Finding[] = [
  {
    id: 'co2-headache',
    topic: 'Air & environment',
    stat: '2×',
    statLabel: 'odds of a headache for every 1 mmHg more CO₂',
    finding:
      'Across ISS missions from 2001 to 2012, each 1 mmHg rise in CO₂ almost doubled a crewmember’s odds of reporting a headache. Weekly headache rates fell from 4.6% to 1.8% once CO₂ was held at or below 4 mmHg.',
    meaning: 'Log cabin CO₂ each day. Above 3 mmHg, improve airflow and note any headache.',
    source: 'Law J et al., J Occup Environ Med 2014; LSAH Newsletter, 2017',
    indicatorIds: ['cabinCO2'],
  },
  {
    id: 'co2-targets',
    topic: 'Air & environment',
    stat: '3 → 2 mmHg',
    statLabel: 'NASA’s CO₂ targets: ISS, then exploration vehicles',
    finding:
      'Keeping the 7-day average under 4 mmHg holds headache risk below 3%, and under 2.5 mmHg below 1%. NASA now aims for a 3 mmHg 24-hour average on the ISS and 2 mmHg in exploration vehicles. CO₂ has also been linked to congestion reports.',
    meaning: 'PULSAR uses 3 mmHg as the normal limit on the station and 2 mmHg in transit, on the Moon, on Mars and in rovers.',
    source: 'LSAH Newsletter, 2017',
    indicatorIds: ['cabinCO2'],
  },
  {
    id: 'vision',
    topic: 'Eyes, ears & brain',
    stat: '60%',
    statLabel: 'of long-duration astronauts noticed worse near or distant vision',
    finding:
      'After 6-month ISS missions, 7 astronauts had eye changes: optic disc swelling (5), a flattened back of the eye (5), choroidal folds (5) and reduced near vision (6). In a survey of about 300 astronauts, 29% on short missions and 60% on long ones noticed their vision get worse. Some changes lasted years.',
    meaning: 'Report any blur or change in near vision at your private medical conference. NASA checks vision on days 30 and 90.',
    source: 'Mader TH et al., Ophthalmology 2011',
  },
  {
    id: 'sans',
    topic: 'Eyes, ears & brain',
    stat: '15%',
    statLabel: 'of ISS crew developed optic disc swelling',
    finding:
      'In 2017 NASA renamed this risk spaceflight-associated neuro-ocular syndrome (SANS). By then 28 crewmembers had at least one related eye change. The leading explanation is the headward fluid shift in microgravity.',
    meaning: 'Eye exams are scheduled in flight for this reason. Headaches and vision changes are worth reporting together.',
    source: 'LSAH Newsletter, 2019',
  },
  {
    id: 'hearing',
    topic: 'Eyes, ears & brain',
    stat: '3 of 45',
    statLabel: 'ISS crew had a mission-related hearing shift, and all recovered',
    finding:
      'Each hearing test is compared with your first NASA audiogram, focusing on 2–4 kHz, where noise damage shows first. Across Expeditions 1 to 47, only 3 of 45 ISS crew had a significant shift, and all resolved on retest after landing.',
    meaning: 'Wear hearing protection near loud equipment. Noise monitoring and hearing tests are on the flight schedule.',
    source: 'LSAH Newsletter, 2017',
  },
  {
    id: 'injuries',
    topic: 'Bones & muscles',
    stat: '219',
    statLabel: 'in-flight musculoskeletal injuries on record',
    finding:
      'Hands were hurt most often, mainly abrasions and small cuts. Moving between modules, exercise and spacesuit parts were the leading causes. On the ISS, exercise is the most common source of injury (0.003 per day), and suit contact caused 0.26 injuries per spacewalk.',
    meaning: 'Warm up, check exercise hardware before loading it, and report even minor injuries.',
    source: 'Scheuring RA et al., Aviat Space Environ Med 2009',
    indicatorIds: ['exercise'],
  },
  {
    id: 'back',
    topic: 'Bones & muscles',
    stat: '6 of 6',
    statLabel: 'crew had a flatter lower back after 6 months',
    finding:
      'Scans before and after flight tied the flattening to shrinking of the multifidus, a deep spine muscle, not to disc swelling. The only two crew with chronic low back pain a year later had spine irregularities before flight.',
    meaning: 'Core and back exercises matter as much as legs. Report back pain early.',
    source: 'LSAH Newsletter, 2018',
    indicatorIds: ['exercise'],
  },
  {
    id: 'landing',
    topic: 'Bones & muscles',
    stat: '32%',
    statLabel: 'of 84 crew were injured landing in Soyuz, mostly bruises',
    finding: '21% had bruises or abrasions, 6% minor injuries and 5% moderate ones, such as neck soft-tissue strain.',
    meaning: 'Landing loads hit a deconditioned body: one more reason to keep exercising until the end of the mission.',
    source: 'LSAH Newsletter, 2023',
    indicatorIds: ['exercise'],
  },
  {
    id: 'flywheel',
    topic: 'Bones & muscles',
    stat: '400 lb',
    statLabel: 'load the Artemis Orion flywheel can produce',
    finding:
      'Apollo crews had a 2-pound friction rope device, used up to 30 minutes twice a day. Orion’s flywheel uses inertia to match resistance to your effort through the whole movement, supports squats, deadlifts and aerobic work, and logs every session.',
    meaning: 'Even in a small capsule, daily exercise stays part of the plan.',
    source: 'LSAH Newsletter, 2026',
    indicatorIds: ['exercise'],
  },
  {
    id: 'cardiac-screen',
    topic: 'Heart & fitness',
    stat: '0 / 100',
    statLabel: 'coronary calcium limits proposed for selection and for long missions',
    finding:
      'Selection gave NASA a corps with lower heart risk than the general population, but older tests could not rule out coronary disease for long missions. The authors proposed excluding candidates with any coronary calcium and long-duration crew with a score above 100. A high CRP should prompt prevention, not disqualification.',
    meaning: 'A heart event far from Earth would be serious, so screening before flight is strict. Track blood pressure and resting heart rate in flight.',
    source: 'Hamilton DR et al., Aviat Space Environ Med 2005 and 2006',
    indicatorIds: ['heartRate', 'systolic', 'diastolic'],
  },
  {
    id: 'clots',
    topic: 'Heart & fitness',
    stat: 'Over half',
    statLabel: 'of 11 crew in a study had stalled or reversed neck-vein flow in flight',
    finding:
      'A neck-vein clot was found on the ISS during a research ultrasound. In 11 crew, the jugular vein widened and its pressure rose in flight, and flow stalled or reversed in more than half. NASA now tracks clots as a concern and screens with vein ultrasound.',
    meaning: 'Report new swelling or pain in your neck, arms or legs right away.',
    source: 'LSAH Newsletter, 2021',
  },
  {
    id: 'motion-sickness',
    topic: 'Heart & fitness',
    stat: '71%',
    statLabel: 'of Shuttle crew had space motion sickness',
    finding: 'Among 125 crew, aerobic fitness (VO₂max of about 44 to 47 in every group) did not predict who got motion sickness.',
    meaning: 'Being fit won’t prevent motion sickness. Expect it in the first days.',
    source: 'Jennings RT et al., Aviat Space Environ Med 1988',
  },
  {
    id: 'medication',
    topic: 'Sleep & medication',
    stat: '94%',
    statLabel: 'of Shuttle crew took medication in flight',
    finding:
      'Of 219 crew flights, 47% included medicine for space motion sickness and 45% for sleep problems, and fewer for headache, backache and congestion. Motion sickness drugs were used in the first 2 days. Sleep and congestion drugs were used throughout.',
    meaning: 'Trouble sleeping is common in flight. Log your sleep honestly so it can be managed.',
    source: 'Putcha L et al., Aviat Space Environ Med 1999',
    indicatorIds: ['sleep'],
  },
  {
    id: 'promethazine',
    topic: 'Sleep & medication',
    stat: '<5%',
    statLabel: 'felt sedated by promethazine in flight, vs 60–73% on the ground',
    finding: 'Injected promethazine was used to treat space motion sickness in 21 crew. Only one felt sedated, with no effect on operations.',
    meaning: 'Drugs can act differently in space. Take them as your flight surgeon directs.',
    source: 'Bagian JP, Ward DF, J Clin Pharmacol 1994',
  },
  {
    id: 'kidney',
    topic: 'Kidneys & metabolism',
    stat: '↑ after landing',
    statLabel: 'stone-forming salts in urine',
    finding:
      'Astronauts who formed kidney stones had more supersaturated stone-forming salts in their urine, and many crew showed the same change right after landing, so the risk rises after flight.',
    meaning: 'Drink enough water, especially around landing. Prevention can include diet changes, more fluid or medicine.',
    source: 'Pietrzyk RA et al., Aviat Space Environ Med 2007',
    indicatorIds: ['glucose'],
  },
  {
    id: 'thyroid',
    topic: 'Kidneys & metabolism',
    stat: '134',
    statLabel: 'astronauts’ thyroid tests rose after drinking iodine-treated water',
    finding:
      'Iodine used to disinfect spacecraft water raised TSH, a thyroid signal, for a while. Once the water system was changed, TSH no longer rose, and there was no lasting increase in thyroid disease.',
    meaning: 'One reason water quality is checked throughout a mission.',
    source: 'McMonigal KA et al., Aviat Space Environ Med 2000',
  },
  {
    id: 'radiation-dose',
    topic: 'Radiation',
    stat: '0.5 mSv',
    statLabel: 'a day on the ISS, vs about 2.4 mSv a year on Earth',
    finding:
      'Beyond low Earth orbit, about 1 mSv a day or more is expected, and about 0.5 mSv a day on the lunar surface, where the Moon gives some shielding. NASA’s career limit is 600 mSv of effective dose.',
    meaning: 'Carry your dosimeter at all times and follow shelter procedures during solar particle events.',
    source: 'LSAH Newsletter, 2023',
  },
  {
    id: 'cataracts',
    topic: 'Radiation',
    stat: '>8 mSv',
    statLabel: 'lens dose linked to more and earlier cataracts',
    finding:
      'Among 295 astronauts, those whose eye lens received more than 8 mSv had more cataracts, appearing earlier. Cataracts were also more common in astronauts than in military aviators, and usually began in a different part of the lens.',
    meaning: 'Even fairly low space radiation doses may matter for the eyes. The lens is graded at every yearly eye exam.',
    source: 'Cucinotta FA et al., Radiat Res 2001; Jones JA et al., Aviat Space Environ Med 2007',
  },
  {
    id: 'mortality',
    topic: 'Whole-corps health',
    stat: '16 of 20',
    statLabel: 'astronaut deaths from 1959 to 1991 were accidents',
    finding:
      'Deaths from heart disease, cancer and other illness were no different from matched ground employees, but accidental deaths were far higher. Coronary deaths were 53% lower than expected.',
    meaning: 'Over a career, accidents have been the biggest risk, not chronic disease.',
    source: 'Peterson LE et al., Radiat Res 1993; Hamm PB et al., Aviat Space Environ Med 2000',
  },
  {
    id: 'cancer',
    topic: 'Whole-corps health',
    stat: '20 of 65',
    statLabel: 'astronaut deaths were from cancer, as of 2017 (27 from accidents)',
    finding:
      'Astronaut cancer death rates were not significantly different from their comparison group, and both were below the general population. Screening starts earlier for astronauts: prostate at 40, and mammography from selection.',
    meaning: 'The yearly exam continues for life. It is how these numbers are known.',
    source: 'Hamm PB et al., Aviat Space Environ Med 1998; LSAH Newsletter, 2019',
  },
  {
    id: 'risk-survey',
    topic: 'Whole-corps health',
    stat: '60',
    statLabel: 'space medicine experts rated the risks of 30–90 day missions',
    finding: 'They judged skin problems the most likely medical events but low impact, and circulatory disease the least likely but most serious.',
    meaning: 'Small problems are common and big ones rare, which is why routine logging and early reporting matter.',
    source: 'Billica RD et al., Aviat Space Environ Med 1996',
  },
]

export const TOPICS = [...new Set(FINDINGS.map((f) => f.topic))]

export const findingsById: Record<string, Finding> = Object.fromEntries(FINDINGS.map((f) => [f.id, f]))
export const findingsForIndicator = (indicatorId: string) => FINDINGS.filter((f) => f.indicatorIds?.includes(indicatorId))
