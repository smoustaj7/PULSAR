import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import '@fontsource-variable/inter'
import '@fontsource-variable/space-grotesk'
import '@fontsource-variable/jetbrains-mono'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

window.addEventListener('load', () => {
  // Offline support in production builds only (a dev service worker would serve stale modules).
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('Service worker registration failed', err))
  }
  // Trends carries the charts library, so it ships separately from the dashboard. Fetch it once
  // the page has loaded and gone quiet: it then opens at once, and is cached for offline use,
  // without slowing the first screen.
  const prefetch = () => void import('./views/TrendsView')
  if ('requestIdleCallback' in window) requestIdleCallback(prefetch, { timeout: 5000 })
  else setTimeout(prefetch, 2000)
})
