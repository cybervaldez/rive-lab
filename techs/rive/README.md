# Rive

Rive is an interactive animation runtime that compiles designs to `.riv` binaries and renders on a GPU-accelerated canvas. It communicates with JavaScript through **Data Binding** — a structured protocol of typed properties, triggers, and binding directions that define how the animation and app logic exchange data.

## Domain Classification

| Domain | Applies |
|--------|---------|
| **Interactive Animation** | **Yes** |
| State Management | No |
| UI Components | No |
| Data Fetching | No |
| Form Handling | No |
| Animation | Partial (GPU canvas, not DOM) |
| Routing | No |
| Testing Tools | Partial (Test protocol scripts inside .riv) |
| Build Tools | No |
| Styling | No |
| Auth | No |

## Pipeline Impact

| Skill | Impact | Reason |
|-------|--------|--------|
| create-task | High | File structure for `.riv` assets, ViewModel contracts, Rive Event wiring |
| coding-guard | High | Data Binding anti-patterns, property type mismatches, logic boundary (XState vs Luau) |
| cli-first | High | Canvas is opaque — state must be exposed via Data Binding; scripts can fire Rive Events as return channel |
| e2e-guard | High | Coverage must verify bindings and Rive Events; Test protocol scripts enable in-canvas validation |
| e2e | High | Verification via `window.__rive_debug__`; deterministicMode enables repeatable script execution |
| e2e-investigate | Medium | Failures are binding mismatches, script execution errors, or Rive Event drops |
| ux-review | Medium | Animation quality is visual — canvas screenshots only |

## User's Use Case

XState mirrors Rive's Data Binding so the app is pipeline-testable now, Rive-swappable later. This doc defines the exact protocol XState must mirror.

---

## Data Binding Protocol

Data Binding is how `.riv` files communicate with JavaScript at runtime. The Rive Editor defines **ViewModels** with typed properties, and the runtime exposes them to JS via a structured API.

### Property Types

| Type | JS Access | Read | Write | Listen |
|------|-----------|------|-------|--------|
| **Number** | `vmi.number("prop")` | `.value` | `.value = x` | `.on(e => e.data)` |
| **String** | `vmi.string("prop")` | `.value` | `.value = x` | `.on(e => e.data)` |
| **Boolean** | `vmi.boolean("prop")` | `.value` | `.value = x` | `.on(e => e.data)` |
| **Trigger** | `vmi.trigger("prop")` | N/A | `.trigger()` | `.on(callback)` / `onTrigger` |
| **Enum** | `vmi.enum("prop")` | `.value` | `.value = "X"` | `.on(e => e.data)` |
| **Color** | `vmi.color("prop")` | `.value` (hex int) | `.rgb(r,g,b)` | `.on(e => e.data)` |
| **Image** | `vmi.image("prop")` | N/A | `.value = decoded` | N/A |
| **Nested VM** | `vmi.viewModel("child")` | returns child VMI | — | — |
| **List** | `vmi.list("prop")` | iterable | add/remove | — |

### Binding Directions (set in Rive Editor)

| Direction | Meaning | Example |
|-----------|---------|---------|
| **Source->Target** (default) | JS property -> Rive element | JS sets `progress`, bar animates |
| **Target->Source** | Rive element -> JS property | Animation changes value, JS gets notified |
| **Bidirectional** | Both ways | Interactive slider: user drags in Rive, JS reads; JS sets, Rive updates |

### Key Behavior

- Property changes apply after next state machine/artboard advance (not immediate)
- `.on()` listeners fire when Rive-side changes propagate to JS
- `onTrigger` callback fires when Rive animation fires a trigger toward JS
- `.trigger()` fires from JS toward Rive
- Nested paths: `vmi.number("parent/child/prop")` using `/` delimiter

---

## React Hooks API

```typescript
// Load & bind
const { rive, RiveComponent } = useRive({ src: 'file.riv', autoBind: true });
const viewModel = useViewModel(rive);
const vmi = useViewModelInstance(viewModel, { rive });

// Property hooks (all return { value, setValue })
const { value, setValue } = useViewModelInstanceNumber('progress', vmi);
const { value, setValue } = useViewModelInstanceString('statusText', vmi);
const { value, setValue } = useViewModelInstanceBoolean('isActive', vmi);
const { value, setValue, values } = useViewModelInstanceEnum('theme', vmi);
const { trigger } = useViewModelInstanceTrigger('reset', vmi, {
  onTrigger: () => { /* Rive fired this trigger -> JS receives */ }
});
```

---

## Communication Channels

How each property type communicates between JS and Rive:

| Channel | Direction | Mechanism | Use Case |
|---------|-----------|-----------|----------|
| **JS writes property** | JS -> Rive | `setValue(x)` / `.value = x` | App drives animation |
| **JS reads property** | Rive -> JS | `value` / `.value` | App reads animation state |
| **JS listens for changes** | Rive -> JS | `.on(callback)` / hook reactivity | React to animation events |
| **JS fires trigger** | JS -> Rive | `.trigger()` / `trigger()` | Tell animation to do something |
| **Rive fires trigger** | Rive -> JS | `onTrigger` callback | Animation tells app something happened |
| **Nested access** | Both | `vmi.viewModel("child")` | Compose complex ViewModels |

---

## Scripting (Luau)

Rive embeds a high-performance Luau (Roblox's Lua fork) engine directly into the runtime. Scripts live inside the `.riv` file and run in a sandboxed VM — the same engine runs in the Rive Editor and all production runtimes (Web, iOS, Android, Unity), ensuring identical behavior everywhere.

### Why This Matters for rive-lab

Scripts add **procedural logic** inside `.riv` files. This creates a logic boundary question: what belongs in XState vs what belongs in Luau? The convention is:

- **XState**: Orchestration, state transitions, business logic, anything the pipeline must test
- **Luau scripts**: Procedural visual effects (particles, custom drawing, layout math, path deformation) that are inherently visual and don't need pipeline test coverage

### Protocols

Scripts are organized into **Protocols** — structured categories that define scope and available APIs. Each protocol generates a typed scaffold constraining the script to its job.

| Protocol | Required Methods | Purpose | rive-lab Relevance |
|----------|-----------------|---------|-------------------|
| **Node** | `draw()`, pointer handlers | Custom drawing, scene graph logic | Procedural visual effects on state change |
| **Layout** | `measure()` | Custom layout within Rive's layout system | Rive-native responsive layout |
| **Converter** | `convert()`, `reverseConvert()` | Data transformation on shapes/transforms | Shape manipulation (rarely needed for UI) |
| **PathEffect** | `processPath()` | Procedural behavior on strokes/paths | Loading animations, decorative strokes |
| **Test** | *(validation logic)* | Validation and testing harnesses | In-canvas contract verification |
| **Transition Condition** | *(condition logic)* | Programmatic state machine transitions | Script-driven guards |
| **Listener Action** | *(action logic)* | Custom logic on listener fire | Side effects on interaction |
| **Util** | *(exports)* | Shared helper modules | Common logic across scripts |

### Two-Way Communication

Scripts extend the existing Data Binding communication model with a return channel:

| Direction | Mechanism | Example |
|-----------|-----------|---------|
| **App → Script** | Update ViewModel property via Runtime API | `vmi.setNumber('health', 50)` → script reacts |
| **App → Script** | State Machine input (trigger/boolean) | Trigger fires → script attached to state change runs |
| **Script → App** | Fire Rive Event | Script fires event → `rive.on(EventType.RiveEvent, handler)` |
| **Script ↔ Script** | Internal ViewModel binding | Invisible to XState — logic stays inside .riv |

### Rive Events (Return Channel)

Scripts (and state machines) can fire **Rive Events** — named signals with custom metadata that the runtime listens for.

Two types:
- **General**: Carries custom properties (string, number, boolean) for app logic
- **OpenUrl**: Triggers navigation (handled manually, won't auto-open)

Event object structure:

```typescript
{
  data: {
    name: string,          // event name set in Rive Editor
    type: RiveEventType,   // General or OpenUrl
    properties: {          // custom metadata
      [key: string]: string | number | boolean
    },
    url?: string,          // OpenUrl only
    target?: string,       // OpenUrl only
  }
}
```

Listening in React:

```typescript
import { EventType, RiveEventType } from '@rive-app/canvas';

useEffect(() => {
  if (rive) {
    rive.on(EventType.RiveEvent, (riveEvent) => {
      const { name, type, properties } = riveEvent.data;
      if (type === RiveEventType.General) {
        // Translate to XState event
        actorRef.send({ type: name, ...properties });
      }
    });
  }
}, [rive]);
```

**Note**: Rive docs mark the Events system as legacy, recommending Data Binding triggers for new projects. For rive-lab, prefer `onTrigger` (Data Binding) as the primary return channel, with Rive Events as a secondary option for scripts that need to send rich metadata.

### Sandboxing & Safety

| Property | Behavior |
|----------|----------|
| Execution limit | 50ms per script call — exceeding terminates execution |
| I/O access | None — no file system, no network, no OS operations |
| Module loading | Custom `require()` only loads pre-registered modules |
| Bytecode verification | Cryptographic signature check (`hydro_sign_verify`) before execution |
| Crash isolation | Script failure cannot crash the host application |

### Deterministic Mode

The runtime supports `deterministicMode` for testing — scripts produce **repeatable results for every frame** regardless of platform or timing. This is critical for pipeline verification:

1. XState sends a known state via ViewModel properties
2. Script processes it deterministically
3. Script fires a Rive Event or updates a property confirming the result
4. Pipeline asserts on the expected output

### Test Protocol

The Test protocol creates **validation harnesses inside the .riv file**. Combined with `deterministicMode`, this enables:

- Asserting that ViewModel properties received correct values from XState
- Firing confirmation events back to the host to prove the round-trip
- Running in-canvas validation as part of the e2e pipeline

This could close the "opaque canvas" gap — the pipeline can verify not just that XState sent the right data, but that Rive received and processed it correctly.

### Script Lifecycle

1. `.riv` file loaded → `ScriptAsset` deserialized with bytecode
2. Bytecode verified → Luau generator function called
3. Generator returns method table (`draw`, `advance`, `measure`, `convert`, `processPath`)
4. Runtime calls methods per frame during artboard/state machine advance
5. State persists across frames — scripts are stateful

### Anti-Patterns

| Anti-Pattern | Problem | Correct |
|--------------|---------|---------|
| Business logic in Luau scripts | Pipeline can't test it — .riv is opaque | Keep orchestration in XState |
| State transitions in scripts | Duplicates XState's job, creates two sources of truth | Scripts react to state, don't drive it |
| Ignoring deterministicMode in tests | Flaky results from timing differences | Always enable for pipeline runs |
| Scripts that don't fire confirmation events | No proof the round-trip completed | Test scripts should echo back via Rive Event or trigger |
| Heavy computation in scripts | 50ms limit will kill it | Keep scripts lightweight; offload to JS |

---

## Layers (Concurrent State)

A Rive state machine can have multiple **layers** — independent state graphs that run simultaneously within the same artboard. Each layer has its own states and transitions but shares the same ViewModel. This is the animation-first equivalent of XState's `type: 'parallel'` regions.

Each layer maps to one XState parallel region — see `techs/xstate/README.md` Parallel States section.

### Fundamentals

| Property | Behavior |
|----------|----------|
| Independence | Each layer transitions independently — changing `playback` doesn't affect `volume` |
| Simultaneity | All layers run at the same time, every frame |
| One active state per layer | Each layer has exactly one current state (same as XState regions) |
| Flat peers | Layers are siblings, not parent-child |
| Shared ViewModel | All layers read/write the same ViewModel properties |

### Layers vs Nested Artboards

| | Layers | Nested Artboards |
|---|--------|-----------------|
| Relationship | Flat peers within one artboard | Parent-child hierarchy |
| ViewModel | Shared — all layers access same properties | Isolated — each artboard has its own ViewModel |
| XState equivalent | Parallel regions (`type: 'parallel'`) | Child actors (`invoke` / `spawn`) |
| Communication | Direct via shared ViewModel properties | Via Data Binding between parent and child |
| Use when | Independent behaviors on same visual element | Reusable, self-contained sub-components |

### Layer Priority (Rightmost Wins)

When multiple layers animate the **same property**, the rightmost layer in the editor wins (higher priority). This is animation blending conflict resolution — it has no XState equivalent since context writes are sequential, not blended.

**Convention**: Avoid same-property conflicts between layers. Document which properties each layer uses and keep them disjoint. If overlap is intentional, document the priority order.

### Shared ViewModel

All layers access the same ViewModel property pool. Each layer typically operates on a subset:

```
MediaPlayerVM (shared ViewModel)
├── playback layer uses: currentTime, duration, isPlaying
│   Triggers: play, pause, stop
└── volume layer uses: volumeLevel, isMuted
    Triggers: mute, unmute
```

This maps directly to XState's shared context — all parallel regions read/write the same context object.

### Layer Communication

Layers communicate through **shared ViewModel properties** and **TransitionViewModelConditions**:

- **Shared property write**: Layer A writes a ViewModel property, Layer B reads it in a condition
- **TransitionViewModelCondition**: A layer's transition can check a ViewModel property value set by another layer (equivalent to an XState context guard: `({ context }) => context.isPlaying === true`)

There is no direct "event" between layers — communication is always through the shared ViewModel. This matches XState where cross-region communication uses shared context or `raise()`.

### Mapping to XState

| Rive Layer Concept | XState Equivalent |
|--------------------|-------------------|
| Layer | Parallel region |
| Layer name | Region key (same name) |
| Layer active state | Region current state |
| All layers run simultaneously | All regions receive all events |
| Shared ViewModel | Shared context |
| TransitionViewModelCondition | Context guard (`({ context }) => ...`) |
| Layer priority (rightmost wins) | *(no equivalent)* |
| *(no equivalent — layers run indefinitely)* | `onDone` (all regions reach final) |

---

## Round-Trip Logging Convention

Rive is a GPU canvas — you can't `querySelector` inside it. When a Rive animation fires `onComplete`, you have no proof it happened unless you explicitly log it. This section defines Rive's role in the 4-point logging handshake documented in `techs/xstate/README.md`. Rive participates as **point 1** (sender) and **point 4** (receiver).

All log lines follow the project-wide format:

```
[{LAYER}:{id}] {arrow} {verb}: {payload}
```

### Rive as Sender (Point 1)

When Rive fires a trigger toward JS (via `onTrigger`), log it before forwarding to XState:

```
[RIVE:{id}] → fire: {trigger}
```

```typescript
const { trigger } = useViewModelInstanceTrigger('onComplete', vmi, {
  onTrigger: () => {
    console.log(`[RIVE:ProgressBar] → fire: onComplete`);
    logSend('RIVE', 'ProgressBar', actorRef, { type: 'complete' });
  },
});
```

### Rive as Receiver (Point 4)

When XState pushes state back to Rive (via `setValue`), log the binding update:

```
[RIVE:{id}] ← bind: {prop}={value}
```

```typescript
// Instrumented setValue wrapper
useEffect(() => {
  const sub = actorRef.subscribe((snapshot) => {
    const { isActive, progress } = snapshot.context;
    console.log(`[RIVE:ProgressBar] ← bind: isActive=${isActive}`);
    setIsActive(isActive);
    console.log(`[RIVE:ProgressBar] ← bind: progress=${progress}`);
    setProgress(progress);
  });
  return () => sub.unsubscribe();
}, [actorRef]);
```

### Full Trace: Outbound (UI → XState → Rive)

User clicks Start, XState transitions to `loading`, Rive receives the binding update:

```
[UI:ProgressBar]      → send:  {"type":"start"}
[XSTATE:ProgressBarSM] ← event: {"type":"start"}
[XSTATE:ProgressBarSM] → state: loading
[RIVE:ProgressBar]    ← bind:  isActive=true
```

### Full Trace: Inbound (Rive → XState → UI)

Rive animation fires `onComplete`, XState transitions to `complete`, UI receives the new state:

```
[RIVE:ProgressBar]    → fire:  onComplete
[XSTATE:ProgressBarSM] ← event: {"type":"complete"}
[XSTATE:ProgressBarSM] → state: complete
[UI:ProgressBar]      ← recv:  state=complete
```

---

## Rive-Side Contract

Naming conventions the Rive developer must follow to match XState machine structure.

| Convention | Pattern | Matches XState |
|------------|---------|----------------|
| ViewModel name | `{ComponentName}VM` | `{componentName}Machine` |
| Number properties | camelCase noun | Context property (same name) |
| String properties | camelCase noun | Context property (same name) |
| Boolean properties | `is{State}` / `has{Feature}` | Context property (same name) |
| Triggers | camelCase verb | Event type (same name) |
| Enums | camelCase noun, UPPER values | Context property + type union |
| State machine name | `{ComponentName}SM` | Machine `id` |
| State names | camelCase | Machine state nodes (same names) |
| Layer names | camelCase noun | Parallel region key (same name) |
| Layer property scope | Document which properties each layer uses | Context property subsets per region |

### Naming Examples

| XState | Rive |
|--------|------|
| `progressBarMachine` | `ProgressBarVM` |
| `context.progress` (number) | ViewModel property `progress` (Number) |
| `context.isActive` (boolean) | ViewModel property `isActive` (Boolean) |
| `event: { type: 'reset' }` | ViewModel trigger `reset` |
| `id: 'ProgressBarSM'` | State machine `ProgressBarSM` |
| State: `idle` | State: `idle` |
| Region: `playback` | Layer: `playback` |
| Region: `volume` | Layer: `volume` |
| `{ playback: 'playing', volume: 'muted' }` | Multi-layer active states: playback=playing, volume=muted |

---

## Machine Self-Documentation for Handoff

XState machines now carry structured metadata that tells the Rive designer exactly what to build — no separate spec document needed.

### `meta` Block

Every machine definition includes a root `meta` object with two fields critical to the Rive side:

- **`riveViewModel`** — the exact name to use for the ViewModel in the Rive Editor (e.g., `ProgressBarVM`)
- **`riveStateMachine`** — the exact name to use for the State Machine in the Rive Editor (e.g., `ProgressBarSM`)

The designer opens the machine file, reads these two strings, and creates the matching ViewModel and State Machine in Rive with those exact names.

### `contextProperties`

The `meta.contextProperties` object lists every context property with its type and Rive mapping:

```typescript
contextProperties: {
  progress: {
    type: 'number',
    range: [0, 100],
    description: 'Maps to Rive Number property "progress".',
  },
  isActive: {
    type: 'boolean',
    description: 'Maps to Rive Boolean property "isActive".',
  },
}
```

The designer creates a matching ViewModel property for each entry — same name, same type. The `description` explains how the property is used, and `range` (when present) defines valid bounds.

### State and Transition Descriptions

Every state node and transition includes a human-readable `description` string. The designer references these when building states and transitions in the Rive Editor to verify that the Rive implementation matches the intended behavior.

### Universal `reset`

Every state in every machine handles `{ type: 'reset' }` back to the initial state. On the Rive side, this means: **wire a `reset` trigger from every Rive state back to the initial state**. This ensures the pipeline can always return to a clean starting point, and the wizard can reset demos reproducibly.

For the full XState-side convention, see `techs/xstate/rive-wiring-conventions.md`.

---

## Handoff Checklist

What the Rive developer needs to implement to match the XState spec:

```
[ ] Machine meta block reviewed — confirm ViewModel name and StateMachine name match
[ ] Every state has a description — used to verify Rive states match intent
[ ] Universal reset wired — reset trigger from every state back to initial
[ ] ViewModel named {ComponentName}VM
[ ] Every XState context property exists as a ViewModel property (same name, same type)
[ ] Every XState event that maps to a trigger exists as a ViewModel trigger (same name)
[ ] State machine states match XState state names
[ ] Binding directions set correctly:
    - source->target for JS-driven properties (XState assign -> Rive)
    - target->source for Rive-driven properties (Rive animation -> XState event)
    - bidirectional for interactive properties (both directions)
[ ] Triggers that Rive fires toward JS have target->source or bidirectional binding
[ ] Nested ViewModels match XState child machine structure (if any)
[ ] Layers named to match XState parallel region keys
[ ] Each layer's property scope documented
[ ] Layer priority order documented if same-property conflicts
[ ] No unintended property conflicts between layers
[ ] Any State transitions documented (maps to root-level `on` handler in XState region)
```

---

## Anti-Patterns & Gotchas

| Anti-Pattern | Problem | Correct |
|--------------|---------|---------|
| Reading `.value` expecting immediate write | Writes apply after next advance | Use `.on()` to confirm |
| Missing `autoBind: true` | Hooks silently return undefined | Always set `autoBind: true` |
| Property name mismatch with XState | Swap fails silently | Use contract naming strictly |
| Wrong binding direction | Data flows wrong way | Check source/target per property |
| Trigger without `onTrigger` handler | Rive->JS triggers lost | Always wire `onTrigger` for target->source triggers |
| Layers animating same property without documented priority | Unpredictable blending results | Document which properties each layer uses; keep disjoint or document priority |
| Layer name mismatch with XState region | Parallel mapping breaks silently | Layer names must exactly match XState region keys |
| Using layers when Nested Artboard is needed | Shared ViewModel when isolation is required | Use Nested Artboards for self-contained, reusable sub-components |

---

## Internal Docs

- `techs/rive/scripting-activation.md` — When to activate scripting, protocol selection, HTML/CSS renderers
- `techs/rive/testing-tiers.md` — Three-tier testing framework (Contract, Runtime, Interactive) with verification key syntax
- `techs/xstate/rive-wiring-conventions.md` — Data Binding contract, naming, handoff checklist

## Resources

- Data Binding Runtime API: https://rive.app/docs/runtimes/data-binding
- Data Binding Editor: https://rive.app/docs/editor/data-binding/overview
- React Runtime: https://rive.app/docs/runtimes/react/react
- State Machines: https://rive.app/docs/runtimes/state-machines
- State Machine Layers: https://rive.app/docs/editor/state-machine/layers
- Rive Events Runtime: https://rive.app/docs/runtimes/rive-events
- Events Editor: https://rive.app/docs/editor/events/overview
- Scripting Protocols: https://rive.app/docs/scripting/protocols/overview
- Why Luau: https://rive.app/blog/why-scripting-runs-on-luau
- Scripting Announcement: https://rive.app/blog/scripting-is-live-in-rive
- GitHub (rive-runtime): https://github.com/rive-app/rive-runtime
- GitHub (rive-react): https://github.com/rive-app/rive-react
