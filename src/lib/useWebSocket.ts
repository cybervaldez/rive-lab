import { useEffect, useRef, useState, useCallback } from 'react'

export type WsStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

export interface UseWebSocketReturn {
  status: WsStatus
  send: (data: unknown) => void
  lastEvent: unknown | null
}

const INITIAL_DELAY = 2000
const MAX_DELAY = 30000
const BACKOFF_FACTOR = 2

export function useWebSocket(url: string): UseWebSocketReturn {
  const [status, setStatus] = useState<WsStatus>('disconnected')
  const [lastEvent, setLastEvent] = useState<unknown | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const retriesRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wasConnectedRef = useRef(false)
  const unmountedRef = useRef(false)

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  useEffect(() => {
    unmountedRef.current = false

    function connect() {
      if (unmountedRef.current) return

      const isReconnect = wasConnectedRef.current
      setStatus(isReconnect ? 'reconnecting' : 'connecting')

      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        if (unmountedRef.current) { ws.close(); return }
        retriesRef.current = 0
        wasConnectedRef.current = true
        setStatus('connected')
      }

      ws.onmessage = (event) => {
        if (unmountedRef.current) return
        try {
          const parsed = JSON.parse(event.data)
          setLastEvent(parsed)
        } catch {
          // ignore non-JSON messages
        }
      }

      ws.onclose = () => {
        if (unmountedRef.current) return
        wsRef.current = null
        scheduleReconnect()
      }

      ws.onerror = () => {
        // onclose will fire after onerror, so just let it handle reconnection
      }
    }

    function scheduleReconnect() {
      if (unmountedRef.current) return
      const delay = Math.min(INITIAL_DELAY * Math.pow(BACKOFF_FACTOR, retriesRef.current), MAX_DELAY)
      retriesRef.current++
      const nextStatus: WsStatus = wasConnectedRef.current ? 'reconnecting' : 'disconnected'
      setStatus(nextStatus)
      timerRef.current = setTimeout(connect, delay)
    }

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
  }, [url])

  return { status, send, lastEvent }
}
