import { useEffect, useState } from 'react'

/** Current time that re-renders every `intervalMs` (default 1 min), so "due" lists and mission day stay fresh. */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
