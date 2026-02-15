export interface RiveEvent {
  name: string
  direction: 'in' | 'out'
  type: string
  description: string
}

export interface InstructStep {
  step: string
  detail: string
  verifies: string[]
}

export interface ReadoutItem {
  label: string
  source: 'state' | 'progress' | 'active'
}

export interface ConceptRegion {
  name: string
  properties: string[]
  description: string
}

export interface RecipeConcept {
  summary: string
  regions?: ConceptRegion[]
}

export interface Recipe {
  key: string
  name: string
  type: 'component' | 'app' | 'test'
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
  concept?: RecipeConcept
}

export const recipes: Recipe[] = [
  {
    key: 'progress-bar',
    name: 'PROGRESS BAR',
    type: 'component',
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
      {
        step: 'Create ViewModel',
        detail: 'Add a ViewModel named ProgressBarVM to the artboard',
        verifies: ['state:idle'],
      },
      {
        step: 'Add Number property',
        detail: 'Create property progress (Number, Source→Target)',
        verifies: ['context.progress'],
      },
      {
        step: 'Add Boolean property',
        detail: 'Create property isActive (Boolean, Source→Target)',
        verifies: ['context.isActive'],
      },
      {
        step: 'Add Triggers',
        detail: 'Create triggers start and reset (Source→Target)',
        verifies: ['event:start', 'event:reset'],
      },
      {
        step: 'Create State Machine',
        detail: 'Name it ProgressBarSM with states: idle, loading, complete',
        verifies: ['state:idle', 'state:loading', 'state:complete'],
      },
      {
        step: 'Wire transitions',
        detail: 'start trigger → idle→loading, reset trigger → any→idle',
        verifies: ['event:start->loading', 'event:reset->idle'],
      },
      {
        step: 'Add Rive Events',
        detail: 'Fire onComplete when progress hits 100, onStateChange on state transitions',
        verifies: [],
      },
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
    type: 'component',
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
      {
        step: 'Create ViewModel',
        detail: 'Add a ViewModel named ToggleSwitchVM to the artboard',
        verifies: ['state:off'],
      },
      {
        step: 'Add Boolean property',
        detail: 'Create property isOn (Boolean, Source→Target)',
        verifies: ['context.isActive'],
      },
      {
        step: 'Add Trigger',
        detail: 'Create trigger toggle (Source→Target)',
        verifies: ['event:toggle'],
      },
      {
        step: 'Create State Machine',
        detail: 'Name it ToggleSwitchSM with states: on, off',
        verifies: ['state:off', 'state:on'],
      },
      {
        step: 'Add Rive Event',
        detail: 'Fire onToggled after toggle animation completes',
        verifies: ['event:toggle->on'],
      },
    ],
    readout: [
      { label: 'state', source: 'state' },
      { label: 'isOn', source: 'active' },
    ],
  },
  {
    key: 'counter',
    name: 'COUNTER',
    type: 'component',
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
      {
        step: 'Create ViewModel',
        detail: 'Add a ViewModel named CounterVM to the artboard',
        verifies: ['state:idle'],
      },
      {
        step: 'Add Number property',
        detail: 'Create property count (Number, Source→Target)',
        verifies: ['context.count'],
      },
      {
        step: 'Add Boolean property',
        detail: 'Create property isActive (Boolean, Source→Target)',
        verifies: [],
      },
      {
        step: 'Add Triggers',
        detail: 'Create triggers increment and reset (Source→Target)',
        verifies: ['event:increment', 'event:reset'],
      },
      {
        step: 'Create State Machine',
        detail: 'Name it CounterSM with states: idle, counting, maxed',
        verifies: ['state:idle', 'state:counting', 'state:maxed'],
      },
      {
        step: 'Wire transitions',
        detail: 'increment trigger → idle→counting, reset trigger → any→idle, auto-transition counting→maxed at count=10',
        verifies: ['event:increment->counting', 'event:reset->idle'],
      },
      {
        step: 'Add Rive Events',
        detail: 'Fire onMaxed when count reaches max, onStateChange on state transitions',
        verifies: [],
      },
    ],
    readout: [
      { label: 'state', source: 'state' },
      { label: 'count', source: 'progress' },
      { label: 'isActive', source: 'active' },
    ],
  },
  {
    key: 'input-demo',
    name: 'INPUT DEMO',
    type: 'app',
    state: 'active',
    progress: 0,
    active: false,
    status: 'wip',
    bindings: 6,
    states: 3,
    triggers: 6,
    contract: [
      { xstate: 'context.bindings', rive: 'ViewModel property bindings (Object)' },
      { xstate: 'context.activeInputs', rive: 'ViewModel property activeInputs (List)' },
      { xstate: 'context.mapperOpen', rive: 'ViewModel property mapperOpen (Boolean)' },
      { xstate: 'event: KEY_DOWN', rive: 'Trigger KEY_DOWN' },
      { xstate: 'event: KEY_UP', rive: 'Trigger KEY_UP' },
      { xstate: 'event: OPEN_MAPPER', rive: 'Trigger OPEN_MAPPER' },
      { xstate: 'event: CLOSE_MAPPER', rive: 'Trigger CLOSE_MAPPER' },
      { xstate: 'event: START_REBIND', rive: 'Trigger START_REBIND' },
      { xstate: 'event: reset', rive: 'Trigger reset' },
      { xstate: 'state: active', rive: 'State: active' },
      { xstate: 'state: {configuring: idle}', rive: 'State: configuring.idle' },
      { xstate: 'state: {configuring: listening}', rive: 'State: configuring.listening' },
    ],
    events: [
      { name: 'bindings', direction: 'in', type: 'Object Input', description: 'Action-to-key mapping' },
      { name: 'activeInputs', direction: 'in', type: 'List Input', description: 'Currently held actions' },
      { name: 'mapperOpen', direction: 'in', type: 'Boolean Input', description: 'Mapper overlay visibility' },
      { name: 'KEY_DOWN', direction: 'in', type: 'Trigger', description: 'Key pressed' },
      { name: 'KEY_UP', direction: 'in', type: 'Trigger', description: 'Key released' },
      { name: 'OPEN_MAPPER', direction: 'in', type: 'Trigger', description: 'Open the key mapper overlay' },
      { name: 'CLOSE_MAPPER', direction: 'in', type: 'Trigger', description: 'Close the key mapper overlay' },
      { name: 'START_REBIND', direction: 'in', type: 'Trigger', description: 'Start rebinding an action' },
      { name: 'reset', direction: 'in', type: 'Trigger', description: 'Reset all bindings to defaults' },
    ],
    instruct: [
      {
        step: 'Create ViewModel',
        detail: 'Add a ViewModel named InputDemoVM to the artboard. The XState machine mediates both visual areas — the React renderer works standalone; add the Rive renderer when ready.',
        verifies: ['state:active'],
      },
      {
        step: 'Add bindings property',
        detail: 'Create property bindings (Object, Source→Target) to receive action-to-key map',
        verifies: ['context.bindings'],
      },
      {
        step: 'Add activeInputs property',
        detail: 'Create property activeInputs (List, Source→Target) to show held actions',
        verifies: ['context.activeInputs'],
      },
      {
        step: 'Add mapperOpen property',
        detail: 'Create property mapperOpen (Boolean, Source→Target) to toggle overlay visibility',
        verifies: ['context.mapperOpen'],
      },
      {
        step: 'Create State Machine',
        detail: 'Name it InputDemoSM with states: active, configuring (idle, listening)',
        verifies: ['state:active', 'state:{configuring:idle}', 'state:{configuring:listening}'],
      },
      {
        step: 'Wire input events',
        detail: 'KEY_DOWN/KEY_UP in active state update activeInputs; OPEN_MAPPER transitions to configuring',
        verifies: ['event:KEY_DOWN', 'event:KEY_UP', 'event:OPEN_MAPPER'],
      },
      {
        step: 'Wire rebind events',
        detail: 'START_REBIND → listening, KEY_DOWN in listening saves binding, CANCEL_REBIND/CLOSE_MAPPER returns',
        verifies: ['event:START_REBIND', 'event:CLOSE_MAPPER'],
      },
    ],
    readout: [
      { label: 'state', source: 'state' },
    ],
    concept: {
      summary: 'One XState machine drives two independent visual regions. The receiver shows which keys are active. The mapper overlay lets users rebind keys. Both regions read from the same machine context — they never communicate directly.',
      regions: [
        { name: 'Receiver', properties: ['bindings', 'activeInputs'], description: 'Shows action indicators that light up on key press' },
        { name: 'Mapper Overlay', properties: ['mapperOpen', 'listeningAction', 'bindings'], description: 'Modal for viewing and rebinding key assignments' },
      ],
    },
  },
  {
    key: 'media-player',
    name: 'MEDIA PLAYER',
    type: 'app',
    state: 'stopped',
    progress: 0,
    active: false,
    status: 'draft',
    bindings: 10,
    states: 5,
    triggers: 5,
    contract: [
      { xstate: 'context.currentTime', rive: 'ViewModel property currentTime (Number)' },
      { xstate: 'context.isPlaying', rive: 'ViewModel property isPlaying (Boolean)' },
      { xstate: 'event: play', rive: 'Trigger play' },
      { xstate: 'event: pause', rive: 'Trigger pause' },
      { xstate: 'event: stop', rive: 'Trigger stop' },
      { xstate: 'context.volumeLevel', rive: 'ViewModel property volumeLevel (Number)' },
      { xstate: 'context.isMuted', rive: 'ViewModel property isMuted (Boolean)' },
      { xstate: 'event: mute', rive: 'Trigger mute' },
      { xstate: 'event: unmute', rive: 'Trigger unmute' },
      { xstate: 'state: {playback: stopped}', rive: 'Layer playback → State: stopped' },
    ],
    events: [
      { name: 'currentTime', direction: 'in', type: 'Number Input', description: 'Current playback position in seconds' },
      { name: 'isPlaying', direction: 'in', type: 'Boolean Input', description: 'Whether media is currently playing' },
      { name: 'play', direction: 'in', type: 'Trigger', description: 'Start playback' },
      { name: 'pause', direction: 'in', type: 'Trigger', description: 'Pause playback' },
      { name: 'stop', direction: 'in', type: 'Trigger', description: 'Stop and reset playback' },
      { name: 'volumeLevel', direction: 'in', type: 'Number Input', description: 'Volume level 0–100' },
      { name: 'isMuted', direction: 'in', type: 'Boolean Input', description: 'Whether audio is muted' },
      { name: 'mute', direction: 'in', type: 'Trigger', description: 'Mute audio' },
      { name: 'unmute', direction: 'in', type: 'Trigger', description: 'Unmute audio' },
      { name: 'onPlaybackEnd', direction: 'out', type: 'Rive Event', description: 'Fires when media reaches the end' },
    ],
    instruct: [
      {
        step: 'Create ViewModel',
        detail: 'Add a ViewModel named MediaPlayerVM to the artboard',
        verifies: [],
      },
      {
        step: 'Add playback properties',
        detail: 'Create currentTime (Number) and isPlaying (Boolean) properties',
        verifies: ['context.currentTime', 'context.isPlaying'],
      },
      {
        step: 'Add volume properties',
        detail: 'Create volumeLevel (Number) and isMuted (Boolean) properties',
        verifies: ['context.volumeLevel', 'context.isMuted'],
      },
      {
        step: 'Add playback triggers',
        detail: 'Create triggers play, pause, stop',
        verifies: ['event:play', 'event:pause', 'event:stop'],
      },
      {
        step: 'Add volume triggers',
        detail: 'Create triggers mute and unmute',
        verifies: ['event:mute', 'event:unmute'],
      },
      {
        step: 'Create State Machine',
        detail: 'Name it MediaPlayerSM with parallel regions: playback (stopped/playing/paused) and volume (unmuted/muted)',
        verifies: [],
      },
      {
        step: 'Wire transitions',
        detail: 'play → stopped→playing, pause → playing→paused, stop → any→stopped, mute → unmuted→muted, unmute → muted→unmuted',
        verifies: [],
      },
      {
        step: 'Add Rive Events',
        detail: 'Fire onPlaybackEnd when currentTime reaches duration',
        verifies: [],
      },
    ],
    readout: [
      { label: 'state', source: 'state' },
      { label: 'currentTime', source: 'progress' },
      { label: 'isPlaying', source: 'active' },
    ],
  },
  {
    key: 'test-bench',
    name: 'TEST BENCH',
    type: 'test',
    state: 'idle',
    progress: 0,
    active: false,
    status: 'wip',
    bindings: 10,
    states: 3,
    triggers: 3,
    contract: [
      { xstate: 'context.progress', rive: 'ViewModel property progress (Number, Source→Target)' },
      { xstate: 'context.label', rive: 'ViewModel property label (String, Source→Target)' },
      { xstate: 'context.isActive', rive: 'ViewModel property isActive (Boolean, Source→Target)' },
      { xstate: 'context.mode', rive: 'ViewModel property mode (Enum, Source→Target)' },
      { xstate: 'context.sliderValue', rive: 'ViewModel property sliderValue (Number, Target→Source)' },
      { xstate: 'event: activate', rive: 'Trigger activate' },
      { xstate: 'event: complete', rive: 'Trigger complete' },
      { xstate: 'event: reset', rive: 'Trigger reset' },
      { xstate: 'state: idle', rive: 'State: idle' },
      { xstate: 'state: active', rive: 'State: active' },
      { xstate: 'state: complete', rive: 'State: complete' },
    ],
    events: [
      { name: 'progress', direction: 'in', type: 'Number Input', description: 'Current progress 0–100 (Source→Target)' },
      { name: 'label', direction: 'in', type: 'String Input', description: 'Text label for display (Source→Target)' },
      { name: 'isActive', direction: 'in', type: 'Boolean Input', description: 'Whether bench is active (Source→Target)' },
      { name: 'mode', direction: 'in', type: 'Enum Input', description: 'Current mode: idle|active|complete (Source→Target)' },
      { name: 'sliderValue', direction: 'out', type: 'Number Output', description: 'Slider position from Rive (Target→Source)' },
      { name: 'activate', direction: 'in', type: 'Trigger', description: 'Activate the bench — idle→active' },
      { name: 'complete', direction: 'in', type: 'Trigger', description: 'Mark complete — active→complete' },
      { name: 'reset', direction: 'in', type: 'Trigger', description: 'Reset to idle from any state' },
      { name: 'onComplete', direction: 'out', type: 'Rive Event', description: 'Fires when Rive animation reaches completion' },
      { name: 'onSliderChange', direction: 'out', type: 'Rive Event', description: 'Fires when slider value changes inside Rive' },
    ],
    instruct: [
      {
        step: 'Create ViewModel',
        detail: 'Add a ViewModel named TestBenchVM to the artboard. This VM covers all property types: Number, String, Boolean, Enum.',
        verifies: [
          'state:idle',
          'state:active',
          'state:complete',
        ],
      },
      {
        step: 'Add Number property (Source→Target)',
        detail: 'Create property progress (Number, Source→Target, range 0–100). JS drives this value into Rive.',
        verifies: [
          'context.progress',
          'vm:progress:number',
          'vm-bind:progress->progress',
        ],
      },
      {
        step: 'Add String property (Source→Target)',
        detail: 'Create property label (String, Source→Target). Bind to a Text Run to verify rendering.',
        verifies: [
          'context.label',
          'vm:label:string',
          'vm-bind:label->label',
        ],
      },
      {
        step: 'Add Boolean property (Source→Target)',
        detail: 'Create property isActive (Boolean, Source→Target). Controls visibility or animation state.',
        verifies: [
          'context.isActive',
          'vm:isActive:boolean',
          'vm-bind:isActive->isActive',
        ],
      },
      {
        step: 'Add Enum property (Source→Target)',
        detail: 'Create property mode (Enum: idle, active, complete, Source→Target). Mirrors machine state names.',
        verifies: [
          'context.mode',
          'vm:mode:enum',
          'vm-bind:mode->mode',
        ],
      },
      {
        step: 'Add Number property (Target→Source)',
        detail: 'Create property sliderValue (Number, Target→Source, range 0–100). Rive drives this value back to JS via a draggable slider element.',
        verifies: [
          'context.sliderValue',
          'vm:sliderValue:number',
          'vm-bind:sliderValue->sliderValue',
        ],
      },
      {
        step: 'Add Triggers',
        detail: 'Create triggers activate, complete, and reset (Source→Target). Wire to state machine transitions.',
        verifies: [
          'event:activate',
          'event:complete',
          'event:reset',
          'event:activate->active',
          'event:reset->idle',
        ],
      },
      {
        step: 'Wire State Machine',
        detail: 'Create TestBenchSM with states: idle, active, complete. activate → idle→active, complete → active→complete, reset → any→idle.',
        verifies: [
          'trigger:activate',
          'trigger:activate->Active',
          'trigger:complete->Complete',
          'vm-value:progress=100',
        ],
      },
      {
        step: 'Add Rive Events',
        detail: 'Fire onComplete when SM reaches Complete state. Fire onSliderChange when slider value updates (Target→Source).',
        verifies: [
          'rive-event:onComplete',
          'rive-event:onSliderChange',
        ],
      },
      {
        step: 'Add interactive slider',
        detail: 'Add a draggable slider element named "Slider" that drives sliderValue (Target→Source). Verify hit testing and value propagation.',
        verifies: [
          'hit-test:Slider',
          'visual:slider moves and updates sliderValue',
          'visual:progress bar fills to 100%',
          'visual:label text renders correctly',
        ],
      },
    ],
    readout: [
      { label: 'state', source: 'state' },
      { label: 'progress', source: 'progress' },
      { label: 'isActive', source: 'active' },
    ],
  },
]

export const DEFAULT_RECIPE_KEY = 'progress-bar'

export function getComponents(): Recipe[] {
  return recipes.filter((r) => r.type === 'component')
}

export function getApps(): Recipe[] {
  return recipes.filter((r) => r.type === 'app')
}

export function getTests(): Recipe[] {
  return recipes.filter((r) => r.type === 'test')
}
