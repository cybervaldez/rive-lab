import { setup, assign } from 'xstate'

export const toggleSwitchMachine = setup({
  types: {
    context: {} as { isActive: boolean },
    events: {} as { type: 'toggle' },
  },
}).createMachine({
  id: 'ToggleSwitchSM',
  initial: 'off',
  context: { isActive: false },
  states: {
    off: {
      on: {
        toggle: {
          target: 'on',
          actions: assign({ isActive: true }),
        },
      },
    },
    on: {
      on: {
        toggle: {
          target: 'off',
          actions: assign({ isActive: false }),
        },
      },
    },
  },
})
