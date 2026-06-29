// grafik.jsx — animated one-pager: how all CRM data flows into the MCP server,
// which powers chat in Slack & Claude. Scripted SVG particle flow + CSS motion.

// ---- Brand marks for the chat destinations ----
const SlackMark = ({ size = 26 }) => {
  const C = ['#36C5F0', '#2EB67D', '#ECB22E', '#E01E5A'];
  return (
    <svg width={size} height={size} viewBox="0 0 54 54" fill="none" style={{ flexShrink: 0 }}>
      {[0, 90, 180, 270].map((r, i) => (
        <g key={i} transform={`rotate(${r} 27 27)`} fill={C[i]}>
          <rect x="6" y="5.5" width="20" height="7" rx="3.5" />
          <rect x="18.5" y="12.5" width="7" height="8" rx="3.5" />
        </g>
      ))}
    </svg>
  );
};

const ClaudeMark = ({ size = 26 }) => {
  const cx = 27, cy = 27, rays = 12;
  return (
    <svg width={size} height={size} viewBox="0 0 54 54" fill="none" style={{ flexShrink: 0 }}>
      <g stroke="#D97757" strokeWidth="3.4" strokeLinecap="round">
        {Array.from({ length: rays }).map((_, i) => {
          const a = (i / rays) * Math.PI * 2 - Math.PI / 2;
          const r0 = 4.5, r1 = i % 2 === 0 ? 21 : 15;
          return (
            <line key={i}
              x1={cx + Math.cos(a) * r0} y1={cy + Math.sin(a) * r0}
              x2={cx + Math.cos(a) * r1} y2={cy + Math.sin(a) * r1} />
          );
        })}
      </g>
    </svg>
  );
};

const McpMark = ({ size = 30, color = 'var(--brand-fg)' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
       strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="3" />
    <circle cx="4" cy="5.5" r="1.8" />
    <circle cx="4" cy="18.5" r="1.8" />
    <circle cx="20" cy="12" r="1.8" />
    <path d="M5.5 6.6 9.6 10.4M5.5 17.4 9.6 13.6M15 12h3" />
  </svg>
);

const SOURCES = [
  { label: 'Kunder',             sub: 'Client · Contact',          icon: 'Users',     hue: 272 },
  { label: 'Kontrakter & salg',  sub: 'Contract · OneOffSale',     icon: 'Briefcase', hue: 205 },
  { label: 'Abonnementer',       sub: 'Subscription',              icon: 'Tag',       hue: 165 },
  { label: 'Tidsregistrering',   sub: 'TimeEntry',                 icon: 'Clock',     hue: 142 },
  { label: 'Opgaver',            sub: 'Task · TaskTemplate',       icon: 'Check',     hue: 95  },
  { label: 'NPS & loyalitet',    sub: 'NpsResponse · Schedule',    icon: 'Sparkle',   hue: 8   },
  { label: 'Retainer & økonomi', sub: 'RetainerHistoryEntry',      icon: 'TrendUp',   hue: 320 },
  { label: 'Team & viden',       sub: 'TeamMember · KnowledgeDoc', icon: 'Note',      hue: 48  },
];

const SLACK_BLUE = '#36C5F0';
const CLAUDE_CLAY = '#D97757';

function GrafikScreen() {
  const wrapRef = React.useRef(null);
  const dotsRef = React.useRef(null);
  const [scale, setScale] = React.useState(1);

  const W = 1200, H = 720;

  // ---- geometry ----
  const srcCY = (i) => 74 + i * 76;
  const entryY = (i) => 285 + i * (150 / 7);

  const connectors = [];
  SOURCES.forEach((s, i) => {
    const sy = srcCY(i), ty = entryY(i);
    connectors.push({ d: `M260 ${sy} C 360 ${sy}, 380 ${ty}, 480 ${ty}`, color: `oklch(62% 0.18 ${s.hue})` });
  });
  connectors.push({ d: 'M720 360 C 800 360, 812 298, 890 298', color: SLACK_BLUE });
  connectors.push({ d: 'M720 360 C 800 360, 812 448, 890 448', color: CLAUDE_CLAY });
  connectors.push({ d: 'M980 346 C 980 470, 980 480, 980 560', color: SLACK_BLUE });
  connectors.push({ d: 'M1050 496 C 1050 528, 1050 532, 1050 560', color: CLAUDE_CLAY });

  // ---- fit-to-width scaling ----
  React.useEffect(() => {
    const fit = () => {
      if (!wrapRef.current) return;
      const w = wrapRef.current.clientWidth;
      setScale(Math.min(1, w / W));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  // ---- scripted particle flow ----
  React.useEffect(() => {
    const layer = dotsRef.current;
    if (!layer) return;
    const svgns = 'http://www.w3.org/2000/svg';
    const paths = Array.from(layer.parentNode.querySelectorAll('path.gk-flow'));
    const dots = [];
    paths.forEach((p) => {
      const len = p.getTotalLength();
      const color = p.dataset.color;
      const n = 2;
      for (let k = 0; k < n; k++) {
        const c = document.createElementNS(svgns, 'circle');
        c.setAttribute('r', '3.2');
        c.setAttribute('fill', color);
        c.style.filter = `drop-shadow(0 0 5px ${color})`;
        layer.appendChild(c);
        dots.push({ c, p, len, phase: k / n, speed: 0.00015 + Math.random() * 0.00006 });
      }
    });
    let raf;
    const tick = (t) => {
      for (const d of dots) {
        const u = ((t * d.speed) + d.phase) % 1;
        const pt = d.p.getPointAtLength(u * d.len);
        d.c.setAttribute('cx', pt.x);
        d.c.setAttribute('cy', pt.y);
        d.c.setAttribute('opacity', Math.sin(u * Math.PI).toFixed(3));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); dots.forEach((d) => d.c.remove()); };
  }, []);

  const css = `
    .gk-flow { fill:none; stroke-width:1.6; stroke-dasharray:3 7; animation: gk-dash .7s linear infinite; }
    @keyframes gk-dash { to { stroke-dashoffset:-20; } }
    @keyframes gk-ring { 0%{transform:scale(1);opacity:.4} 80%{opacity:0} 100%{transform:scale(1.5);opacity:0} }
    @keyframes gk-build { 0%{transform:translateX(-130%)} 100%{transform:translateX(420%)} }
    @keyframes gk-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
  `;

  const NodeShell = ({ x, y, w, h, children, style }) => (
    <div style={{
      position: 'absolute', left: x, top: y, width: w, height: h,
      background: 'var(--bg-elev)', border: '1px solid var(--border)',
      borderRadius: 12, boxShadow: 'var(--sh-sm)', display: 'flex', alignItems: 'center',
      gap: 12, padding: '0 14px', ...style,
    }}>{children}</div>
  );

  const colLabel = { left: 0, position: 'absolute', fontSize: 10.5, fontWeight: 600,
    letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)' };

  return (
    <div style={{ padding: '24px 24px 36px' }}>
      <style>{css}</style>

      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>
        Datastrøm → MCP → Slack &amp; Claude
      </h1>
      <p style={{ margin: '0 0 22px', color: 'var(--text-muted)', fontSize: 13.5, maxWidth: '78ch' }}>
        Al data i Searchmind Agency OS samles i én MCP-server (Model Context Protocol). Når serveren er bygget,
        kan medarbejderne chatte med og handle på tværs af alle datakilder — direkte i Slack og i Claude.
      </p>

      <div ref={wrapRef} style={{ width: '100%', height: H * scale, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: H,
          transformOrigin: 'top left', transform: `scale(${scale})` }}>

          {/* connectors */}
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
            {connectors.map((c, i) => (
              <path key={'w' + i} d={c.d} fill="none" stroke="var(--border-strong)" strokeWidth="1.4" opacity="0.55" />
            ))}
            {connectors.map((c, i) => (
              <path key={'f' + i} className="gk-flow" d={c.d} stroke={c.color} data-color={c.color} opacity="0.7" />
            ))}
            <g ref={dotsRef}></g>
          </svg>

          {/* column labels */}
          <div style={{ ...colLabel, left: 32, top: 16 }}>Datakilder · CRM</div>
          <div style={{ ...colLabel, left: 480, width: 240, top: 224, textAlign: 'center' }}>MCP-server</div>
          <div style={{ ...colLabel, left: 890, width: 250, top: 224, textAlign: 'center' }}>Adgang i chat</div>

          {/* source nodes */}
          {SOURCES.map((s, i) => {
            const Ic = Icons[s.icon];
            const c = `oklch(60% 0.18 ${s.hue})`;
            return (
              <NodeShell key={s.label} x={30} y={srcCY(i) - 30} w={230} h={60}>
                <span style={{
                  width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  color: c, background: `color-mix(in oklch, ${c} 14%, var(--bg-elev))`,
                  border: `1px solid color-mix(in oklch, ${c} 30%, var(--border))`,
                }}>
                  <Ic size={17} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>{s.label}</div>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--text-faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.sub}</div>
                </div>
              </NodeShell>
            );
          })}

          {/* MCP node */}
          <div style={{ position: 'absolute', left: 480, top: 250, width: 240, height: 220 }}>
            <div style={{ position: 'absolute', inset: -6, borderRadius: 20, border: '1.5px solid var(--brand)', animation: 'gk-ring 2.6s ease-out infinite' }} />
            <div style={{ position: 'absolute', inset: -6, borderRadius: 20, border: '1.5px solid var(--brand)', animation: 'gk-ring 2.6s ease-out infinite 1.3s' }} />
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 16,
              background: 'var(--bg-elev)', border: '1.5px solid var(--brand-border)',
              boxShadow: 'var(--sh-lg)', padding: 18,
              display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14, animation: 'gk-float 3.4s ease-in-out infinite',
                background: 'linear-gradient(135deg, var(--brand), oklch(65% 0.18 310))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 6px 18px color-mix(in oklch, var(--brand) 40%, transparent)',
              }}>
                <McpMark size={28} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, marginTop: 12, letterSpacing: '-0.01em' }}>Searchmind MCP</div>
              <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-faint)', marginTop: 2 }}>Model Context Protocol</div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center', marginTop: 14 }}>
                {['Tools', 'Ressourcer', 'Prompts', 'Auth · RBAC'].map((t) => (
                  <span key={t} style={{
                    fontSize: 10.5, fontWeight: 500, padding: '2px 8px', borderRadius: 999,
                    background: 'var(--bg-sunken)', border: '1px solid var(--border)', color: 'var(--text-muted)',
                  }}>{t}</span>
                ))}
              </div>

              <div style={{ flex: 1 }} />
              <div className="chip chip-brand" style={{ alignSelf: 'center', marginBottom: 8 }}>
                <span className="dot pulse-dot" style={{ background: 'var(--brand)' }} />
                Bygges nu
              </div>
              <div style={{ width: '100%', height: 4, borderRadius: 999, background: 'var(--bg-sunken)', overflow: 'hidden' }}>
                <div style={{ width: '32%', height: '100%', borderRadius: 999,
                  background: 'linear-gradient(90deg, transparent, var(--brand), transparent)',
                  animation: 'gk-build 1.8s ease-in-out infinite' }} />
              </div>
            </div>
          </div>

          {/* Slack */}
          <NodeShell x={890} y={250} w={250} h={96}>
            <span style={{ width: 46, height: 46, borderRadius: 11, flexShrink: 0, display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center', background: 'oklch(97% 0.02 230)', border: '1px solid var(--border)' }}>
              <SlackMark size={28} />
            </span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Slack</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Spørg dine data i en kanal eller DM</div>
            </div>
          </NodeShell>

          {/* Claude */}
          <NodeShell x={890} y={400} w={250} h={96}>
            <span style={{ width: 46, height: 46, borderRadius: 11, flexShrink: 0, display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center', background: 'oklch(96% 0.03 50)', border: '1px solid var(--border)' }}>
              <ClaudeMark size={28} />
            </span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Claude</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Naturligt sprog + agentiske handlinger</div>
            </div>
          </NodeShell>

          {/* Employees */}
          <NodeShell x={890} y={560} w={250} h={96} style={{ background: 'var(--bg-sunken)' }}>
            <div style={{ display: 'flex', flexShrink: 0 }}>
              {[
                { avatar: 'LM', hue: 300, name: 'Louise' },
                { avatar: 'MK', hue: 205, name: 'Mads' },
                { avatar: 'AS', hue: 142, name: 'Anne' },
              ].map((p, i) => (
                <div key={i} style={{ marginLeft: i ? -8 : 0, borderRadius: '50%', boxShadow: '0 0 0 2px var(--bg-sunken)' }}>
                  <Avatar person={p} size={30} />
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Medarbejdere</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Selvbetjent indsigt — uden at skifte værktøj</div>
            </div>
          </NodeShell>

        </div>
      </div>

      {/* 3-step legend */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 28 }}>
        {[
          { n: '1', t: 'Datakilder', d: 'Kunder, kontrakter, tid, opgaver, NPS, økonomi og viden — alt det operationelle og kommercielle data i Agency OS.' },
          { n: '2', t: 'MCP-server', d: 'Én sikker Model Context Protocol-server eksponerer dataene som tools og ressourcer med RBAC. Under opbygning.' },
          { n: '3', t: 'Adgang i chat', d: 'Medarbejderne spørger og handler på dataene direkte i Slack og Claude — i naturligt sprog.' },
        ].map((s) => (
          <div key={s.n} className="card card-pad" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="mono" style={{ width: 22, height: 22, borderRadius: 6, display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600,
                background: 'var(--brand-soft)', color: 'var(--brand)', border: '1px solid var(--brand-border)' }}>{s.n}</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{s.t}</span>
            </div>
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.55 }}>{s.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

window.GrafikScreen = GrafikScreen;
