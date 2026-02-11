import { useCallback, useEffect, useRef, useState } from 'react'

const PREFIX = 'instruct-checked:'

function load(key: string): Set<number> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw) return new Set(JSON.parse(raw) as number[])
  } catch {}
  return new Set()
}

export function useChecklist(key: string): [Set<number>, (index: number) => void] {
  const [checked, setChecked] = useState<Set<number>>(() => load(key))
  const prevKey = useRef(key)

  // Re-load from localStorage when key changes (navigating between recipes)
  useEffect(() => {
    if (prevKey.current !== key) {
      prevKey.current = key
      setChecked(load(key))
    }
  }, [key])

  const toggle = useCallback(
    (index: number) => {
      setChecked((prev) => {
        const next = new Set(prev)
        if (next.has(index)) next.delete(index)
        else next.add(index)
        localStorage.setItem(PREFIX + key, JSON.stringify([...next]))
        return next
      })
    },
    [key],
  )

  return [checked, toggle]
}
