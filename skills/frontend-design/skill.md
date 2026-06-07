---
name: frontend-design
description: Kills generic AI-generated UI. Use when building any frontend — forces opinionated design decisions, real visual hierarchy, and non-template aesthetics.
---

# Frontend Design Skill

## Core Principle
Generic AI UI is a red flag. Every component must have a reason to exist and a deliberate visual decision behind it.

## Rules

### Layout
- Start with content hierarchy, not grid. What is the user doing here?
- Use whitespace intentionally — breathing room signals importance
- Align to an 8px base grid. No exceptions.
- Mobile-first. Then scale up.

### Typography
- Maximum 2 font families per project
- Heading scale: 1.25 ratio minimum (type scale)
- Body: 16–18px, 1.5–1.6 line-height
- Never use default system fonts without intent

### Color
- Maximum 3 brand colors + neutrals
- Define semantic tokens: --color-action, --color-danger, --color-surface
- Contrast ratio ≥ 4.5:1 for text (WCAG AA)
- Dark mode from day one if the product runs at night

### Components
- No component without a state: default, hover, active, disabled, loading, error
- Animations: 150–250ms, ease-out. Nothing bounces unless it's a game.
- Icons: single library, consistent stroke weight

### Anti-patterns to kill
- Cards stacked in infinite scroll with no visual variation
- Gradient hero backgrounds with centered white text
- Dashboard with 12 KPI cards of equal visual weight
- "Clean minimal" = just empty. Add hierarchy.
- Buttons: all the same size and color

## Process
1. Sketch hierarchy on paper or Excalidraw first
2. Define color + type tokens before any component
3. Build one component at a time with all states
4. Review at 375px and 1440px before calling done
