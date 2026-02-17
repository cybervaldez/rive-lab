# Motion — Coding Guard Reference

Motion (formerly Framer Motion) is the project standard for all state-driven animations. CSS transitions remain appropriate for pseudo-state styling (`:hover`, `:focus`, `:active`).

## Convention: Motion for State Animations, CSS for Pseudo-States

**The rule:** If the animation is triggered by a state change that exists in component state or XState context, use Motion. If it's a CSS pseudo-state, keep it in CSS.

| Trigger | Tool | Example |
|---------|------|---------|
| XState context change (`activeInputs`, `activeTab`) | Motion | Action indicator springs to life |
| Component state change (`isOpen`, `status`) | Motion | Overlay fades in, status badge pulses |
| Conditional render (mount/unmount) | Motion + AnimatePresence | Tab content crossfade, modal enter/exit |
| `:hover` | CSS | Button background highlight |
| `:focus` | CSS | Input outline ring |
| `:active` | CSS | Button press depression |
| Static layout (grid, flexbox) | CSS | Column widths, padding, spacing |
| Scrollbar, cursor, outline | CSS | Utility styling |

**Litmus test:** Would a Rive designer need to see this transition to understand the interaction? If yes → Motion. If no → CSS.

## Anti-Patterns

### 1. CSS @keyframes for state-driven animation

```tsx
// BAD — CSS keyframe triggered by class toggle
className={isActive ? 'stream-flash' : ''}
```

```css
/* BAD — animation behavior invisible to component code */
@keyframes stream-flash {
  0% { box-shadow: 0 0 0 0 var(--color-accent); }
  50% { box-shadow: 0 0 12px 2px var(--color-accent); }
  100% { box-shadow: 0 0 0 0 var(--color-accent); }
}
```

```tsx
// GOOD — Motion driven by state, animation behavior readable in component
<motion.div
  animate={isActive
    ? { scale: 1.05, borderColor: "var(--color-accent)", background: "var(--color-accent-dim)" }
    : { scale: 1, borderColor: "var(--color-border)", background: "transparent" }
  }
  transition={{ type: "spring", stiffness: 300, damping: 20 }}
/>
```

### 2. Conditional render without AnimatePresence

```tsx
// BAD — hard mount/unmount, no exit animation
{isOpen && <Overlay />}

// BAD — tab content pops in with no transition
{activeTab === 'live' && <LiveContent />}
{activeTab === 'mapper' && <MapperContent />}
```

```tsx
// GOOD — exit animation preserved
<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
    >
      <Overlay />
    </motion.div>
  )}
</AnimatePresence>

// GOOD — tab crossfade
<AnimatePresence mode="wait">
  <motion.div key={activeTab}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.15 }}
  >
    {tabContent}
  </motion.div>
</AnimatePresence>
```

### 3. motion.create() inside render

```tsx
// BAD — creates new component every render, breaks animations
function Component() {
  const Box = motion.create('div')
  return <Box animate={{ opacity: 1 }} />
}

// GOOD — defined outside render
const Box = motion.create('div')
function Component() {
  return <Box animate={{ opacity: 1 }} />
}
```

### 4. React state for continuously animated values

```tsx
// BAD — triggers React re-render on every frame
const [x, setX] = useState(0)
onDrag={(e) => setX(e.clientX)}
<motion.div style={{ x }} />

// GOOD — MotionValue updates without re-renders
const x = useMotionValue(0)
onDrag={(e) => x.set(e.clientX)}
<motion.div style={{ x }} />
```

### 5. Animation state in XState context

```typescript
// BAD — animation concerns in state machine
context: {
  isAnimating: boolean,     // Motion's job, not XState's
  animationPhase: string,   // presentation concern
}

// BAD — animation events in machine
events: { type: 'ANIMATION_COMPLETE' }

// GOOD — machine stays renderer-agnostic
// Use Motion's onAnimationComplete callback in the component if needed
<motion.div onAnimationComplete={() => send({ type: 'STEP_DONE' })} />
```

### 6. Wrapping motion components in aggressive React.memo

```tsx
// BAD — memo prevents Motion from seeing animate prop changes
const Item = React.memo(({ isActive }) => (
  <motion.div animate={isActive ? "active" : "idle"} />
))

// GOOD — let Motion manage its own optimization
function Item({ isActive }) {
  return <motion.div animate={isActive ? "active" : "idle"} />
}
```

## When CSS Is Correct

These are NOT violations — CSS is the right tool here:

```css
/* Hover states — pseudo-state, not component state */
.demo-btn:hover { background: var(--color-bg-hover); }

/* Focus rings — accessibility styling */
.stream-api-custom-input:focus { outline: 1px solid var(--color-accent); }

/* Static layout transitions — not behavioral */
.resizable-panel { transition: width var(--duration-slow) var(--ease-out); }

/* Scrollbar, cursor, outline utility styling */
body { cursor: default; }
```

## Quick Audit Checklist

- [ ] No `@keyframes` used for state-driven animations (use Motion instead)
- [ ] Conditional renders for overlays/modals/tabs wrapped in `AnimatePresence`
- [ ] `motion.create()` not called inside render functions
- [ ] No `isAnimating` or animation phase tracking in XState context
- [ ] Motion import is `from "motion/react"` (not legacy `from "framer-motion"`)
- [ ] MotionValue used instead of React state for continuously animated values
