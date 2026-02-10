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
      console.log(`[XSTATE:${machine.id}] → state: ${event.snapshot.value}`);
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

---

## Resources

- XState Docs: https://stately.ai/docs/xstate
- XState React: https://stately.ai/docs/xstate-react
- Actors: https://stately.ai/docs/actors
- Setup API: https://stately.ai/docs/setup
- GitHub: https://github.com/statelyai/xstate
