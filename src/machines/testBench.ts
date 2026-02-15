import { setup, assign } from 'xstate'

export const testBenchMachine = setup({
  types: {
    context: {} as {
      progress: number
      label: string
      isActive: boolean
      mode: string
      sliderValue: number
      riveEventCount: number
    },
    events: {} as
      | { type: 'activate' }
      | { type: 'complete' }
      | { type: 'reset' }
      | { type: 'SET_PROGRESS'; value: number }
      | { type: 'SET_LABEL'; value: string }
      | { type: 'SLIDER_CHANGED'; value: number }
      | { type: 'RIVE_COMPLETE' },
  },
  guards: {
    isProgressFull: ({ context }) => context.progress >= 100,
  },
}).createMachine({
  id: 'TestBenchSM',
  initial: 'idle',
  context: {
    progress: 0,
    label: '',
    isActive: false,
    mode: 'idle',
    sliderValue: 0,
    riveEventCount: 0,
  },
  meta: {
    description:
      'General-purpose test bench that exercises every XState ↔ Rive contract point: all property types, both binding directions, triggers, and Rive Events.',
    contextProperties: {
      progress: {
        type: 'number',
        range: [0, 100],
        direction: 'source-to-target',
        description: 'Maps to Rive Number property "progress". JS drives Rive.',
      },
      label: {
        type: 'string',
        direction: 'source-to-target',
        description: 'Maps to Rive String property "label". Binds to Text Run.',
      },
      isActive: {
        type: 'boolean',
        direction: 'source-to-target',
        description: 'Maps to Rive Boolean property "isActive".',
      },
      mode: {
        type: 'enum',
        values: ['idle', 'active', 'complete'],
        direction: 'source-to-target',
        description: 'Maps to Rive Enum property "mode". Mirrors machine state.',
      },
      sliderValue: {
        type: 'number',
        range: [0, 100],
        direction: 'target-to-source',
        description:
          'Maps to Rive Number property "sliderValue". Rive drives JS (Target→Source).',
      },
      riveEventCount: {
        type: 'number',
        description: 'Internal counter for Rive Events received. Not bound to Rive.',
      },
    },
    riveViewModel: 'TestBenchVM',
    riveStateMachine: 'TestBenchSM',
  },
  states: {
    idle: {
      description: 'Resting state — all properties at defaults.',
      on: {
        activate: {
          description: 'Trigger: idle → active. Sets isActive=true, mode=active.',
          target: 'active',
          actions: assign({
            isActive: true,
            mode: 'active',
            label: 'active',
          }),
        },
        reset: {
          description: 'Self-transition to guarantee clean idle.',
          target: 'idle',
          actions: assign({
            progress: 0,
            label: '',
            isActive: false,
            mode: 'idle',
            sliderValue: 0,
            riveEventCount: 0,
          }),
        },
      },
    },
    active: {
      description:
        'Main working state — accepts property updates and Rive interactions.',
      on: {
        SET_PROGRESS: {
          description: 'Update progress number (Source→Target).',
          actions: assign({
            progress: ({ event }) => Math.min(100, Math.max(0, event.value)),
          }),
        },
        SET_LABEL: {
          description: 'Update label string (Source→Target).',
          actions: assign({ label: ({ event }) => event.value }),
        },
        SLIDER_CHANGED: {
          description:
            'Rive slider value changed (Target→Source). Updates sliderValue from Rive.',
          actions: assign({
            sliderValue: ({ event }) => event.value,
          }),
        },
        RIVE_COMPLETE: {
          description:
            'Rive Event received from animation. Increments counter.',
          actions: assign({
            riveEventCount: ({ context }) => context.riveEventCount + 1,
          }),
        },
        complete: {
          description:
            'Trigger: active → complete. Sets progress=100, isActive=false.',
          target: 'complete',
          actions: assign({
            progress: 100,
            isActive: false,
            mode: 'complete',
            label: 'complete',
          }),
        },
        reset: {
          description: 'Abort and return to idle.',
          target: 'idle',
          actions: assign({
            progress: 0,
            label: '',
            isActive: false,
            mode: 'idle',
            sliderValue: 0,
            riveEventCount: 0,
          }),
        },
      },
    },
    complete: {
      description:
        'Finished state — only reset can continue. Rive should fire onComplete event here.',
      on: {
        RIVE_COMPLETE: {
          description: 'Accept late Rive Events in complete state.',
          actions: assign({
            riveEventCount: ({ context }) => context.riveEventCount + 1,
          }),
        },
        reset: {
          description: 'Clear everything and return to idle.',
          target: 'idle',
          actions: assign({
            progress: 0,
            label: '',
            isActive: false,
            mode: 'idle',
            sliderValue: 0,
            riveEventCount: 0,
          }),
        },
      },
    },
  },
})
