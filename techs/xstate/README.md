# XState

XState v5 is a state management library implementing finite state machines and the actor model. In this project, XState IS the app — it serves as the logic layer structured to mirror Rive's Data Binding model. The XState machine becomes a living spec that tells the Rive developer exactly what states, properties, triggers, and bindings are expected at every stage.

## Domain Classification

| Domain | Applies |
|--------|---------|
| **State Management** | **Yes** |
| UI Components | No |
| Data Fetching | No |
| Form Handling | No |
| Animation | No |
| Routing | No |
| Testing Tools | No |
| Build Tools | No |
| Styling | No |
| Auth | No |

## Pipeline Impact

| Skill | Impact | Reason |
|-------|--------|--------|
| create-task | High | Machine file structure, Rive-compatible scaffolding |
| coding-guard | High | Context mutation, missing error states, v4 API misuse |
| cli-first | High | State exposure via `window.__xstate__` for `agent-browser eval` |
| e2e-guard | Medium | Coverage for state transitions and context properties |
| e2e | Medium | Verification via eval + subscribe patterns |
| e2e-investigate | Medium | State machine log format, transition debugging |

## User's Use Case

XState IS the app; it mirrors Rive's Data Binding so the pipeline can test everything. When the Rive developer delivers the `.riv` file, the swap is seamless because XState was already shaped like Rive. XState serves as a living spec for the Rive developer.

---

## Core Concepts

### Machine Definition (v5)

```typescript
import { setup, assign, createActor } from 'xstate';

const machine = setup({
  types: {
    context: {} as { count: number },
    events: {} as { type: 'increment' } | { type: 'SET_COUNT'; value: number },
  },
  actions: {
    increment: assign({ count: ({ context }) => context.count + 1 }),
  },
  guards: {
    isPositive: ({ context }) => context.count > 0,
  },
}).createMachine({
  id: 'counter',
  initial: 'active',
  context: { count: 0 },
  states: {
    active: {
      on: {
        increment: { actions: 'increment' },
        SET_COUNT: { actions: assign({ count: ({ event }) => event.value }) },
      },
    },
  },
});
```

### Actor Lifecycle

```typescript
const actor = createActor(machine);
actor.start();
actor.send({ type: 'increment' });
actor.getSnapshot().value;    // current state
actor.getSnapshot().context;  // current context
actor.subscribe((snapshot) => { /* react to changes */ });
actor.stop();
```

### React Integration (`@xstate/react`)

```typescript
import { useMachine, useActor, useSelector } from '@xstate/react';

// In component
const [snapshot, send] = useMachine(machine);
snapshot.value;           // current state
snapshot.context.count;   // context value
send({ type: 'increment' });
```

### Actor Types

| Actor | Created With | Use Case |
|-------|-------------|----------|
| State machine | `setup().createMachine()` | Complex state logic |
| Promise | `fromPromise()` | Async operations |
| Callback | `fromCallback()` | Event streams, subscriptions |
| Observable | `fromObservable()` | RxJS streams |
| Transition | `fromTransition()` | Simple reducers |

---

## XState <-> Rive Mapping Convention

This is the core convention — how XState must be structured to mirror Rive:

| Rive Data Binding | XState Equivalent | Convention |
|-------------------|-------------------|------------|
| ViewModel `{Name}VM` | Machine `{name}Machine` | Same logical name |
| ViewModel property (number) | Context property (number) | Same name, same type |
| ViewModel property (string) | Context property (string) | Same name, same type |
| ViewModel property (boolean) | Context property (boolean) | Same name, same type |
| ViewModel trigger | Event `{ type: 'triggerName' }` | Same name |
| ViewModel enum | Context property + type union | Same values |
| Binding source->target | `assign()` action updates context | JS drives state |
| Binding target->source | Event handler reads from "Rive" | Rive drives state |
| Binding bidirectional | Both assign + event | Both directions |
| `prop.on(callback)` | `actor.subscribe()` + selector | Listen for changes |
| `prop.value` read | `actor.getSnapshot().context.prop` | Read current value |
| `prop.value = x` write | `actor.send({ type: 'SET_PROP', value: x })` | Write value |
| `triggerProp.trigger()` (JS->Rive) | `actor.send({ type: 'triggerName' })` | Fire trigger |
| `onTrigger` callback (Rive->JS) | `inspect` event or action side-effect | Receive trigger |
| State machine state | Machine state node | Same name |
| `onStateChange` | `actor.subscribe()` on `.value` | State observation |
| Layer (concurrent state) | Parallel region (`type: 'parallel'`) | One layer = one region, same name |
| Shared ViewModel (across layers) | Shared context (across regions) | All regions read/write same context |
| Layer active state | Region current state | Each region has exactly one active state |
| Layer priority (rightmost wins) | *(no equivalent)* | Rive-only: animation blending conflict resolution |
| *(no equivalent)* | `onDone` (all regions reach final) | XState-only: parallel completion event |
| TransitionViewModelCondition | Context guard (`({ context }) => ...`) | Cross-region/layer queries via shared property values |
| *(no equivalent)* | `stateIn()` guard | XState-only: check if a region is in a named state |
| Shared ViewModel property write | Shared context update via `assign()` | Cross-region/layer communication via shared state |
| *(no equivalent)* | `raise()` event | XState-only: one region raises an event for all regions |
| Multi-layer active states | Composite state value (object) | `{ playback: 'playing', volume: 'muted' }` |

---

## Rive-Structured Machine Pattern

How to structure machines to mirror Rive ViewModel:

```typescript
// src/machines/progressBar.ts
import { setup, assign } from 'xstate';

// Context properties MUST match Rive ViewModel properties (same names, types)
// Events for triggers MUST match Rive trigger names
// State names MUST match Rive state machine state names
export const progressBarMachine = setup({
  types: {
    context: {} as {
      // <- Maps to ProgressBarVM properties
      progress: number;
      statusText: string;
      isActive: boolean;
    },
    events: {} as
      // <- Maps to ProgressBarVM triggers
      | { type: 'start' }
      | { type: 'reset' }
      // <- Maps to JS->Rive property writes
      | { type: 'SET_PROGRESS'; value: number }
      | { type: 'SET_STATUS_TEXT'; value: string },
  },
  actions: {
    setProgress: assign({
      progress: ({ event }) => (event as any).value,
    }),
  },
}).createMachine({
  id: 'ProgressBarSM',  // <- matches Rive state machine name
  initial: 'idle',
  context: { progress: 0, statusText: '', isActive: false },
  states: {
    idle: {
      on: { start: { target: 'loading', actions: assign({ isActive: true }) } },
    },
    loading: {
      on: {
        SET_PROGRESS: { actions: 'setProgress' },
        complete: 'complete',
      },
    },
    complete: {
      entry: assign({ isActive: false, statusText: 'Done' }),
      on: { reset: 'idle' },
    },
    error: {
      entry: assign({ isActive: false }),
      on: { reset: 'idle' },
    },
  },
});
```

---

## Parallel States (Concurrent Regions)

Parallel states model genuinely independent concerns that run simultaneously. Each parallel region has its own set of states and transitions, but all regions share the same context and receive the same events.

Each region maps to one Rive layer — see `techs/rive/README.md` Layers section.

### When to Use

Use `type: 'parallel'` when you have **orthogonal concerns** — behaviors that:
- Can change independently (playback can toggle without affecting volume)
- Don't gate each other (muting doesn't pause playback)
- Together describe the full state (you need both playback AND volume to describe the player)

If concerns are dependent (auth gates profile access), use compound (nested) states instead — see Anti-Pattern #7.

### State Value

Parallel machines produce an **object** state value instead of a string:

```typescript
// Flat machine:
snapshot.value // => 'playing' (string)

// Parallel machine:
snapshot.value // => { playback: 'playing', volume: 'muted' } (object)
```

### Shared Context

All regions read and write the **same context** — this maps directly to Rive's shared ViewModel where all layers access the same property pool:

```typescript
context: {
  // playback region properties   <- Maps to playback layer properties
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  // volume region properties     <- Maps to volume layer properties
  volumeLevel: 100,
  isMuted: false,
}
```

### Event Broadcasting

All regions receive **every event**. When you send `{ type: 'mute' }`, both the `playback` and `volume` regions evaluate it — only the region with a matching handler transitions. This mirrors Rive where all layers evaluate conditions simultaneously.

### Cross-Region Communication

| Mechanism | How | Use Case |
|-----------|-----|----------|
| Shared context | Both regions read/write same context via `assign()` | Region A updates a value that region B's guard checks |
| `raise()` | Action in one region raises an event all regions receive | Region A triggers a transition in region B |
| Context guard | Guard checks a shared context value set by another region | Conditional transition based on sibling region's property (maps to Rive TransitionViewModelCondition) |
| `stateIn()` guard | Guard checks if another region is in a specific state | XState-only: no direct Rive equivalent since layers query properties, not state names |

**`raise()` example** — in a file-processing machine, the `upload` region notifies `alerts` when complete:

```typescript
// In setup():
actions: {
  notifyUploadDone: raise({ type: 'showAlert' }), // all regions receive this
},

// In upload region:
complete: {
  type: 'final',
  entry: [
    assign({ uploadComplete: true }),
    'notifyUploadDone',  // raises 'showAlert' → alerts region transitions to visible
  ],
}
```

**Context guard example** — `alerts` region auto-dismisses only after upload finishes:

```typescript
// In setup():
guards: {
  isUploadComplete: ({ context }) => context.uploadComplete === true,
},

// In alerts region:
visible: {
  on: {
    dismiss: { target: 'hidden', guard: 'isUploadComplete' },
  },
}
```

### `onDone` — Parallel Completion

When **all** regions reach a `type: 'final'` state, the parallel parent fires `onDone`. This is XState-only — Rive has no equivalent since layers run indefinitely.

```typescript
states: {
  active: {
    type: 'parallel',
    states: {
      upload: { /* ... has a 'done' final state */ },
      process: { /* ... has a 'done' final state */ },
    },
    onDone: 'complete', // fires when BOTH upload and process reach final
  },
  complete: {},
}
```

### Media Player Machine

```typescript
// src/machines/mediaPlayer.ts
import { setup, assign } from 'xstate';

// Context properties MUST match Rive MediaPlayerVM properties (same names, types)
// Events for triggers MUST match Rive trigger names
// Region keys MUST match Rive layer names
export const mediaPlayerMachine = setup({
  types: {
    context: {} as {
      // <- Maps to MediaPlayerVM properties (shared across layers)
      currentTime: number;
      duration: number;
      isPlaying: boolean;
      volumeLevel: number;
      isMuted: boolean;
    },
    events: {} as
      // <- Maps to MediaPlayerVM triggers
      | { type: 'play' }
      | { type: 'pause' }
      | { type: 'stop' }
      | { type: 'mute' }
      | { type: 'unmute' }
      // <- Maps to JS->Rive property writes
      | { type: 'SET_CURRENT_TIME'; value: number }
      | { type: 'SET_VOLUME_LEVEL'; value: number },
  },
}).createMachine({
  id: 'MediaPlayerSM',           // <- Matches Rive state machine name
  type: 'parallel',              // <- Enables concurrent regions
  context: {
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    volumeLevel: 100,
    isMuted: false,
  },
  states: {
    playback: {                   // <- Maps to Rive layer: playback
      initial: 'stopped',
      states: {
        stopped: {
          entry: assign({ isPlaying: false, currentTime: 0 }),
          on: {
            play: { target: 'playing' },
          },
        },
        playing: {
          entry: assign({ isPlaying: true }),
          on: {
            pause: { target: 'paused' },
            stop: { target: 'stopped' },
            SET_CURRENT_TIME: {
              actions: assign({ currentTime: ({ event }) => event.value }),
            },
          },
        },
        paused: {
          entry: assign({ isPlaying: false }),
          on: {
            play: { target: 'playing' },
            stop: { target: 'stopped' },
          },
        },
      },
    },
    volume: {                     // <- Maps to Rive layer: volume
      initial: 'unmuted',
      states: {
        unmuted: {
          on: {
            mute: { target: 'muted' },
            SET_VOLUME_LEVEL: {
              actions: assign({ volumeLevel: ({ event }) => event.value }),
            },
          },
        },
        muted: {
          entry: assign({ isMuted: true, volumeLevel: 0 }),
          on: {
            unmute: { target: 'unmuted', actions: assign({ isMuted: false, volumeLevel: 100 }) },
          },
        },
      },
    },
  },
});
```

### Pipeline Exposure

For parallel machines, `window.__xstate__` returns an **object** for state. Use dot notation to query individual regions:

```typescript
window.__xstate__?.MediaPlayer?.state()
// => { playback: 'playing', volume: 'muted' }

// Access individual region directly:
window.__xstate__?.MediaPlayer?.state().playback
// => 'playing'
```

### Logging

Parallel state emission logs as JSON instead of a string:

```
[XSTATE:MediaPlayerSM] → state: {"playback":"playing","volume":"muted"}
```

The `inspect` handler must check `typeof value` and call `JSON.stringify()` when the value is an object — template literals produce `[object Object]` otherwise. See the inspect code in the Round-Trip Logging section.

---

## State Exposure for Pipeline (cli-first)

Expose XState actors to `window.__xstate__` so the pipeline can query and drive state via `agent-browser eval`.

```typescript
// Shared hook: src/hooks/useXStateDebug.ts
import { useEffect } from 'react';
import type { AnyActorRef } from 'xstate';

declare global {
  interface Window {
    __xstate__?: Record<string, {
      state: () => unknown;
      context: () => unknown;
      send: (event: any) => void;
    }>;
  }
}

function useXStateDebug(name: string, actorRef: AnyActorRef) {
  useEffect(() => {
    window.__xstate__ = window.__xstate__ || {};
    window.__xstate__[name] = {
      state: () => actorRef.getSnapshot().value,
      context: () => actorRef.getSnapshot().context,
      send: actorRef.send.bind(actorRef),
    };
    return () => { delete window.__xstate__?.[name]; };
  }, [name, actorRef]);
}
```

### Usage in Component

```typescript
function ProgressBar() {
  const [snapshot, send] = useMachine(progressBarMachine);
  const actorRef = useActorRef(progressBarMachine);

  useXStateDebug('ProgressBar', actorRef);

  return <div data-state={snapshot.value}>...</div>;
}
```

---

## Round-Trip Logging Convention

Every event crossing a boundary is logged **when sent** (point 1) and **when received** (point 4). XState's `inspect` covers the middle — receiving the event (point 2) and emitting new state (point 3). Together, these 4 points form a complete handshake that proves every link in the chain is alive. If any log is missing, you know exactly which boundary broke.

### Log Format

All log lines follow the same structure:

```
[{LAYER}:{id}] {arrow} {verb}: {payload}
```

| Point | Layer | Format | Example |
|-------|-------|--------|---------|
| 1 (UI sends) | UI | `[UI:{comp}] → send: {event}` | `[UI:ProgressBar] → send: {"type":"start"}` |
| 1 (Rive sends) | RIVE | `[RIVE:{id}] → fire: {trigger}` | `[RIVE:ProgressBar] → fire: onComplete` |
| 2 (XState receives) | XSTATE | `[XSTATE:{machineId}] ← event: {json}` | `[XSTATE:ProgressBarSM] ← event: {"type":"start"}` |
| 3 (XState emits) | XSTATE | `[XSTATE:{machineId}] → state: {value}` | `[XSTATE:ProgressBarSM] → state: loading` |
| 4 (UI receives) | UI | `[UI:{comp}] ← recv: state={value}` | `[UI:ProgressBar] ← recv: state=loading` |
| 4 (Rive receives) | RIVE | `[RIVE:{id}] ← bind: {prop}={value}` | `[RIVE:ProgressBar] ← bind: isActive=true` |
| 3 (parallel state) | XSTATE | `[XSTATE:{machineId}] → state: {json}` | `[XSTATE:MediaPlayerSM] → state: {"playback":"playing","volume":"muted"}` |

### Point 1: Send-Site Logging

Wrap `actor.send()` so every outbound event is logged at the call site:

```typescript
// src/lib/logSend.ts
function logSend(
  layer: string,
  id: string,
  actor: AnyActorRef,
  event: AnyEventObject
) {
  console.log(`[${layer}:${id}] → send: ${JSON.stringify(event)}`);
  actor.send(event);
}

// Usage in a React component
function ProgressBar() {
  const [snapshot, send] = useMachine(progressBarMachine);
  const actorRef = useActorRef(progressBarMachine);

  const handleStart = () => {
    logSend('UI', 'ProgressBar', actorRef, { type: 'start' });
  };
}
```

### Points 2-3: XState Receives and Emits (inspect)

The `inspect` callback logs when XState receives an event (point 2) and when it emits new state (point 3):

```typescript
const actor = createActor(machine, {
  inspect: (event) => {
    if (event.type === '@xstate.event') {
      console.log(`[XSTATE:${machine.id}] ← event: ${JSON.stringify(event.event)}`);
    }
    if (event.type === '@xstate.snapshot') {
      const value = event.snapshot.value;
      const display = typeof value === 'string' ? value : JSON.stringify(value);
      console.log(`[XSTATE:${machine.id}] → state: ${display}`);
    }
  },
});
```

### Point 4: Subscribe-Site Logging

`actor.subscribe()` logs when UI or Rive receives new state from XState:

```typescript
// In React component (UI receives)
useEffect(() => {
  const sub = actorRef.subscribe((snapshot) => {
    console.log(`[UI:ProgressBar] ← recv: state=${snapshot.value}`);
  });
  return () => sub.unsubscribe();
}, [actorRef]);

// In Rive binding layer (Rive receives)
useEffect(() => {
  const sub = actorRef.subscribe((snapshot) => {
    console.log(`[RIVE:ProgressBar] ← bind: isActive=${snapshot.context.isActive}`);
    setValue(snapshot.context.isActive);
  });
  return () => sub.unsubscribe();
}, [actorRef]);
```

### Full Trace Example

**Outbound cycle: UI → XState → Rive**

User clicks Start in the UI, XState transitions, Rive receives the binding update:

```
[UI:ProgressBar]      → send:  {"type":"start"}
[XSTATE:ProgressBarSM] ← event: {"type":"start"}
[XSTATE:ProgressBarSM] → state: loading
[RIVE:ProgressBar]    ← bind:  isActive=true
```

**Inbound cycle: Rive → XState → UI**

Rive animation fires `onComplete`, XState transitions, UI receives the new state:

```
[RIVE:ProgressBar]    → fire:  onComplete
[XSTATE:ProgressBarSM] ← event: {"type":"complete"}
[XSTATE:ProgressBarSM] → state: complete
[UI:ProgressBar]      ← recv:  state=complete
```

### Diagnosis Table

When a log line is missing, it pinpoints the broken link:

| Missing Log | Meaning | Check |
|-------------|---------|-------|
| Point 1 missing | Event never sent | Handler not wired or `logSend` not called |
| Point 2 missing | XState never received | Actor not started, wrong actor reference, or event type misspelled |
| Point 3 missing | XState received but didn't transition | Guard blocked it, or no matching `on` handler in current state |
| Point 4 missing | State emitted but receiver never got it | `subscribe` not wired, component unmounted, or binding layer broken |
| Points 1+2 both missing | Sender side completely dead | Component not rendered or event handler not attached |
| Points 3+4 both missing | XState processed but nothing downstream | `inspect` misconfigured and `subscribe` not wired |
| All 4 missing | Nothing happened | Wrong machine, wrong component, or app not running |

---

## E2E Testing Patterns

### Read State

```bash
# Read current state
STATE=$(agent-browser eval "window.__xstate__?.ProgressBar?.state()")
[ "$STATE" = "\"idle\"" ] && log_pass "State: idle" || log_fail "State: $STATE"
```

### Read Context Property

```bash
PROGRESS=$(agent-browser eval "window.__xstate__?.ProgressBar?.context()?.progress")
[ "$PROGRESS" = "75" ] && log_pass "Progress: 75" || log_fail "Progress: $PROGRESS"
```

### Fire Event (Trigger Equivalent)

```bash
agent-browser eval "window.__xstate__?.ProgressBar?.send({ type: 'reset' })"
sleep 0.5
```

### Verify State Transition

```bash
# Start -> verify transition
agent-browser eval "window.__xstate__?.ProgressBar?.send({ type: 'start' })"
sleep 0.5
STATE=$(agent-browser eval "window.__xstate__?.ProgressBar?.state()")
[ "$STATE" = "\"loading\"" ] && log_pass "Transitioned to loading" || log_fail "State: $STATE"
```

### Console Log Verification

```bash
agent-browser console | grep '\[XSTATE:ProgressBarSM\]'
```

### Swap-Ready Assertion Pattern

The same assertion structure works for Rive later via `__rive_debug__`:

```bash
# XState (now)
STATE=$(agent-browser eval "window.__xstate__?.ProgressBar?.state()")

# Rive (later) — same pattern, different namespace
# STATE=$(agent-browser eval "window.__rive_debug__?.ProgressBar?.state()")
```

### Parallel State Queries

```bash
# Read composite state as JSON
STATE=$(agent-browser eval "JSON.stringify(window.__xstate__?.MediaPlayer?.state())")
echo "$STATE"  # => {"playback":"playing","volume":"muted"}

# Read single region directly
PLAYBACK=$(agent-browser eval "window.__xstate__?.MediaPlayer?.state().playback")
[ "$PLAYBACK" = "\"playing\"" ] && log_pass "Playback: playing" || log_fail "Playback: $PLAYBACK"

# Verify two regions independently
VOLUME=$(agent-browser eval "window.__xstate__?.MediaPlayer?.state().volume")
[ "$VOLUME" = "\"muted\"" ] && log_pass "Volume: muted" || log_fail "Volume: $VOLUME"

# Fire event affecting one region
agent-browser eval "window.__xstate__?.MediaPlayer?.send({ type: 'mute' })"
sleep 0.5
VOLUME=$(agent-browser eval "window.__xstate__?.MediaPlayer?.state().volume")
[ "$VOLUME" = "\"muted\"" ] && log_pass "Muted" || log_fail "Volume: $VOLUME"
```

---

## Anti-Patterns (coding-guard)

### 1. Direct Context Mutation

```typescript
// BAD
actions: {
  addItem: ({ context }) => {
    context.items.push(item); // mutates directly
  }
}

// GOOD
actions: {
  addItem: assign({
    items: ({ context, event }) => [...context.items, event.item]
  })
}
```

### 2. Unhandled Events Silently Ignored

```typescript
// BAD — sending 'reset' in 'idle' state does nothing silently

// GOOD — use strict mode or explicit catch-all
const machine = createMachine({
  strict: true, // throws on unhandled events
  // ...
});
```

### 3. Missing Error States

```typescript
// BAD — async invoke with no error handling
states: {
  loading: {
    invoke: { src: 'fetchData', onDone: 'success' }
    // missing onError
  }
}

// GOOD
states: {
  loading: {
    invoke: {
      src: 'fetchData',
      onDone: 'success',
      onError: 'error',
    }
  },
  error: {
    on: { retry: 'loading' }
  }
}
```

### 4. v4 API Usage

```typescript
// BAD (v4)
import { Machine, interpret } from 'xstate';
const machine = Machine({ ... });
const service = interpret(machine);

// GOOD (v5)
import { setup, createActor } from 'xstate';
const machine = setup({ ... }).createMachine({ ... });
const actor = createActor(machine);
```

### 5. Fallback Defaults on Context

```typescript
// BAD — hides missing data
const label = context.statusText ?? 'Loading...';

// GOOD — machine guarantees correct state
// statusText is always set correctly via assign in entry actions
```

### 6. No Debug Exposure

```typescript
// BAD — pipeline is blind
function MyComponent() {
  const [snapshot, send] = useMachine(machine);
  // no useXStateDebug call
}

// GOOD — pipeline can verify
function MyComponent() {
  const actorRef = useActorRef(machine);
  useXStateDebug('MyComponent', actorRef);
}
```

### 7. Unnecessary Parallel States

```typescript
// BAD — auth and profile are dependent (profile requires auth)
states: {
  type: 'parallel',
  states: {
    auth: { /* logged_out, logged_in */ },
    profile: { /* empty, loaded */ },
  },
}

// GOOD — use compound states for dependent concerns
states: {
  logged_out: {
    on: { login: 'logged_in' },
  },
  logged_in: {
    initial: 'profileEmpty',
    states: {
      profileEmpty: { on: { loadProfile: 'profileLoaded' } },
      profileLoaded: {},
    },
  },
}
```

**Rule**: Use parallel states only when regions are genuinely independent. If region B can only be active when region A is in a specific state, they are dependent — use compound (nested) states.

---

## Resources

- XState Docs: https://stately.ai/docs/xstate
- XState React: https://stately.ai/docs/xstate-react
- Actors: https://stately.ai/docs/actors
- Setup API: https://stately.ai/docs/setup
- Parallel States: https://stately.ai/docs/parallel-states
- GitHub: https://github.com/statelyai/xstate
