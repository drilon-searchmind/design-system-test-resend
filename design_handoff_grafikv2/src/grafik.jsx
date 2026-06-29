// grafik.jsx — animated one-pager: how all CRM data + Apex performance data flow into the
// Searchmind MCP server, powering 2-way chat in Slack & Claude. Scripted SVG particle flow + CSS.

// ---- Brand marks for the chat destinations ----
const SlackMark = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 122.8 122.8" style={{ flexShrink: 0 }}>
    <path d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z" fill="#E01E5A" />
    <path d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z" fill="#36C5F0" />
    <path d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z" fill="#2EB67D" />
    <path d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z" fill="#ECB22E" />
  </svg>
);

const ClaudeMark = ({ size = 26, color = '#D97757' }) => {
  const cx = 27, cy = 27, rays = 16;
  return (
    <svg width={size} height={size} viewBox="0 0 54 54" fill="none" style={{ flexShrink: 0 }}>
      <g stroke={color} strokeWidth="2.7" strokeLinecap="round">
        {Array.from({ length: rays }).map((_, i) => {
          const a = (i / rays) * Math.PI * 2 - Math.PI / 2;
          const r0 = 4, r1 = i % 2 === 0 ? 21 : 13;
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

const ApexMark = ({ size = 26, color = 'var(--brand-fg)' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
       strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M3 14l3.5-5 3 3.5L14 5l4 8" />
    <path d="M3 19h16" opacity="0.6" />
  </svg>
);

const SOURCES = [
  { label: 'Kunder',             sub: 'Client · Contact',          icon: 'Users',     hue: 272 },
  { label: 'Kontrakter & salg',  sub: 'Contract · OneOffSale',     icon: 'Briefcase', hue: 205 },
  { label: 'Abonnementer',       sub: 'Subscription',              icon: 'Tag',       hue: 165 },
  { label: 'Tidsregistrering',   sub: 'TimeEntry',                 icon: 'Clock',     hue: 142, write: true },
  { label: 'Opgaver',            sub: 'Task · TaskTemplate',       icon: 'Check',     hue: 95,  write: true },
  { label: 'NPS & loyalitet',    sub: 'NpsResponse · Schedule',    icon: 'Sparkle',   hue: 8   },
  { label: 'Retainer & økonomi', sub: 'RetainerHistoryEntry',      icon: 'TrendUp',   hue: 320 },
  { label: 'Team & viden',       sub: 'TeamMember · KnowledgeDoc', icon: 'Note',      hue: 48  },
];

const SLACK_BLUE = '#36C5F0';
const CLAUDE_CLAY = '#D97757';
const APEX_C = 'oklch(62% 0.16 200)';
const WRITE_C = 'oklch(60% 0.15 150)';   // green "write-back" channel

function GrafikScreen() {
  const wrapRef = React.useRef(null);
  const dotsRef = React.useRef(null);
  const [scale, setScale] = React.useState(1);

  const W = 1240, H = 880;

  // ---- geometry ----
  const srcCY = (i) => 169 + i * 70;          // source-node centers (inside CRM enclosure)
  const entryY = (i) => 330 + i * (170 / 7);  // entry points on Searchmind-MCP left edge

  const flows = [];
  // CRM sources -> Searchmind MCP (forward)
  SOURCES.forEach((s, i) => {
    flows.push({ d: `M284 ${srcCY(i)} C 400 ${srcCY(i)}, 440 ${entryY(i)}, 515 ${entryY(i)}`, color: `oklch(62% 0.18 ${s.hue})` });
  });
  // Apex MCP -> Searchmind MCP (top, feeding down)
  flows.push({ d: 'M640 196 C 640 240, 640 262, 640 300', color: APEX_C });
  // Searchmind MCP -> Slack / Claude
  flows.push({ d: 'M765 415 C 845 415, 855 348, 915 348', color: SLACK_BLUE });
  flows.push({ d: 'M765 415 C 845 415, 855 503, 915 503', color: CLAUDE_CLAY });
  // Slack / Claude -> Employees
  flows.push({ d: 'M1005 396 C 1005 545, 1005 565, 1005 620', color: SLACK_BLUE });
  flows.push({ d: 'M1075 551 C 1075 585, 1075 600, 1075 620', color: CLAUDE_CLAY });
  // 2-way WRITE-BACK: Slack & Claude route ALL the way around the outside (no crossings) back into CRM.
  // Slack -> Opgaver (outer ring), Claude -> Tidsregistrering (inner ring).
  flows.push({ d: 'M1165 348 C1200 348 1210 360 1210 392 L1210 800 C1210 824 1196 834 1170 834 L42 834 C18 834 6 822 6 798 L6 474 C6 457 16 449 32 449', color: WRITE_C, write: true });
  flows.push({ d: 'M1165 503 C1188 503 1196 514 1196 538 L1196 788 C1196 810 1184 820 1162 820 L44 820 C22 820 12 810 12 788 L12 404 C12 389 20 379 32 379', color: WRITE_C, write: true });

  // ---- fit-to-width scaling ----
  React.useEffect(() => {
    const fit = () => {
      if (!wrapRef.current) return;
      setScale(Math.min(1, wrapRef.current.clientWidth / W));
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
      const isWrite = p.dataset.write === '1';
      const n = isWrite ? 3 : 2;
      for (let k = 0; k < n; k++) {
        const c = document.createElementNS(svgns, 'circle');
        c.setAttribute('r', isWrite ? '3.6' : '3.2');
        c.setAttribute('fill', color);
        c.style.filter = `drop-shadow(0 0 5px ${color})`;
        layer.appendChild(c);
        dots.push({ c, p, len, phase: k / n, speed: (isWrite ? 0.00011 : 0.00015) + Math.random() * 0.00006 });
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
    .gk-flow.gk-back { stroke-dasharray:2 8; animation: gk-dash-r 1s linear infinite; }
    @keyframes gk-dash { to { stroke-dashoffset:-20; } }
    @keyframes gk-dash-r { to { stroke-dashoffset:20; } }
    @keyframes gk-ring { 0%{transform:scale(1);opacity:.4} 80%{opacity:0} 100%{transform:scale(1.5);opacity:0} }
    @keyframes gk-glow { 0%{opacity:.55;transform:scale(1)} 100%{opacity:0;transform:scale(1.14)} }
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

  const colLabel = { position: 'absolute', fontSize: 10.5, fontWeight: 600,
    letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)' };

  return (
    <div style={{ padding: '24px 24px 36px' }}>
      <style>{css}</style>

      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>
        Datastrøm → MCP → Slack &amp; Claude
      </h1>
      <p style={{ margin: '0 0 22px', color: 'var(--text-muted)', fontSize: 13.5, maxWidth: '80ch' }}>
        Alt CRM-data fra Searchmind Agency OS — plus performance-data fra Apex MCP — samles i én
        Searchmind MCP-server. Når den er bygget, kan medarbejderne chatte med dataene i Slack og Claude,
        og <b>skrive tilbage</b>: fx oprette en opgave eller en tidsregistrering direkte fra chatten.
      </p>

      <div ref={wrapRef} style={{ width: '100%', height: H * scale, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: H,
          transformOrigin: 'top left', transform: `scale(${scale})` }}>

          {/* ---- CRM enclosure (the single unit the sources belong to) ---- */}
          <div style={{
            position: 'absolute', left: 16, top: 70, width: 268, height: 636,
            borderRadius: 18, background: 'color-mix(in oklch, var(--brand) 4%, var(--bg-sunken))',
            border: '1.5px solid var(--brand-border)', boxShadow: 'var(--sh-sm)',
          }} />
          {/* CRM enclosure header */}
          <div style={{ position: 'absolute', left: 32, top: 86, width: 236, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: 'linear-gradient(135deg, var(--brand), oklch(65% 0.18 310))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--brand-fg)', fontWeight: 700, fontSize: 13, letterSpacing: '-0.03em',
            }}>S</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.01em' }}>CRM</div>
              <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>Searchmind Agency OS</div>
            </div>
            <span className="mono" style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--brand)',
              background: 'var(--brand-soft)', border: '1px solid var(--brand-border)', borderRadius: 999, padding: '1px 7px' }}>
              1 enhed
            </span>
          </div>

          {/* ---- connectors ---- */}
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
            {flows.map((c, i) => (
              <path key={'w' + i} d={c.d} fill="none" stroke="var(--border-strong)" strokeWidth="1.4" opacity={c.write ? 0.0 : 0.5} />
            ))}
            {flows.map((c, i) => (
              <path key={'f' + i} className={'gk-flow' + (c.write ? ' gk-back' : '')} d={c.d}
                stroke={c.color} data-color={c.color} data-write={c.write ? '1' : '0'}
                opacity={c.write ? 0.85 : 0.7} strokeDasharray={c.write ? '2 8' : '3 7'} />
            ))}
            <g ref={dotsRef}></g>
          </svg>

          {/* ---- column labels ---- */}
          <div style={{ ...colLabel, left: 32, top: 46 }}>Datakilder · CRM</div>
          <div style={{ ...colLabel, left: 525, width: 230, top: 80, textAlign: 'center' }}>Performance-data</div>
          <div style={{ ...colLabel, left: 515, width: 250, top: 276, textAlign: 'center' }}>MCP-server</div>
          <div style={{ ...colLabel, left: 915, width: 250, top: 276, textAlign: 'center' }}>Adgang i chat</div>

          {/* ---- source nodes ---- */}
          {SOURCES.map((s, i) => {
            const Ic = Icons[s.icon];
            const c = `oklch(60% 0.18 ${s.hue})`;
            return (
              <div key={s.label} style={{ position: 'absolute', left: 32, top: srcCY(i) - 29, width: 236, height: 58 }}>
                {s.write && (
                  <div style={{ position: 'absolute', inset: -3, borderRadius: 13, border: `1.5px solid ${WRITE_C}`,
                    animation: 'gk-glow 2.4s ease-out infinite' }} />
                )}
                <div style={{
                  position: 'absolute', inset: 0, background: 'var(--bg-elev)', border: '1px solid var(--border)',
                  borderRadius: 10, boxShadow: 'var(--sh-sm)', display: 'flex', alignItems: 'center', gap: 11, padding: '0 12px',
                }}>
                  <span style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    color: c, background: `color-mix(in oklch, ${c} 14%, var(--bg-elev))`,
                    border: `1px solid color-mix(in oklch, ${c} 30%, var(--border))`,
                  }}>
                    <Ic size={16} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '-0.01em' }}>{s.label}</div>
                    <div className="mono" style={{ fontSize: 9.5, color: 'var(--text-faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.sub}</div>
                  </div>
                  {s.write && (
                    <span title="Kan oprettes fra chat" style={{ marginLeft: 'auto', flexShrink: 0, color: WRITE_C, display: 'inline-flex' }}>
                      <Icons.Edit size={13} />
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* ---- Apex MCP (performance-data feed) ---- */}
          <NodeShell x={525} y={104} w={230} h={92} style={{ borderColor: 'color-mix(in oklch, ' + APEX_C + ' 40%, var(--border))' }}>
            <div style={{
              width: 44, height: 44, borderRadius: 11, flexShrink: 0,
              background: `linear-gradient(135deg, ${APEX_C}, oklch(66% 0.15 172))`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 5px 14px color-mix(in oklch, ${APEX_C} 38%, transparent)`,
            }}>
              <ApexMark size={24} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Apex MCP</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Al performance-data</div>
            </div>
            <span className="chip" style={{ marginLeft: 'auto', flexShrink: 0,
              background: `color-mix(in oklch, ${APEX_C} 12%, var(--bg-elev))`,
              border: `1px solid color-mix(in oklch, ${APEX_C} 30%, var(--border))`, color: APEX_C }}>
              <span className="dot pulse-dot" style={{ background: APEX_C }} /> Live
            </span>
          </NodeShell>

          {/* ---- Searchmind MCP (hero) ---- */}
          <div style={{ position: 'absolute', left: 515, top: 300, width: 250, height: 230 }}>
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

          {/* ---- Slack ---- */}
          <NodeShell x={915} y={300} w={250} h={96}>
            <span style={{ width: 46, height: 46, borderRadius: 11, flexShrink: 0, display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center', background: 'oklch(97% 0.02 230)', border: '1px solid var(--border)' }}>
              <SlackMark size={28} />
            </span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Slack</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Spørg dine data i en kanal eller DM</div>
            </div>
          </NodeShell>

          {/* ---- Claude ---- */}
          <NodeShell x={915} y={455} w={250} h={96}>
            <span style={{ width: 46, height: 46, borderRadius: 11, flexShrink: 0, display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center', background: '#D97757', border: '1px solid color-mix(in oklch, #D97757 45%, var(--border))' }}>
              <ClaudeMark size={28} color="#ffffff" />
            </span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Claude</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Naturligt sprog + agentiske handlinger</div>
            </div>
          </NodeShell>

          {/* ---- Employees ---- */}
          <NodeShell x={915} y={620} w={250} h={96} style={{ background: 'var(--bg-sunken)' }}>
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

      {/* ---- 4-step legend ---- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 26 }}>
        {[
          { n: '1', t: 'CRM-data', d: 'Kunder, kontrakter, tid, opgaver, NPS, økonomi og viden — alt samlet i ét CRM (Searchmind Agency OS).' },
          { n: '2', t: 'Apex MCP', d: 'Al performance-data flyder fra Apex MCP direkte ind i Searchmind MCP.' },
          { n: '3', t: 'Searchmind MCP', d: 'Samler CRM + performance som tools og ressourcer med RBAC. Under opbygning.' },
          { n: '4', t: '2-vejs i chat', d: 'Medarbejderne spørger i Slack og Claude — og skriver tilbage, fx opret opgave eller tidsregistrering.' },
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
