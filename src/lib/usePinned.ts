import { useCallback, useState } from 'react'

const STORAGE_KEY = 'panel-pinned'

function getInitialPinned(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

export function usePinned(): [boolean, () => void] {
  const [isPinned, setIsPinned] = useState(getInitialPinned)

  const togglePinned = useCallback(() => {
    setIsPinned((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }, [])

  return [isPinned, togglePinned]
}
