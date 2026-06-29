// shared.jsx — small shared components

const fmtDKK = (n, opts={}) => {
  const { compact=false } = opts;
  if (compact && Math.abs(n) >= 1000) {
    if (Math.abs(n) >= 1_000_000) return (n/1_000_000).toFixed(1).replace('.0','') + 'M kr';
    return Math.round(n/1000) + 'K kr';
  }
  return new Intl.NumberFormat('da-DK').format(Math.round(n)) + ' kr';
};
const fmtPct = (n, digits=0) => `${(n*100).toFixed(digits)}%`;
const fmtHours = (n) => `${n.toFixed(n%1===0?0:1)} t`;
const fmtDate = (iso) => new Date(iso).toLocaleDateString('da-DK', { day:'numeric', month:'short', year:'numeric' });

function Avatar({ person, size=24, ring=true }) {
  if (!person) return null;
  return (
    <div className="avatar" style={{
      width:size, height:size,
      background:`oklch(62% 0.15 ${person.hue || 272})`,
      fontSize:Math.round(size*0.42), borderWidth: ring?1.5:0,
    }}>
      {person.avatar || (person.name?.split(' ').map(s=>s[0]).slice(0,2).join(''))}
    </div>
  );
}

function AvatarStack({ people, max=3, size=22 }) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <div style={{ display:'inline-flex' }}>
      {shown.map((p,i) => (
        <div key={p.id} style={{ marginLeft:i===0?0:-6, zIndex:shown.length-i }}>
          <Avatar person={p} size={size}/>
        </div>
      ))}
      {extra > 0 && (
        <div className="avatar" style={{
          width:size, height:size, marginLeft:-6,
          background:'var(--bg-sunken)', color:'var(--text-muted)',
          fontSize:Math.round(size*0.42), borderWidth:1.5,
        }}>+{extra}</div>
      )}
    </div>
  );
}

function DeptDot({ id, size=8 }) {
  const d = SmData.DEPARTMENTS.find(x => x.id === id);
  return <span style={{ display:'inline-block', width:size, height:size, borderRadius:2, background:d?.color||'var(--border)' }}/>;
}
function DeptChip({ id }) {
  const d = SmData.DEPARTMENTS.find(x => x.id === id);
  if (!d) return null;
  return <span className="chip" style={{ color:d.color, background:`color-mix(in oklch, ${d.color} 10%, var(--bg-elev))`, borderColor:`color-mix(in oklch, ${d.color} 25%, var(--border))` }}><span className="dot"/>{d.name}</span>;
}

function HealthChip({ health, label }) {
  const map = {
    ok:{ cls:'chip-ok',   dot:'var(--ok)',   text:'Sund' },
    warn:{ cls:'chip-warn',dot:'var(--warn)', text:'Advarsel' },
    bad:{ cls:'chip-bad',  dot:'var(--bad)',  text:'Kritisk' },
  };
  const m = map[health] || map.ok;
  return <span className={`chip ${m.cls}`}><span className="dot" style={{ background:m.dot }}/>{label??m.text}</span>;
}

// NEW: Status pill/symbol
function StatusPill({ status, compact=false }) {
  const map = {
    active:   { dot:'var(--ok)',   text:'Aktiv',    pulse:true },
    paused:   { dot:'var(--warn)', text:'Pauseret', pulse:false },
    inactive: { dot:'var(--text-faint)', text:'Inaktiv', pulse:false },
  };
  const m = map[status] || map.active;
  if (compact) {
    return (
      <Tooltip content={m.text}>
        <span style={{
          display:'inline-block', width:8, height:8, borderRadius:'50%',
          background:m.dot, boxShadow: m.pulse ? `0 0 0 2px color-mix(in oklch, ${m.dot} 25%, transparent)` : 'none',
          animation: m.pulse ? 'pulse 2s ease-in-out infinite' : 'none',
        }}/>
      </Tooltip>
    );
  }
  return (
    <span className="chip" style={{
      background:`color-mix(in oklch, ${m.dot} 10%, var(--bg-elev))`,
      borderColor:`color-mix(in oklch, ${m.dot} 25%, var(--border))`,
      color: status==='inactive' ? 'var(--text-muted)' : m.dot,
    }}>
      <span className="dot" style={{ background:m.dot }}/>{m.text}
    </span>
  );
}

function Delta({ value, fmt=(v)=>fmtPct(v,1), invert=false }) {
  const up = value >= 0;
  const good = invert ? !up : up;
  return (
    <span className="num mono" style={{ fontSize:11.5, fontWeight:500, color: good?'var(--ok)':'var(--bad)' }}>
      {up?'▲':'▼'} {up?'+':''}{fmt(value).replace('-','')}
    </span>
  );
}

function Sparkline({ data, width=120, height=32, stroke='currentColor', fill, strokeWidth=1.5, showLast=false }) {
  if (!data?.length) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v,i) => [(i/(data.length-1))*(width-2)+1, height-1-((v-min)/span)*(height-2)]);
  const path = pts.map((p,i) => (i===0?'M':'L')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const areaPath = fill ? path + ` L ${width-1} ${height-1} L 1 ${height-1} Z` : null;
  return (
    <svg width={width} height={height} style={{ overflow:'visible' }}>
      {areaPath && <path d={areaPath} fill={fill} opacity={0.15}/>}
      <path d={path} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      {showLast && <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r={2.5} fill={stroke}/>}
    </svg>
  );
}

function UtilBar({ hours, budget, showLabel=true, width=null }) {
  const ratio = budget > 0 ? hours/budget : 0;
  const over = ratio > 1;
  const fillPct = Math.min(ratio, 1) * 100;
  const overPct = over ? Math.min((ratio-1), 0.6) * 100 / 0.6 : 0;
  const color = ratio > 1 ? 'var(--bad)' : ratio > 0.9 ? 'var(--warn)' : 'var(--ok)';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, width:width||'100%' }}>
      <div style={{ flex:1, height:6, borderRadius:3, background:'var(--bg-sunken)', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', left:0, top:0, bottom:0, width:`${fillPct}%`, background:color, borderRadius:3, transition:'width 0.3s ease' }}/>
        {over && <div style={{ position:'absolute', right:0, top:0, bottom:0, width:`${overPct}%`, background:'repeating-linear-gradient(45deg, var(--bad) 0 3px, var(--bad-soft) 3px 6px)', borderRadius:3 }}/>}
      </div>
      {showLabel && <span className="mono num" style={{ fontSize:11.5, color, minWidth:50, textAlign:'right' }}>{Math.round(ratio*100)}%</span>}
    </div>
  );
}

function AllocationBar({ allocation, height=10, rounded=true }) {
  const entries = Object.entries(allocation);
  return (
    <div style={{ display:'flex', height, width:'100%', borderRadius:rounded?height/2:0, overflow:'hidden', background:'var(--bg-sunken)' }}>
      {entries.map(([dep, pct]) => {
        const d = SmData.DEPARTMENTS.find(x => x.id === dep);
        return <div key={dep} style={{ width:`${pct}%`, background:d?.color||'var(--border)', transition:'width 0.3s ease' }} title={`${d?.name}: ${pct}%`}/>;
      })}
    </div>
  );
}

function TextField({ icon:IconComp, placeholder, value, onChange, kbd, width, autoFocus, type='text' }) {
  return (
    <div style={{
      display:'inline-flex', alignItems:'center', gap:8,
      height:32, padding:'0 10px', width:width||'auto',
      borderRadius:'var(--r-sm)', border:'1px solid var(--border)', background:'var(--bg-elev)',
    }} tabIndex={-1}>
      {IconComp && <IconComp size={14} style={{ color:'var(--text-faint)' }}/>}
      <input type={type} autoFocus={autoFocus} value={value} onChange={(e)=>onChange?.(e.target.value)} placeholder={placeholder}
        style={{ flex:1, border:0, outline:0, background:'transparent', fontSize:13, minWidth:0 }}/>
      {kbd && <span className="kbd">{kbd}</span>}
    </div>
  );
}

function TabGroup({ tabs, active, onChange, small }) {
  return (
    <div style={{ display:'inline-flex', gap:2, padding:2, background:'var(--bg-sunken)', borderRadius:'var(--r-sm)', border:'1px solid var(--border)' }}>
      {tabs.map(t => (
        <button key={t.id} onClick={()=>onChange(t.id)} style={{
          height:small?24:28, padding:'0 10px',
          fontSize:small?12:13, fontWeight:active===t.id?600:500,
          color:active===t.id?'var(--text)':'var(--text-muted)',
          background:active===t.id?'var(--bg-elev)':'transparent',
          border:'1px solid', borderColor:active===t.id?'var(--border)':'transparent',
          borderRadius:4, boxShadow:active===t.id?'var(--sh-sm)':'none',
          display:'inline-flex', alignItems:'center', gap:6,
        }}>
          {t.icon && <t.icon size={12}/>}{t.label}
          {t.count != null && <span className="mono num" style={{ fontSize:11, color:'var(--text-faint)' }}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

function Tooltip({ children, content, position='top' }) {
  const [show, setShow] = React.useState(false);
  return (
    <span style={{ position:'relative', display:'inline-flex' }}
          onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}>
      {children}
      {show && content && (
        <div style={{
          position:'absolute',
          bottom: position==='top' ? 'calc(100% + 6px)' : 'auto',
          top: position==='bottom' ? 'calc(100% + 6px)' : 'auto',
          left:'50%', transform:'translateX(-50%)',
          background:'var(--text)', color:'var(--bg-elev)',
          padding:'6px 10px', borderRadius:4, fontSize:11.5, whiteSpace:'nowrap',
          zIndex:100, pointerEvents:'none', boxShadow:'var(--sh-md)',
        }}>{content}</div>
      )}
    </span>
  );
}

// NEW: NPS score display with hover card showing latest / 6-month average / history
function NpsHoverCard({ client, size='md' }) {
  const [show, setShow] = React.useState(false);
  const hist = client.npsHistory || [];
  const latest = hist[hist.length-1];
  const last6 = hist.slice(-6);
  const avg6 = last6.length ? (last6.reduce((a,b)=>a+b.score,0)/last6.length) : null;
  const score = latest?.score ?? 0;
  const color = score >= 60 ? 'var(--ok)' : score >= 40 ? 'var(--warn)' : 'var(--bad)';
  const fontSize = size==='lg' ? 17 : 14;

  return (
    <span style={{ position:'relative', display:'inline-flex', alignItems:'center', gap:6 }}
          onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}>
      <span className="mono num" style={{ fontSize, fontWeight:600, color, cursor:'help' }}>
        {hist.length ? score : '—'}
      </span>
      {show && hist.length > 0 && (
        <div style={{
          position:'absolute', top:'calc(100% + 8px)', left:0, zIndex:80,
          background:'var(--bg-elev)', border:'1px solid var(--border)',
          borderRadius:'var(--r-md)', padding:14, minWidth:260,
          boxShadow:'var(--sh-pop)', pointerEvents:'none',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
            <div>
              <div className="section-label">Seneste</div>
              <div className="mono num" style={{ fontSize:22, fontWeight:600, color, lineHeight:1 }}>{score}</div>
              <div style={{ fontSize:10.5, color:'var(--text-faint)', marginTop:2 }}>{latest ? fmtDate(latest.respondedAt) : '—'}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div className="section-label">Gns. seneste 6 mdr</div>
              <div className="mono num" style={{ fontSize:22, fontWeight:600, color: avg6>=60?'var(--ok)':avg6>=40?'var(--warn)':'var(--bad)', lineHeight:1 }}>
                {avg6!=null ? avg6.toFixed(1) : '—'}
              </div>
              <div style={{ fontSize:10.5, color:'var(--text-faint)', marginTop:2 }}>{last6.length} målinger</div>
            </div>
          </div>
          <div style={{ color, marginTop:6 }}>
            <Sparkline data={hist.map(h=>h.score)} width={230} height={36} stroke={color} fill={color} strokeWidth={1.8} showLast/>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:10.5, color:'var(--text-faint)', marginTop:4, fontFamily:'Geist Mono' }}>
            <span>{hist[0] ? fmtDate(hist[0].sentAt) : ''}</span>
            <span>{latest ? fmtDate(latest.sentAt) : ''}</span>
          </div>
          <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid var(--border-subtle)', fontSize:11, color:'var(--text-muted)' }}>
            Interval: <b style={{ color:'var(--text)' }}>
              {client.npsInterval==='monthly'?'Månedlig':client.npsInterval==='quarterly'?'Kvartalsvis':'Halvårlig'}
            </b>
          </div>
        </div>
      )}
    </span>
  );
}

Object.assign(window, {
  fmtDKK, fmtPct, fmtHours, fmtDate,
  Avatar, AvatarStack, DeptDot, DeptChip, HealthChip, StatusPill, Delta,
  Sparkline, UtilBar, AllocationBar,
  TextField, TabGroup, Tooltip, NpsHoverCard,
});
