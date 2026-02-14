# rive-lab

Build interactive animated apps that AI can fully test — even when the canvas is opaque.

## How rive-lab Works

XState machines mirror Rive's Data Binding model — same property names,
same types, same triggers, same state names. The XState version IS the
app: AI iterates on it, the pipeline tests it, and the code self-documents
into Rive handoff instructions.

Why? Rive compiles to `.riv` binaries that AI cannot read. Canvas is opaque
to `agent-browser snapshot`. XState solves this by acting as the single brain —
every boundary crossing is logged via a 4-point handshake, so the pipeline can
prove every link in the chain is alive (see `techs/xstate/README.md`).

Dual-mode: The XState+HTML+CSS version works in production standalone.
Rive is an upgrade path, not a requirement. If Rive doesn't load, the
XState app is the fallback.

### The Flow

```
  Prompt AI ──> XState+HTML+CSS ──> Pipeline tests ──> Ship it
                     |                                    |
                     v                                    v
              Self-documents                      Works standalone
              handoff instructions                (production-ready)
                     |
                     v
              Rive developer builds .riv ──> Swap in ──> Same tests pass
```

### XState <-> Rive Contract

| XState (now)            | Rive (later)              |
|-------------------------|---------------------------|
| Context property        | ViewModel property        |
| Event type              | Trigger                   |
| State node              | State machine state       |
| `window.__xstate__`     | `window.__rive_debug__`   |
| `actor.send(event)`     | `vm.trigger()`            |
| `actor.getSnapshot()`   | `vm.property.value`       |
| `inspect` + `subscribe` | Console log handshake     |

### Machine Conventions

Every machine self-documents via `meta` and `description` fields so AI tools can parse structure and Rive designers can read the spec directly from code.

**Root `meta` block** — embedded in every machine definition:

```typescript
meta: {
  description: 'Drives a progress bar from idle through loading to complete.',
  contextProperties: {
    progress: { type: 'number', range: [0, 100], description: 'Maps to Rive Number property "progress".' },
    statusText: { type: 'string', description: 'Human-readable status label for the current state.' },
    isActive: { type: 'boolean', description: 'Maps to Rive Boolean property "isActive".' },
  },
  riveViewModel: 'ProgressBarVM',
  riveStateMachine: 'ProgressBarSM',
}
```

Every state node and transition carries a `description` string that documents its purpose. Every state handles `{ type: 'reset' }` targeting the initial state — this enables reproducible testing and pipeline resets from any point in the flow.

## Who Is This For

- **Developers using Rive** who need testable, observable animations — not just visual checks
- **Teams with a Rive designer + JS developer split** where XState serves as the living spec for handoff
- **AI-assisted development practitioners** who need the pipeline to verify GPU-opaque canvas behavior

## Quick Start

Live demo coming soon.

```bash
npm install
npm run dev
# Open http://localhost:5173
```

## Creating Components & Apps

Every UI idea in rive-lab becomes a **recipe** — either a component or an app.

### Components

Single-concern animations with one XState machine and one state graph.

Examples: progress bar, toggle switch, counter, star rating, button, slider.

| Property | Typical Range |
|----------|--------------|
| Context properties | 2–5 |
| States | 2–3 |
| Triggers | 1–2 |
| Rive layers | 1 (single layer) |
| XState shape | Flat states (`idle → loading → complete`) |

### Apps

Multi-concern experiences with one XState machine using parallel regions.

Examples: media player, dashboard, multi-step wizard, audio mixer.

| Property | Typical Range |
|----------|--------------|
| Context properties | 6+ (split across regions) |
| States | 4+ across parallel regions |
| Triggers | 3+ |
| Rive layers | Multiple (one per region) |
| XState shape | `type: 'parallel'` with region keys |

### How to Decide

| Signal | Component | App |
|--------|-----------|-----|
| Independent behaviors? | No — one concern | Yes — e.g. playback AND volume |
| Parallel state graphs? | No — linear states | Yes — `type: 'parallel'` |
| Rive layers needed? | One layer | Multiple layers |
| Context split? | All properties serve one purpose | Properties grouped by region |

### Prompting Flow

```
Describe your idea ──> /ux-planner ──> /create-task ──> Done
                        classifies       implements
                        component/app    machine + HTML/CSS + tests
```

### Example Prompts

**Component:**
```
I want a star rating widget. Users click 1-5 stars, the selected
stars fill with color, and there's a pulse animation on selection.
```

**App:**
```
I want a media player with independent playback and volume controls.
Play/pause/stop for audio, plus a separate mute toggle and volume slider.
```

**Component with scripting:**
```
I want a dashboard card that renders a mini bar chart from an array
of values, with a confetti burst when all values exceed the target.
```

For scripting edge cases (procedural visuals like particles, charts, physics), see `techs/rive/scripting-activation.md`.

## Pipeline Skills

| Skill           | What it does in rive-lab                                    |
|-----------------|-------------------------------------------------------------|
| /ux-planner     | Plan interactive component (the "recipe")                   |
| /create-task    | Build XState machine + HTML/CSS with tests                  |
| /coding-guard   | Flag XState anti-patterns, verify Rive contract compliance  |
| /cli-first      | Expose state via window.__xstate__ for pipeline             |
| /e2e            | Verify state transitions via agent-browser eval             |
| /research       | Research new technologies                                   |

## Project Structure

```
rive-lab/
├── src/              # React app (XState machines + HTML/CSS components)
├── tests/            # E2E tests (bash + agent-browser)
├── techs/
│   ├── rive/         # Rive Data Binding protocol + handoff checklist
│   └── xstate/       # XState patterns + Rive mapping conventions
└── .claude/skills/   # Playbook pipeline (14 skills)
```

## Further Reading

- techs/rive/README.md — Rive Data Binding protocol, scripting, sender/receiver logging, handoff checklist
- techs/rive/scripting-activation.md — When to activate Rive Scripting, protocol selection, HTML/CSS fallbacks
- techs/xstate/README.md — XState machine patterns, round-trip logging convention, diagnosis table
- techs/xstate/rive-wiring-conventions.md — Rive wiring conventions, naming, handoff checklist
- .claude/skills/SKILL_INDEX.md — Full pipeline reference

## Part of the Cybervaldez Playbook

Built on the Cybervaldez Playbook — a skill system for AI-assisted
development. https://github.com/cybervaldez/cybervaldez-playbook
