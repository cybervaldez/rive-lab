import { setup, assign } from 'xstate'
import { DEFAULT_BINDINGS } from '../lib/inputUtils'

export const inputDemoMachine = setup({
  types: {
    context: {} as {
      bindings: Record<string, string>
      activeInputs: string[]
      listeningAction: string | null
      mapperOpen: boolean
    },
    events: {} as
      | { type: 'KEY_DOWN'; code: string }
      | { type: 'KEY_UP'; code: string }
      | { type: 'OPEN_MAPPER' }
      | { type: 'CLOSE_MAPPER' }
      | { type: 'START_REBIND'; action: string }
      | { type: 'CANCEL_REBIND' }
      | { type: 'reset' },
  },
}).createMachine({
  id: 'InputDemoSM',
  initial: 'active',
  context: {
    bindings: { ...DEFAULT_BINDINGS },
    activeInputs: [],
    listeningAction: null,
    mapperOpen: false,
  },
  meta: {
    description: 'Maps keyboard keys to abstract input actions. Supports rebinding via a mapper overlay.',
    contextProperties: {
      bindings: { type: 'object', description: 'Action name to KeyboardEvent.code mapping.' },
      activeInputs: { type: 'array', description: 'Currently held action names.' },
      mapperOpen: { type: 'boolean', description: 'Whether the mapper overlay is visible.' },
    },
    riveViewModel: 'InputDemoVM',
    riveStateMachine: 'InputDemoSM',
  },
  states: {
    active: {
      description: 'Normal gameplay — keyboard events map to input actions.',
      on: {
        KEY_DOWN: {
          actions: assign({
            activeInputs: ({ context, event }) => {
              const action = Object.entries(context.bindings).find(([, code]) => code === event.code)?.[0]
              if (!action || context.activeInputs.includes(action)) return context.activeInputs
              return [...context.activeInputs, action]
            },
          }),
        },
        KEY_UP: {
          actions: assign({
            activeInputs: ({ context, event }) => {
              const action = Object.entries(context.bindings).find(([, code]) => code === event.code)?.[0]
              if (!action) return context.activeInputs
              return context.activeInputs.filter((a) => a !== action)
            },
          }),
        },
        OPEN_MAPPER: {
          target: 'configuring',
          actions: assign({ mapperOpen: true, activeInputs: [] }),
        },
        reset: {
          target: 'active',
          actions: assign({
            bindings: { ...DEFAULT_BINDINGS },
            activeInputs: [],
            listeningAction: null,
            mapperOpen: false,
          }),
        },
      },
    },
    configuring: {
      description: 'Mapper overlay is open — user can view and rebind keys.',
      initial: 'idle',
      states: {
        idle: {
          description: 'Mapper open, waiting for user to pick an action to rebind.',
          on: {
            START_REBIND: {
              target: 'listening',
              actions: assign({ listeningAction: ({ event }) => event.action }),
            },
            CLOSE_MAPPER: {
              target: '#InputDemoSM.active',
              actions: assign({ mapperOpen: false, listeningAction: null }),
            },
          },
        },
        listening: {
          description: 'Waiting for the user to press a key to bind to the selected action.',
          on: {
            KEY_DOWN: {
              target: 'idle',
              actions: assign({
                bindings: ({ context, event }) => {
                  const action = context.listeningAction!
                  const newCode = event.code
                  const updated = { ...context.bindings }
                  // Clear conflict: if another action had this key, unbind it
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
            CANCEL_REBIND: {
              target: 'idle',
              actions: assign({ listeningAction: null }),
            },
          },
        },
      },
      on: {
        reset: {
          target: 'active',
          actions: assign({
            bindings: { ...DEFAULT_BINDINGS },
            activeInputs: [],
            listeningAction: null,
            mapperOpen: false,
          }),
        },
      },
    },
  },
})
