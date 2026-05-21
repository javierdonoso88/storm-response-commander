import { useEffect, useState } from 'react';

interface Props {
  onEnter: () => void;
}

const STATS = [
  { value: '127K', label: 'Clientes afectados', sub: 'Comarques de Girona', color: '#ef4444' },
  { value: '47', label: 'Fallos activos', sub: 'Transformadores · Cables · Conmutables', color: '#f97316' },
  { value: '22', label: 'Brigadas', sub: 'En 6 bases operativas', color: '#3b82f6' },
  { value: '7', label: 'Sitios críticos', sub: 'Hospitales · CPDs · Diálisis', color: '#f59e0b' },
];

const CHALLENGE_CARDS = [
  { accent: '#f59e0b', label: 'Sitios críticos', sub: 'Hospitales, diálisis y CPDs — batería limitada, prioridad máxima' },
  { accent: '#ef4444', label: 'Fallos de transformador', sub: '7 activos — brigada especializada · 90–180 min reparación' },
  { accent: '#f97316', label: 'Fallos de cable MT/BT', sub: '18 activos — reparación manual · 60–120 min' },
  { accent: '#22d3ee', label: 'Red conmutable', sub: '22 activos — restauración por telecontrol remoto · inmediato' },
  { accent: '#a78bfa', label: 'Drolius — Robot Scout', sub: 'Inspección autónoma de zonas peligrosas antes del despliegue de brigadas' },
];

const PHASE1_AGENTS = [
  { label: 'TECHNICIAN BRIEFING AGENT', system: 'SAP S/4HANA Asset Management + Event Mesh', desc: 'Clasifica 47 fallos por severidad y rankea los físicos por urgencia para el despacho', color: '#22d3ee' },
  { label: 'REMOTE RESTORATION SCADA AGENT', system: 'SAP Asset Intelligence Network', desc: 'Ejecuta conmutaciones remotas de telecontrol hasta el límite autorizado', color: '#4ade80' },
];

const PHASE2_AGENTS = [
  { label: 'SERVICE DISPATCHER AGENT', system: 'SAP Field Service Management', desc: 'Asigna brigadas respetando skills y ventana de tormenta', color: '#60a5fa' },
  { label: 'RESOURCE CAPACITY SHORTAGE AGENT', system: 'SAP Integrated Business Planning', desc: 'Gestiona inventario y registra conflictos de material', color: '#c084fc' },
  { label: 'COMMUNICATIONS INSIGHT AGENT', system: 'SAP Customer Experience', desc: 'Redacta SMS, notas de prensa y notificaciones regulatorias', color: '#f472b6' },
];

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function AgentCard({ label, system, desc, color }: { label: string; system: string; desc: string; color: string }) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3 transition-transform duration-200 hover:scale-[1.02]"
      style={{
        background: `linear-gradient(135deg, rgba(${hexToRgb(color)},0.08), rgba(${hexToRgb(color)},0.02))`,
        border: `1px solid rgba(${hexToRgb(color)},0.25)`,
      }}
    >
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="text-xs font-black tracking-widest" style={{ color }}>{label}</span>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{desc}</p>
      <div
        className="mt-auto text-[10px] font-mono px-2 py-1 rounded self-start"
        style={{ background: `rgba(${hexToRgb(color)},0.08)`, color: 'var(--text-dim)', border: `1px solid rgba(${hexToRgb(color)},0.15)` }}
      >
        {system}
      </div>
    </div>
  );
}

export function LandingPage({ onEnter }: Props) {
  const [vis, setVis] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVis(true), 60);
    return () => clearTimeout(t);
  }, []);

  const fade = (delay: number) =>
    `transition-all duration-700 ${vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}` +
    ` delay-[${delay}ms]`;

  return (
    <div className="h-screen overflow-y-auto" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>

      {/* ── NAV ── */}
      <nav
        className="sticky top-0 z-50 flex items-center gap-3 px-8 h-14"
        style={{ background: 'var(--bg-header)', backdropFilter: 'blur(14px)', borderBottom: '1px solid var(--border)' }}
      >
        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/SAP_2011_logo.svg/1280px-SAP_2011_logo.svg.png" alt="SAP" style={{ height: 17 }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--text-ghost)', margin: '0 2px' }}>|</span>
        <span className="text-sm font-semibold tracking-wide" style={{ color: 'var(--text-muted)' }}>Storm Response Commander</span>
        <button
          onClick={onEnter}
          className="ml-auto text-xs font-bold px-4 py-1.5 rounded-lg"
          style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)', cursor: 'pointer' }}
        >
          Abrir Simulador →
        </button>
      </nav>

      {/* ── HERO ── */}
      <section
        className="relative flex flex-col items-center justify-center text-center px-8"
        style={{ minHeight: 'calc(100vh - 56px)', background: 'radial-gradient(ellipse 80% 60% at 50% 40%, color-mix(in srgb, var(--accent) 5%, transparent) 0%, transparent 70%)' }}
      >
        {/* dot grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, color-mix(in srgb, var(--accent) 6%, transparent) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        {/* badge */}
        <div className={`mb-7 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest ${fade(0)}`}
          style={{ background: 'var(--accent-subtle)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)', color: 'var(--accent)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          SAP AI CORE &times; ANTHROPIC CLAUDE SONNET 4.6
        </div>

        {/* title */}
        <h1 className={`font-black leading-none mb-5 ${fade(100)}`}
          style={{ fontSize: 'clamp(2.8rem, 7.5vw, 6rem)', letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
          Storm Response<br />
          <span style={{ color: 'var(--accent)' }}>Commander</span>
        </h1>

        {/* subtitle */}
        <p className={`max-w-2xl text-lg leading-relaxed mb-3 ${fade(200)}`} style={{ color: 'var(--text-secondary)' }}>
          Sistema multi-agente de inteligencia artificial para la gestión de incidentes
          eléctricos en tiempo real. Orquestación autónoma, decisiones razonadas e integraciones SAP en vivo.
        </p>

        <p className={`text-xs font-mono mb-12 tracking-[0.15em] ${fade(300)}`} style={{ color: 'var(--text-ghost)' }}>
          IBERDROLA &middot; COMARQUES DE GIRONA &middot; ESCENARIO DE TORMENTA
        </p>

        {/* CTA */}
        <button
          onClick={onEnter}
          className={`px-10 py-4 rounded-xl font-bold text-base tracking-wide ${fade(400)}`}
          style={{ background: 'linear-gradient(135deg,#0891b2,#0e7490)', color: 'white', boxShadow: '0 0 32px rgba(34,211,238,0.22), 0 4px 20px rgba(0,0,0,0.3)', border: 'none', cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 56px rgba(34,211,238,0.4), 0 4px 20px rgba(0,0,0,0.3)'; e.currentTarget.style.transform = 'scale(1.03)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 32px rgba(34,211,238,0.22), 0 4px 20px rgba(0,0,0,0.3)'; e.currentTarget.style.transform = 'scale(1)'; }}
        >
          Acceder al Simulador →
        </button>

        {/* stats */}
        <div className={`mt-20 grid grid-cols-4 gap-10 ${fade(500)}`}>
          {STATS.map(s => (
            <div key={s.label} className="text-center">
              <div className="font-black mb-1" style={{ fontSize: '2.6rem', color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>{s.label}</div>
              <div className="text-xs" style={{ color: 'var(--text-ghost)' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* scroll hint */}
        <div className="absolute bottom-7 flex flex-col items-center gap-1 animate-bounce" style={{ color: 'var(--text-ghost)' }}>
          <span className="text-[11px] font-mono tracking-widest">SCROLL</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ── EL RETO ── */}
      <section className="px-8 py-24" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-xs font-bold tracking-widest mb-3" style={{ color: 'var(--accent)' }}>EL RETO OPERATIVO</div>
          <h2 className="font-black mb-3 leading-tight" style={{ fontSize: 'clamp(2rem,4vw,3rem)', color: 'var(--text-primary)' }}>
            47 fallos simultáneos.<br />
            <span style={{ color: '#f97316' }}>Decisiones en minutos.</span>
          </h2>
          <div className="grid grid-cols-2 gap-12 mt-10 items-start">
            <p className="text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Una tormenta severa golpea las Comarques de Girona dejando a <strong style={{ color: 'var(--text-secondary)' }}>127.000 clientes sin suministro</strong>.
              Hospitales y centros de diálisis funcionan con baterías. El equipo de operaciones
              dispone de una ventana limitada antes de la segunda tormenta para restaurar el máximo de
              suministro con los recursos disponibles. Cada minuto cuenta.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {CHALLENGE_CARDS.slice(0, 4).map(c => (
                <div key={c.label} className="rounded-lg p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderLeft: `3px solid ${c.accent}` }}>
                  <div className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{c.label}</div>
                  <div className="text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>{c.sub}</div>
                </div>
              ))}
              <div className="col-span-2 rounded-lg p-4 flex items-center gap-4" style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.25)', borderLeft: '3px solid #a78bfa' }}>
                <span className="text-2xl flex-shrink-0" style={{ lineHeight: 1 }}>🤖</span>
                <div>
                  <div className="text-sm font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>Drolius — Robot de Inspección</div>
                  <div className="text-xs leading-relaxed" style={{ color: '#6d5acd' }}>
                    Boston Dynamics Scout desplegado en campo. El agente Service Dispatcher Agent puede enviarlo a zonas peligrosas para confirmar batería SAI, evaluar accesibilidad o documentar daños <em style={{ color: '#8b7cf8' }}>antes de arriesgar a una brigada</em>.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ARQUITECTURA ── */}
      <section className="px-8 py-24" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-base)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-xs font-bold tracking-widest mb-3 text-center" style={{ color: 'var(--accent)' }}>ARQUITECTURA MULTI-AGENTE</div>
          <h2 className="font-black mb-2 text-center" style={{ fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', color: 'var(--text-primary)' }}>Orquestación autónoma con SAP</h2>
          <p className="text-center text-sm mb-14" style={{ color: 'var(--text-ghost)' }}>
            Un orquestador Claude coordina 5 agentes especializados que razonan y actúan con herramientas reales
          </p>

          {/* Orchestrator */}
          <div className="flex justify-center mb-5">
            <div className="px-10 py-4 rounded-2xl text-center" style={{ background: 'linear-gradient(135deg,rgba(245,158,11,0.1),rgba(245,158,11,0.04))', border: '1px solid rgba(245,158,11,0.35)', minWidth: 280 }}>
              <div className="text-[10px] font-bold tracking-widest mb-1" style={{ color: '#f59e0b' }}>SUPERVISOR</div>
              <div className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>ASSET AND SERVICES ASSISTANT</div>
              <div className="text-[11px] font-mono mt-1" style={{ color: 'var(--text-dim)' }}>SAP AI Core Orchestration</div>
            </div>
          </div>
          <div className="flex justify-center mb-4">
            <div style={{ width: 1, height: 28, background: 'linear-gradient(rgba(245,158,11,0.3),var(--border))' }} />
          </div>

          {/* Phase 1 */}
          <div className="flex items-center gap-4 mb-4 justify-center">
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span className="text-[11px] font-bold tracking-widest px-3 py-1 rounded-full" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)', whiteSpace: 'nowrap' }}>
              FASE 1 — PARALELO
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {PHASE1_AGENTS.map(a => <AgentCard key={a.label} {...a} />)}
          </div>

          <div className="flex justify-center mb-4">
            <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
          </div>

          {/* Phase 2 */}
          <div className="flex items-center gap-4 mb-4 justify-center">
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span className="text-[11px] font-bold tracking-widest px-3 py-1 rounded-full" style={{ background: 'rgba(249,115,22,0.08)', color: '#f97316', border: '1px solid rgba(249,115,22,0.2)', whiteSpace: 'nowrap' }}>
              FASE 2 — SECUENCIAL
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {PHASE2_AGENTS.map(a => <AgentCard key={a.label} {...a} />)}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section
        className="px-8 py-32 flex flex-col items-center text-center"
        style={{ borderTop: '1px solid var(--border)', background: 'radial-gradient(ellipse 70% 50% at 50% 0%, color-mix(in srgb, var(--accent) 4%, transparent) 0%, transparent 60%)' }}
      >
        <div className="text-xs font-bold tracking-widest mb-5" style={{ color: 'var(--accent)' }}>LISTO PARA SIMULAR</div>
        <h2 className="font-black mb-3" style={{ fontSize: 'clamp(2rem,4vw,3.5rem)', color: 'var(--text-primary)' }}>Inicia el incidente</h2>
        <p className="mb-10 text-base max-w-lg" style={{ color: 'var(--text-dim)' }}>
          Configura los parámetros operativos y observa cómo los agentes razonan, deciden y actúan en tiempo real.
        </p>
        <button
          onClick={onEnter}
          className="px-14 py-5 rounded-2xl font-black text-lg tracking-wide"
          style={{ background: 'linear-gradient(135deg,#0891b2,#0e7490)', color: 'white', boxShadow: '0 0 48px rgba(34,211,238,0.25), 0 8px 32px rgba(0,0,0,0.4)', border: 'none', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = '0 0 72px rgba(34,211,238,0.38), 0 8px 32px rgba(0,0,0,0.4)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 48px rgba(34,211,238,0.25), 0 8px 32px rgba(0,0,0,0.4)'; }}
        >
          Acceder al Simulador →
        </button>
        <div className="mt-14 flex items-center gap-3">
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/SAP_2011_logo.svg/1280px-SAP_2011_logo.svg.png" alt="SAP" style={{ height: 14, opacity: 0.25 }} />
          <span className="text-[11px] font-mono" style={{ color: 'var(--text-ghost)' }}>BTP Cloud Foundry · AI Core · Claude Sonnet 4.6</span>
        </div>
      </section>

    </div>
  );
}
