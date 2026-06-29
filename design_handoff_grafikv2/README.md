# Handoff: "Grafik" — CRM + Apex data → Searchmind MCP → Slack & Claude (2-way)

## Overview
"Grafik" is a single full-page (one-pager) screen inside the **Searchmind Agency OS** CRM. It is an
animated diagram that explains, for a non-technical internal audience, how the company's data flows into
a single **Searchmind MCP server** (Model Context Protocol) and powers **two-way** chat in **Slack** and
**Claude**. It lives in the app sidebar under the **Organisation** group as the nav item **Grafik**
(`route.screen === 'grafik'`).

The visual story:
1. **CRM (one unit)** — eight CRM data domains, wrapped together inside a single labeled enclosure
   ("CRM · Searchmind Agency OS · 1 enhed") to signal they all come from one system.
2. **Apex MCP** — a separate "performance-data" source node above the hub that feeds **straight down**
   into Searchmind MCP.
3. **Searchmind MCP** — the central hub, shown mid-build ("Bygges nu").
4. **Adgang i chat** — Slack and Claude, then the employees who use them.
5. **2-way write-back** — a green return channel pulses **from Slack & Claude all the way around the
   outside** of the diagram (no line crossings) back into two CRM nodes (Tidsregistrering & Opgaver),
   showing that staff can *create* a task or time entry from chat — not just read.

Animated, colored "data packets" travel along every connector (forward in source colors; the return
channel in green, flowing chat → CRM).

## About the Design Files
The files in this bundle are **design references created in HTML/React-via-Babel** — a working
prototype showing intended look, motion, and content. They are **not** production code to copy verbatim.
The task is to **recreate this design in the target codebase's environment** using its established
framework, components, and patterns (a real React/Vite/Next app with a proper build, rather than
in-browser Babel + `window.*` globals). If no front-end exists yet, choose the most appropriate
framework and implement it there.

## Fidelity
**High-fidelity (hifi).** Colors, typography, spacing, geometry, copy, and animation timings are final
and intentional. The fixed **1240×880** design canvas and the exact SVG path geometry are part of the
spec — recreate pixel-faithfully using the codebase's primitives.

## Screen: Grafik (one-pager)
- **Purpose:** Communicate the data-integration architecture to internal staff; show the MCP is under
  construction, that Apex feeds performance data in, and that chat is bidirectional.
- **Layout:**
  - Page padding `24px 24px 36px`, background `--bg`. Renders in the app's scrollable `<main>`;
    standalone it sits in a `max-width: 1320px` centered container.
  - **Header:** `<h1>` (22px/600, −0.02em) + intro `<p>` (13.5px, `--text-muted`, max-width 80ch).
  - **Stage:** a **fixed 1240×880 canvas**, scaled to fit container width via
    `transform: scale(min(1, containerWidth / 1240))`, `transform-origin: top left`; wrapper height set
    to `880 * scale`; recomputed on mount + `resize`. All nodes are absolutely positioned in this
    1240×880 space; one SVG (`viewBox="0 0 1240 880"`, `overflow: visible`) holds the connectors so
    lines and HTML nodes stay aligned.
  - **Layer order (paint back→front):** CRM enclosure card → enclosure header → SVG connectors+packets
    → column labels → source nodes → Apex node → Searchmind MCP → Slack/Claude/Employees.

- **Key coordinates (1240×880 space):**
  - CRM enclosure: rect at (16, 70), 268×636, radius 18.
  - Source nodes (×8): x=32, 236×58; node i center-Y = `169 + i*70` (i=0..7). Node right edge x=268;
    enclosure right edge x=284 (forward connectors start here).
  - Searchmind MCP: 250×230 at (515, 300); left edge x=515, right edge x=765, center y=415.
  - Apex MCP: 230×92 at (525, 104); bottom-center (640, 196).
  - Right column (x=915, 250×96 each): Slack y=300 (center 348), Claude y=455 (center 503),
    Employees y=620 (center 668). Right edge x=1165.

- **Components:**

  **CRM enclosure** — `color-mix(in oklch, var(--brand) 4%, var(--bg-sunken))` fill, `1.5px solid
  var(--brand-border)`, radius 18, `--sh-sm`. Header row: a 30×30 brand-gradient "S" badge, "CRM"
  (13.5/700) + "Searchmind Agency OS" (10px `--text-faint`), and a right-aligned pill "1 enhed"
  (`--brand` on `--brand-soft`/`--brand-border`).

  **Source node** (×8) — `--bg-elev`, 1px `--border`, radius 10, `--sh-sm`, flex row gap 11, padding 0 12.
    - Icon chip 32×32 radius 8; color = source hue; bg `color-mix(in oklch, <hue> 14%, var(--bg-elev))`,
      border `1px color-mix(in oklch, <hue> 30%, var(--border))`. Title 12.5/600; sub Geist-Mono 9.5px
      `--text-faint`, ellipsised.
    - **Write nodes** (Tidsregistrering, Opgaver) additionally get: an animated green outline ring
      (`inset:-3`, radius 13, `1.5px solid WRITE_C`, `gk-glow 2.4s ease-out infinite`) and a trailing
      green `Icons.Edit` (13px). These are the targets of the write-back channel.

      | # | label | sub (entities) | icon | hue | write? |
      |---|-------|----------------|------|-----|--------|
      | 1 | Kunder | Client · Contact | Users | 272 | |
      | 2 | Kontrakter & salg | Contract · OneOffSale | Briefcase | 205 | |
      | 3 | Abonnementer | Subscription | Tag | 165 | |
      | 4 | Tidsregistrering | TimeEntry | Clock | 142 | ✓ |
      | 5 | Opgaver | Task · TaskTemplate | Check | 95 | ✓ |
      | 6 | NPS & loyalitet | NpsResponse · Schedule | Sparkle | 8 | |
      | 7 | Retainer & økonomi | RetainerHistoryEntry | TrendUp | 320 | |
      | 8 | Team & viden | TeamMember · KnowledgeDoc | Note | 48 | |

  **Apex MCP node** — `--bg-elev`, border tinted to `APEX_C` (`oklch(62% 0.16 200)`), radius 12,
    `--sh-sm`. Logo tile 44×44 radius 11, `linear-gradient(135deg, APEX_C, oklch(66% 0.15 172))`,
    soft glow, holds **ApexMark** (a line-chart "performance" glyph). Title "Apex MCP" 15/600; sub
    "Al performance-data". Right pill: "Live" chip with a `pulse-dot` in APEX_C. Feeds straight down
    into the MCP.

  **Searchmind MCP node** (hero) — 250×230. Two pulsing brand halos (`inset:-6`, radius 20,
    `1.5px solid var(--brand)`, `gk-ring 2.6s ease-out infinite`, second delayed 1.3s). Card: radius 16,
    `--bg-elev`, `1.5px solid var(--brand-border)`, `--sh-lg`, centered column. Logo tile 52×52 radius
    14, brand→`oklch(65% 0.18 310)` gradient, gentle `gk-float`, holds **McpMark** (hub/connector glyph,
    `--brand-fg`). Title "Searchmind MCP" 16/600; sub "Model Context Protocol" (Geist Mono 10.5px).
    Capability pills: "Tools", "Ressourcer", "Prompts", "Auth · RBAC". Status chip `.chip.chip-brand`
    "Bygges nu" with `pulse-dot`. Build bar: 4px `--bg-sunken` track, 32%-wide gradient bar sliding via
    `gk-build 1.8s`.

  **Slack node** — icon tile 46×46 radius 11, bg `oklch(97% 0.02 230)`, 1px `--border`; contains the
    **official Slack logo** (4-color hash: #36C5F0 / #2EB67D / #ECB22E / #E01E5A, viewBox 122.8). Title
    "Slack"; sub "Spørg dine data i en kanal eller DM".

  **Claude node** — icon tile 46×46 radius 11, **clay background #D97757**, border
    `color-mix(in oklch, #D97757 45%, var(--border))`; contains **ClaudeMark** (a 16-ray clay/white
    sunburst, here rendered `#ffffff`). Title "Claude"; sub "Naturligt sprog + agentiske handlinger".

  **Medarbejdere node** — bg `--bg-sunken`; 3 overlapping initials avatars (−8px, 2px ring) + title
    "Medarbejdere" / sub "Selvbetjent indsigt — uden at skifte værktøj".

  **Connectors** — every flow is two stacked SVG paths sharing one `d`:
    - faint static "wire": `stroke: var(--border-strong)`, width 1.4, opacity 0.5 (write-back wires are
      opacity 0 — the green flow shows alone);
    - animated "flow" (`.gk-flow`): the channel color, width 1.6, dashed, marching via `gk-dash`.
      Return flows add `.gk-back` (finer `2 8` dash, reversed `gk-dash-r`).
    - The flow list (1240×880 space):
      - Source i → MCP: `M284 {169+i*70} C 400 {169+i*70}, 440 {330+i*170/7}, 515 {330+i*170/7}`,
        color `oklch(62% 0.18 <hue>)`.
      - Apex → MCP (down): `M640 196 C 640 240, 640 262, 640 300`, color APEX_C.
      - MCP → Slack: `M765 415 C 845 415, 855 348, 915 348` (#36C5F0).
      - MCP → Claude: `M765 415 C 845 415, 855 503, 915 503` (#D97757).
      - Slack → Employees: `M1005 396 C 1005 545, 1005 565, 1005 620` (#36C5F0).
      - Claude → Employees: `M1075 551 C 1075 585, 1075 600, 1075 620` (#D97757).
      - **Write-back, Slack → Opgaver (outer perimeter ring), green:**
        `M1165 348 C1200 348 1210 360 1210 392 L1210 800 C1210 824 1196 834 1170 834 L42 834 C18 834 6 822 6 798 L6 474 C6 457 16 449 32 449`
      - **Write-back, Claude → Tidsregistrering (inner perimeter ring), green:**
        `M1165 503 C1188 503 1196 514 1196 538 L1196 788 C1196 810 1184 820 1162 820 L44 820 C22 820 12 810 12 788 L12 404 C12 389 20 379 32 379`
      The two write-back rings are **concentric** (different gutter offsets) so they never cross each
      other or the interior forward lines — they exit the chat nodes' right edge, loop the outside, and
      re-enter the CRM nodes from the left.

## Interactions & Behavior
Presentational only — no clicks/forms/navigation beyond the sidebar entry. All motion is continuous:

- **Traveling data packets (scripted centerpiece):** one `requestAnimationFrame` loop animates SVG
  `<circle>` packets along every `.gk-flow` path.
  - Per path: read `getTotalLength()` once; spawn **2** dots (forward) or **3** (write-back), evenly
    phased. Dot radius 3.2 (forward) / 3.6 (write-back); `fill` = path color; `filter: drop-shadow(0 0
    5px <color>)`.
  - Per frame: `u = (t*speed + phase) % 1`; position = `getPointAtLength(u*len)`; `opacity = sin(u*π)`
    (fade in at source, out at destination). `speed` ≈ 0.00015 (forward) / 0.00011 (write-back, slower)
    + small random. Forward packets run source→destination; write-back packets run chat→CRM (the path
    is authored in that direction).
  - Packets are appended into a dedicated, React-untouched `<g>` so the framework never fights the
    manually-created nodes. Cancel RAF + remove circles on unmount.
- **CSS keyframes:** `gk-dash` / `gk-dash-r` (marching ants, fwd/reverse), `gk-ring` (MCP halo),
  `gk-glow` (write-node outline pulse), `gk-build` (MCP progress shimmer), `gk-float` (MCP logo bob),
  plus the app's existing `pulse-dot`.
- **Responsive:** single scale-to-fit transform on the 1240×880 stage; recompute on `resize`.
- **Reduced motion (do in production):** wrap the RAF loop and decorative keyframes in
  `@media (prefers-reduced-motion: no-preference)` and render the static end-state otherwise.

## State Management
- `scale` (number) from a resize listener; refs `wrapRef` (measured container) and `dotsRef` (the `<g>`
  holding packets). No data fetching — sources, copy, and geometry are static constants.

## Design Tokens
From the app's OKLCH token system in `styles.css` (full set + dark-mode overrides there):
- **Brand:** `--brand` `oklch(54% 0.20 272)`, `--brand-soft`, `--brand-border`, `--brand-fg`; gradient
  partner `oklch(65% 0.18 310)`.
- **Surfaces:** `--bg`, `--bg-elev`, `--bg-sunken`. **Borders:** `--border`, `--border-strong`,
  `--brand-border`. **Text:** `--text`, `--text-muted`, `--text-faint`. **Shadows:** `--sh-sm`, `--sh-lg`.
- **Accents (literals in `grafik.jsx`):** `APEX_C = oklch(62% 0.16 200)`,
  `WRITE_C = oklch(60% 0.15 150)` (green write-back), Slack #36C5F0/#2EB67D/#ECB22E/#E01E5A,
  Claude clay #D97757.
- **Source hues:** 272, 205, 165, 142, 95, 8, 320, 48 — chip at `oklch(60% 0.18 H)`, connector at
  `oklch(62% 0.18 H)`.
- **Radii:** 8/10/11/12/13/14/16/18/20 and 999/50%. **Type:** Geist + Geist Mono; sizes
  22/16/15/13.5/13/12.5/11.5/10.5/10/9.5 px, weights 400/500/600/700. **Canvas:** 1240×880.

## Assets
All vector, drawn inline — no raster files:
- **SlackMark** (official 4-color logo), **ClaudeMark** (clay/white sunburst), **McpMark**, **ApexMark**
  are inline-SVG components at the top of `grafik.jsx`. The Slack & Claude marks are the real product
  logos used as diagram icons — if your codebase has official brand SVGs/SDK icons, prefer those and
  respect each vendor's brand guidelines.
- Source/chat node glyphs use the app's stroke icon set (`Icons.*` in `icons.jsx`).
- **Avatar** (initials-on-color) from `shared.jsx`; the standalone build inlines a minimal copy.
- Fonts from Google Fonts (Geist, Geist Mono).

## Files
- **`Grafik (standalone).html`** — self-contained, offline build of *just* this page. Double-click to
  see the live animation. (Compiled artifact; don't edit.)
- **`src/grafik.jsx`** — the component source to port: `GrafikScreen`, `SlackMark`, `ClaudeMark`,
  `McpMark`, `ApexMark`, the `SOURCES` constant, geometry, the RAF particle system, all inline
  styles/keyframes.
- **`src/styles.css`** — full design-token stylesheet (OKLCH tokens, `.card`, `.chip`, `.chip-brand`,
  `.pulse-dot`, `.mono`, dark mode). Port the tokens this screen uses.
- **`src/icons.jsx`** — the stroke icon set (`window.Icons`).
- **`src/shared.jsx`** — the app's shared primitives, incl. the real `Avatar`, for reference.

### Where it lives in the original app (context)
- `grafik.jsx` is loaded by `Searchmind CRM.html`; `GrafikScreen` renders when `route.screen === 'grafik'`.
- Sidebar entry in `shell.jsx` `NAV_ITEMS`:
  `{ id:'grafik', label:'Grafik', icon: Icons.Globe, group:'organisation' }`.

## Implementation notes for porting
- Replace in-browser Babel + `window.*` globals with real module imports/exports.
- Keep the **fixed-canvas + scale-to-fit** approach — it guarantees the SVG connectors stay glued to the
  HTML nodes (fully-responsive layout would require recomputing every bezier endpoint).
- Keep the **concentric outer-perimeter routing** for the write-back so it never crosses interior flows.
- Keep packet animation in a single RAF loop; append circles to a non-framework-managed SVG group.
- Gate decorative motion behind `prefers-reduced-motion` in production.
- Copy is **Danish** — keep it; code/comments are English.
