# Rive — Create Task Reference

When implementing a rive-lab recipe, `/create-task` uses this reference to scaffold the correct XState machine structure, HTML/CSS renderer, and test file based on whether the recipe is a **component** or **app**.

---

## Recipe Types

### Component (Single-Concern)

**Machine shape:** Flat states with linear transitions.

```typescript
const machine = setup({
  types: {
    context: {} as { progress: number; isActive: boolean },
    events: {} as { type: 'start' } | { type: 'reset' },
  },
}).createMachine({
  id: 'ProgressBarSM',
  initial: 'idle',
  context: { progress: 0, isActive: false },
  meta: {
    description: 'Drives a progress bar from idle through loading to complete.',
    riveViewModel: 'ProgressBarVM',
    riveStateMachine: 'ProgressBarSM',
    contextProperties: {
      progress: { type: 'number', range: [0, 100], description: 'Maps to Rive Number property "progress".' },
      isActive: { type: 'boolean', description: 'Maps to Rive Boolean property "isActive".' },
    },
  },
  states: {
    idle: {
      description: 'Initial resting state.',
      on: { start: 'loading', reset: 'idle' },
    },
    loading: {
      description: 'Animation in progress.',
      on: { complete: 'complete', reset: 'idle' },
    },
    complete: {
      description: 'Animation finished.',
      on: { reset: 'idle' },
    },
  },
});
```

**File structure:**
```
src/machines/{name}.ts        # XState machine with meta block
src/components/{Name}Demo.tsx  # HTML/CSS renderer + demo controls
```

**Recipe data fields:**
```typescript
{
  type: 'component',
  // 2-5 context properties
  // 2-3 states
  // 1-2 triggers
  // Single Rive layer (no layers field needed)
}
```

### App (Multi-Concern)

**Machine shape:** Parallel regions with independent state graphs.

```typescript
const machine = setup({
  types: {
    context: {} as {
      currentTime: number; isPlaying: boolean;  // playback region
      volumeLevel: number; isMuted: boolean;    // volume region
    },
    events: {} as
      | { type: 'play' } | { type: 'pause' } | { type: 'stop' }
      | { type: 'mute' } | { type: 'unmute' },
  },
}).createMachine({
  id: 'MediaPlayerSM',
  type: 'parallel',
  context: { currentTime: 0, isPlaying: false, volumeLevel: 80, isMuted: false },
  meta: {
    description: 'Media player with independent playback and volume control.',
    riveViewModel: 'MediaPlayerVM',
    riveStateMachine: 'MediaPlayerSM',
    contextProperties: {
      currentTime: { type: 'number', range: [0, 300], description: 'Playback position in seconds.' },
      isPlaying: { type: 'boolean', description: 'Whether media is playing.' },
      volumeLevel: { type: 'number', range: [0, 100], description: 'Volume level.' },
      isMuted: { type: 'boolean', description: 'Whether audio is muted.' },
    },
  },
  states: {
    playback: {
      initial: 'stopped',
      states: {
        stopped: { description: 'No playback.', on: { play: 'playing', reset: 'stopped' } },
        playing: { description: 'Audio playing.', on: { pause: 'paused', stop: 'stopped', reset: 'stopped' } },
        paused: { description: 'Playback paused.', on: { play: 'playing', stop: 'stopped', reset: 'stopped' } },
      },
    },
    volume: {
      initial: 'unmuted',
      states: {
        unmuted: { description: 'Audio audible.', on: { mute: 'muted', reset: 'unmuted' } },
        muted: { description: 'Audio muted.', on: { unmute: 'unmuted', reset: 'unmuted' } },
      },
    },
  },
});
```

**File structure:**
```
src/machines/{name}.ts        # XState machine with parallel regions
src/components/{Name}Demo.tsx  # Multi-panel HTML/CSS renderer
```

**Recipe data fields:**
```typescript
{
  type: 'app',
  // 6+ context properties split across regions
  // 4+ states across parallel regions
  // 3+ triggers
  // Multiple Rive layers (one per parallel region)
}
```

---

## Scaffolding Checklist

When `/create-task` implements a recipe, verify:

### Machine File

- [ ] Machine `id` follows `{ComponentName}SM` pattern
- [ ] Root `meta` block has `description`, `riveViewModel`, `riveStateMachine`, `contextProperties`
- [ ] Every context property listed in `meta.contextProperties` with type and description
- [ ] Every state node has a `description` string
- [ ] Every state handles `{ type: 'reset' }` targeting the initial state
- [ ] App machines use `type: 'parallel'` with named region keys

### Demo Component

- [ ] Renders current state from XState snapshot
- [ ] Provides controls for each trigger/event
- [ ] Displays context properties relevant to the user
- [ ] Works as standalone HTML/CSS (no Rive dependency)

### Recipe Data (`src/lib/recipes.ts`)

- [ ] `type` is `'component'` or `'app'`
- [ ] `contract` array maps every XState concept to its Rive equivalent
- [ ] `events` array lists all ViewModel properties and triggers with directions
- [ ] `instruct` array has step-by-step Rive wiring instructions
- [ ] `readout` array defines what the top bar displays

### Test File (`tests/test_{name}.sh`)

- [ ] Verifies initial state renders
- [ ] Verifies each trigger/event produces expected state transition
- [ ] Verifies reset returns to initial state
- [ ] No JS errors on the page

---

## Scripting Considerations

If `/ux-planner` included a Scripting Assessment in the handoff:

1. **HTML/CSS renderer** — implement the procedural visual using the specified renderer approach (SVG, CSS animations, canvas, JS formatting)
2. **XState machine** — add any additional context properties or events the script needs
3. **Instruct steps** — add a step noting the Rive designer will need a script (e.g. "Add Node script for confetti burst on completion state")
4. **Don't write Luau** — the script code is the Rive designer's concern

See `techs/rive/scripting-activation.md` for protocol details and renderer patterns.

---

## Machine Registration

After creating the machine file, register it in `src/machines/index.ts`:

```typescript
import { progressBarMachine } from './progressBar'
import { newComponentMachine } from './newComponent'  // add

export const machines: Record<string, AnyStateMachine> = {
  'progress-bar': progressBarMachine,
  'new-component': newComponentMachine,  // add
}
```

---

## See Also

- `techs/rive/README.md` — Data Binding protocol, scripting, communication channels
- `techs/rive/scripting-activation.md` — Protocol selection, renderer patterns
- `techs/xstate/rive-wiring-conventions.md` — Naming, binding directions, handoff checklist
- `techs/xstate/README.md` — XState patterns, parallel states, round-trip logging
