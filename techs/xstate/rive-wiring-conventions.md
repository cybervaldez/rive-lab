# Rive Wiring Conventions

How to wire a `.riv` file so it matches the XState machine contract.

---

## Naming Conventions

| Rive element       | XState equivalent          | Example                          |
|--------------------|----------------------------|----------------------------------|
| ViewModel          | Machine (root)             | `ProgressBarVM` ↔ `ProgressBarSM` |
| ViewModel property | `context` property         | `progress` (Number) ↔ `context.progress` |
| Trigger            | Event                      | trigger `start` ↔ `{ type: 'start' }` |
| State Machine      | Machine `id`               | `ProgressBarSM`                  |
| State              | State node                 | `idle`, `loading`, `complete`    |
| Layer              | Parallel region (XState `type: 'parallel'`) | `playback` layer, `volume` layer |

Names must match **exactly** (case-sensitive) across Rive and XState.

---

## Binding Directions

| Direction          | Arrow         | Who drives?                      | Use for                          |
|--------------------|---------------|----------------------------------|----------------------------------|
| Source → Target    | JS → Rive     | JavaScript sets the value        | `context.progress`, `context.isActive` |
| Target → Source    | Rive → JS     | Rive animation sets the value    | Rive-driven values read by JS    |
| Bidirectional      | JS ↔ Rive     | Either side can update           | Rare — avoid unless necessary    |

Default direction for most properties is **Source → Target** (JS drives Rive).

---

## Trigger Wiring

### JS → Rive (Source → Target)

XState sends an event; Rive receives it as a trigger.

```
JS:   actorRef.send({ type: 'start' })
Rive: trigger "start" fires → transition idle → loading
```

The trigger name in Rive must match the XState event `type` string exactly.

### Rive → JS (Target → Source)

Rive fires a trigger from an animation; JS translates it into an XState event.

Convention: prefix Rive-originated triggers with `on` (e.g., `onComplete`, `onToggled`).

```
Rive: fires trigger "onComplete"
JS:   riveInstance.on(RiveEvent, (e) => actorRef.send({ type: 'complete' }))
```

### General-Purpose Rive Event Pattern

For reusable Rive components that don't know their XState context, use:

- **Trigger**: `onRiveEvent` (generic, always the same name)
- **String property**: `riveEventPayload` (carries the event name or JSON)

The JS integration layer translates via an event map:

```typescript
const eventMap: Record<string, string> = {
  'progress-complete': 'complete',
  'toggle-done': 'toggle',
}

riveInstance.on(RiveEvent, (e) => {
  const payload = viewModel.getString('riveEventPayload')
  const xstateEvent = eventMap[payload]
  if (xstateEvent) actorRef.send({ type: xstateEvent })
})
```

---

## State Wiring

- State names in Rive must match XState state node names exactly.
- Transitions in the Rive state machine should map 1:1 to XState transitions.
- Every machine must support a universal **`reset`** event:
  - Every state node must handle `{ type: 'reset' }` targeting the initial state.
  - In Rive, wire the `reset` trigger from every state back to the initial state.

| XState transition          | Rive wiring                              |
|----------------------------|------------------------------------------|
| `idle → loading` on `start` | trigger `start` on `idle` → `loading`   |
| `loading → idle` on `reset` | trigger `reset` on `loading` → `idle`   |
| `* → idle` on `reset`       | trigger `reset` on every state → `idle` |

---

## Layer Wiring (Parallel Regions)

When an XState machine uses `type: 'parallel'`, each parallel region maps to a **Rive layer**:

```
XState:
  states: {
    playback: { type: 'parallel-child', states: { stopped, playing, paused } },
    volume:   { type: 'parallel-child', states: { unmuted, muted } },
  }

Rive:
  Layer "playback" → states: stopped, playing, paused
  Layer "volume"   → states: unmuted, muted
```

All layers share the same ViewModel — context properties are global to the machine.

---

## Machine Self-Documentation Convention

Every XState machine must include structured metadata so AI tools can generate instruct steps and verify wiring automatically.

### Root `meta` block

```typescript
meta: {
  description: 'One-line purpose of the machine.',
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
  },
  riveViewModel: 'ProgressBarVM',
  riveStateMachine: 'ProgressBarSM',
}
```

### State `description`

Every state node must have a `description`:

```typescript
idle: {
  description: 'Initial resting state — progress is 0, nothing animating.',
  on: { ... }
}
```

### Transition `description`

Every transition must have a `description`:

```typescript
start: {
  description: 'Kick off the loading sequence.',
  target: 'loading',
  actions: assign({ ... }),
}
```

---

## Handoff Checklist

Before giving a machine definition to a Rive designer, verify:

- [ ] Machine has root `meta` with `description`, `contextProperties`, `riveViewModel`, `riveStateMachine`
- [ ] Every state node has a `description`
- [ ] Every transition has a `description`
- [ ] Every state handles `{ type: 'reset' }` targeting the initial state
- [ ] Context property names match planned Rive ViewModel property names exactly
- [ ] Event type strings match planned Rive trigger names exactly
- [ ] State node names match planned Rive state names exactly
- [ ] Parallel regions (if any) are documented with their layer names
- [ ] `riveViewModel` and `riveStateMachine` names are agreed upon
- [ ] Rive-originated events follow the `on`-prefix convention (`onComplete`, `onToggled`)
