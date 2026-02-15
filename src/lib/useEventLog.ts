import { useCallback, useRef, useState } from 'react'
import type { InspectionEvent } from 'xstate'

export interface EventLogEntry {
  id: number
  timestamp: number
  type: 'event' | 'snapshot'
  label: string
  payload: unknown
}

const MAX_ENTRIES = 200

export function useEventLog() {
  const [entries, setEntries] = useState<EventLogEntry[]>([])
  const nextId = useRef(0)

  const inspect = useCallback((event: InspectionEvent) => {
    if (event.type === '@xstate.event') {
      const eventType = (event.event as any).type as string
      if (eventType?.startsWith('xstate.')) return
      const entry: EventLogEntry = {
        id: nextId.current++,
        timestamp: Date.now(),
        type: 'event',
        label: eventType,
        payload: event.event,
      }
      setEntries((prev) => {
        const next = [...prev, entry]
        return next.length > MAX_ENTRIES ? next.slice(-MAX_ENTRIES) : next
      })
    }

    if (event.type === '@xstate.snapshot') {
      const snapshot = event.snapshot as any
      if (snapshot?.value !== undefined) {
        const value = typeof snapshot.value === 'string'
          ? snapshot.value
          : JSON.stringify(snapshot.value)
        const entry: EventLogEntry = {
          id: nextId.current++,
          timestamp: Date.now(),
          type: 'snapshot',
          label: value,
          payload: snapshot.value,
        }
        setEntries((prev) => {
          const next = [...prev, entry]
          return next.length > MAX_ENTRIES ? next.slice(-MAX_ENTRIES) : next
        })
      }
    }
  }, [])

  const clear = useCallback(() => {
    setEntries([])
  }, [])

  return { entries, inspect, clear }
}
