import { setup, assign } from 'xstate'

export const counterMachine = setup({
  types: {
    context: {} as { count: number },
    events: {} as { type: 'increment' } | { type: 'reset' },
  },
  guards: {
    isMaxed: ({ context }) => context.count + 1 >= 10,
  },
}).createMachine({
  id: 'CounterSM',
  initial: 'idle',
  context: { count: 0 },
  states: {
    idle: {
      on: {
        increment: [
          {
            guard: 'isMaxed',
            target: 'maxed',
            actions: assign({ count: 10 }),
          },
          {
            target: 'counting',
            actions: assign({ count: ({ context }) => context.count + 1 }),
          },
        ],
      },
    },
    counting: {
      on: {
        increment: [
          {
            guard: 'isMaxed',
            target: 'maxed',
            actions: assign({ count: 10 }),
          },
          {
            actions: assign({ count: ({ context }) => context.count + 1 }),
          },
        ],
        reset: {
          target: 'idle',
          actions: assign({ count: 0 }),
        },
      },
    },
    maxed: {
      on: {
        reset: {
          target: 'idle',
          actions: assign({ count: 0 }),
        },
      },
    },
  },
})
