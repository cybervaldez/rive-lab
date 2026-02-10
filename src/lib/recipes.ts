export interface RiveEvent {
  name: string
  direction: 'in' | 'out'
  type: string
  description: string
}

export interface InstructStep {
  step: string
  detail: string
}

export interface ReadoutItem {
  label: string
  source: 'state' | 'progress' | 'active'
}

export interface Recipe {
  key: string
  name: string
  state: string
  progress: number
  active: boolean
  status: 'ready' | 'draft' | 'wip'
  bindings: number
  states: number
  triggers: number
  contract: { xstate: string; rive: string }[]
  events: RiveEvent[]
  instruct: InstructStep[]
  readout: ReadoutItem[]
}

export const recipes: Recipe[] = [
  {
    key: 'progress-bar',
    name: 'PROGRESS BAR',
    state: 'loading',
    progress: 65,
    active: true,
    status: 'ready',
    bindings: 7,
    states: 3,
    triggers: 2,
    contract: [
      { xstate: 'context.progress', rive: 'ViewModel property progress (Number)' },
      { xstate: 'context.isActive', rive: 'ViewModel property isActive (Boolean)' },
      { xstate: 'event: start', rive: 'Trigger start' },
      { xstate: 'event: reset', rive: 'Trigger reset' },
      { xstate: 'state: idle', rive: 'State: idle' },
      { xstate: 'state: loading', rive: 'State: loading' },
      { xstate: 'state: complete', rive: 'State: complete' },
    ],
    events: [
      { name: 'progress', direction: 'in', type: 'Number Input', description: 'Current progress 0–100' },
      { name: 'isActive', direction: 'in', type: 'Boolean Input', description: 'Whether animation is running' },
      { name: 'start', direction: 'in', type: 'Trigger', description: 'Begin the loading animation' },
      { name: 'reset', direction: 'in', type: 'Trigger', description: 'Reset to idle state' },
      { name: 'onComplete', direction: 'out', type: 'Rive Event', description: 'Fires when progress reaches 100' },
      { name: 'onStateChange', direction: 'out', type: 'Rive Event', description: 'Fires on idle→loading→complete transitions' },
    ],
    instruct: [
      { step: 'Create ViewModel', detail: 'Add a ViewModel named ProgressBarVM to the artboard' },
      { step: 'Add Number property', detail: 'Create property progress (Number, Source→Target)' },
      { step: 'Add Boolean property', detail: 'Create property isActive (Boolean, Source→Target)' },
      { step: 'Add Triggers', detail: 'Create triggers start and reset (Source→Target)' },
      { step: 'Create State Machine', detail: 'Name it ProgressBarSM with states: idle, loading, complete' },
      { step: 'Wire transitions', detail: 'start trigger → idle→loading, reset trigger → any→idle' },
      { step: 'Add Rive Events', detail: 'Fire onComplete when progress hits 100, onStateChange on state transitions' },
    ],
    readout: [
      { label: 'state', source: 'state' },
      { label: 'progress', source: 'progress' },
      { label: 'isActive', source: 'active' },
    ],
  },
  {
    key: 'toggle-switch',
    name: 'TOGGLE SWITCH',
    state: 'off',
    progress: 0,
    active: false,
    status: 'draft',
    bindings: 4,
    states: 2,
    triggers: 1,
    contract: [
      { xstate: 'context.isOn', rive: 'ViewModel property isOn (Boolean)' },
      { xstate: 'context.label', rive: 'ViewModel property label (String)' },
      { xstate: 'event: toggle', rive: 'Trigger toggle' },
      { xstate: 'state: on', rive: 'State: on' },
      { xstate: 'state: off', rive: 'State: off' },
    ],
    events: [
      { name: 'isOn', direction: 'in', type: 'Boolean Input', description: 'Current toggle state' },
      { name: 'toggle', direction: 'in', type: 'Trigger', description: 'Flip the switch' },
      { name: 'onToggled', direction: 'out', type: 'Rive Event', description: 'Fires after the toggle animation completes' },
    ],
    instruct: [
      { step: 'Create ViewModel', detail: 'Add a ViewModel named ToggleSwitchVM to the artboard' },
      { step: 'Add Boolean property', detail: 'Create property isOn (Boolean, Source→Target)' },
      { step: 'Add Trigger', detail: 'Create trigger toggle (Source→Target)' },
      { step: 'Create State Machine', detail: 'Name it ToggleSwitchSM with states: on, off' },
      { step: 'Add Rive Event', detail: 'Fire onToggled after toggle animation completes' },
    ],
    readout: [
      { label: 'state', source: 'state' },
      { label: 'isOn', source: 'active' },
    ],
  },
  {
    key: 'counter',
    name: 'COUNTER',
    state: 'idle',
    progress: 0,
    active: false,
    status: 'wip',
    bindings: 5,
    states: 3,
    triggers: 2,
    contract: [
      { xstate: 'context.count', rive: 'ViewModel property count (Number)' },
      { xstate: 'context.isActive', rive: 'ViewModel property isActive (Boolean)' },
      { xstate: 'event: increment', rive: 'Trigger increment' },
      { xstate: 'event: reset', rive: 'Trigger reset' },
      { xstate: 'state: idle', rive: 'State: idle' },
      { xstate: 'state: counting', rive: 'State: counting' },
      { xstate: 'state: maxed', rive: 'State: maxed' },
    ],
    events: [
      { name: 'count', direction: 'in', type: 'Number Input', description: 'Current count value 0–10' },
      { name: 'isActive', direction: 'in', type: 'Boolean Input', description: 'Whether counter is active' },
      { name: 'increment', direction: 'in', type: 'Trigger', description: 'Add 1 to count' },
      { name: 'reset', direction: 'in', type: 'Trigger', description: 'Reset count to 0' },
      { name: 'onMaxed', direction: 'out', type: 'Rive Event', description: 'Fires when count reaches max' },
      { name: 'onStateChange', direction: 'out', type: 'Rive Event', description: 'Fires on idle→counting→maxed transitions' },
    ],
    instruct: [
      { step: 'Create ViewModel', detail: 'Add a ViewModel named CounterVM to the artboard' },
      { step: 'Add Number property', detail: 'Create property count (Number, Source→Target)' },
      { step: 'Add Boolean property', detail: 'Create property isActive (Boolean, Source→Target)' },
      { step: 'Add Triggers', detail: 'Create triggers increment and reset (Source→Target)' },
      { step: 'Create State Machine', detail: 'Name it CounterSM with states: idle, counting, maxed' },
      { step: 'Wire transitions', detail: 'increment trigger → idle→counting, reset trigger → any→idle, auto-transition counting→maxed at count=10' },
      { step: 'Add Rive Events', detail: 'Fire onMaxed when count reaches max, onStateChange on state transitions' },
    ],
    readout: [
      { label: 'state', source: 'state' },
      { label: 'count', source: 'progress' },
      { label: 'isActive', source: 'active' },
    ],
  },
]

export const DEFAULT_RECIPE_KEY = 'progress-bar'
