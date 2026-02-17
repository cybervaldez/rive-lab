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
  meta: {
    description: 'Drives a progress bar from idle through loading to complete.',
    contextProperties: {
      progress: { type: 'number', range: [0, 100], direction: 'source-to-target', description: 'Maps to Rive Number property "progress".' },
      statusText: { type: 'string', direction: 'source-to-target', description: 'Human-readable status label for the current state.' },
      isActive: { type: 'boolean', direction: 'source-to-target', description: 'Maps to Rive Boolean property "isActive".' },
    },
    riveViewModel: 'ProgressBarVM',
    riveStateMachine: 'ProgressBarSM',
    stateNodes: [
      { name: 'idle', initial: true, depth: 0, description: 'Initial resting state — progress is 0, nothing animating.' },
      { name: 'loading', initial: false, depth: 0, description: 'Actively filling the bar — accepts progress updates.' },
      { name: 'complete', initial: false, depth: 0, description: 'Bar is full — waiting for reset.' },
      { name: 'error', initial: false, depth: 0, description: 'Something went wrong — only reset can recover.' },
    ],
    transitions: [
      { from: 'idle', event: 'start', target: 'loading', description: 'Kick off the loading sequence.' },
      { from: 'idle', event: 'reset', target: 'idle', description: 'Self-transition to guarantee a clean idle state.' },
      { from: 'loading', event: 'SET_PROGRESS', target: '(self)', description: 'Update the bar position (0–100).' },
      { from: 'loading', event: 'complete', target: 'complete', description: 'Mark the bar as done — snaps to 100 %.' },
      { from: 'loading', event: 'reset', target: 'idle', description: 'Abort loading and return to idle.' },
      { from: 'complete', event: 'reset', target: 'idle', description: 'Clear the bar and return to idle.' },
      { from: 'error', event: 'reset', target: 'idle', description: 'Clear error state and return to idle.' },
    ],
  },
  states: {
    idle: {
      description: 'Initial resting state — progress is 0, nothing animating.',
      on: {
        start: {
          description: 'Kick off the loading sequence.',
          target: 'loading',
          actions: assign({ isActive: true, statusText: 'loading' }),
        },
        reset: {
          description: 'Self-transition to guarantee a clean idle state.',
          target: 'idle',
          actions: assign({ progress: 0, isActive: false, statusText: '' }),
        },
      },
    },
    loading: {
      description: 'Actively filling the bar — accepts progress updates.',
      on: {
        SET_PROGRESS: {
          description: 'Update the bar position (0–100).',
          actions: assign({ progress: ({ event }) => event.value }),
        },
        complete: {
          description: 'Mark the bar as done — snaps to 100 %.',
          target: 'complete',
          actions: assign({ progress: 100, isActive: false, statusText: 'complete' }),
        },
        reset: {
          description: 'Abort loading and return to idle.',
          target: 'idle',
          actions: assign({ progress: 0, isActive: false, statusText: '' }),
        },
      },
    },
    complete: {
      description: 'Bar is full — waiting for reset.',
      on: {
        reset: {
          description: 'Clear the bar and return to idle.',
          target: 'idle',
          actions: assign({ progress: 0, isActive: false, statusText: '' }),
        },
      },
    },
    error: {
      description: 'Something went wrong — only reset can recover.',
      on: {
        reset: {
          description: 'Clear error state and return to idle.',
          target: 'idle',
          actions: assign({ progress: 0, isActive: false, statusText: '' }),
        },
      },
    },
  },
})
