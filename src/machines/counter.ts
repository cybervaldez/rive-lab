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
  meta: {
    description: 'Increments a count from 0 to 10, then locks at maxed.',
    contextProperties: {
      count: { type: 'number', range: [0, 10], description: 'Maps to Rive Number property "count".' },
    },
    riveViewModel: 'CounterVM',
    riveStateMachine: 'CounterSM',
  },
  states: {
    idle: {
      description: 'Counter is at zero — waiting for first increment.',
      on: {
        increment: [
          {
            description: 'Jump straight to maxed if this increment hits 10.',
            guard: 'isMaxed',
            target: 'maxed',
            actions: assign({ count: 10 }),
          },
          {
            description: 'Start counting — move to counting state.',
            target: 'counting',
            actions: assign({ count: ({ context }) => context.count + 1 }),
          },
        ],
        reset: {
          description: 'Self-transition to guarantee a clean idle state.',
          target: 'idle',
          actions: assign({ count: 0 }),
        },
      },
    },
    counting: {
      description: 'Actively counting — between 1 and 9.',
      on: {
        increment: [
          {
            description: 'Cap at 10 and lock.',
            guard: 'isMaxed',
            target: 'maxed',
            actions: assign({ count: 10 }),
          },
          {
            description: 'Add one and stay in counting.',
            actions: assign({ count: ({ context }) => context.count + 1 }),
          },
        ],
        reset: {
          description: 'Reset count to 0 and return to idle.',
          target: 'idle',
          actions: assign({ count: 0 }),
        },
      },
    },
    maxed: {
      description: 'Counter hit the ceiling (10) — only reset can continue.',
      on: {
        reset: {
          description: 'Clear count and return to idle.',
          target: 'idle',
          actions: assign({ count: 0 }),
        },
      },
    },
  },
})
