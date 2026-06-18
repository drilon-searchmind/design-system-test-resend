"use client";

// ai-chat-overview.js — AI Chat one-pager: how all CRM data + Apex performance
// data flow into the Searchmind MCP server, powering 2-way chat in Slack & Claude.
// Ported from the "Grafik" v2 design handoff (scripted SVG particle flow + CSS
// motion), mapped onto the app's Agency OS tokens / fonts, with a primary
// "Se DEMO" CTA into /chat/demo. Decorative motion gated on prefers-reduced-motion.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { routes } from "@/config/routes";
import { CrmAvatar } from "@/components/crm/crm-avatar";

// ── Stroke icon set (subset ported from the handoff icons.jsx) ───────────────
function Icon({ children, size = 16, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

const SourceIcons = {
  Users: (p) => (
    <Icon {...p}>
      <circle cx="6" cy="6" r="2.2" />
      <path d="M2 13.5c0-2.2 1.8-4 4-4s4 1.8 4 4" />
      <path d="M10.5 5.5a2 2 0 0 1 0 4" />
      <path d="M11.5 13.5c0-1.6-1-3-2.5-3.6" />
    </Icon>
  ),
  Briefcase: (p) => (
    <Icon {...p}>
      <rect x="2" y="4.5" width="12" height="9" rx="1" />
      <path d="M6 4.5V3h4v1.5M2 8h12" />
    </Icon>
  ),
  Tag: (p) => (
    <Icon {...p}>
      <path d="M2.5 2.5H7L13.5 9a1 1 0 0 1 0 1.4l-3 3a1 1 0 0 1-1.4 0L2.5 7V2.5z" />
      <circle cx="5" cy="5" r="0.8" />
    </Icon>
  ),
  Clock: (p) => (
    <Icon {...p}>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v3l2 1.5" />
    </Icon>
  ),
  Check: (p) => <Icon {...p}><path d="M3 8.5L6.5 12 13 4.5" /></Icon>,
  Sparkle: (p) => (
    <Icon {...p}>
      <path d="M5 2v2M5 4c-1.5 0-3 1-3 2M5 4c1.5 0 3 1 3 2M5 4v0M5 6v0" />
      <path d="M11 7l.7 2 2 .7-2 .7L11 12.5l-.7-2-2-.7 2-.7L11 7z" fill="currentColor" stroke="none" />
    </Icon>
  ),
  TrendUp: (p) => (
    <Icon {...p}>
      <path d="M2 11L6 7l3 3 5-6" />
      <path d="M10 5h4v4" />
    </Icon>
  ),
  Note: (p) => (
    <Icon {...p}>
      <path d="M2.5 2.5h11v11h-11z" />
      <path d="M5 5.5h6M5 8h6M5 10.5h4" />
    </Icon>
  ),
};

function EditGlyph(p) {
  return <Icon {...p}><path d="M11 2.5l2.5 2.5L5 13.5H2.5V11L11 2.5z" /></Icon>;
}

// ── Brand / source marks ─────────────────────────────────────────────────────
function SlackMark({ size = 28 }) {
  // Official 4-color Slack hash mark
  return (
    <svg width={size} height={size} viewBox="0 0 122.8 122.8" style={{ flexShrink: 0 }} aria-hidden>
      <path d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z" fill="#E01E5A" />
      <path d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z" fill="#36C5F0" />
      <path d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z" fill="#2EB67D" />
      <path d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z" fill="#ECB22E" />
    </svg>
  );
}

function ClaudeMark({ size = 28, color = "#D97757" }) {
  const cx = 27, cy = 27, rays = 16;
  return (
    <svg width={size} height={size} viewBox="0 0 54 54" fill="none" style={{ flexShrink: 0 }} aria-hidden>
      <g stroke={color} strokeWidth="2.7" strokeLinecap="round">
        {Array.from({ length: rays }).map((_, i) => {
          const a = (i / rays) * Math.PI * 2 - Math.PI / 2;
          const r0 = 4, r1 = i % 2 === 0 ? 21 : 13;
          return (
            <line
              key={i}
              x1={cx + Math.cos(a) * r0}
              y1={cy + Math.sin(a) * r0}
              x2={cx + Math.cos(a) * r1}
              y2={cy + Math.sin(a) * r1}
            />
          );
        })}
      </g>
    </svg>
  );
}

function McpMark({ size = 28, color = "var(--agency-brand-fg)" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <circle cx="4" cy="5.5" r="1.8" />
      <circle cx="4" cy="18.5" r="1.8" />
      <circle cx="20" cy="12" r="1.8" />
      <path d="M5.5 6.6 9.6 10.4M5.5 17.4 9.6 13.6M15 12h3" />
    </svg>
  );
}

function ApexLogo({ size = 26, color = "#ffffff" }) {
  // Official Apex icon (apex.searchmind.tech), recolored to sit on the gradient tile.
  const h = size;
  const w = Math.round((size * 80) / 108);
  return (
    <svg width={w} height={h} viewBox="0 0 80 108" fill="none" style={{ flexShrink: 0 }} aria-hidden>
      <path d="M73.0207 27.0116C72.923 27.0085 72.8223 27.0054 72.7246 27.0054H60.1507C56.8027 26.7987 54.0652 24.3064 53.4517 21.0491V7.35361C53.4517 7.03282 53.4304 6.71819 53.3907 6.40973C52.9329 2.79462 49.8779 0 46.1759 0H33.9927C29.9733 0 26.7169 3.29123 26.7169 7.35361V19.6672C26.7169 23.5754 23.6985 26.771 19.8867 27.0054H7.31582C7.21511 27.0054 7.11745 27.0085 7.01979 27.0116C3.13774 27.172 0.0400391 30.3984 0.0400391 34.359V46.6726C0.0400391 50.735 3.29644 54.0262 7.31582 54.0262H19.4991C23.2011 54.0262 26.2561 51.2316 26.7138 47.6165C26.7535 47.308 26.7749 46.9934 26.7749 46.6726V32.9771C27.3883 29.7229 30.1228 27.2275 33.4738 27.0208H46.4933C50.3021 27.2552 53.3205 30.4509 53.3235 34.359V46.6171C53.3235 50.6795 56.5799 53.9707 60.5993 53.9707H72.7246C76.744 53.9707 80.0004 50.6795 80.0004 46.6171V34.3621C80.0004 30.4015 76.9027 27.172 73.0207 27.0147V27.0116Z" fill={color} />
      <path d="M72.9806 80.9852C72.883 80.9821 72.7822 80.979 72.6846 80.979H60.1107C56.7627 80.7724 54.0251 78.28 53.4117 75.0227V61.3272C53.4117 61.0065 53.3903 60.6918 53.3507 60.3834C52.8929 56.7683 49.8379 53.9736 46.1359 53.9736H33.9526C29.9333 53.9736 26.6769 57.2649 26.6769 61.3272V73.6408C26.6769 77.549 23.6585 80.7446 19.8467 80.979H7.27578C7.17507 80.979 7.07741 80.9821 6.97975 80.9852C3.0977 81.1425 0 84.369 0 88.3326V100.646C0 104.709 3.2564 108 7.27578 108H19.4591C23.161 108 26.216 105.205 26.6738 101.59C26.7135 101.282 26.7348 100.967 26.7348 100.646V86.9508C27.3483 83.6935 30.0859 81.2011 33.4338 80.9945H46.4533C50.2621 81.2289 53.2805 84.4245 53.2835 88.3326V100.591C53.2835 104.653 56.5399 107.944 60.5593 107.944H72.6846C76.704 107.944 79.9604 104.653 79.9604 100.591V88.3357C79.9604 84.3751 76.8627 81.1456 72.9806 80.9883V80.9852Z" fill={color} />
    </svg>
  );
}

function SearchmindMark({ size = 19, color = "var(--agency-brand-fg)" }) {
  // Searchmind logo mark (icon only, from the brand lockup).
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" fill="none" style={{ flexShrink: 0 }} aria-hidden>
      <path d="M10.6182 0C11.3257 0 11.8994 0.573737 11.8994 1.28125V4.66895C11.8993 5.37637 11.3256 5.9502 10.6182 5.9502L7.23047 5.9502C6.97045 5.95013 6.69682 5.99556 6.51296 6.17942L6.17942 6.51296C5.99557 6.69682 5.95011 6.97046 5.9502 7.23047L5.9502 22.5186C5.95013 22.8213 5.99298 23.1453 6.20706 23.3594L6.3881 23.5404C6.60249 23.7548 6.92727 23.7989 7.23047 23.7988H10.6182C10.8637 23.7988 11.1209 23.7512 11.2945 23.5775L11.6788 23.1933C11.852 23.0201 11.8995 22.7635 11.8994 22.5186L11.8994 7.23047C11.8997 6.52316 12.4733 5.9502 13.1807 5.9502L16.5684 5.9502C16.8336 5.95022 17.1135 5.90405 17.3011 5.71647L17.6159 5.40169C17.8035 5.21411 17.8496 4.93422 17.8496 4.66895V1.28125C17.8496 0.573737 18.4233 0 19.1309 0L22.5186 0C23.226 7.46213e-05 23.7998 0.573783 23.7998 1.28125V4.66895C23.7998 4.90736 23.8468 5.1564 24.0154 5.32499L24.4241 5.73371C24.5927 5.90223 24.8418 5.95026 25.0801 5.9502L28.4678 5.9502C29.1751 5.9502 29.7488 6.52316 29.749 7.23047L29.749 22.5186C29.7489 23.2259 29.1752 23.7998 28.4678 23.7998H25.0801C24.8183 23.7997 24.5425 23.845 24.3573 24.0301L24.0311 24.3559C23.8455 24.5414 23.7998 24.8177 23.7998 25.0801V28.4678C23.7997 29.1752 23.226 29.7489 22.5186 29.749H19.1309C18.4234 29.749 17.8497 29.1752 17.8496 28.4678V25.0801C17.8496 24.3726 18.4233 23.7988 19.1309 23.7988H22.5186C22.8017 23.7989 23.1025 23.754 23.3027 23.5538L23.5554 23.301C23.7553 23.1012 23.7999 22.8011 23.7998 22.5186L23.7998 7.23047C23.7999 6.92487 23.7564 6.59724 23.5403 6.38115L23.368 6.20883C23.1518 5.99265 22.8243 5.95016 22.5186 5.9502L19.1309 5.9502C18.8506 5.9502 18.5534 5.99446 18.3552 6.19264L18.0914 6.45648C17.8936 6.65425 17.8495 6.95078 17.8496 7.23047L17.8496 22.5186C17.8495 23.2259 17.2757 23.7997 16.5684 23.7998H13.1807C12.8808 23.7998 12.5604 23.8421 12.3485 24.0542L12.1536 24.2493C11.9421 24.461 11.8994 24.7808 11.8994 25.0801L11.8994 28.4678C11.8994 29.1752 11.3256 29.749 10.6182 29.749H7.23047C6.52314 29.7489 5.95026 29.1751 5.9502 28.4678V25.0801C5.9502 24.8377 5.9011 24.5838 5.72961 24.4125L5.33368 24.017C5.16285 23.8463 4.91041 23.7998 4.66895 23.7998H1.28125C0.573834 23.7998 0.000157478 23.2259 0 22.5186L0 7.23047C0.000239465 6.52316 0.573885 5.9502 1.28125 5.9502L4.66895 5.9502C4.95333 5.95023 5.25551 5.90577 5.4567 5.70479L5.70374 5.45801C5.90529 5.25668 5.95024 4.95383 5.9502 4.66895L5.9502 1.28125C5.9502 0.573839 6.5231 0.000165957 7.23047 0L10.6182 0Z" fill={color} />
    </svg>
  );
}

function PlayIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M4 3.5v9l8-4.5-8-4.5z" />
    </svg>
  );
}

const SOURCES = [
  { label: "Kunder", sub: "Client · Contact", icon: "Users", hue: 272 },
  { label: "Kontrakter & salg", sub: "Contract · OneOffSale", icon: "Briefcase", hue: 205 },
  { label: "Abonnementer", sub: "Subscription", icon: "Tag", hue: 165 },
  { label: "Tidsregistrering", sub: "TimeEntry", icon: "Clock", hue: 142, write: true },
  { label: "Opgaver", sub: "Task · TaskTemplate", icon: "Check", hue: 95, write: true },
  { label: "NPS & loyalitet", sub: "NpsResponse · Schedule", icon: "Sparkle", hue: 8 },
  { label: "Retainer & økonomi", sub: "RetainerHistoryEntry", icon: "TrendUp", hue: 320 },
  { label: "Team & viden", sub: "TeamMember · KnowledgeDoc", icon: "Note", hue: 48 },
];

const SLACK_BLUE = "#36C5F0";
const CLAUDE_CLAY = "#D97757";
const APEX_C = "oklch(62% 0.16 200)";
const WRITE_C = "oklch(60% 0.15 150)"; // green "write-back" channel

const W = 1240;
const H = 880;
// Vertically the visible content only spans ~y46..y838, so the canvas has ~80px
// of empty top/bottom margin. Fit height to that content box (not the full 880)
// so the diagram fills the stage taller; the empty margins are clipped by the
// stage's overflow-hidden. Width keeps the full canvas (W) so the side-hugging
// write-back rings are never clipped — min() still caps width on narrow screens.
const FIT_W = W;
const FIT_H = 800;

const srcCY = (i) => 169 + i * 70; // source-node centers (inside CRM enclosure)
const entryY = (i) => 330 + i * (170 / 7); // entry points on Searchmind-MCP left edge

const FLOWS = [
  // CRM sources → Searchmind MCP (forward)
  ...SOURCES.map((s, i) => ({
    d: `M284 ${srcCY(i)} C 400 ${srcCY(i)}, 440 ${entryY(i)}, 515 ${entryY(i)}`,
    color: `oklch(62% 0.18 ${s.hue})`,
  })),
  // Apex MCP → Searchmind MCP (top, feeding down)
  { d: "M640 196 C 640 240, 640 262, 640 300", color: APEX_C },
  // Searchmind MCP → Slack / Claude
  { d: "M765 415 C 845 415, 855 348, 915 348", color: SLACK_BLUE },
  { d: "M765 415 C 845 415, 855 503, 915 503", color: CLAUDE_CLAY },
  // Slack / Claude → Employees
  { d: "M1005 396 C 1005 545, 1005 565, 1005 620", color: SLACK_BLUE },
  { d: "M1075 551 C 1075 585, 1075 600, 1075 620", color: CLAUDE_CLAY },
  // 2-way WRITE-BACK — concentric outer-perimeter rings (no crossings), chat → CRM.
  { d: "M1165 348 C1200 348 1210 360 1210 392 L1210 800 C1210 824 1196 834 1170 834 L42 834 C18 834 6 822 6 798 L6 474 C6 457 16 449 32 449", color: WRITE_C, write: true },
  { d: "M1165 503 C1188 503 1196 514 1196 538 L1196 788 C1196 810 1184 820 1162 820 L44 820 C22 820 12 810 12 788 L12 404 C12 389 20 379 32 379", color: WRITE_C, write: true },
];

const STEPS = [
  { n: "1", t: "CRM-data", d: "Kunder, kontrakter, tid, opgaver, NPS, økonomi og viden — alt samlet i ét CRM (Searchmind Agency OS)." },
  { n: "2", t: "Apex MCP", d: "Al performance-data flyder fra Apex MCP direkte ind i Searchmind MCP." },
  { n: "3", t: "Searchmind MCP", d: "Samler CRM + performance som tools og ressourcer med RBAC. Under opbygning." },
  { n: "4", t: "2-vejs i chat", d: "Medarbejderne spørger i Slack og Claude — og skriver tilbage, fx opret opgave eller tidsregistrering." },
];

const EMPLOYEES = [
  { label: "Louise", hue: 300 },
  { label: "Mads", hue: 205 },
  { label: "Anne", hue: 142 },
];

const NODE_BASE = {
  position: "absolute",
  background: "var(--ds-surface-card)",
  border: "1px solid var(--ds-border)",
  borderRadius: 12,
  boxShadow: "var(--agency-shadow-raised)",
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "0 14px",
};

const CSS = `
  .gk-flow { fill:none; stroke-width:1.6; stroke-dasharray:3 7; }
  .gk-flow.gk-back { stroke-dasharray:2 8; }
  @media (prefers-reduced-motion: no-preference) {
    .gk-flow { animation: gk-dash .7s linear infinite; }
    .gk-flow.gk-back { animation: gk-dash-r 1s linear infinite; }
    .gk-ring { animation: gk-ring 2.6s ease-out infinite; }
    .gk-ring-2 { animation: gk-ring 2.6s ease-out infinite 1.3s; }
    .gk-glow { animation: gk-glow 2.4s ease-out infinite; }
    .gk-build-bar { animation: gk-build 1.8s ease-in-out infinite; }
    .gk-logo { animation: gk-float 3.4s ease-in-out infinite; }
    .gk-pulse-dot { animation: gk-pulse 1.6s ease-in-out infinite; }
  }
  @keyframes gk-dash { to { stroke-dashoffset:-20; } }
  @keyframes gk-dash-r { to { stroke-dashoffset:20; } }
  @keyframes gk-ring { 0%{transform:scale(1);opacity:.4} 80%{opacity:0} 100%{transform:scale(1.5);opacity:0} }
  @keyframes gk-glow { 0%{opacity:.55;transform:scale(1)} 100%{opacity:0;transform:scale(1.14)} }
  @keyframes gk-build { 0%{transform:translateX(-130%)} 100%{transform:translateX(420%)} }
  @keyframes gk-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
  @keyframes gk-pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
`;

function NodeShell({ x, y, w, h, children, style }) {
  return (
    <div style={{ ...NODE_BASE, left: x, top: y, width: w, height: h, ...style }}>{children}</div>
  );
}

export function AiChatOverview() {
  const wrapRef = useRef(null);
  const dotsRef = useRef(null);
  const [scale, setScale] = useState(1);

  // ── Fit the fixed 1240×880 canvas into the available viewport (width AND height) ──
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const fit = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w <= 0 || h <= 0) return; // transient (e.g. mid-navigation) — keep last scale
      setScale(Math.min(w / FIT_W, h / FIT_H));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Scripted particle flow (decorative; skipped when reduced motion) ──
  useEffect(() => {
    const layer = dotsRef.current;
    if (!layer) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const svgns = "http://www.w3.org/2000/svg";
    const paths = Array.from(layer.parentNode.querySelectorAll("path.gk-flow"));
    const dots = [];
    paths.forEach((p) => {
      const len = p.getTotalLength();
      const color = p.dataset.color;
      const isWrite = p.dataset.write === "1";
      const n = isWrite ? 3 : 2;
      for (let k = 0; k < n; k++) {
        const c = document.createElementNS(svgns, "circle");
        c.setAttribute("r", isWrite ? "3.6" : "3.2");
        c.setAttribute("fill", color);
        c.style.filter = `drop-shadow(0 0 5px ${color})`;
        layer.appendChild(c);
        dots.push({
          c,
          p,
          len,
          phase: k / n,
          speed: (isWrite ? 0.00011 : 0.00015) + Math.random() * 0.00006,
        });
      }
    });

    let raf;
    const tick = (t) => {
      for (const d of dots) {
        const u = (t * d.speed + d.phase) % 1;
        const pt = d.p.getPointAtLength(u * d.len);
        d.c.setAttribute("cx", pt.x);
        d.c.setAttribute("cy", pt.y);
        d.c.setAttribute("opacity", Math.sin(u * Math.PI).toFixed(3));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      dots.forEach((d) => d.c.remove());
    };
  }, []);

  const colLabel = {
    position: "absolute",
    fontSize: 10.5,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--ds-fg-quiet)",
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col px-4 pb-4 pt-4 md:px-8">
      <style>{CSS}</style>

      {/* ── Header + primary CTA ── */}
      <div className="flex shrink-0 flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-fg-quiet">
            AI Chat · Searchmind Agency OS
          </p>
          <h1
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
            className="text-fg"
          >
            Datastrøm → MCP → Slack &amp; Claude
          </h1>
          <p className="mt-1 max-w-[80ch] font-sans text-[12.5px] leading-snug text-fg-muted">
            Alt CRM-data fra Searchmind Agency OS — plus performance-data fra Apex MCP — samles i én
            Searchmind MCP-server. Når den er bygget, kan medarbejderne chatte med dataene i Slack og
            Claude, og <b className="font-semibold text-fg">skrive tilbage</b>: fx oprette en opgave eller
            en tidsregistrering direkte fra chatten.
          </p>
        </div>

        <Link
          href={routes.chatDemo}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-solid-cta-bg px-5 py-2.5 font-sans text-[13px] font-semibold text-solid-cta-fg shadow-agency-raised transition-colors hover:bg-solid-cta-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <PlayIcon size={13} />
          Se DEMO
        </Link>
      </div>

      {/* ── Stage: fixed 1240×880 canvas, scaled to fill the available viewport ── */}
      <div
        ref={wrapRef}
        className="relative mt-3 flex min-h-[280px] min-w-0 flex-1 items-center justify-center overflow-hidden"
      >
        <div
          style={{
            width: W,
            height: H,
            flexShrink: 0,
            position: "relative",
            transformOrigin: "center",
            transform: `scale(${scale})`,
          }}
        >
          {/* CRM enclosure (the single unit the sources belong to) */}
          <div
            style={{
              position: "absolute",
              left: 16,
              top: 70,
              width: 268,
              height: 636,
              borderRadius: 18,
              background: "color-mix(in oklch, var(--agency-brand) 4%, var(--ds-surface-muted))",
              border: "1.5px solid var(--agency-brand-border)",
              boxShadow: "var(--agency-shadow-raised)",
            }}
          />
          {/* CRM enclosure header */}
          <div style={{ position: "absolute", left: 32, top: 86, width: 236, display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                flexShrink: 0,
                background: "linear-gradient(135deg, var(--agency-brand), oklch(65% 0.18 310))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <SearchmindMark size={19} color="var(--agency-brand-fg)" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: "-0.01em" }} className="text-fg">CRM</div>
              <div style={{ fontSize: 10 }} className="text-fg-quiet">Searchmind Agency OS</div>
            </div>
            <span
              className="font-mono"
              style={{
                marginLeft: "auto",
                fontSize: 10,
                color: "var(--agency-brand)",
                background: "var(--agency-brand-soft)",
                border: "1px solid var(--agency-brand-border)",
                borderRadius: 999,
                padding: "1px 7px",
              }}
            >
              1 enhed
            </span>
          </div>

          {/* connectors */}
          <svg
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            style={{ position: "absolute", inset: 0, overflow: "visible" }}
          >
            {FLOWS.map((c, i) => (
              <path
                key={`w${i}`}
                d={c.d}
                fill="none"
                stroke="var(--ds-border)"
                strokeWidth="1.4"
                opacity={c.write ? 0 : 0.9}
              />
            ))}
            {FLOWS.map((c, i) => (
              <path
                key={`f${i}`}
                className={"gk-flow" + (c.write ? " gk-back" : "")}
                d={c.d}
                stroke={c.color}
                data-color={c.color}
                data-write={c.write ? "1" : "0"}
                opacity={c.write ? 0.85 : 0.7}
              />
            ))}
            <g ref={dotsRef} />
          </svg>

          {/* column labels */}
          <div style={{ ...colLabel, left: 32, top: 46 }}>Datakilder · CRM</div>
          <div style={{ ...colLabel, left: 525, width: 230, top: 80, textAlign: "center" }}>Performance-data</div>
          <div style={{ ...colLabel, left: 515, width: 250, top: 276, textAlign: "center" }}>MCP-server</div>
          <div style={{ ...colLabel, left: 915, width: 250, top: 276, textAlign: "center" }}>Adgang i chat</div>

          {/* source nodes */}
          {SOURCES.map((s, i) => {
            const Ic = SourceIcons[s.icon];
            const c = `oklch(60% 0.18 ${s.hue})`;
            return (
              <div key={s.label} style={{ position: "absolute", left: 32, top: srcCY(i) - 29, width: 236, height: 58 }}>
                {s.write ? (
                  <div
                    className="gk-glow"
                    style={{ position: "absolute", inset: -3, borderRadius: 13, border: `1.5px solid ${WRITE_C}` }}
                  />
                ) : null}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "var(--ds-surface-card)",
                    border: "1px solid var(--ds-border)",
                    borderRadius: 10,
                    boxShadow: "var(--agency-shadow-raised)",
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    padding: "0 12px",
                  }}
                >
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      flexShrink: 0,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: c,
                      background: `color-mix(in oklch, ${c} 16%, var(--ds-canvas))`,
                      border: `1px solid color-mix(in oklch, ${c} 30%, var(--ds-border))`,
                    }}
                  >
                    <Ic size={16} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: "-0.01em" }} className="text-fg">
                      {s.label}
                    </div>
                    <div
                      className="font-mono text-fg-quiet"
                      style={{ fontSize: 9.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                    >
                      {s.sub}
                    </div>
                  </div>
                  {s.write ? (
                    <span
                      title="Kan oprettes fra chat"
                      style={{ marginLeft: "auto", flexShrink: 0, color: WRITE_C, display: "inline-flex" }}
                    >
                      <EditGlyph size={13} />
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}

          {/* Apex MCP (performance-data feed) */}
          <NodeShell x={525} y={104} w={230} h={92} style={{ borderColor: `color-mix(in oklch, ${APEX_C} 40%, var(--ds-border))` }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 11,
                flexShrink: 0,
                background: `linear-gradient(135deg, ${APEX_C}, oklch(66% 0.15 172))`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 5px 14px color-mix(in oklch, ${APEX_C} 38%, transparent)`,
              }}
            >
              <ApexLogo size={26} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }} className="text-fg">Apex MCP</div>
              <div style={{ fontSize: 11.5 }} className="text-fg-muted">Al performance-data</div>
            </div>
            <span
              style={{
                marginLeft: "auto",
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "3px 9px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                background: `color-mix(in oklch, ${APEX_C} 12%, var(--ds-surface-card))`,
                border: `1px solid color-mix(in oklch, ${APEX_C} 30%, var(--ds-border))`,
                color: APEX_C,
              }}
            >
              <span className="gk-pulse-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: APEX_C }} />
              Live
            </span>
          </NodeShell>

          {/* Searchmind MCP (hero) */}
          <div style={{ position: "absolute", left: 515, top: 300, width: 250, height: 230 }}>
            <div className="gk-ring" style={{ position: "absolute", inset: -6, borderRadius: 20, border: "1.5px solid var(--agency-brand)" }} />
            <div className="gk-ring-2" style={{ position: "absolute", inset: -6, borderRadius: 20, border: "1.5px solid var(--agency-brand)" }} />
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 16,
                background: "var(--ds-surface-card)",
                border: "1.5px solid var(--agency-brand-border)",
                boxShadow: "0 12px 32px oklch(0% 0 0 / 0.45)",
                padding: 18,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <div
                className="gk-logo"
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: "linear-gradient(135deg, var(--agency-brand), oklch(65% 0.18 310))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 6px 18px color-mix(in oklch, var(--agency-brand) 40%, transparent)",
                }}
              >
                <McpMark size={28} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, marginTop: 12, letterSpacing: "-0.01em" }} className="text-fg">
                Searchmind MCP
              </div>
              <div className="font-mono text-fg-quiet" style={{ fontSize: 10.5, marginTop: 2 }}>
                Model Context Protocol
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "center", marginTop: 14 }}>
                {["Tools", "Ressourcer", "Prompts", "Auth · RBAC"].map((t) => (
                  <span
                    key={t}
                    className="text-fg-muted"
                    style={{
                      fontSize: 10.5,
                      fontWeight: 500,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: "var(--ds-surface-muted)",
                      border: "1px solid var(--ds-border)",
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>

              <div style={{ flex: 1 }} />
              <div
                style={{
                  alignSelf: "center",
                  marginBottom: 8,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "3px 10px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--agency-brand)",
                  background: "var(--agency-brand-soft)",
                  border: "1px solid var(--agency-brand-border)",
                }}
              >
                <span
                  className="gk-pulse-dot"
                  style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--agency-brand)" }}
                />
                Bygges nu
              </div>
              <div style={{ width: "100%", height: 4, borderRadius: 999, background: "var(--ds-surface-muted)", overflow: "hidden" }}>
                <div
                  className="gk-build-bar"
                  style={{
                    width: "32%",
                    height: "100%",
                    borderRadius: 999,
                    background: "linear-gradient(90deg, transparent, var(--agency-brand), transparent)",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Slack */}
          <NodeShell x={915} y={300} w={250} h={96}>
            <span
              style={{
                width: 46,
                height: 46,
                borderRadius: 11,
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "oklch(97% 0.02 230)",
                border: "1px solid var(--ds-border)",
              }}
            >
              <SlackMark size={28} />
            </span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }} className="text-fg">Slack</div>
              <div style={{ fontSize: 11.5 }} className="text-fg-muted">Spørg dine data i en kanal eller DM</div>
            </div>
          </NodeShell>

          {/* Claude */}
          <NodeShell x={915} y={455} w={250} h={96}>
            <span
              style={{
                width: 46,
                height: 46,
                borderRadius: 11,
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#D97757",
                border: "1px solid color-mix(in oklch, #D97757 45%, var(--ds-border))",
              }}
            >
              <ClaudeMark size={28} color="#ffffff" />
            </span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }} className="text-fg">Claude</div>
              <div style={{ fontSize: 11.5 }} className="text-fg-muted">Naturligt sprog + agentiske handlinger</div>
            </div>
          </NodeShell>

          {/* Employees */}
          <NodeShell x={915} y={620} w={250} h={96} style={{ background: "var(--ds-surface-muted)" }}>
            <div style={{ display: "flex", flexShrink: 0 }}>
              {EMPLOYEES.map((p, i) => (
                <span
                  key={p.label}
                  style={{ marginLeft: i ? -8 : 0, borderRadius: "50%", boxShadow: "0 0 0 2px var(--ds-canvas)" }}
                >
                  <CrmAvatar label={p.label} hue={p.hue} className="h-[30px] w-[30px] rounded-full" />
                </span>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }} className="text-fg">Medarbejdere</div>
              <div style={{ fontSize: 11.5 }} className="text-fg-muted">Selvbetjent indsigt — uden at skifte værktøj</div>
            </div>
          </NodeShell>
        </div>
      </div>

      {/* ── 4-step legend ── */}
      <div className="mt-3 grid shrink-0 grid-cols-2 gap-2 md:grid-cols-4">
        {STEPS.map((s) => (
          <div key={s.n} className="rounded-xl border border-border bg-surface-card p-3">
            <div className="mb-1 flex items-center gap-2">
              <span
                className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-md font-mono text-[12px] font-semibold"
                style={{
                  background: "var(--agency-brand-soft)",
                  color: "var(--agency-brand)",
                  border: "1px solid var(--agency-brand-border)",
                }}
              >
                {s.n}
              </span>
              <span className="text-[14px] font-semibold text-fg">{s.t}</span>
            </div>
            <p className="text-[11.5px] leading-snug text-fg-muted">{s.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
