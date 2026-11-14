import type { IconName } from '../components/Icon'

/** One stop on the tour: the control it points at (its `data-tour` name), and what it does. */
export interface TourStep {
  /** No target: a card in the middle of the screen (the welcome and the send-off). */
  target?: string
  icon: IconName
  title: string
  body: string
}

/**
 * The first-run tour of the dashboard, in the order the eye meets things. A step whose control
 * isn't on screen is skipped: the welcome screen and the status headline never show together,
 * and phones put the views in a bottom bar.
 */
export const tourSteps = (firstName: string): TourStep[] => [
  {
    icon: 'orbit',
    title: `Welcome aboard, ${firstName}`,
    body: 'Here’s a quick tour of your controls: what each one is for and when to use it. It takes about a minute.',
  },
  {
    target: 'start',
    icon: 'rocket',
    title: 'Start here',
    body: 'Log your first reading to see how you’re doing, or try demo data to look around with a week of sample readings first.',
  },
  {
    target: 'status',
    icon: 'gauge',
    title: 'Your status at a glance',
    body: 'This headline sums up all your readings: all clear, watch, or action required. The readings that need attention are listed under it; tap one to see it on your body.',
  },
  {
    target: 'body',
    icon: 'heart',
    title: 'Your body, system by system',
    body: 'Each body system lights up green, amber or red from your readings. Tap the model to open it full screen, then tap a system to see its readings and what NASA says about it.',
  },
  {
    target: 'log',
    icon: 'plus',
    title: 'Log a reading',
    body: 'Tap + whenever you measure something: heart rate, blood pressure, sleep, mood and more. Each reading is checked against the safe range for where you are.',
  },
  {
    target: 'report',
    icon: 'send',
    title: 'Report to ground',
    body: 'Builds a summary of your last week for your flight surgeon on Earth. Check it, copy it, and paste it into your next message home.',
  },
  {
    target: 'nav',
    icon: 'overview',
    title: 'Find your way',
    body: 'Dashboard is home. Trends charts each reading over time. The Field manual says what to do when something is off. The NASA guide holds the research behind it all.',
  },
  {
    target: 'ask',
    icon: 'chat',
    title: 'Ask Dr.Jarvis',
    body: 'Your AI health assistant. Ask about your readings or about health in space; answers come from NASA’s research, with the sources linked.',
  },
  {
    target: 'settings',
    icon: 'user',
    title: 'Your profile',
    body: 'Change your name, mission, location or sex, load demo data, switch astronaut, or replay this tour.',
  },
  {
    icon: 'check',
    title: 'You’re ready',
    body: 'That’s everything. Log a reading whenever you take one, and check back here each day.',
  },
]
