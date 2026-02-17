import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'

interface RoomContent {
  type: 'text' | 'link'
  value: string
  timestamp: number
}

type ViewerStatus = 'connecting' | 'connected' | 'reconnecting' | 'ended' | 'not_found'

export const Route = createFileRoute('/view/$roomId')({
  component: ViewerPage,
})

const WS_URL = `ws://localhost:${import.meta.env.VITE_WS_PORT || '3001'}`
const INITIAL_DELAY = 2000
const MAX_DELAY = 30000
const BACKOFF_FACTOR = 2

function ViewerPage() {
  const { roomId } = Route.useParams()
  const [status, setStatus] = useState<ViewerStatus>('connecting')
  const [content, setContent] = useState<RoomContent | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const retriesRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wasConnectedRef = useRef(false)
  const unmountedRef = useRef(false)
  const terminalRef = useRef(false)

  const connect = useCallback(() => {
    if (unmountedRef.current) return

    const isReconnect = wasConnectedRef.current
    if (!isReconnect) setStatus('connecting')
    else setStatus('reconnecting')

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      if (unmountedRef.current) { ws.close(); return }
      retriesRef.current = 0
      wasConnectedRef.current = true
      ws.send(JSON.stringify({ type: 'JOIN_ROOM', roomId }))
    }

    ws.onmessage = (event) => {
      if (unmountedRef.current) return
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'ROOM_JOINED') {
          setStatus('connected')
          setContent(msg.content || null)
        } else if (msg.type === 'CONTENT_UPDATE') {
          setContent(msg.content)
        } else if (msg.type === 'CONTENT_CLEARED') {
          setContent(null)
        } else if (msg.type === 'ROOM_CLOSED') {
          terminalRef.current = true
          setStatus('ended')
          ws.close()
        } else if (msg.type === 'ROOM_ERROR') {
          terminalRef.current = true
          setStatus('not_found')
          ws.close()
        }
      } catch {
        // ignore non-JSON
      }
    }

    ws.onclose = () => {
      if (unmountedRef.current) return
      wsRef.current = null
      if (terminalRef.current) return
      scheduleReconnect()
    }

    ws.onerror = () => {
      // onclose fires after onerror
    }
  }, [roomId]) // eslint-disable-line react-hooks/exhaustive-deps

  const scheduleReconnect = useCallback(() => {
    if (unmountedRef.current) return
    const delay = Math.min(INITIAL_DELAY * Math.pow(BACKOFF_FACTOR, retriesRef.current), MAX_DELAY)
    retriesRef.current++
    setStatus(wasConnectedRef.current ? 'reconnecting' : 'connecting')
    timerRef.current = setTimeout(connect, delay)
  }, [connect])

  useEffect(() => {
    unmountedRef.current = false
    connect()
    return () => {
      unmountedRef.current = true
      if (timerRef.current) clearTimeout(timerRef.current)
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])

  return (
    <div className="viewer-page" data-testid="viewer-page">
      <div className="viewer-content" data-testid="viewer-content">
        <AnimatePresence mode="wait">
          {status === 'connecting' && (
            <motion.div
              key="connecting"
              className="viewer-status"
              data-testid="viewer-connecting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              Connecting...
            </motion.div>
          )}

          {status === 'reconnecting' && (
            <motion.div
              key="reconnecting"
              className="viewer-status"
              data-testid="viewer-reconnecting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              Reconnecting...
            </motion.div>
          )}

          {status === 'not_found' && (
            <motion.div
              key="not_found"
              className="viewer-status"
              data-testid="viewer-not-found"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              Room not found
            </motion.div>
          )}

          {status === 'ended' && (
            <motion.div
              key="ended"
              className="viewer-status viewer-status--ended"
              data-testid="viewer-ended"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              Stream ended
            </motion.div>
          )}

          {status === 'connected' && !content && (
            <motion.div
              key="waiting"
              className="viewer-waiting"
              data-testid="viewer-waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              Waiting for the streamer...
            </motion.div>
          )}

          {status === 'connected' && content && (
            <motion.div
              key="active"
              className="viewer-active"
              data-testid="viewer-active"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {content.type === 'text' && (
                <p className="viewer-text" data-testid="viewer-text">
                  {content.value}
                </p>
              )}
              {content.type === 'link' && (
                <a
                  className="viewer-link"
                  data-testid="viewer-link"
                  href={content.value}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {content.value}
                </a>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="viewer-footer" data-testid="viewer-footer">
        powered by <span className="viewer-footer-brand">rive-lab</span>
      </footer>
    </div>
  )
}
