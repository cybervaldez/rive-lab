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
| Testing Tools | No |
| Build Tools | No |
| Styling | No |
| Auth | No |

## Pipeline Impact

| Skill | Impact | Reason |
|-------|--------|--------|
| create-task | High | File structure for `.riv` assets, ViewModel contracts |
| coding-guard | High | Data Binding anti-patterns, property type mismatches |
| cli-first | High | Canvas is opaque — state must be exposed via Data Binding |
| e2e-guard | Medium | Coverage must verify bindings, not just DOM |
| e2e | Medium | Verification via `window.__rive_debug__` instead of DOM queries |
| e2e-investigate | Medium | Failures are binding mismatches, not DOM errors |
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

## Handoff Checklist

What the Rive developer needs to implement to match the XState spec:

```
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

## Resources

- Data Binding Runtime API: https://rive.app/docs/runtimes/data-binding
- Data Binding Editor: https://rive.app/docs/editor/data-binding/overview
- React Runtime: https://rive.app/docs/runtimes/react/react
- State Machines: https://rive.app/docs/runtimes/state-machines
- State Machine Layers: https://rive.app/docs/editor/state-machine/layers
- GitHub (rive-react): https://github.com/rive-app/rive-react
