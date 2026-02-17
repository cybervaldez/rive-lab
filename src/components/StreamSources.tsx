import type { InputSource, SourceState } from '../machines/streamOverlay'

interface StreamSourcesProps {
  sources: Record<InputSource, SourceState>
}

const SOURCE_META: Record<InputSource, { label: string; description: string; available: boolean }> = {
  keyboard: { label: 'Keyboard', description: 'Physical key presses (held-state)', available: true },
  voice: { label: 'Voice', description: 'Web Speech API — say action names', available: false },
  face: { label: 'Face', description: 'MediaPipe face tracking — blink, gaze', available: false },
  api: { label: 'API', description: 'WebSocket event relay — CLI, bots, AI', available: false },
}

export function StreamSources({ sources }: StreamSourcesProps) {
  return (
    <div className="stream-sources" data-testid="stream-sources">
      <div className="stream-sources-header">INPUT SOURCES</div>
      {(Object.keys(SOURCE_META) as InputSource[]).map((key) => {
        const meta = SOURCE_META[key]
        const source = sources[key]
        return (
          <div
            key={key}
            className={`stream-sources-row${source.enabled ? ' stream-sources-row--enabled' : ''}`}
            data-testid={`stream-source-${key}`}
          >
            <div className="stream-sources-row-info">
              <span className="stream-sources-row-label">{meta.label}</span>
              <span className="stream-sources-row-desc">{meta.description}</span>
            </div>
            <div className="stream-sources-row-status">
              {meta.available ? (
                <span
                  className={`stream-sources-badge stream-sources-badge--${source.enabled ? 'on' : 'off'}`}
                  data-testid={`stream-source-status-${key}`}
                >
                  {source.enabled ? 'on' : 'off'}
                </span>
              ) : (
                <span
                  className="stream-sources-badge stream-sources-badge--soon"
                  data-testid={`stream-source-status-${key}`}
                >
                  coming soon
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
