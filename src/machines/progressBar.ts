import { setup, assign } from 'xstate'

export const progressBarMachine = setup({
  types: {
    context: {} as { progress: number; statusText: string; isActive: boolean },
    events: {} as
      | { type: 'start' }
      | { type: 'reset' }
      | { type: 'SET_PROGRESS'; value: number }
      | { type: 'complete' },
  },
}).createMachine({
  id: 'ProgressBarSM',
  initial: 'idle',
  context: { progress: 0, statusText: '', isActive: false },
  states: {
    idle: {
      on: {
        start: {
          target: 'loading',
          actions: assign({ isActive: true, statusText: 'loading' }),
        },
      },
    },
    loading: {
      on: {
        SET_PROGRESS: {
          actions: assign({ progress: ({ event }) => event.value }),
        },
        complete: {
          target: 'complete',
          actions: assign({ progress: 100, isActive: false, statusText: 'complete' }),
        },
        reset: {
          target: 'idle',
          actions: assign({ progress: 0, isActive: false, statusText: '' }),
        },
      },
    },
    complete: {
      on: {
        reset: {
          target: 'idle',
          actions: assign({ progress: 0, isActive: false, statusText: '' }),
        },
      },
    },
    error: {
      on: {
        reset: {
          target: 'idle',
          actions: assign({ progress: 0, isActive: false, statusText: '' }),
        },
      },
    },
  },
})
