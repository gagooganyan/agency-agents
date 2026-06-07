---
name: overclock-mkt
description: Carousel pipeline from zero to PNG — generates ready-to-post carousel slides for Instagram/TikTok from any input (topic, URL, text). Use when creating social media content carousels.
---

# Overclock Marketing Carousel Skill

## Goal
Turn any input into a 5–10 slide carousel ready to post on Instagram or TikTok. Output: structured slide content + design spec.

## Input Types
- Topic/idea → research + structure
- URL → scrape + extract key points
- Raw text → compress + visualize
- Product → benefits carousel

## Carousel Structure

### Slide 1 — Hook
- Bold claim or provocative question
- Max 8 words headline
- Subline: 1 sentence expanding the hook
- Visual: high contrast, single focal point

### Slides 2–N — Content
- One idea per slide. Never two.
- Headline: ≤6 words
- Body: ≤30 words OR 3-bullet list
- Visual cue: icon, number, or data point

### Last Slide — CTA
- Clear action: follow / save / DM / link in bio
- Repeat the core promise from slide 1
- Brand element visible

## Output Format

For each slide produce:
```
SLIDE [N]
Headline: [text]
Body: [text or bullets]
Visual note: [what to show]
```

## Design Spec
- Ratio: 1080×1350px (portrait, best for both IG and TikTok)
- Safe zone: 100px margin all sides
- Max 3 colors: background, primary text, accent
- Font: 1 family, 2 weights max
- Each slide self-contained — readable without previous context

## Quality Check
- Slide 1 stops the scroll? (would you swipe?)
- Each slide has exactly 1 takeaway?
- CTA is specific and easy?
- Visually consistent throughout?
