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
| Machine state node      | State machine state       |
| `window.__xstate__`     | `window.__rive_debug__`   |
| `actor.send(event)`     | `vm.trigger()`            |
| `actor.getSnapshot()`   | `vm.property.value`       |
| `inspect` + `subscribe` | Console log handshake     |

## Who Is This For

- **Developers using Rive** who need testable, observable animations — not just visual checks
- **Teams with a Rive designer + JS developer split** where XState serves as the living spec for handoff
- **AI-assisted development practitioners** who need the pipeline to verify GPU-opaque canvas behavior

## Quick Start

```bash
npm install
npm run dev
# Open http://localhost:5173
```

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

- techs/rive/README.md — Rive Data Binding protocol, sender/receiver logging, handoff checklist
- techs/xstate/README.md — XState machine patterns, round-trip logging convention, diagnosis table
- .claude/skills/SKILL_INDEX.md — Full pipeline reference

## Part of the Cybervaldez Playbook

Built on the Cybervaldez Playbook — a skill system for AI-assisted
development. https://github.com/cybervaldez/cybervaldez-playbook
