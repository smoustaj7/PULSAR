/**
 * How NASA itself tracks each PULSAR reading, from the LSAH requirement documents, the
 * annual exam (MR089S) and LSAH newsletters. Requirement ids point into `lsah.ts`.
 */
export interface IndicatorNasa {
  protocol: string
  requirementIds: string[]
}

export const INDICATOR_NASA: Record<string, IndicatorNasa> = {
  heartRate: {
    protocol:
      'NASA records heart rate during every treadmill and cycle session for the first 2 weeks of a mission and in each fitness test. The Crew Medical Officer takes vital signs at each periodic health exam.',
    requirementIds: ['hr-monitor', 'cycle-test', 'health-status', 'ecg', 'holter'],
  },
  systolic: {
    protocol:
      'At the yearly physical NASA measures blood pressure lying, sitting and standing, because the change on standing shows how well circulation adapts. In flight it is part of each periodic health exam and fitness test.',
    requirementIds: ['health-status', 'cycle-test', 'physical'],
  },
  diastolic: {
    protocol:
      'Taken in the same cuff reading as systolic pressure: lying, sitting and standing at the yearly physical, and at each periodic health exam in flight.',
    requirementIds: ['health-status', 'physical'],
  },
  glucose: {
    protocol:
      'NASA’s lab tests are drawn after a 12-hour fast with no alcohol for 12 hours. In flight, blood chemistry is drawn around day 180 on 1-year missions, and a weekly food questionnaire tracks what you eat.',
    requirementIds: ['labs', 'nutrition'],
  },
  temperature: {
    protocol:
      'Body temperature is part of the vital signs at each periodic health exam and is monitored during spacewalks. Rashes and skin injuries are photographed and reported at the next private medical conference.',
    requirementIds: ['health-status', 'eva-monitoring', 'skin-photos'],
  },
  spo2: {
    protocol:
      'NASA tests lung volumes and how well the lungs pass oxygen into the blood at the yearly exam and 3 days after landing, and watches cabin CO₂ throughout the mission.',
    requirementIds: ['spirometry', 'co2'],
  },
  cabinCO2: {
    protocol:
      'Fixed sensors track CO₂ across the station. Crew use a handheld CO₂ monitor where air may be stagnant, such as sleep stations and crowded modules.',
    requirementIds: ['co2', 'aqm'],
  },
  sleep: {
    protocol:
      'Sleep comes up at every private medical and psychological conference, and fatigue is one reason for an extra cognitive test. On Artemis II, some crew wear a wristband that records sleep and movement.',
    requirementIds: ['pmc', 'ppc', 'cognition'],
  },
  mood: {
    protocol:
      'NASA schedules a private psychological conference every 2 weeks and a private video call home every week. You can ask for a conference at any time.',
    requirementIds: ['ppc', 'pfc', 'cognition', 'psych-readiness'],
  },
  exercise: {
    protocol:
      'NASA schedules 2.5 hours of exercise a day in flight: 1 hour aerobic and 1.5 hours resistance, including setup and cleanup. Start at least 90 minutes after eating and finish 2 hours before sleep.',
    requirementIds: ['exercise-plan', 'hr-monitor', 'calf', 'dxa'],
  },
}
