import { MotionConfig } from 'framer-motion'
import App from './App'
import { Toaster } from './components/Toaster'
import { useAccountStore } from './store/useAccountStore'
import { Gate } from './views/Gate'

/** The dashboard for whoever is signed in; otherwise setup or the pick-your-profile screen. */
export default function Root() {
  const activeId = useAccountStore((s) => s.activeId)
  // Keyed by astronaut, so nothing on screen carries over from one to the next.
  if (activeId) return <App key={activeId} />
  return (
    <MotionConfig reducedMotion="user">
      <Gate />
      <Toaster />
    </MotionConfig>
  )
}
