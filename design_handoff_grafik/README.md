# Handoff: "Grafik" — Data-flow to MCP (Slack & Claude)

## Overview
"Grafik" is a single full-page (one-pager) screen inside the **Searchmind Agency OS** CRM. It is an
animated diagram that explains, for a non-technical internal audience, how all of the CRM's data is
consolidated into a single **MCP server** (Model Context Protocol) — which, once built, lets employees
chat with and act on that data directly inside **Slack** and **Claude**.

It lives in the app sidebar under the **Organisation** group, as the nav item **Grafik**
(`route.screen === 'grafik'`).

The visual story reads left → right in three stages:
1. **Datakilder · CRM** — eight data-source nodes (the CRM's domains).
2. **MCP-server** — one central, prominent "Searchmind MCP" node shown mid-build ("Bygges nu").
3. **Adgang i chat** — Slack and Claude, feeding the employees who consume the data.

Animated, colored "data packets" travel along curved connectors from each source into the MCP, then
out to Slack/Claude and down to the employees.

## About the Design Files
The files in this bundle are **design references created in HTML/React-via-Babel** — a working
prototype that shows the intended look, motion, and content. They are **not** production code to copy
verbatim. The task is to **recreate this design in the target codebase's environment** using its
established framework, component library, and patterns (e.g. a real React/Vite/Next app with proper
build tooling rather than in-browser Babel). If no front-end environment exists yet, pick the most
appropriate one for the project and implement the design there.

The prototype was authored as a global-scope Babel component (`window.GrafikScreen`) so it could be
dropped into the existing prototype shell. In a real codebase you would convert it to a normal module
component with imports.

## Fidelity
**High-fidelity (hifi).** Colors, typography, spacing, geometry, copy, and animation timings are all
final and intentional. Recreate the UI pixel-faithfully using the codebase's existing primitives. The
exact SVG path geometry and the fixed 1200×720 design canvas are part of the spec (see Layout).

## Screens / Views

### Screen: Grafik (one-pager)
- **Name:** Grafik — "Datastrøm → MCP → Slack & Claude"
- **Purpose:** Communicate the data-integration architecture to internal staff; show that the MCP is
  under construction and what it will unlock.
- **Layout:**
  - Outer page: padding `24px 24px 36px`, background `--bg`. Inside the app it renders in the scrollable
    `<main>`; standalone it sits in a `max-width: 1280px` centered container.
  - **Header:** `<h1>` (22px/600, letter-spacing −0.02em) + intro `<p>` (13.5px, `--text-muted`, max-width 78ch).
  - **Stage:** a **fixed 1200×720 design canvas**. It is scaled to fit its container width with
    `transform: scale(min(1, containerWidth / 1200))`, `transform-origin: top left`. The wrapper's
    height is set to `720 * scale` so layout reflows correctly. Re-computed on mount and on `resize`.
    All nodes are absolutely positioned in this 1200×720 coordinate space; an SVG with
    `viewBox="0 0 1200 720"` holds the connectors so the lines and the HTML nodes always align.
  - **Three columns** within the stage:
    - Sources column: x = 30, node size 230×60, vertically stacked. Node i center-Y = `74 + i*76`
      (i = 0..7). Right edge at x = 260.
    - MCP node: 240×220 at (480, 250); visual center ≈ (600, 360).
    - Right column (Slack / Claude / Medarbejdere): x = 890, each 250×96, at y = 250 / 400 / 560.
  - **Column labels** (`section-label` style): "Datakilder · CRM" (top-left), "MCP-server" and
    "Adgang i chat" centered over their columns at y ≈ 224. Style: 10.5px, 600, letter-spacing 0.08em,
    uppercase, `--text-faint`.
  - **3-step legend** below the stage: CSS grid, 3 equal columns, gap 12px, margin-top 28px. Each is a
    `.card` (padding 16) with a numbered violet badge + title + description.

- **Components:**

  **Source node** (×8) — `--bg-elev`, 1px `--border`, radius 12, `--sh-sm`, flex row, gap 12, padding 0 14px.
    - Icon chip: 34×34, radius 8. Color = the source's hue; background
      `color-mix(in oklch, <hue> 14%, var(--bg-elev))`, border `1px color-mix(in oklch, <hue> 30%, var(--border))`.
    - Title: 13px/600, −0.01em. Sub-label: Geist Mono 10px, `--text-faint`, ellipsised.
    - The eight sources, with `label`, `sub` (entity names), `icon`, and `hue` (OKLCH hue used at
      `oklch(60% 0.18 H)` for the chip and `oklch(62% 0.18 H)` for its connector):

      | # | label | sub (entities) | icon | hue |
      |---|-------|----------------|------|-----|
      | 1 | Kunder | Client · Contact | Users | 272 |
      | 2 | Kontrakter & salg | Contract · OneOffSale | Briefcase | 205 |
      | 3 | Abonnementer | Subscription | Tag | 165 |
      | 4 | Tidsregistrering | TimeEntry | Clock | 142 |
      | 5 | Opgaver | Task · TaskTemplate | Check | 95 |
      | 6 | NPS & loyalitet | NpsResponse · Schedule | Sparkle | 8 |
      | 7 | Retainer & økonomi | RetainerHistoryEntry | TrendUp | 320 |
      | 8 | Team & viden | TeamMember · KnowledgeDoc | Note | 48 |

  **MCP node** (the hero) — 240×220 container at (480, 250).
    - Two pulsing rings: absolutely positioned, `inset: -6`, radius 20, `1.5px solid var(--brand)`,
      animation `gk-ring 2.6s ease-out infinite`, the second delayed `1.3s` (ripple).
    - Card: radius 16, `--bg-elev`, `1.5px solid var(--brand-border)`, `--sh-lg`, padding 18, column
      layout, centered text.
    - Logo tile: 52×52, radius 14, `linear-gradient(135deg, var(--brand), oklch(65% 0.18 310))`,
      soft brand glow shadow, gentle float (`gk-float 3.4s ease-in-out infinite`); contains the
      custom **McpMark** glyph (a hub/connector icon, `--brand-fg`, 28px).
    - Title "Searchmind MCP" 16px/600; sub "Model Context Protocol" Geist Mono 10.5px `--text-faint`.
    - Capability chips: "Tools", "Ressourcer", "Prompts", "Auth · RBAC" — 10.5px/500 pills,
      `--bg-sunken` / 1px `--border` / `--text-muted`, radius 999.
    - Status chip `.chip.chip-brand` "Bygges nu" with a `.pulse-dot` brand dot.
    - Build progress bar: 4px track `--bg-sunken`, radius 999; inner 32%-wide bar
      `linear-gradient(90deg, transparent, var(--brand), transparent)` sliding via
      `gk-build 1.8s ease-in-out infinite`.

  **Slack node** — icon tile 46×46 radius 11, background `oklch(97% 0.02 230)`, 1px `--border`,
    containing the **SlackMark** (4-color pinwheel: #36C5F0, #2EB67D, #ECB22E, #E01E5A). Title "Slack"
    15px/600; sub "Spørg dine data i en kanal eller DM" 11.5px `--text-muted`.

  **Claude node** — icon tile 46×46 radius 11, background `oklch(96% 0.03 50)`, 1px `--border`,
    containing the **ClaudeMark** (12-ray clay sunburst, #D97757). Title "Claude"; sub
    "Naturligt sprog + agentiske handlinger".

  **Medarbejdere node** — background `--bg-sunken`. Avatar stack of 3 (overlap −8px, 2px ring in
    `--bg-sunken`), then title "Medarbejdere"; sub "Selvbetjent indsigt — uden at skifte værktøj".

  **Connectors** — for every flow there are two stacked SVG paths sharing the same `d`:
    - a faint static "wire": `stroke: var(--border-strong)`, width 1.4, opacity 0.55;
    - an animated "flow" (`.gk-flow`): the source/destination color, width 1.6, `stroke-dasharray: 3 7`,
      `animation: gk-dash .7s linear infinite` (marching ants).
    - Cubic-bezier `d` strings (1200×720 space):
      - Source i: `M260 {74+i*76} C 360 {74+i*76}, 380 {285+i*150/7}, 480 {285+i*150/7}`
      - MCP→Slack: `M720 360 C 800 360, 812 298, 890 298` (color #36C5F0)
      - MCP→Claude: `M720 360 C 800 360, 812 448, 890 448` (color #D97757)
      - Slack→Employees: `M980 346 C 980 470, 980 480, 980 560` (color #36C5F0)
      - Claude→Employees: `M1050 496 C 1050 528, 1050 532, 1050 560` (color #D97757)

## Interactions & Behavior
This screen is **presentational** — no clicks, forms, or navigation beyond the sidebar item that opens it.
All motion is decorative and continuous:

- **Traveling data packets (scripted, the centerpiece):** a `requestAnimationFrame` loop animates SVG
  `<circle>` "packets" along every `.gk-flow` path. Implementation:
  - For each flow path, read `path.getTotalLength()` once and spawn **2** dots, evenly phased.
  - Each dot: radius 3.2, `fill` = the path's color, `filter: drop-shadow(0 0 5px <color>)`.
  - Per frame, progress `u = (t * speed + phase) % 1`; position from `path.getPointAtLength(u * len)`;
    `opacity = sin(u * π)` so packets fade in at the source and out at the destination.
  - `speed` ≈ `0.00015 + random()*0.00006` (units = fraction-of-path per millisecond ⇒ ~5–7s traversal).
  - The dots are appended into a dedicated, React-untouched `<g>` so the framework's reconciler never
    fights the manually-created nodes. Cancel the RAF and remove the circles on unmount.
- **CSS keyframes:**
  - `gk-dash` — marching-ants dash flow on connectors (0.7s linear).
  - `gk-ring` — MCP halo pulse: scale 1→1.5, opacity .4→0 (2.6s, plus a 1.3s-delayed second ring).
  - `gk-build` — MCP progress shimmer sliding across (1.8s ease-in-out).
  - `gk-float` — MCP logo tile bob ±3px (3.4s ease-in-out).
  - `pulse-dot` — existing app keyframe used by the "Bygges nu" status dot.
- **Responsive:** single scale-to-fit transform on the 1200×720 stage; recompute on `resize`.
- **Reduced motion:** the prototype does not gate animation on `prefers-reduced-motion`. In production,
  wrap the RAF loop and the decorative keyframes in a `@media (prefers-reduced-motion: no-preference)`
  guard (render the static end-state otherwise).

## State Management
- `scale` — number, the fit-to-width factor for the stage (from a `resize` observer/listener).
- Refs: `wrapRef` (measured container), `dotsRef` (the `<g>` that holds RAF-driven packets).
- No data fetching. The source list, copy, and geometry are static constants. In production the eight
  data sources could be derived from the app's real module registry, but they are intentionally a
  curated set of 8 here.

## Design Tokens
All colors come from the app's OKLCH token system in `styles.css` (see that file for the full set and
dark-mode overrides). The ones this screen relies on:

- **Brand:** `--brand` `oklch(54% 0.20 272)`, `--brand-soft`, `--brand-border`, `--brand-fg`;
  gradient companion `oklch(65% 0.18 310)`.
- **Surfaces:** `--bg`, `--bg-elev`, `--bg-sunken`.
- **Borders:** `--border`, `--border-strong`.
- **Text:** `--text`, `--text-muted`, `--text-faint`.
- **Shadows:** `--sh-sm` (nodes), `--sh-lg` (MCP card).
- **Radii:** 8 (icon chip), 11 (chat icon tile), 12 (source node), 14 (MCP logo), 16 (MCP card),
  20 (MCP halo), 999/50% (pills, avatars, dots).
- **Source hues** (OKLCH, lightness/chroma fixed): 272, 205, 165, 142, 95, 8, 320, 48 — used at
  `oklch(60% 0.18 H)` for chips and `oklch(62% 0.18 H)` for connectors/packets.
- **External brand colors:** Slack #36C5F0 / #2EB67D / #ECB22E / #E01E5A; Claude (Anthropic) clay #D97757.
- **Typography:** Geist (UI) + Geist Mono (numbers, entity sub-labels, the "Model Context Protocol" line).
  Sizes used: 22/16/15/13.5/13/12.5/11.5/10.5/10 px; weights 400/500/600.
- **Spacing:** page padding 24px; node gap 12px; legend gap 12px; stage canvas 1200×720.

## Assets
No external image/raster assets — everything is vector, drawn inline:
- **SlackMark**, **ClaudeMark**, **McpMark** are custom inline-SVG components defined at the top of
  `grafik.jsx`. The Slack and Claude marks are simplified, recognizable renditions of those products'
  logos for use as diagram icons; if you have official brand assets/SDK icons in your codebase, prefer
  those (and respect each vendor's brand guidelines).
- Source-node and chat icons use the app's stroke icon set (`Icons.*` from `icons.jsx`):
  Users, Briefcase, Tag, Clock, Check, Sparkle, TrendUp, Note.
- **Avatar** (initials-on-color circle) comes from the app's `shared.jsx`. The standalone build inlines
  a minimal copy.
- Fonts load from Google Fonts (Geist, Geist Mono).

## Files
Everything needed to view and re-implement the design:

- **`Grafik (standalone).html`** — self-contained, fully offline build of *just* this page. Double-click
  to open in any browser and see the live animation. (This is the compiled artifact; don't edit it.)
- **`src/grafik.jsx`** — the actual component source (the thing to port). Defines `GrafikScreen`,
  `SlackMark`, `ClaudeMark`, `McpMark`, the `SOURCES` constant, geometry, the RAF particle system, and
  all inline styles/keyframes.
- **`src/styles.css`** — the app's full design-token stylesheet (OKLCH tokens, `.card`, `.chip`,
  `.chip-brand`, `.pulse-dot`, `.mono`, dark-mode overrides). Port the tokens this screen uses.
- **`src/icons.jsx`** — the stroke icon set referenced by the source/chat nodes (`window.Icons`).
- **`src/shared.jsx`** — the app's shared primitives, including the real `Avatar` component, for reference.

### Where it lives in the original app (for context)
- `grafik.jsx` is loaded by `Searchmind CRM.html`; `GrafikScreen` renders when `route.screen === 'grafik'`.
- The sidebar entry is registered in `shell.jsx` `NAV_ITEMS` as
  `{ id:'grafik', label:'Grafik', icon: Icons.Globe, group:'organisation' }`.

## Implementation notes for porting
- Replace the in-browser Babel + `window.*` globals with real module imports/exports.
- Keep the **fixed-canvas + scale-to-fit** approach — it guarantees the SVG connectors stay glued to the
  HTML nodes. (Alternatively, fully responsive layout would require recomputing all bezier endpoints.)
- Keep packet animation in a single RAF loop and append the circles to a non-framework-managed SVG group.
- Gate decorative motion behind `prefers-reduced-motion` in production.
- The copy is **Danish** — keep it; only the codebase/comments are English.
