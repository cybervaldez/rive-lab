# Rive — UX Planner Reference

When planning UI in a rive-lab project, `/ux-planner` must classify the idea as a **component** or **app** and ask contract-aware questions. This reference is loaded automatically when the project uses Rive + XState.

---

## Classification Question (Ask Early)

After the user describes their idea, ask:

> "Is this a single-concern animation (component) or a multi-concern experience with independent behaviors (app)?"

If the user isn't sure, use the criteria below to classify for them.

---

## Component vs App Criteria

| Signal | Component | App |
|--------|-----------|-----|
| Independent behaviors? | No — one concern | Yes — e.g. playback AND volume |
| Parallel state graphs? | No — linear states | Yes — `type: 'parallel'` |
| Rive layers needed? | One layer | Multiple layers |
| Context properties | 2–5, single purpose | 6+, grouped by region |
| States | 2–3 | 4+ across parallel regions |

### Component Examples
Progress bar, toggle switch, counter, star rating, button, slider, badge, tooltip.

### App Examples
Media player, dashboard with multiple widgets, multi-step wizard, audio mixer, video editor timeline.

---

## Contract-Aware Questions

After classifying, ask these to shape the XState machine:

### For Components

1. **What does the user see?** → These become context properties (ViewModel properties)
   - "What values are displayed?" (numbers, strings, booleans)
   - "What ranges or constraints?" (0–100, true/false, enum values)

2. **What can the user do?** → These become events/triggers
   - "What actions are available?" (start, stop, toggle, increment)
   - "Any actions from the animation back to the app?" (onComplete, onToggled)

3. **What states does it go through?** → These become state nodes
   - "What's the starting state?" (idle, off, empty)
   - "What's the end state?" (complete, on, full)
   - "Any intermediate states?" (loading, animating, selecting)

### For Apps (Additional Questions)

4. **What are the independent concerns?** → These become parallel regions / Rive layers
   - "What behaviors run simultaneously?" (playback + volume, timer + settings)
   - "Can they change independently?" (muting doesn't pause playback)

5. **How do regions communicate?** → Shared context properties
   - "Does one concern affect another?" (playback speed affects visualizer)
   - "Are there cross-region guards?" (can't unmute while stopped)

---

## Scripting Assessment

After finalizing the recommendation, scan for procedural visual patterns using the detection heuristics in the main SKILL.md Scripting Assessment section.

**Quick check** — does the UX description mention any of these?

| Keyword | Implies Script |
|---------|---------------|
| particles, confetti, burst | Node script |
| chart, graph, bars from data | Node script |
| circular path, wave, organic | PathEffect script |
| spring, bounce, momentum | Node script |
| responsive within animation | Layout script |
| format as currency/percentage | Converter script |
| sound at exact frame | Listener Action script |

If yes, include the Scripting Assessment table in the handoff. If no, skip it.

---

## Handoff Additions for rive-lab

When handing off to `/create-task`, include these rive-lab-specific sections:

```markdown
### Classification
**Type:** Component / App
**Rationale:** [Why this is a component or app]

### Machine Shape
**States:** [list of state nodes]
**Context:** [list of properties with types]
**Events:** [list of triggers/events]
**Parallel regions:** [if app — list region names]

### Scripting Assessment
[Only if procedural visual patterns detected]
| Visual Pattern | Rive Protocol | HTML/CSS Fallback | XState Impact |
|...             |...            |...                |...            |
```

---

## What NOT to Plan

- **Rive-internal implementation** — don't prescribe how the designer builds the .riv
- **Script code** — don't write Luau; just identify that scripting is needed
- **Binding directions** — that's in `techs/xstate/rive-wiring-conventions.md`
- **Naming conventions** — that's in the wiring conventions doc

The UX planner defines **what the user experiences**. The contract docs define **how it's wired**.

---

## See Also

- `techs/rive/README.md` — Data Binding protocol, scripting, communication channels
- `techs/rive/scripting-activation.md` — Protocol selection, fallback patterns
- `techs/xstate/rive-wiring-conventions.md` — Naming, binding directions, handoff checklist
