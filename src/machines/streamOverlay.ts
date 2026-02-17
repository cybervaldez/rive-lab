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
      bindings: { type: 'object', direction: 'source-to-target', description: 'Action name to KeyboardEvent.code mapping.' },
      activeInputs: { type: 'array', direction: 'source-to-target', description: 'Currently active action names.' },
      activeTab: { type: 'string', direction: 'source-to-target', description: 'Active control room tab.' },
      sources: { type: 'object', direction: 'source-to-target', description: 'Input source enable/disable states.' },
      mapperOpen: { type: 'boolean', direction: 'source-to-target', description: 'Whether the mapper panel is in rebind mode.' },
    },
    riveViewModel: 'StreamOverlayVM',
    riveStateMachine: 'StreamOverlaySM',
    stateNodes: [
      { name: 'active', initial: true, depth: 0, description: 'Normal mode — input events map to active actions.' },
      { name: 'configuring', initial: false, depth: 0, description: 'Mapper is active — user can view and rebind keys.' },
      { name: 'configuring.idle', initial: true, depth: 1, description: 'Waiting for user to pick an action to rebind.' },
      { name: 'configuring.listening', initial: false, depth: 1, description: 'Waiting for user to press a key to bind.' },
    ],
    transitions: [
      { from: 'active', event: 'KEY_DOWN', target: '(self)', description: 'Map key press to input action.' },
      { from: 'active', event: 'KEY_UP', target: '(self)', description: 'Release input action.' },
      { from: 'active', event: 'TRIGGER_INPUT', target: '(self)', description: 'External trigger activates an input action.' },
      { from: 'active', event: 'CLEAR_TRIGGER', target: '(self)', description: 'Clear a triggered input action.' },
      { from: 'active', event: 'OPEN_MAPPER', target: 'configuring', description: 'Open the key mapper overlay.' },
      { from: 'configuring.idle', event: 'START_REBIND', target: 'configuring.listening', description: 'Start listening for a key press to rebind.' },
      { from: 'configuring.idle', event: 'CLOSE_MAPPER', target: 'active', description: 'Close mapper and return to active.' },
      { from: 'configuring.listening', event: 'KEY_DOWN', target: 'configuring.idle', description: 'Bind the pressed key and return to idle.' },
      { from: 'configuring.listening', event: 'CANCEL_REBIND', target: 'configuring.idle', description: 'Cancel rebind and return to idle.' },
      { from: '(root)', event: 'SET_TAB', target: '(self)', description: 'Switch the active control room tab.' },
      { from: '(root)', event: 'WS_STATUS', target: '(self)', description: 'Update WebSocket connection status.' },
      { from: '(root)', event: 'reset', target: 'active', description: 'Reset to initial state.' },
    ],
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
