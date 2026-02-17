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
      bindings: { type: 'object', direction: 'source-to-target', description: 'Action name to KeyboardEvent.code mapping.' },
      activeInputs: { type: 'array', direction: 'source-to-target', description: 'Currently held action names.' },
    },
    riveViewModel: 'InputDemoVM',
    riveStateMachine: 'InputDemoSM',
    stateNodes: [
      { name: 'receiver', initial: true, depth: 0, description: 'Keyboard input receiver — processes key events as game actions.' },
      { name: 'receiver.active', initial: true, depth: 1, description: 'Normal gameplay — keyboard events map to input actions.' },
      { name: 'receiver.paused', initial: false, depth: 1, description: 'Input paused while mapper overlay is open.' },
      { name: 'mapper', initial: true, depth: 0, description: 'Key binding configuration overlay.' },
      { name: 'mapper.closed', initial: true, depth: 1, description: 'Mapper overlay is hidden.' },
      { name: 'mapper.open', initial: false, depth: 1, description: 'Mapper overlay is visible — user can view and rebind keys.' },
      { name: 'mapper.open.idle', initial: true, depth: 2, description: 'Mapper open, waiting for user to pick an action to rebind.' },
      { name: 'mapper.open.listening', initial: false, depth: 2, description: 'Waiting for the user to press a key to bind to the selected action.' },
    ],
    transitions: [
      { from: 'receiver.active', event: 'KEY_DOWN', target: '(self)', description: 'Map key press to input action.' },
      { from: 'receiver.active', event: 'KEY_UP', target: '(self)', description: 'Release input action.' },
      { from: 'receiver.active', event: 'OPEN_MAPPER', target: 'receiver.paused', description: 'Pause input while mapper opens.' },
      { from: 'receiver.paused', event: 'CLOSE_MAPPER', target: 'receiver.active', description: 'Resume input when mapper closes.' },
      { from: 'receiver', event: 'reset', target: 'receiver.active', description: 'Reset receiver to active state.' },
      { from: 'mapper.closed', event: 'OPEN_MAPPER', target: 'mapper.open', description: 'Open the mapper overlay.' },
      { from: 'mapper.open.idle', event: 'START_REBIND', target: 'mapper.open.listening', description: 'Start listening for a key press to rebind.' },
      { from: 'mapper.open.idle', event: 'CLOSE_MAPPER', target: 'mapper.closed', description: 'Close the mapper overlay.' },
      { from: 'mapper.open.listening', event: 'KEY_DOWN', target: 'mapper.open.idle', description: 'Bind the pressed key and return to idle.' },
      { from: 'mapper.open.listening', event: 'CANCEL_REBIND', target: 'mapper.open.idle', description: 'Cancel rebind and return to idle.' },
      { from: 'mapper', event: 'reset', target: 'mapper.closed', description: 'Reset mapper to closed state.' },
    ],
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
