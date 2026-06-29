# Design System Inspired by Tally · Bill what your customers actua…

> Auto-extracted from `https://www.usehallmark.com/examples/tally/` on 2026-06-29

## 1. Visual Theme & Atmosphere

Friendly, approachable design with rounded shapes and generous whitespace.

The hero section leads with "Bill what your customers actually use." followed by "Tally meters every API call, every minute, every byte — and turns it
          into invoices your fi".

**Key Characteristics:**
- Geist as the heading font
- Geist as the body font for all running text
- Heading weight 600, letter-spacing -2.4px
- Light/white background (#ffffff) as the primary canvas
- Primary accent `#888888` used for CTAs and brand highlights
- 8 shadow level(s) detected — tinted shadows
- Rounded corners (12px+) creating a friendly, approachable feel
- Tags: light, rounded, monochrome, bold-typography, monospace, serif

## 2. Color Palette & Roles

### Primary
- **Primary Accent** (`#888888`) · `--color-primary`: Brand color, CTA backgrounds, link text, interactive highlights.
- **Secondary Accent** (`#aaaaaa`) · `--color-secondary`: Secondary brand, hover states, complementary highlights.
- **Background** (`#ffffff`) · `--color-bg`: Page background, primary canvas.
- **Background Secondary** (``) · `--color-bg-secondary`: Cards, surfaces, alternating sections.

### Text
- **Text Primary** (`#000000`) · `--color-text`: Headings and body text.
- **Text Secondary** (`#666666`) · `--color-text-secondary`: Muted text, captions, placeholders.

### Borders & Surfaces
- **Border** (`#e5e5e5`) · `--color-border`: Dividers, outlines, input borders.

## 3. Typography Rules

- **Heading Font:** `Geist`, sans-serif
- **Body Font:** `Geist`, sans-serif

### Type Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing |
|---|---|---|---|---|---|
| H1 | Geist | 80px | 600 | 76.8px | -2.4px |
| H2 | Geist | 56px | 600 | 58.8px | -1.4px |
| H3 | Geist | 22px | 600 | 34.1px | -0.44px |
| H4 | Geist | 14px | 500 | 21.7px | normal |
| Body | Geist | 18px | 400 | 27px | normal |
| Small | Geist | 23.3333px | 600 | 36.1667px | -0.56px |

### Type Scale

| Token | Size | Suggested Usage |
|---|---|---|
| Display | `80px` | headings |
| H1 | `72px` | headings |
| H2 | `56px` | headings |
| H3 | `51.2px` | headings |
| H4 | `41.6px` | headings |
| Body L | `36px` | body / supporting text |
| Body | `28px` | body / supporting text |
| Small | `23.3333px` | body / supporting text |
| XS | `22.4px` | body / supporting text |
| Caption | `22px` | body / supporting text |

## 4. Component Stylings

### Primary Button

```css
.btn-primary {
  background: transparent;
  color: ;
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 14px;
  font-weight: 500;
  border: 0.909091px solid oklch(0.18 0.03 258);
  cursor: pointer;
}
```

### Card

```css
.card {
  background: #000000;
  border-radius: 20px;
  padding: 48px;
}
```

## 5. Layout Principles

- **Base spacing unit:** `8px` — use multiples (16px, 24px, 32px, etc.)

### Spacing Scale (extracted from real elements)

| Token | Value | Role |
|---|---|---|
| spacing-1 | `8px` | element |
| spacing-2 | `14px` | element |
| spacing-3 | `32px` | card |
| spacing-4 | `16px` | element |
| spacing-5 | `24px` | card |
| spacing-6 | `48px` | card |
| spacing-7 | `80px` | section |
| spacing-8 | `128px` | section |

### Border Radius Scale

| Token | Value | Element |
|---|---|---|
| radius-button | `12px` | button |
| radius-card | `20px` | card |
| radius-button | `6px` | button |
| radius-card | `28px` | card |

## 6. Depth & Elevation

| Level | Shadow | Usage |
|---|---|---|
| Low | `rgba(255, 255, 255, 0.16) 0px 1px 0px 0px inset, rgba(0, 10, 60, 0.4) 0px 8px 24...` | Cards, subtle elevation |
| High | `rgba(20, 30, 80, 0.2) 0px 6px 16px -8px` | Modals, floating elements |
| Low | `rgba(255, 255, 255, 0.6) 0px 1px 0px 0px inset, rgba(20, 30, 80, 0.18) 0px 8px 3...` | Cards, subtle elevation |
| Low | `oklab(0 0 0 / 0) 0px 0px 0px 0.169355px` | Cards, subtle elevation |
| Low | `rgba(255, 255, 255, 0.7) 0px 1px 0px 0px inset, rgba(20, 30, 80, 0.25) 0px 24px ...` | Cards, subtle elevation |

> **Note:** This site uses chromatic (color-tinted) shadows rather than pure black — this is a deliberate brand choice that adds warmth to elevation.

## 7. Do's and Don'ts

### Do
- Use `#ffffff` as the primary background color
- Use `Geist` for all headings and `Geist` for body text
- Use `#888888` as the single dominant accent/CTA color
- Maintain `8px` as the base spacing unit — all gaps should be multiples
- Use rounded corners (`12px`+) consistently for all interactive elements
- Use serif fonts for headlines to maintain editorial authority
- Make headlines large and bold — typography is the hero element
- Stick to grayscale + `#888888` accent — avoid color overload
- Apply the shadow system for elevation — use the extracted shadow values
- Use weight 600 for headings to match the brand's typographic voice

### Don't
- Don't use colors outside the extracted palette without justification
- Don't substitute Geist/Geist with generic alternatives
- Don't use irregular spacing — stick to 8px grid
- Don't use dark/black backgrounds — this is a light-themed design
- Don't use sharp corners — they feel hostile in this rounded design language
- Don't add additional saturated colors beyond the primary accent
- Don't mix in geometric sans-serif headlines — it breaks the editorial tone
- Don't use pure black (#000000) for text — use `#000000` instead
- Don't add decorative elements not present in the original design — no badges, ribbons, banners, or ornaments unless the source site uses them
- Don't invent UI patterns the source site doesn't have — if the original has no NEW badge, don't add one just because a red is in the palette

## 8. Responsive Behavior

| Breakpoint | Width | Notes |
|---|---|---|
| Mobile | < 640px | Single column, stack sections, reduce font sizes ~80% |
| Tablet | 640–1024px | 2-column where appropriate, maintain spacing ratios |
| Desktop | 1024–1440px | Full layout as designed |
| Wide | > 1440px | Max-width container, center content |

- Touch targets: minimum 44×44px on mobile
- Maintain 8px base unit across breakpoints — only scale multipliers

## 9. Agent Prompt Guide

### Quick Color Reference

```
Background:  #ffffff
Text:        #000000
Accent:      #888888
Secondary:   #aaaaaa
Border:      #e5e5e5
```

### Example Prompts

1. "Build a hero section with a `#ffffff` background, `Geist` heading in `#000000`, and a `#888888` CTA button."
2. "Create a pricing card using background ``, border `#e5e5e5`, `Geist` for text, and 24px padding."
3. "Design a navigation bar — `#ffffff` background, `#000000` links, `#888888` for active state."
4. "Build a feature grid with 3 columns, 24px gap, each card using the card component style."
5. "Create a footer with `#000000` background, `#ffffff` text, and 16px padding."

### Iteration Guide

1. Start with layout structure (sections, grid, spacing)
2. Apply colors from the palette — background first, then text, then accents
3. Set typography — font families, sizes from the type scale, weights
4. Add components — buttons, cards, inputs using the specs above
5. Apply border-radius consistently across all elements
6. Add shadows for depth — use the extracted shadow values, not defaults
7. Check responsive behavior — test mobile and tablet layouts
8. Final pass — verify all colors match, spacing is consistent, fonts are correct
