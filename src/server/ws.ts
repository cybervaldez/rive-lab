import { WebSocketServer, WebSocket } from 'ws'
import { createServer, IncomingMessage, ServerResponse } from 'http'
import { randomBytes } from 'crypto'

const PORT = parseInt(process.env.WS_PORT || '3001', 10)

// --- Room types ---

interface RoomContent {
  type: 'text' | 'link'
  value: string
  timestamp: number
}

interface Room {
  id: string
  streamer: WebSocket | null
  viewers: Set<WebSocket>
  content: RoomContent | null
}

const rooms = new Map<string, Room>()

function generateRoomId(): string {
  let id: string
  do {
    id = randomBytes(3).toString('hex')
  } while (rooms.has(id))
  return id
}

function broadcastToViewers(room: Room, msg: object) {
  const data = JSON.stringify(msg)
  room.viewers.forEach((v) => {
    if (v.readyState === WebSocket.OPEN) v.send(data)
  })
}

function sendViewerCount(room: Room) {
  if (room.streamer && room.streamer.readyState === WebSocket.OPEN) {
    room.streamer.send(JSON.stringify({ type: 'VIEWER_COUNT', count: room.viewers.size }))
  }
}

function closeRoom(room: Room) {
  broadcastToViewers(room, { type: 'ROOM_CLOSED' })
  rooms.delete(room.id)
  console.log(`[ROOM] closed ${room.id}`)
}

// Track room membership for cleanup on disconnect
const clientRooms = new Map<WebSocket, { roomId: string; role: 'streamer' | 'viewer' }>()

// --- HTTP server ---

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', clients: wss.clients.size, rooms: rooms.size }))
    return
  }

  // Room-scoped HTTP POST: /api/room/:roomId/push
  const roomPushMatch = req.url?.match(/^\/api\/room\/([a-f0-9]+)\/push$/)
  if (req.method === 'POST' && roomPushMatch) {
    const roomId = roomPushMatch[1]
    let body = ''
    req.on('data', (chunk: Buffer) => { body += chunk.toString() })
    req.on('end', () => {
      const room = rooms.get(roomId)
      if (!room) {
        res.writeHead(404, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Room not found' }))
        return
      }
      try {
        const parsed = JSON.parse(body)
        if (!parsed.type || !parsed.value) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Content must have "type" and "value" fields' }))
          return
        }
        const content: RoomContent = { type: parsed.type, value: parsed.value, timestamp: Date.now() }
        room.content = content
        broadcastToViewers(room, { type: 'CONTENT_UPDATE', content })
        if (room.streamer && room.streamer.readyState === WebSocket.OPEN) {
          room.streamer.send(JSON.stringify({ type: 'CONTENT_UPDATE', content }))
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, viewers: room.viewers.size }))
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
      }
    })
    return
  }

  // Create room via HTTP (no WS streamer required)
  if (req.method === 'POST' && req.url === '/api/rooms') {
    const roomId = generateRoomId()
    const room: Room = { id: roomId, streamer: null, viewers: new Set(), content: null }
    rooms.set(roomId, room)
    console.log(`[ROOM] created ${roomId} (via HTTP)`)
    res.writeHead(201, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ roomId }))
    return
  }

  // Global event relay (existing Phase 2 behavior)
  if (req.method === 'POST' && req.url === '/api/events') {
    let body = ''
    req.on('data', (chunk: Buffer) => { body += chunk.toString() })
    req.on('end', () => {
      try {
        const event = JSON.parse(body)
        if (!event.type) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Event must have a "type" field' }))
          return
        }
        const message = JSON.stringify(event)
        let relayed = 0
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message)
            relayed++
          }
        })
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ relayed, clients: wss.clients.size }))
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
      }
    })
    return
  }

  // Room status / delete endpoints
  const roomStatusMatch = req.url?.match(/^\/api\/room\/([a-f0-9]+)$/)
  if (roomStatusMatch) {
    const roomId = roomStatusMatch[1]
    const room = rooms.get(roomId)

    if (req.method === 'GET') {
      if (!room) {
        res.writeHead(404, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Room not found' }))
        return
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ roomId: room.id, viewers: room.viewers.size, content: room.content }))
      return
    }

    if (req.method === 'DELETE') {
      if (!room) {
        res.writeHead(404, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Room not found' }))
        return
      }
      closeRoom(room)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
      return
    }
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found' }))
})

// --- WebSocket server ---

const wss = new WebSocketServer({ server })

wss.on('connection', (ws: WebSocket) => {
  console.log(`[WS] client connected (${wss.clients.size} total)`)

  ws.on('message', (data: Buffer) => {
    let msg: any
    try {
      msg = JSON.parse(data.toString())
    } catch {
      return
    }

    // --- Room protocol ---
    if (msg.type === 'CREATE_ROOM') {
      const roomId = generateRoomId()
      const room: Room = { id: roomId, streamer: ws, viewers: new Set(), content: null }
      rooms.set(roomId, room)
      clientRooms.set(ws, { roomId, role: 'streamer' })
      ws.send(JSON.stringify({ type: 'ROOM_CREATED', roomId }))
      console.log(`[ROOM] created ${roomId}`)
      return
    }

    if (msg.type === 'JOIN_ROOM') {
      const room = rooms.get(msg.roomId)
      if (!room) {
        ws.send(JSON.stringify({ type: 'ROOM_ERROR', error: 'Room not found' }))
        return
      }
      room.viewers.add(ws)
      clientRooms.set(ws, { roomId: msg.roomId, role: 'viewer' })
      ws.send(JSON.stringify({ type: 'ROOM_JOINED', content: room.content }))
      sendViewerCount(room)
      console.log(`[ROOM] ${msg.roomId}: viewer joined (${room.viewers.size} viewers)`)
      return
    }

    if (msg.type === 'PUSH_CONTENT') {
      const room = rooms.get(msg.roomId)
      if (!room || room.streamer !== ws) return
      const content: RoomContent = { type: msg.content.type, value: msg.content.value, timestamp: Date.now() }
      room.content = content
      broadcastToViewers(room, { type: 'CONTENT_UPDATE', content })
      ws.send(JSON.stringify({ type: 'CONTENT_UPDATE', content }))
      return
    }

    if (msg.type === 'CLEAR_CONTENT') {
      const room = rooms.get(msg.roomId)
      if (!room || room.streamer !== ws) return
      room.content = null
      broadcastToViewers(room, { type: 'CONTENT_CLEARED' })
      ws.send(JSON.stringify({ type: 'CONTENT_CLEARED' }))
      return
    }

    if (msg.type === 'CLOSE_ROOM') {
      const room = rooms.get(msg.roomId)
      if (!room || room.streamer !== ws) return
      closeRoom(room)
      clientRooms.delete(ws)
      ws.send(JSON.stringify({ type: 'ROOM_CLOSED' }))
      return
    }

    // --- Global relay (existing Phase 2 behavior) ---
    const message = data.toString()
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message)
      }
    })
  })

  ws.on('close', () => {
    console.log(`[WS] client disconnected (${wss.clients.size} total)`)

    // Clean up room membership
    const membership = clientRooms.get(ws)
    if (membership) {
      const room = rooms.get(membership.roomId)
      if (room) {
        if (membership.role === 'streamer') {
          closeRoom(room)
        } else {
          room.viewers.delete(ws)
          sendViewerCount(room)
          console.log(`[ROOM] ${membership.roomId}: viewer left (${room.viewers.size} viewers)`)
        }
      }
      clientRooms.delete(ws)
    }
  })
})

server.listen(PORT, () => {
  console.log(`[WS] server listening on http://localhost:${PORT}`)
  console.log(`[WS] WebSocket: ws://localhost:${PORT}`)
  console.log(`[WS] HTTP POST: http://localhost:${PORT}/api/events`)
  console.log(`[WS] Health: http://localhost:${PORT}/health`)
})
