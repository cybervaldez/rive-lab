# Motion — Create Task Reference

Motion (formerly Framer Motion) is the project standard for all state-driven animations in the HTML renderer. When building components or apps, use Motion (not CSS `@keyframes`) for any animation triggered by state changes.

```tsx
import { motion, AnimatePresence } from "motion/react"
```

## Why Motion in This Project

The HTML renderer is built first by AI and serves as a **living behavioral reference** for Rive designers. CSS class toggles show what changes but not how it moves. Motion makes the transitions visible — a Rive designer opens the HTML renderer in a browser, interacts with it, observes how things move, and builds their own version in Rive.

The XState machine stays renderer-agnostic. It says *what* state is active. Motion says *how it looks* when state changes. The contract and `meta` block map data and events only — no animation specs.

## When to Use Motion vs CSS

| Trigger | Use | Example |
|---------|-----|---------|
| State change (XState context, component state) | Motion | Action activation, tab switch, overlay open |
| Conditional render (mount/unmount of content) | Motion + AnimatePresence | Tab content, modals, status messages |
| `:hover`, `:focus`, `:active` | CSS | Button hover, input focus ring |
| Static layout | CSS | Grid, flexbox, padding |

## Patterns

### Action/element activation (driven by XState context)

When an action enters `activeInputs` or a boolean state toggles, spring it:

```tsx
<motion.div
  animate={isActive
    ? { scale: 1.05, borderColor: "var(--color-accent)", background: "var(--color-accent-dim)" }
    : { scale: 1, borderColor: "var(--color-border)", background: "transparent" }
  }
  transition={{ type: "spring", stiffness: 300, damping: 20 }}
  data-testid={`action-${name}`}
>
```

### Tab/page content switching

Wrap tab content in `AnimatePresence mode="wait"` so the old content exits before the new content enters:

```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={activeTab}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.15 }}
  >
    {activeTab === 'live' && <LiveContent />}
    {activeTab === 'mapper' && <MapperContent />}
  </motion.div>
</AnimatePresence>
```

### Overlay/modal enter-exit

Wrap conditional renders in `AnimatePresence` so content animates out on unmount:

```tsx
<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      data-testid="overlay"
    >
      {children}
    </motion.div>
  )}
</AnimatePresence>
```

### Status/connection pulse

Replace CSS `@keyframes` pulse with Motion:

```tsx
<motion.span
  animate={{ opacity: [1, 0.5, 1] }}
  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
  data-testid="status-badge"
>
  reconnecting...
</motion.span>
```

### Staggered list entrance (scroll-triggered)

For landing pages or content sections that should animate in on scroll:

```tsx
import { motion, useInView } from "motion/react"

function Section({ children }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4 }}
    >
      {children}
    </motion.div>
  )
}
```

### Viewer page status transitions

When the viewer page moves between states (connecting → connected → ended → not_found):

```tsx
<AnimatePresence mode="wait">
  {status === 'connecting' && (
    <motion.div key="connecting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      Connecting...
    </motion.div>
  )}
  {status === 'connected' && content && (
    <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {content.value}
    </motion.div>
  )}
  {status === 'ended' && (
    <motion.div key="ended" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      Stream ended
    </motion.div>
  )}
</AnimatePresence>
```

## What NOT to Do

- **Don't add animation state to XState machine.** No `isAnimating`, no `animationPhase` in context.
- **Don't add animation metadata to machine `meta` block.** The contract maps data and events, not transitions.
- **Don't call `motion.create()` inside render functions.**
- **Don't use React state for continuously animated values.** Use `useMotionValue` instead.
- **Don't forget `AnimatePresence` for conditional renders** that should exit-animate.
- **Don't animate everything.** Only state changes that a Rive designer would need to see. Hover styles stay CSS.
- **Be consistent.** If one action indicator has a spring, all action indicators get springs. Inconsistency creates ambiguity for Rive designers.

## Testing Notes

- Motion animations **don't affect `data-testid` checks.** Element presence and text content work the same.
- Existing `sleep` / wait durations (1-4s) in tests are sufficient. Motion animations are typically 150-300ms.
- `AnimatePresence` keeps exiting elements briefly in the DOM. When testing, check for the **new** element's presence rather than asserting the old element is immediately gone.
- No need to disable animations in tests or mock Motion.

## Bundle Size

Motion adds ~34kb to the bundle (full), or ~4.6kb with LazyMotion + domAnimation. For rive-lab's Vite SPA with Rive runtime, 34kb is fine. Don't bother with LazyMotion unless bundle analysis says otherwise.
