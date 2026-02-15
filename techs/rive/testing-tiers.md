# Testing Tiers: XState ↔ Rive Contract Verification

The rive-lab test wizard walks through each recipe's instruct steps and verifies the XState ↔ Rive contract automatically. Verification is organized into three tiers based on what they check and what infrastructure they require.

---

## Overview

| Tier | What It Checks | Rive Loaded? | Canvas Needed? | Status |
|------|---------------|:---:|:---:|--------|
| **Tier 1: Contract** | ViewModel properties exist, types match, XState context flows | Loaded (headless) | No | **Implemented** |
| **Tier 2: Runtime** | Triggers consumed, Rive Events fire, nested VM propagation | Loaded + `advance()` loop | No (but needs runtime ticking) | **Proposed** |
| **Tier 3: Interactive** | Hit testing, Target→Source flow, visual correctness | Full canvas + pointer | Yes | **Proposed** |

**Where each tier runs:**

| Concern | Where |
|---------|-------|
| Running verification checks | **Test Wizard** (modal with step-by-step checklist) |
| Displaying live XState state | **Debug Panel** (StateGraph + ContextInspector + EventLog) |
| Rendering Rive canvas | **Debug Panel** (future Rive section — collapsible, loads when URL provided) |
| Interactive testing (clicks, drags) | **Debug Panel** Rive canvas |
| Visual confirmation | Developer eyes on Debug Panel — verdict recorded in Test Wizard |

```
+--- Debug Panel (right side) --+   +--- Test Wizard (modal) -------+
|                                |   |                                |
|  ┌─ Rive (collapsible) ─────┐ |   |  Step 2: Wire transitions     |
|  │ URL: [https://...riv____] │ |   |                                |
|  │ ┌───────────────────────┐ │ |   |  Tier 1: Contract              |
|  │ │  [Rive canvas]        │ │ |   |  ✓ context.progress exists     |
|  │ └───────────────────────┘ │ |   |  ✓ vm:progress:number          |
|  │ VM: progress=42           │ |   |                                |
|  └───────────────────────────┘ |   |  Tier 2: Runtime               |
|  ── State Graph ──             |   |  ○ trigger:start→Loading       |
|  ● idle  ○ loading             |   |  [run runtime tests]           |
|  ── Context ──                 |   |                                |
|  progress: 42                  |   |  Tier 3: Interactive           |
|  isActive: true                |   |  ○ visual:bar fills to 100%   |
|  ── Event Log ──               |   |  [run with canvas]            |
|  14:23:01  INCREMENT           |   |                                |
+--------------------------------+   +--------------------------------+
```

---

## Tier 1: Contract (Headless)

Contract verification checks the **data shape** — does the XState machine and Rive ViewModel agree on property names, types, and flow? No Rive canvas is needed. Checks run against `window.__xstate__[machineId]` and the loaded ViewModel instance.

### What It Checks

| Check | What Passes |
|-------|-------------|
| Context property exists | XState context has the named property |
| State is reachable | Machine config contains the named state |
| Event is accepted | Machine accepts the named event type |
| Event transitions to state | Firing the event produces the expected state |
| ViewModel property exists | `.riv` ViewModel has the named property |
| ViewModel property type matches | Property type matches expected (Number, String, Boolean, Trigger) |
| Context-to-ViewModel binding | XState context property maps to ViewModel property |

### Verification Key Syntax

These keys go in the `verifies[]` array of each `InstructStep` in `recipes.ts`.

| Key | Category | What It Checks | Example |
|-----|----------|----------------|---------|
| `context.{prop}` | on-load | XState context property exists | `context.progress` |
| `state:{name}` | on-load | XState state is reachable | `state:idle` |
| `event:{name}` | on-load | XState event type is accepted | `event:INCREMENT` |
| `event:{name}->{state}` | event-driven | Fire event, verify state transition | `event:start->loading` |
| `vm:{prop}:{type}` | on-load | ViewModel property exists with type | `vm:progress:number` |
| `vm-bind:{ctxProp}->{vmProp}` | on-load | Context property maps to ViewModel property | `vm-bind:progress->progress` |

**Types for `vm:` keys:** `number`, `string`, `boolean`, `trigger`, `enum`, `color`, `image`

### What the Designer Prepares

Before Tier 1 tests will pass:

```
[ ] ViewModel named {ComponentName}VM (matches meta.riveViewModel)
[ ] State machine named {ComponentName}SM (matches meta.riveStateMachine)
[ ] Every context property exists as a ViewModel property (same name, same type)
[ ] Every trigger event exists as a ViewModel trigger (same name)
[ ] Binding directions set correctly (source→target for JS-driven, target→source for Rive-driven)
```

### Example

For a progress-bar recipe:

```typescript
instruct: [
  {
    step: 'Create ViewModel',
    detail: 'Add a ViewModel named ProgressBarVM to the artboard',
    verifies: [
      'state:idle',                        // Tier 1: state exists
      'vm:progress:number',                // Tier 1: ViewModel property
      'vm-bind:progress->progress',        // Tier 1: binding mapped
    ],
  },
  {
    step: 'Wire transitions',
    detail: 'start trigger → idle→loading, reset trigger → any→idle',
    verifies: [
      'event:start->loading',              // Tier 1: event-driven check
      'event:reset->idle',                 // Tier 1: event-driven check
    ],
  },
]
```

---

## Tier 2: Runtime (Proposed)

Runtime verification checks **behavioral correctness** — does the Rive state machine actually consume triggers and fire events? This requires the Rive runtime loaded with an `advance()` loop running, but NOT a visible canvas.

### What It Checks

| Check | What Passes |
|-------|-------------|
| Trigger consumed | Firing a trigger causes the Rive state machine to transition |
| Trigger transitions to Rive state | After trigger, Rive SM is in the expected state |
| ViewModel property value | After an event, ViewModel property equals expected value |
| Nested ViewModel propagation | Parent ViewModel property flows to nested artboard ViewModel |

### Why `advance()` Is Required

Triggers are **frame-dependent**. When you set a trigger via `vmi.trigger('start')`, the Rive state machine only reads it during the next `advance(dt)` call. Without advancing, the trigger is set but never consumed — the Rive SM stays in its previous state.

```
Without advance():
  vmi.trigger('start') → trigger = true → Rive SM still in "idle" ✗

With advance():
  vmi.trigger('start') → trigger = true → advance(0.016) → Rive SM transitions to "loading" ✓
```

### Verification Key Syntax (Proposed)

> **Note:** These keys are proposed specifications. They are NOT yet implemented in `useTestWizard`. When implemented, they will require a loaded `.riv` file (Rive URL provided in the debug panel).

| Key | Category | What It Checks | Example |
|-----|----------|----------------|---------|
| `trigger:{name}` | runtime | Trigger consumed by Rive SM after advance | `trigger:start` |
| `trigger:{name}->{riveState}` | runtime | Trigger transitions Rive SM to state | `trigger:start->Loading` |
| `vm-value:{prop}={value}` | runtime | ViewModel property equals expected value | `vm-value:progress=100` |
| `vm-nested:{parent}.{child}:{type}` | runtime | Nested artboard ViewModel property exists | `vm-nested:Slider.fillAmount:number` |

### Edge Cases

**Simultaneous property updates (race conditions):**
When XState updates multiple context properties in a single transition (e.g., `assign({ progress: 100, isComplete: true })`), the order they reach the ViewModel matters. The Rive state machine may see an intermediate state between frames:

```
Frame N:   progress = 100, isComplete = false   (progress updated first)
Frame N+1: isComplete = true                     (arrives next frame)
```

**Nested artboard ViewModel propagation:**
Complex `.riv` files with nested artboards (components) have their own ViewModels. The parent ViewModel binds to the child's ViewModel properties. Nested binding only propagates after `advance()` — headless ViewModel checking only sees the parent level.

### What the Designer Prepares

In addition to Tier 1:

```
[ ] Triggers wired to Rive state machine transitions in the Rive Editor
[ ] Rive state machine state names documented (may differ from XState state names)
[ ] Nested artboard ViewModels accessible from parent
[ ] Property names match exactly — no abbreviations or renames
[ ] Each trigger produces a single, deterministic state transition
```

---

## Tier 3: Interactive (Proposed)

Interactive verification checks the **full round-trip** — including visual output, pointer interactions, and Rive Events firing back to the host. This requires a visible, rendered Rive canvas that the developer can see and interact with.

### What It Checks

| Check | What Passes |
|-------|-------------|
| Rive Event fires to host | Rive animation fires a named event (General or OpenUrl) |
| Rive state machine state | Rive SM is in the expected state (via runtime query) |
| Hit testing | Clicking a named element in the Rive canvas triggers a response |
| Visual correctness | Developer confirms the animation looks correct (manual checkpoint) |

### Why Canvas + Pointer Is Required

| Scenario | Why Headless Fails |
|----------|-------------------|
| **Rive Events at specific frames** | Events fire during `advance()` at animation-time-dependent moments — you need the animation to actually play through |
| **Target→Source properties** | The value originates inside Rive (e.g., user drags a slider). No way to set this from JS — the Rive renderer must process the interaction |
| **Hit testing** | Pointer events go through the canvas hit-test system. `pointerDown` on a Rive button fires a listener that triggers a state change — no DOM equivalent |
| **Text Run visual correctness** | Binding a string to a Text Run renders inside the canvas. The ViewModel property is "set" correctly, but the text may be truncated, use wrong font, or overflow — only visible in the canvas |
| **Layout-responsive artboards** | Rive Layout adapts to container size. Different sizes activate different layout modes — verifying this requires a sized canvas |

### Verification Key Syntax (Proposed)

> **Note:** These keys are proposed specifications. They are NOT yet implemented. When implemented, they will require a loaded `.riv` file rendered in the debug panel's Rive canvas.

| Key | Category | What It Checks | Example |
|-----|----------|----------------|---------|
| `rive-event:{name}` | interactive | Rive fires named event to host | `rive-event:onComplete` |
| `rive-state:{smName}:{state}` | interactive | Rive SM is in expected state | `rive-state:ProgressBarSM:Loading` |
| `hit-test:{target}` | interactive | Clicking named Rive element triggers response | `hit-test:PlayButton` |
| `visual:{description}` | interactive (manual) | Developer confirms visual output | `visual:progress bar fills to 100%` |

**`visual:` keys are special:** They don't auto-pass or auto-fail. The test wizard shows the description and two buttons — **confirm** and **reject** — and the developer looks at the debug panel's Rive canvas to make the call.

### Edge Cases

**Rive input events (pointer hit testing):**
For interactive Rive components (buttons, toggles, sliders inside Rive), hit testing happens inside the canvas. Clicking a Rive button fires a Rive listener → triggers a state change → fires a Rive Event or trigger → JS receives it → sends XState event. The full chain requires canvas + pointer.

**Target→Source property flow:**
Some ViewModel properties flow from Rive to JS (e.g., a slider value). Testing this requires either user interaction with the canvas or a Rive animation that programmatically moves the element. The value cannot be set from JS.

**Text Run and font verification:**
When binding a string to a Text Run, the string value is set correctly in the ViewModel but may render incorrectly (wrong font loaded, text overflow, missing glyph). Only visual inspection catches this.

### What the Designer Prepares

In addition to Tier 1 and Tier 2:

```
[ ] Rive Events created in the Rive Editor for animation milestones (e.g., onComplete)
[ ] Rive Events carry correct metadata (name, custom properties)
[ ] Clickable/interactive elements named clearly (for hit-test verification)
[ ] Target→Source binding direction set for Rive-driven properties
[ ] Text Runs sized with enough room for expected content
[ ] Layout modes tested at different container sizes in the Rive Editor
[ ] deterministicMode tested — animations produce repeatable results
```

---

## Verification Key Reference

Complete syntax table across all three tiers:

### Tier 1 — Contract (Implemented)

| Key | Example | Auto? | Rive Needed? |
|-----|---------|:---:|:---:|
| `context.{prop}` | `context.progress` | Yes | No |
| `state:{name}` | `state:idle` | Yes | No |
| `event:{name}` | `event:INCREMENT` | Yes | No |
| `event:{name}->{state}` | `event:start->loading` | Yes (event-driven) | No |
| `vm:{prop}:{type}` | `vm:progress:number` | Yes | Yes (loaded) |
| `vm-bind:{ctx}->{vm}` | `vm-bind:progress->progress` | Yes | Yes (loaded) |

### Tier 2 — Runtime (Proposed)

| Key | Example | Auto? | Rive Needed? |
|-----|---------|:---:|:---:|
| `trigger:{name}` | `trigger:start` | Yes | Yes (loaded + advance) |
| `trigger:{name}->{state}` | `trigger:start->Loading` | Yes | Yes (loaded + advance) |
| `vm-value:{prop}={value}` | `vm-value:progress=100` | Yes | Yes (loaded + advance) |
| `vm-nested:{p}.{c}:{type}` | `vm-nested:Slider.fillAmount:number` | Yes | Yes (loaded + advance) |

### Tier 3 — Interactive (Proposed)

| Key | Example | Auto? | Rive Needed? |
|-----|---------|:---:|:---:|
| `rive-event:{name}` | `rive-event:onComplete` | Yes (time-based) | Yes (canvas + advance) |
| `rive-state:{sm}:{state}` | `rive-state:Main:Loading` | Yes | Yes (canvas + advance) |
| `hit-test:{target}` | `hit-test:PlayButton` | Yes (pointer sim) | Yes (canvas + pointer) |
| `visual:{desc}` | `visual:bar fills to 100%` | **No** (manual) | Yes (canvas) |

---

## Designer Checklist

A consolidated per-tier checklist. Complete each tier in order — Tier 2 builds on Tier 1, Tier 3 builds on Tier 2.

### Tier 1 (Required for all recipes)

```
[ ] Read machine meta block — confirm ViewModel name and StateMachine name match
[ ] Create ViewModel with matching name ({ComponentName}VM)
[ ] Create State Machine with matching name ({ComponentName}SM)
[ ] Add every context property as a ViewModel property (same name, same type)
[ ] Add every trigger event as a ViewModel trigger (same name)
[ ] Set binding directions correctly per property
[ ] Wire universal reset trigger from every state back to initial
```

### Tier 2 (Required when recipe uses triggers or nested artboards)

```
[ ] Triggers wired to state machine transitions in Rive Editor
[ ] Each trigger produces deterministic state transition
[ ] Rive state machine state names documented
[ ] Nested artboard ViewModels accessible and named
[ ] Test with deterministicMode enabled
```

### Tier 3 (Required when recipe uses interactive Rive elements or Rive Events)

```
[ ] Rive Events created for animation milestones
[ ] Rive Events carry correct metadata (name, properties)
[ ] Interactive elements named for hit-test targeting
[ ] Target→Source properties configured for Rive-driven values
[ ] Text Runs sized for expected content
[ ] Layout modes verified at target container sizes
[ ] Full round-trip tested: Rive interaction → Event → XState → context update → ViewModel → animation
```

---

## Implementation Roadmap

| Phase | What | Depends On |
|-------|------|-----------|
| **Now** | Tier 1 verify keys work (`context.*`, `state:*`, `event:*`) | Already implemented |
| **Phase 2** | Add `vm:` and `vm-bind:` verify keys (Tier 1 extension) | `@rive-app/react-webgl2` added to project |
| **Phase 3** | Debug panel Rive section (URL input + canvas + VM readout) | Debug panel exists (done) |
| **Phase 4** | Tier 2 verify keys (`trigger:*`, `vm-value:*`) | Phase 2 + 3 |
| **Phase 5** | Tier 3 verify keys (`rive-event:*`, `hit-test:*`, `visual:*`) | Phase 4 |

---

## Internal Docs

- `techs/rive/README.md` — Data Binding protocol, ViewModel types, communication channels
- `techs/rive/scripting-activation.md` — When to activate scripting, protocol selection
- `techs/xstate/rive-wiring-conventions.md` — Naming conventions, handoff checklist
