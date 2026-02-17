# Motion (formerly Framer Motion)

A production-grade animation library for React, JavaScript, and Vue by Matt Perry. Motion provides a declarative `<motion.div>` component that extends any HTML/SVG element with spring physics, layout animations, exit animations, gestures (hover/press/drag), scroll-linked effects, and timeline orchestration. Its hybrid engine combines the Web Animations API with JavaScript for 120fps GPU-accelerated animations. 18M+ monthly npm downloads, ~34kb full or ~4.6kb with LazyMotion tree-shaking.

## Domain Classification

| Domain | Applies |
|--------|---------|
| State Management | No |
| UI Components | Yes (secondary — gesture handling, layout transitions) |
| Data Fetching | No |
| Form Handling | No |
| Animation | Yes (primary) |
| Routing | No |
| Testing Tools | No |
| Build Tools | No |
| Styling | No |
| Auth | No |

## Pipeline Impact

Based on domain classification, these skills may need tech-specific references:

| Skill | Impact | Reason |
|-------|--------|--------|
| create-task | High | Components use `<motion.div>` with animate props driven by XState context. AnimatePresence for mount/unmount transitions. AI generates Motion animations as part of building the HTML renderer. |
| ux-planner | Medium | Motion enables spring physics, drag gestures, exit animations, scroll-linked effects — expands feasible interaction patterns. |
| ux-review | Medium | Animation timing, spring feel, and gesture responsiveness become observable behaviors to verify. |
| coding-guard | Medium | Anti-patterns to flag: motion.create() inside render, React state for animated values, missing AnimatePresence for exit animations. |
| e2e / e2e-guard | Medium | Animations add timing to state changes. Tests should wait for DOM state, not animation completion. data-testid checks remain the primary verification. |
| ui-planner | Low | Motion is behavioral, not visual design. |

## User's Use Case

Motion enhances the **self-documenting HTML renderer** in the rive-lab pipeline. The HTML renderer is built first by AI and serves as a living behavioral reference for Rive designers. Without Motion, state changes are binary CSS class toggles — a Rive designer sees "it turns green" but nothing about how it transitions. With Motion, the HTML renderer becomes a **playable animation demo** — the designer opens it in a browser, interacts with it, observes how things move, and builds their own elevated version in Rive.

Key principles established by team consultation:
- **Motion = living behavioral demo, not prescriptive spec.** Rive designers watch and interpret, they don't translate spring constants.
- **No animation metadata in XState machine.** The machine stays renderer-agnostic. It says *what* state is active. Motion says *how it looks*.
- **No animation specs in the recipe contract.** Contract maps data bindings and events only.
- **Animate meaningful state changes, not everything.** Action activation, tab transitions, content enter/exit, connection status changes.
- **Be consistent.** If one state change animates, all similar state changes should animate.

## Core Concepts

### motion component
The `<motion.div>`, `<motion.span>`, etc. components extend HTML elements with animation props. Animations are declarative — tied directly to React state/props.

```tsx
import { motion } from "motion/react"

<motion.div animate={{ opacity: 1, scale: 1 }} />
```

### AnimatePresence
Keeps components in the DOM during exit animations. Required for any conditional render that should animate out.

```tsx
import { motion, AnimatePresence } from "motion/react"

<AnimatePresence mode="wait">
  <motion.div key={activeTab}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.15 }}
  />
</AnimatePresence>
```

### Spring transitions
Physics-based springs replace CSS ease curves. Defined by stiffness and damping.

```tsx
<motion.div
  animate={isActive ? { scale: 1.05 } : { scale: 1 }}
  transition={{ type: "spring", stiffness: 300, damping: 20 }}
/>
```

### Variants
Named animation states that can be driven by parent state.

```tsx
const variants = {
  active: { scale: 1.05, borderColor: "var(--color-accent)" },
  idle: { scale: 1, borderColor: "var(--color-border)" },
}

<motion.div variants={variants} animate={isActive ? "active" : "idle"} />
```

### Hooks
- `useAnimate()` — imperative animation control scoped to a component
- `useInView()` — detects when element enters viewport (0.6kb)
- `useScroll()` — scroll-linked animations and parallax

### LazyMotion
Tree-shaking optimization. Reduces initial bundle from ~34kb to ~4.6kb.

```tsx
import { LazyMotion, domAnimation, m } from "motion/react"

<LazyMotion features={domAnimation}>
  <m.div animate={{ opacity: 1 }} />
</LazyMotion>
```

## Common Patterns

### XState context drives Motion animate prop
```tsx
// XState says WHAT is active, Motion handles HOW it looks
const isActive = activeInputs.includes(action)
<motion.div animate={isActive ? "active" : "idle"} variants={actionVariants} />
```

### AnimatePresence for tab/page transitions
```tsx
<AnimatePresence mode="wait">
  <motion.div key={currentView} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
</AnimatePresence>
```

### Overlay enter/exit
```tsx
<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
    />
  )}
</AnimatePresence>
```

## Anti-Patterns & Gotchas

- **Never call `motion.create()` inside a render function.** Creates a new component every render, breaking animations.
- **Don't use React state for continuously animated values.** Use MotionValue instead to avoid re-renders.
- **Don't use `animate` prop for layout changes.** Use the `layout` prop — it handles FLIP calculations.
- **Don't add animation state to XState context.** No `isAnimating`, no `animationPhase`. That's Motion's job.
- **Don't add `ANIMATION_COMPLETE` events to XState machines.** If needed, use Motion's `onAnimationComplete` callback to fire XState events from the component.
- **Don't wrap `<motion.div>` in aggressive `React.memo` with shallow comparison.** Motion needs re-renders when animate props change.
- **Don't animate everything.** Only meaningful state changes. Inconsistency (some transitions animate, similar ones don't) creates ambiguity for Rive designers reading the HTML renderer.

## Testing Considerations

- **E2E tests check DOM state, not animation state.** `data-testid` and element presence remain the primary verification.
- **Animations add timing.** A `sleep 0.5` after a state change may need slight increase if Motion adds a 150ms transition. In practice, existing waits (1-4s) already cover this.
- **AnimatePresence keeps exiting elements in DOM briefly.** If a test checks for element removal immediately after state change, it may still find the element during its exit animation. Use a short wait or check for the *new* element's presence instead.
- **No need to disable animations in tests.** The waits in the test framework are generous enough. Only consider it if tests become flaky due to animation timing.

## Resources

- Official docs: https://motion.dev/docs
- React docs: https://motion.dev/docs/react
- GitHub: https://github.com/motiondivision/motion
- npm: https://www.npmjs.com/package/motion
- Bundle size optimization: https://motion.dev/docs/react-reduce-bundle-size
- Performance guide: https://motion.dev/docs/performance
- AnimatePresence: https://motion.dev/docs/react-animate-presence
- Upgrade from Framer Motion: https://motion.dev/docs/react-upgrade-guide
