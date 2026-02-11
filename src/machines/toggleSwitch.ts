import { setup, assign } from 'xstate'

export const toggleSwitchMachine = setup({
  types: {
    context: {} as { isActive: boolean },
    events: {} as { type: 'toggle' } | { type: 'reset' },
  },
}).createMachine({
  id: 'ToggleSwitchSM',
  initial: 'off',
  context: { isActive: false },
  meta: {
    description: 'Binary toggle — flips between off and on.',
    contextProperties: {
      isActive: { type: 'boolean', description: 'Maps to Rive Boolean property "isActive".' },
    },
    riveViewModel: 'ToggleSwitchVM',
    riveStateMachine: 'ToggleSwitchSM',
  },
  states: {
    off: {
      description: 'Switch is in the off position (initial).',
      on: {
        toggle: {
          description: 'Flip the switch on.',
          target: 'on',
          actions: assign({ isActive: true }),
        },
        reset: {
          description: 'Ensure switch is off (self-transition).',
          target: 'off',
          actions: assign({ isActive: false }),
        },
      },
    },
    on: {
      description: 'Switch is in the on position.',
      on: {
        toggle: {
          description: 'Flip the switch off.',
          target: 'off',
          actions: assign({ isActive: false }),
        },
        reset: {
          description: 'Force switch back to off.',
          target: 'off',
          actions: assign({ isActive: false }),
        },
      },
    },
  },
})
