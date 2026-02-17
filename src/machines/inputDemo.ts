import { setup, assign } from 'xstate'
import { DEFAULT_BINDINGS } from '../lib/inputUtils'

export const inputDemoMachine = setup({
  types: {
    context: {} as {
      bindings: Record<string, string>
      activeInputs: string[]
      listeningAction: string | null
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
  type: 'parallel',
  context: {
    bindings: { ...DEFAULT_BINDINGS },
    activeInputs: [],
    listeningAction: null,
  },
  meta: {
    description: 'Maps keyboard keys to abstract input actions. Supports rebinding via a mapper overlay.',
    contextProperties: {
      bindings: { type: 'object', description: 'Action name to KeyboardEvent.code mapping.' },
      activeInputs: { type: 'array', description: 'Currently held action names.' },
    },
    riveViewModel: 'InputDemoVM',
    riveStateMachine: 'InputDemoSM',
  },
  states: {
    receiver: {
      description: 'Keyboard input receiver — processes key events as game actions.',
      initial: 'active',
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
              target: 'paused',
              actions: assign({ activeInputs: [] }),
            },
          },
        },
        paused: {
          description: 'Input paused while mapper overlay is open.',
          on: {
            CLOSE_MAPPER: 'active',
          },
        },
      },
      on: {
        reset: {
          target: '.active',
          actions: assign({
            bindings: { ...DEFAULT_BINDINGS },
            activeInputs: [],
            listeningAction: null,
          }),
        },
      },
    },
    mapper: {
      description: 'Key binding configuration overlay.',
      initial: 'closed',
      states: {
        closed: {
          description: 'Mapper overlay is hidden.',
          on: {
            OPEN_MAPPER: 'open',
          },
        },
        open: {
          description: 'Mapper overlay is visible — user can view and rebind keys.',
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
                  target: '#InputDemoSM.mapper.closed',
                  actions: assign({ listeningAction: null }),
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
        },
      },
      on: {
        reset: '.closed',
      },
    },
  },
})
