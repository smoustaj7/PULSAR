// Isolated integration fixture: the actual chat shell, without unrelated dashboard WebGL work.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import '@fontsource-variable/inter'
import '@fontsource-variable/space-grotesk'
import '../src/index.css'
import { Assistant } from '../src/components/Assistant'

const root = createRoot(document.getElementById('root')!)
window.addEventListener('unmount-voice-test', () => root.unmount(), { once: true })
root.render(
  <StrictMode>
    <MotionConfig reducedMotion="always">
      <Assistant metrics="Voice composer integration test" />
    </MotionConfig>
  </StrictMode>,
)
