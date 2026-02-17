import { useState, useEffect, useCallback, useRef } from 'react'
import type { WsStatus } from '../lib/useWebSocket'

interface RoomContent {
  type: 'text' | 'link'
  value: string
  timestamp: number
}

interface StreamCommunityTabProps {
  wsStatus: WsStatus
  wsSend: (data: unknown) => void
  lastEvent: unknown | null
}

export function StreamCommunityTab({ wsStatus, wsSend, lastEvent }: StreamCommunityTabProps) {
  const [roomId, setRoomId] = useState<string | null>(null)
  const [roomStatus, setRoomStatus] = useState<'idle' | 'creating' | 'active' | 'closed'>('idle')
  const [viewerCount, setViewerCount] = useState(0)
  const [content, setContent] = useState<RoomContent | null>(null)
  const [textInput, setTextInput] = useState('')
  const [linkInput, setLinkInput] = useState('')
  const [copied, setCopied] = useState(false)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Handle incoming WS messages for room protocol
  useEffect(() => {
    if (!lastEvent) return
    const msg = lastEvent as any

    if (msg.type === 'ROOM_CREATED') {
      setRoomId(msg.roomId)
      setRoomStatus('active')
      setViewerCount(0)
      setContent(null)
    } else if (msg.type === 'VIEWER_COUNT') {
      setViewerCount(msg.count)
    } else if (msg.type === 'CONTENT_UPDATE') {
      setContent(msg.content)
    } else if (msg.type === 'CONTENT_CLEARED') {
      setContent(null)
    } else if (msg.type === 'ROOM_CLOSED') {
      setRoomId(null)
      setRoomStatus('closed')
      setViewerCount(0)
      setContent(null)
    }
  }, [lastEvent])

  const handleCreateRoom = useCallback(() => {
    if (wsStatus !== 'connected') return
    setRoomStatus('creating')
    wsSend({ type: 'CREATE_ROOM' })
  }, [wsStatus, wsSend])

  const handlePushText = useCallback(() => {
    if (!roomId || !textInput.trim()) return
    wsSend({ type: 'PUSH_CONTENT', roomId, content: { type: 'text', value: textInput.trim() } })
    setTextInput('')
  }, [roomId, textInput, wsSend])

  const handlePushLink = useCallback(() => {
    if (!roomId || !linkInput.trim()) return
    wsSend({ type: 'PUSH_CONTENT', roomId, content: { type: 'link', value: linkInput.trim() } })
    setLinkInput('')
  }, [roomId, linkInput, wsSend])

  const handleClear = useCallback(() => {
    if (!roomId) return
    wsSend({ type: 'CLEAR_CONTENT', roomId })
  }, [roomId, wsSend])

  const handleCloseRoom = useCallback(() => {
    if (!roomId) return
    wsSend({ type: 'CLOSE_ROOM', roomId })
  }, [roomId, wsSend])

  const viewerUrl = roomId ? `${window.location.origin}/view/${roomId}` : ''

  const handleCopyLink = useCallback(() => {
    if (!viewerUrl) return
    navigator.clipboard.writeText(viewerUrl).then(() => {
      setCopied(true)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000)
    })
  }, [viewerUrl])

  const isConnected = wsStatus === 'connected'

  return (
    <div className="stream-community" data-testid="stream-community">
      {/* Room section */}
      <div className="stream-api-section" data-testid="stream-community-room">
        <div className="stream-api-section-header">ROOM</div>

        {roomStatus === 'idle' || roomStatus === 'closed' ? (
          <div className="stream-community-create">
            {!isConnected && (
              <span className="stream-community-hint" data-testid="stream-community-hint">
                Start the WS server to create a room
              </span>
            )}
            <button
              className="demo-btn stream-community-create-btn"
              data-testid="stream-community-create"
              onClick={handleCreateRoom}
              disabled={!isConnected}
            >
              create room
            </button>
          </div>
        ) : roomStatus === 'creating' ? (
          <span className="stream-community-hint">Creating room...</span>
        ) : (
          <div className="stream-community-active">
            <div className="stream-community-room-row">
              <span className="stream-community-room-url" data-testid="stream-community-url">
                {viewerUrl}
              </span>
              <button
                className="demo-btn stream-community-copy-btn"
                data-testid="stream-community-copy"
                onClick={handleCopyLink}
              >
                {copied ? 'copied!' : 'copy link'}
              </button>
            </div>
            <div className="stream-community-room-info">
              <span className="stream-community-viewers" data-testid="stream-community-viewers">
                viewers: {viewerCount}
              </span>
              <button
                className="demo-btn stream-community-close-btn"
                data-testid="stream-community-close"
                onClick={handleCloseRoom}
              >
                close room
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Push content section — only when room is active */}
      {roomStatus === 'active' && (
        <div className="stream-api-section" data-testid="stream-community-push">
          <div className="stream-api-section-header">PUSH CONTENT</div>
          <div className="stream-community-input-row">
            <input
              className="stream-api-custom-input"
              data-testid="stream-community-text-input"
              type="text"
              placeholder="Type a message..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handlePushText() }}
            />
            <button
              className="demo-btn"
              data-testid="stream-community-text-send"
              onClick={handlePushText}
              disabled={!textInput.trim()}
            >
              send
            </button>
          </div>
          <div className="stream-community-input-row">
            <input
              className="stream-api-custom-input"
              data-testid="stream-community-link-input"
              type="text"
              placeholder="https://..."
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handlePushLink() }}
            />
            <button
              className="demo-btn"
              data-testid="stream-community-link-send"
              onClick={handlePushLink}
              disabled={!linkInput.trim()}
            >
              send link
            </button>
          </div>
          <div className="stream-community-actions">
            <button
              className="demo-btn stream-community-clear-btn"
              data-testid="stream-community-clear"
              onClick={handleClear}
              disabled={!content}
            >
              clear all
            </button>
          </div>
        </div>
      )}

      {/* Live preview — only when room is active */}
      {roomStatus === 'active' && (
        <div className="stream-api-section" data-testid="stream-community-preview">
          <div className="stream-api-section-header">LIVE PREVIEW</div>
          <div className="stream-community-preview-content" data-testid="stream-community-preview-content">
            {content ? (
              content.type === 'link' ? (
                <a
                  className="stream-community-preview-link"
                  href={content.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="stream-community-preview-link"
                >
                  {content.value}
                </a>
              ) : (
                <span data-testid="stream-community-preview-text">{content.value}</span>
              )
            ) : (
              <span className="stream-community-preview-empty" data-testid="stream-community-preview-empty">
                No content pushed yet
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
