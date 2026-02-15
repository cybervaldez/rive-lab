# Rive Scripting Activation Guide

When to activate Rive Scripting in a component, which protocol to use, and how to build the HTML/CSS renderer.

---

## When to Activate Scripting

Standard Data Binding (ViewModel properties, triggers, state machine) covers most components. Activate scripting only when the visual output is **procedural** — determined by runtime calculation, not predefined on a timeline.

| You need scripting when... | You don't need scripting when... |
|---------------------------|----------------------------------|
| Shape/count depends on data (charts, particles) | Animation follows a fixed timeline |
| Path varies per-frame (physics, organic strokes) | Properties are simple types (number, boolean, string) |
| Layout must adapt inside the artboard | Layout is fixed or handled by CSS |
| Value needs formatting for display | Raw value is displayed directly |
| Transition guard requires complex calculation | Guard is a simple boolean/number check |

**Rule of thumb**: If you can keyframe it in the Rive Editor, don't script it.

---

## Protocol Selection

When `/ux-planner` identifies a procedural pattern, choose the protocol:

### Node — Custom Drawing

**Activate when:** The component needs to draw shapes that don't exist at design time.

**Examples:** Particle effects, data-driven charts, procedural backgrounds, dynamic badges.

**What the script does:**
- Receives ViewModel properties (data from XState)
- Draws shapes in `draw()` using Rive's path/shape APIs
- Optionally handles pointer events (`pointerDown`, `pointerMove`, `pointerUp`)

**What XState provides:**
```typescript
// XState context carries the data the script needs
context: {
  dataPoints: [10, 45, 80, 30, 65],  // chart data
  particleCount: 20,                   // how many to spawn
  isActive: true,                      // trigger condition
}
```

**HTML/CSS renderer:**
```tsx
// SVG for charts
{data.map((v, i) => (
  <rect key={i} x={i * barWidth} y={height - v} width={barWidth - gap} height={v} />
))}

// CSS for particles
function spawnParticles(count: number) {
  return Array.from({ length: count }, (_, i) => (
    <div key={i} className="particle" style={{
      '--delay': `${Math.random() * 0.5}s`,
      '--angle': `${Math.random() * 360}deg`,
    } as React.CSSProperties} />
  ))
}
```

---

### PathEffect — Procedural Strokes

**Activate when:** A stroke or path needs per-frame variation that can't be keyframed.

**Examples:** Handwriting animation with pressure, glitch/distortion effects, wave progress.

**What the script does:**
- Receives the original path
- Returns a modified path in `processPath()`
- Can use ViewModel properties to control intensity/speed

**What XState provides:**
```typescript
context: {
  progress: 72,       // drives how far along the path
  intensity: 0.5,     // controls effect strength
}
```

**HTML/CSS renderer:**
```css
/* SVG stroke animation */
.progress-path {
  stroke-dasharray: 1000;
  stroke-dashoffset: calc(1000 - (var(--progress) * 10));
  transition: stroke-dashoffset 0.3s ease-out;
}

/* CSS glitch effect */
.glitch { animation: glitch 0.3s steps(3) infinite; }
@keyframes glitch {
  0% { clip-path: inset(20% 0 60% 0); transform: translateX(-2px); }
  50% { clip-path: inset(50% 0 20% 0); transform: translateX(2px); }
  100% { clip-path: inset(10% 0 80% 0); transform: translateX(0); }
}
```

---

### Layout — Custom Layout Logic

**Activate when:** Elements inside the Rive artboard need to reflow based on container size or data.

**Examples:** Responsive card grid inside animation, adaptive text layout, dynamic spacing.

**What the script does:**
- Calculates positions/sizes in `measure()`
- Positions child elements based on available space
- Can read ViewModel properties for layout parameters

**What XState provides:**
```typescript
context: {
  itemCount: 5,         // how many items to layout
  containerWidth: 400,  // available space (if dynamic)
}
```

**HTML/CSS renderer:**
```css
/* CSS Grid handles this natively */
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.5rem; }
```

**Note:** Layout inside Rive is rare. CSS Grid/Flexbox is usually simpler. Only activate when the layout must participate in Rive's animation system.

---

### Converter — Data Transformation

**Activate when:** A ViewModel property needs formatting before display in Rive (currency, units, percentage).

**Examples:** `0.75` → `"75%"`, `2500` → `"$2,500"`, `98.6` → `"37°C"`.

**What the script does:**
- Receives raw value in `convert()`
- Returns formatted value
- Optional `reverseConvert()` for bidirectional binding

**What XState provides:**
```typescript
context: {
  temperature: 98.6,  // raw value — XState doesn't format
  price: 2500,        // raw cents or units
}
```

**HTML/CSS renderer:**
```tsx
// JS formatting in the React component
<span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price / 100)}</span>
<span>{(temperature - 32) * 5/9}°C</span>
```

**Note:** For the HTML/CSS renderer, formatting lives in the React component. This is often simpler than a Rive Converter script.

---

### Transition Condition — Complex Guards

**Activate when:** A Rive state machine transition needs a guard that checks multiple ViewModel properties with logic beyond simple comparisons.

**Examples:** "Transition when velocity > 10 AND distance < 50 AND isEnabled", compound threshold checks.

**What the script does:**
- Evaluates complex conditions based on ViewModel properties
- Returns boolean to allow/block the transition

**What XState provides:**
```typescript
// XState already has guards — this is the Rive equivalent
guards: {
  canTransition: ({ context }) =>
    context.velocity > 10 && context.distance < 50 && context.isEnabled,
}
```

**HTML/CSS renderer:** XState guards handle this natively. No separate renderer needed — the XState standalone version already has the logic.

---

### Listener Action — Timed Side Effects

**Activate when:** A side effect (sound, haptic, analytics event) must fire at a precise animation frame, not at a state transition.

**Examples:** Sound effect when a ball bounces (mid-animation), haptic feedback on impact frame.

**What the script does:**
- Runs custom logic when a Rive listener fires
- Can fire Rive Events back to the runtime

**What XState provides:**
```typescript
// XState doesn't control per-frame timing — it receives the event
on: {
  bounce: { actions: 'playBounceSound' },
}
```

**HTML/CSS renderer:**
```typescript
// CSS animation event or setTimeout approximation
element.addEventListener('animationiteration', () => playSound());
```

---

### Test — In-Canvas Validation

**Activate when:** You want the `.riv` file itself to validate that ViewModel properties were received correctly.

**Examples:** Contract verification harness, round-trip confirmation, regression test inside the animation.

**What the script does:**
- Reads ViewModel properties
- Validates expected values
- Fires a Rive Event confirming success/failure

**What XState provides:**
```typescript
// XState sends known test values
actorRef.send({ type: 'SET_TEST_DATA', progress: 50, isActive: true });
// Then listens for confirmation event from the Test script
```

**HTML/CSS renderer:** Not applicable — this is a Rive-only testing concern. The HTML/CSS renderer is tested directly via the e2e pipeline.

---

## Contract Impact

Scripting does **not** change the XState ↔ Rive contract. The `meta` block, naming conventions, and handoff checklist in `techs/xstate/rive-wiring-conventions.md` remain the same.

Scripts may require **additional** context properties or events:

| Script Need | Contract Addition |
|------------|-------------------|
| Script reads data array | Add array/list to `contextProperties` in `meta` |
| Script fires confirmation event | Add event handler in XState machine |
| Script needs intensity/speed parameter | Add number property to context |
| Script needs trigger from XState | Add event type to machine |

These additions follow the same process as any contract expansion — add to `meta`, add to XState, designer reads the updated spec.

---

## Prompting Pattern

When prompting AI to build a component that needs scripting, include the scripting assessment from `/ux-planner` in the task description:

```
Build a progress bar with confetti burst on completion.

Scripting assessment:
- Confetti burst: Rive Node script for particle spawning
- HTML/CSS renderer: CSS @keyframes with JS-spawned <div> elements
- XState impact: Add `celebrate` trigger event

Everything else is standard Data Binding.
```

This tells `/create-task` to:
1. Build the XState machine with the `celebrate` event
2. Build the HTML/CSS renderer with CSS particle animation
3. Note in the handoff that the Rive designer will need a Node script

---

## See Also

- `techs/rive/README.md` — Scripting section (protocols, sandboxing, Rive Events API, anti-patterns)
- `techs/xstate/rive-wiring-conventions.md` — Data Binding contract (naming, binding directions, handoff checklist)
- `/ux-planner` — Scripting Assessment detection heuristics
