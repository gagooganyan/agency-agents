---
name: framer-motion
description: Framer Motion animation expert. Use when building any animated React UI — enforces purposeful motion, correct API usage, and performance-safe patterns.
---

# Framer Motion Skill

## Core Principle
Animation exists to communicate — not decorate. Every motion must answer: what changed, where did it go, what should the user focus on now?

## API Essentials

### motion components
- Replace HTML tags with `motion.*` equivalents: `<motion.div>`, `<motion.button>`, `<motion.ul>`
- Use `initial`, `animate`, `exit` props for declarative state transitions
- Use `whileHover`, `whileTap`, `whileFocus` for interaction states

### Variants (preferred for complex UIs)
```tsx
const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}
const item = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
}
// <motion.ul variants={container} initial="hidden" animate="visible">
//   <motion.li variants={item} />
```

### AnimatePresence
- Wrap any component that conditionally mounts/unmounts
- Always provide `key` prop to the child being animated
- Use `mode="wait"` when outgoing animation must complete before incoming starts
```tsx
<AnimatePresence mode="wait">
  {show && <motion.div key="panel" exit={{ opacity: 0 }} />}
</AnimatePresence>
```

### useMotionValue + useTransform
- Use for scroll-linked or pointer-linked animations
- Never derive transforms inside render — use `useTransform` hook
```tsx
const { scrollYProgress } = useScroll()
const scale = useTransform(scrollYProgress, [0, 1], [1, 1.2])
```

### Layout animations
- Add `layout` prop to animate size/position changes automatically
- Use `layoutId` to animate shared elements between views (hero expand, tab indicator)
- Wrap in `<LayoutGroup>` when multiple elements share layout IDs

## Timing Rules
| Context | Duration | Easing |
|---|---|---|
| Micro (hover, tap) | 100–150ms | `easeOut` |
| UI transitions | 200–300ms | `[0.4, 0, 0.2, 1]` (material) |
| Page transitions | 300–450ms | `[0.22, 1, 0.36, 1]` |
| Stagger children | 60–100ms per item | `easeOut` |

Never exceed 500ms unless it's a deliberate slow reveal.

## Performance Rules
- Never animate `width`, `height`, `top`, `left`, `margin` — triggers layout
- Safe to animate: `opacity`, `transform` (x, y, scale, rotate)
- Use `will-change: transform` sparingly — add it, measure, remove if no gain
- Disable animations for `prefers-reduced-motion`:
```tsx
const shouldAnimate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
// OR: use framer-motion's built-in
import { useReducedMotion } from 'framer-motion'
const reduced = useReducedMotion()
```

## Common Patterns

### Fade + slide in on mount
```tsx
<motion.div
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.25, ease: 'easeOut' }}
/>
```

### Staggered list
```tsx
<motion.ul variants={container} initial="hidden" animate="visible">
  {items.map(item => <motion.li key={item.id} variants={itemVariant} />)}
</motion.ul>
```

### Tab/route transition
```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={route}
    initial={{ opacity: 0, x: 24 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -24 }}
    transition={{ duration: 0.22 }}
  />
</AnimatePresence>
```

### Drag-to-dismiss
```tsx
<motion.div
  drag="y"
  dragConstraints={{ top: 0 }}
  onDragEnd={(_, info) => {
    if (info.offset.y > 100) onDismiss()
  }}
/>
```

## Anti-patterns to kill
- Animating layout properties (width/height) instead of transforms
- Missing `key` on `AnimatePresence` children — exit animations won't fire
- `animate={{ opacity: [0, 1] }}` without `initial` — flashes on re-render
- Overusing `spring` physics — use `tween` with a good easing for UI
- Stacking 4+ simultaneous animations on the same element
- No `useReducedMotion` check in user-facing products

## Integration with 21st.dev components
When using 21st.dev components that accept motion props:
- Pass `motion` variants through the component's `className` or wrapper
- Prefer wrapping with `motion.div` over patching internal component markup
- Check if the component already uses Framer Motion internally before double-wrapping
