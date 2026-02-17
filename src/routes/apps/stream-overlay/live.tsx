import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useMachine } from '@xstate/react'
import { streamOverlayMachine } from '../../../machines/streamOverlay'
import { StreamLiveView } from '../../../components/StreamLiveView'
import { useWebSocket } from '../../../lib/useWebSocket'

export const Route = createFileRoute('/apps/stream-overlay/live')({
  component: StreamLivePage,
})

function StreamLivePage() {
  const [snapshot, send] = useMachine(streamOverlayMachine)
  const bindings = snapshot.context.bindings
  const activeInputs = snapshot.context.activeInputs
  const boundCodes = new Set(Object.values(bindings))
  const wsUrl = snapshot.context.connection.url

  // WebSocket — auto-connect, apply received events silently
  const ws = useWebSocket(wsUrl)

  useEffect(() => {
    if (!ws.lastEvent) return
    const evt = ws.lastEvent as any
    if (evt.type === 'TRIGGER_INPUT' || evt.type === 'CLEAR_TRIGGER' || evt.type === 'KEY_DOWN' || evt.type === 'KEY_UP') {
      send(evt)
    }
  }, [ws.lastEvent, send])

  // Set transparent background on mount, restore on unmount
  useEffect(() => {
    document.documentElement.classList.add('stream-live-page')
    return () => document.documentElement.classList.remove('stream-live-page')
  }, [])

  // Keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (boundCodes.has(e.code)) e.preventDefault()
      send({ type: 'KEY_DOWN', code: e.code })
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (boundCodes.has(e.code)) e.preventDefault()
      send({ type: 'KEY_UP', code: e.code })
    }
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [send, boundCodes])

  return (
    <div className="stream-live" data-testid="stream-live">
      <StreamLiveView activeInputs={activeInputs} bindings={bindings} />
    </div>
  )
}
