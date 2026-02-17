import { setup, assign } from 'xstate'
import { DEFAULT_BINDINGS } from '../lib/inputUtils'

export type InputSource = 'keyboard' | 'voice' | 'face' | 'api'
export type StreamTab = 'live' | 'effects' | 'mapper' | 'sources' | 'api' | 'community'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

export interface SourceState {
  enabled: boolean
}

export interface ConnectionState {
  status: ConnectionStatus
  url: string
}

export interface StreamOverlayContext {
  bindings: Record<string, string>
  activeInputs: string[]
  activeTab: StreamTab
  sources: Record<InputSource, SourceState>
  connection: ConnectionState
  mapperOpen: boolean
  listeningAction: string | null
}

const DEFAULT_SOURCES: Record<InputSource, SourceState> = {
  keyboard: { enabled: true },
  voice: { enabled: false },
  face: { enabled: false },
  api: { enabled: false },
}

export const streamOverlayMachine = setup({
  types: {
    context: {} as StreamOverlayContext,
    events: {} as
      | { type: 'KEY_DOWN'; code: string }
      | { type: 'KEY_UP'; code: string }
      | { type: 'TRIGGER_INPUT'; action: string; source: InputSource }
      | { type: 'CLEAR_TRIGGER'; action: string }
      | { type: 'SET_TAB'; tab: StreamTab }
      | { type: 'OPEN_MAPPER' }
      | { type: 'CLOSE_MAPPER' }
      | { type: 'START_REBIND'; action: string }
      | { type: 'CANCEL_REBIND' }
      | { type: 'WS_STATUS'; status: ConnectionStatus }
      | { type: 'reset' },
  },
  actions: {
    addInput: assign({
      activeInputs: ({ context, event }) => {
        if (event.type !== 'KEY_DOWN') return context.activeInputs
        const action = Object.entries(context.bindings).find(([, code]) => code === event.code)?.[0]
        if (!action || context.activeInputs.includes(action)) return context.activeInputs
        return [...context.activeInputs, action]
      },
    }),
    removeInput: assign({
      activeInputs: ({ context, event }) => {
        if (event.type !== 'KEY_UP') return context.activeInputs
        const action = Object.entries(context.bindings).find(([, code]) => code === event.code)?.[0]
        if (!action) return context.activeInputs
        return context.activeInputs.filter((a) => a !== action)
      },
    }),
    addTrigger: assign({
      activeInputs: ({ context, event }) => {
        if (event.type !== 'TRIGGER_INPUT') return context.activeInputs
        if (context.activeInputs.includes(event.action)) return context.activeInputs
        return [...context.activeInputs, event.action]
      },
    }),
    clearTrigger: assign({
      activeInputs: ({ context, event }) => {
        if (event.type !== 'CLEAR_TRIGGER') return context.activeInputs
        return context.activeInputs.filter((a) => a !== event.action)
      },
    }),
    rebindKey: assign({
      bindings: ({ context, event }) => {
        if (event.type !== 'KEY_DOWN') return context.bindings
        const action = context.listeningAction!
        const newCode = event.code
        const updated = { ...context.bindings }
        for (const [existingAction, existingCode] of Object.entries(updated)) {
          if (existingAction !== action && existingCode === newCode) {
            updated[existingAction] = ''
          }
        }
        updated[action] = newCode
        return updated
      },
      listeningAction: null,
    }),
  },
  delays: {
    TRIGGER_RELEASE: 200,
  },
}).createMachine({
  id: 'StreamOverlaySM',
  initial: 'active',
  context: {
    bindings: { ...DEFAULT_BINDINGS },
    activeInputs: [],
    activeTab: 'live',
    sources: { ...DEFAULT_SOURCES },
    connection: { status: 'disconnected' as ConnectionStatus, url: 'ws://localhost:3001' },
    mapperOpen: false,
    listeningAction: null,
  },
  meta: {
    description: 'Streamer overlay — maps multiple input sources to visual effects. Keyboard primary, voice/face/API layered on top.',
    contextProperties: {
      bindings: { type: 'object', description: 'Action name to KeyboardEvent.code mapping.' },
      activeInputs: { type: 'array', description: 'Currently active action names.' },
      activeTab: { type: 'string', description: 'Active control room tab.' },
      sources: { type: 'object', description: 'Input source enable/disable states.' },
      mapperOpen: { type: 'boolean', description: 'Whether the mapper panel is in rebind mode.' },
    },
    riveViewModel: 'StreamOverlayVM',
    riveStateMachine: 'StreamOverlaySM',
  },
  on: {
    SET_TAB: {
      actions: assign({ activeTab: ({ event }) => event.tab }),
    },
    WS_STATUS: {
      actions: assign({
        connection: ({ context, event }) => ({
          ...context.connection,
          status: event.status,
        }),
      }),
    },
    reset: {
      target: '.active',
      actions: assign({
        bindings: { ...DEFAULT_BINDINGS },
        activeInputs: [],
        activeTab: 'live' as StreamTab,
        sources: { ...DEFAULT_SOURCES },
        connection: { status: 'disconnected' as ConnectionStatus, url: 'ws://localhost:3001' },
        mapperOpen: false,
        listeningAction: null,
      }),
    },
  },
  states: {
    active: {
      description: 'Normal mode — input events map to active actions.',
      on: {
        KEY_DOWN: { actions: 'addInput' },
        KEY_UP: { actions: 'removeInput' },
        TRIGGER_INPUT: { actions: 'addTrigger' },
        CLEAR_TRIGGER: { actions: 'clearTrigger' },
        OPEN_MAPPER: {
          target: 'configuring',
          actions: assign({ mapperOpen: true, activeInputs: [] }),
        },
      },
    },
    configuring: {
      description: 'Mapper is active — user can view and rebind keys.',
      initial: 'idle',
      states: {
        idle: {
          description: 'Waiting for user to pick an action to rebind.',
          on: {
            START_REBIND: {
              target: 'listening',
              actions: assign({ listeningAction: ({ event }) => event.action }),
            },
            CLOSE_MAPPER: {
              target: '#StreamOverlaySM.active',
              actions: assign({ mapperOpen: false, listeningAction: null }),
            },
          },
        },
        listening: {
          description: 'Waiting for user to press a key to bind.',
          on: {
            KEY_DOWN: {
              target: 'idle',
              actions: 'rebindKey',
            },
            CANCEL_REBIND: {
              target: 'idle',
              actions: assign({ listeningAction: null }),
            },
          },
        },
      },
    },
  },
})
