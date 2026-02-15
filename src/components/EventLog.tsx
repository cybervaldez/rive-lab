import { useEffect, useRef } from 'react'
import type { EventLogEntry } from '../lib/useEventLog'

interface EventLogProps {
  entries: EventLogEntry[]
  onClear: () => void
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  const ms = String(d.getMilliseconds()).padStart(3, '0')
  return `${h}:${m}:${s}.${ms}`
}

export function EventLog({ entries, onClear }: EventLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [entries.length])

  return (
    <div className="event-log" data-testid="event-log">
      <div className="event-log-header">
        <span className="t-section-header">&gt; Event Log</span>
        <button
          className="event-log-clear"
          data-testid="event-log-clear"
          onClick={onClear}
        >
          clear
        </button>
      </div>
      <div
        className="event-log-entries"
        data-testid="event-log-entries"
        ref={scrollRef}
      >
        {entries.map((entry) => (
          <div
            key={entry.id}
            className={`event-log-row event-log-row--${entry.type}`}
            data-testid={`event-log-entry-${entry.id}`}
          >
            <span className="event-log-ts">{formatTimestamp(entry.timestamp)}</span>
            <span className="event-log-arrow">
              {entry.type === 'event' ? '\u2190' : '\u2192'}
            </span>
            <span className="event-log-label">{entry.label}</span>
          </div>
        ))}
        {entries.length === 0 && (
          <div className="event-log-empty">no events yet</div>
        )}
      </div>
    </div>
  )
}
