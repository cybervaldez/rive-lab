import { useState, useCallback } from 'react'
import { motion } from 'motion/react'
import { actionLabel } from '../lib/inputUtils'
import type { ConnectionState, InputSource } from '../machines/streamOverlay'

export interface ApiEvent {
  id: number
  timestamp: string
  source: string
  type: string
  detail: string
}

interface StreamApiTabProps {
  bindings: Record<string, string>
  connection: ConnectionState
  send: (event: any) => void
  wsSend?: (data: unknown) => void
  wsConnected?: boolean
  events: ApiEvent[]
  logEvent: (source: string, type: string, detail: string) => void
  onClearLog: () => void
}

export function StreamApiTab({ bindings, connection, send, wsSend, wsConnected, events, logEvent, onClearLog }: StreamApiTabProps) {
  const [customJson, setCustomJson] = useState('')
  const [jsonError, setJsonError] = useState('')

  const handleTrigger = useCallback(
    (action: string) => {
      const event = { type: 'TRIGGER_INPUT', action, source: 'api' as InputSource }
      send(event)
      if (wsConnected && wsSend) {
        wsSend(event)
        logEvent('RELAY', 'TRIGGER_INPUT', action)
      } else {
        logEvent('TEST', 'TRIGGER_INPUT', action)
      }
      // Auto-release after 200ms
      setTimeout(() => {
        const clearEvt = { type: 'CLEAR_TRIGGER', action }
        send(clearEvt)
        if (wsConnected && wsSend) wsSend(clearEvt)
      }, 200)
    },
    [send, wsSend, wsConnected, logEvent],
  )

  const handleCustomSend = useCallback(() => {
    setJsonError('')
    if (!customJson.trim()) {
      setJsonError('Enter a JSON event')
      return
    }
    try {
      const parsed = JSON.parse(customJson)
      if (!parsed.type) {
        setJsonError('Event must have a "type" field')
        return
      }
      send(parsed)
      if (wsConnected && wsSend) {
        wsSend(parsed)
        logEvent('RELAY', parsed.type, JSON.stringify(parsed).substring(0, 60))
      } else {
        logEvent('JSON', parsed.type, JSON.stringify(parsed).substring(0, 60))
      }
      setCustomJson('')
    } catch {
      setJsonError('Invalid JSON')
    }
  }, [customJson, send, wsSend, wsConnected, logEvent])

  const serverUrl = connection.url.replace('ws://', 'http://').replace('wss://', 'https://')

  return (
    <div className="stream-api" data-testid="stream-api">
      {/* Connection Status */}
      <div className="stream-api-section" data-testid="stream-api-connection">
        <div className="stream-api-section-header">CONNECTION</div>
        <div className="stream-api-connection-row">
          <span className="stream-api-connection-url" data-testid="stream-api-url">
            {connection.url}
          </span>
          <motion.span
            className={`stream-api-status stream-api-status--${connection.status}`}
            data-testid="stream-api-status"
            animate={
              connection.status === 'reconnecting' || connection.status === 'connecting'
                ? { opacity: [1, 0.5, 1] }
                : { opacity: 1 }
            }
            transition={
              connection.status === 'reconnecting' || connection.status === 'connecting'
                ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0 }
            }
          >
            {connection.status === 'reconnecting' ? 'reconnecting...' : connection.status === 'connecting' ? 'connecting...' : connection.status}
          </motion.span>
        </div>
      </div>

      {/* Test Console */}
      <div className="stream-api-section" data-testid="stream-api-console">
        <div className="stream-api-section-header">TEST CONSOLE</div>
        <div className="stream-api-triggers" data-testid="stream-api-triggers">
          {Object.keys(bindings).map((action) => (
            <button
              key={action}
              className="demo-btn stream-api-trigger-btn"
              data-testid={`stream-api-trigger-${action}`}
              onClick={() => handleTrigger(action)}
            >
              {actionLabel(action)}
            </button>
          ))}
        </div>
        <div className="stream-api-custom">
          <input
            className="stream-api-custom-input"
            data-testid="stream-api-custom-input"
            type="text"
            placeholder='{"type":"TRIGGER_INPUT","action":"INPUT_JUMP","source":"api"}'
            value={customJson}
            onChange={(e) => {
              setCustomJson(e.target.value)
              setJsonError('')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCustomSend()
            }}
          />
          <button
            className="demo-btn"
            data-testid="stream-api-custom-send"
            onClick={handleCustomSend}
          >
            send
          </button>
        </div>
        {jsonError && (
          <span className="stream-api-error" data-testid="stream-api-error">
            {jsonError}
          </span>
        )}
      </div>

      {/* Endpoint Reference */}
      <div className="stream-api-section" data-testid="stream-api-reference">
        <div className="stream-api-section-header">ENDPOINT REFERENCE</div>
        <div className="stream-api-ref-block">
          <code className="stream-api-ref-code" data-testid="stream-api-curl">
            {`curl -X POST ${serverUrl}/api/events \\
  -H "Content-Type: application/json" \\
  -d '{"type":"TRIGGER_INPUT","action":"INPUT_JUMP","source":"api"}'`}
          </code>
        </div>
        <div className="stream-api-ref-block">
          <code className="stream-api-ref-code" data-testid="stream-api-cli">
            {`echo "jump" | npx rive-lab trigger`}
          </code>
        </div>
      </div>

      {/* Event Log */}
      <div className="stream-api-section" data-testid="stream-api-log">
        <div className="stream-api-section-header">
          EVENT LOG
          {events.length > 0 && (
            <button
              className="demo-btn stream-api-clear-btn"
              data-testid="stream-api-clear"
              onClick={onClearLog}
            >
              clear
            </button>
          )}
        </div>
        <div className="stream-api-events" data-testid="stream-api-events">
          {events.length === 0 && (
            <span className="stream-api-empty" data-testid="stream-api-empty">
              No events yet. Use the test console or connect a client.
            </span>
          )}
          {events.map((evt) => (
            <div key={evt.id} className="stream-api-event" data-testid="stream-api-event">
              <span className="stream-api-event-time">{evt.timestamp}</span>
              <span className="stream-api-event-source">{evt.source}</span>
              <span className="stream-api-event-type">{evt.type}</span>
              <span className="stream-api-event-detail">{evt.detail}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
