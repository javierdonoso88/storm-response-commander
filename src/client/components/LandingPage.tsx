import { useEffect, useState, useCallback } from 'react';

interface Props {
  onEnter: () => void;
}

const CRITICAL_SITES = [
  { id: 'TRF-002', name: 'CPD Ajuntament de Girona',           type: 'Centro de datos',      battery: 30  },
  { id: 'TRF-003', name: 'Centro de Diálisis de Girona',       type: 'Salud — diálisis',      battery: 60  },
  { id: 'TRF-004', name: 'EDAR Banyoles',                      type: 'Agua / saneamiento',    battery: 120 },
  { id: 'TRF-006', name: "Comissaria Mossos d'Esquadra Fig.",  type: 'Emergencias',            battery: 180 },
  { id: 'TRF-001', name: 'Hospital de Figueres',               type: 'Hospital',              battery: 240 },
  { id: 'TRF-007', name: 'H. Universitari de Santa Caterina',  type: 'Hospital',              battery: 360 },
  { id: 'TRF-005', name: "Punt d'Atenció Continuada Olot",     type: 'Hospital',              battery: 480 },
];

const TENSIONS = [
  {
    color: '#ef4444',
    title: 'CPD Girona — 30 min de batería',
    desc: 'El fallo TRF-002 tiene la batería más baja del escenario. Si el SLA objetivo supera los 30 min, casi seguro incumplirá. El agente Triage debe asignarlo rango 1 de forma obligatoria.',
  },
  {
    color: '#f97316',
    title: 'Escasez de transformadores',
    desc: 'Con piezas limitadas ON solo hay 1 transformador en almacén para 7 fallos que lo necesitan. El agente Resource entra en conflicto garantizado y priorización forzada.',
  },
  {
    color: '#facc15',
    title: 'Ventana tormenta 2 — T+4h',
    desc: 'Con ventana en T+4h el agente Crew-Dispatch no puede asignar reparaciones de transformador con ETA > 210 min, dejando varios fallos físicos sin brigada para proteger al personal.',
  },
  {
    color: '#818cf8',
    title: 'Pocas brigadas disponibles',
    desc: 'Con menos de 12 brigadas, zonas costeras de alta carga (Palamós 6.200, Palafrugell 5.800, Sant Feliu 5.500) quedan sin atender. La eficiencia cae por debajo del 60%.',
  },
];

function batteryColor(min: number) {
  if (min <= 60) return '#ef4444';
  if (min <= 180) return '#f97316';
  if (min <= 300) return '#facc15';
  return '#475569';
}

function batteryPct(min: number) {
  return Math.round((min / 480) * 100);
}

export function LandingPage({ onEnter }: Props) {
  const [current, setCurrent] = useState(0);
  const [vis, setVis] = useState(false);
  const total = 4;

  useEffect(() => {
    const t = setTimeout(() => setVis(true), 60);
    return () => clearTimeout(t);
  }, []);

  const prev = useCallback(() => setCurrent(c => Math.max(0, c - 1)), []);
  const next = useCallback(() => setCurrent(c => Math.min(total - 1, c + 1)), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, prev]);

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: '#080e1a', color: 'white' }}
    >
      {/* NAV */}
      <nav
        className="flex items-center gap-3 px-8 h-14 flex-shrink-0 z-50"
        style={{
          background: 'rgba(8,14,26,0.9)',
          backdropFilter: 'blur(14px)',
          borderBottom: '1px solid rgba(30,45,69,0.7)',
        }}
      >
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/SAP_2011_logo.svg/1280px-SAP_2011_logo.svg.png"
          alt="SAP"
          style={{ height: 17 }}
        />
        <span className="text-sm font-semibold" style={{ color: '#334155', margin: '0 2px' }}>|</span>
        <span className="text-sm font-semibold tracking-wide" style={{ color: '#64748b' }}>
          Storm Response Commander
        </span>
        <button
          onClick={onEnter}
          className="ml-auto text-xs font-bold px-4 py-1.5 rounded-lg transition-all"
          style={{
            background: 'rgba(34,211,238,0.08)',
            color: '#22d3ee',
            border: '1px solid rgba(34,211,238,0.25)',
            cursor: 'pointer',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(34,211,238,0.15)';
            e.currentTarget.style.borderColor = 'rgba(34,211,238,0.5)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(34,211,238,0.08)';
            e.currentTarget.style.borderColor = 'rgba(34,211,238,0.25)';
          }}
        >
          Abrir Simulador →
        </button>
      </nav>

      {/* SLIDES */}
      <div className="flex-1 overflow-hidden relative">
        <div
          className="flex h-full"
          style={{
            width: `${total * 100}%`,
            transform: `translateX(-${(current / total) * 100}%)`,
            transition: 'transform 0.45s cubic-bezier(0.4,0,0.2,1)',
          }}
        >

          {/* ── SLIDE 1: RESUMEN ── */}
          <SlideShell>
            <div
              className={`flex flex-col items-center justify-center text-center h-full px-8 transition-all duration-700 ${vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ maxWidth: 800, margin: '0 auto', width: '100%' }}
            >
              <div
                className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  color: '#ef4444',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                INCIDENTE ACTIVO · COMARQUES DE GIRONA
              </div>

              <h1
                className="font-black leading-none mb-4"
                style={{ fontSize: 'clamp(2.4rem,6vw,5rem)', letterSpacing: '-0.03em' }}
              >
                Tormenta severa.<br />
                <span style={{ color: '#22d3ee' }}>47 fallos simultáneos.</span>
              </h1>

              <p className="text-base leading-relaxed mb-10 max-w-xl" style={{ color: '#64748b' }}>
                Una tormenta golpea las Comarques de Girona dejando{' '}
                <strong style={{ color: '#94a3b8' }}>127.000 clientes sin suministro</strong>.
                Hospitales, centros de diálisis y CPDs funcionan con batería limitada.
                Los agentes de IA deben coordinar la respuesta antes de que se agote.
              </p>

              <div className="grid grid-cols-4 gap-5 mb-10 w-full">
                {[
                  { value: '127K', label: 'Clientes', sub: 'sin suministro', color: '#ef4444' },
                  { value: '47', label: 'Fallos activos', sub: '22 · 7 · 18', color: '#f97316' },
                  { value: '7', label: 'Críticos', sub: 'SAI / batería', color: '#facc15' },
                  { value: '22', label: 'Brigadas', sub: 'en 6 bases', color: '#22c55e' },
                ].map(s => (
                  <div
                    key={s.label}
                    className="rounded-xl py-5 px-3 flex flex-col items-center gap-1"
                    style={{ background: 'rgba(15,24,42,0.9)', border: '1px solid #0d1e35' }}
                  >
                    <span className="font-black leading-none" style={{ fontSize: '2.2rem', color: s.color }}>{s.value}</span>
                    <span className="text-sm font-semibold text-white">{s.label}</span>
                    <span className="text-[11px]" style={{ color: '#334155' }}>{s.sub}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={onEnter}
                className="px-10 py-3.5 rounded-xl font-bold text-base tracking-wide"
                style={{
                  background: 'linear-gradient(135deg,#0891b2,#0e7490)',
                  color: 'white',
                  boxShadow: '0 0 32px rgba(34,211,238,0.22), 0 4px 20px rgba(0,0,0,0.5)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'scale(1.04)';
                  e.currentTarget.style.boxShadow = '0 0 56px rgba(34,211,238,0.38), 0 4px 20px rgba(0,0,0,0.5)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 0 32px rgba(34,211,238,0.22), 0 4px 20px rgba(0,0,0,0.5)';
                }}
              >
                Acceder al Simulador →
              </button>
            </div>
          </SlideShell>

          {/* ── SLIDE 2: SITIOS CRÍTICOS ── */}
          <SlideShell>
            <div className="flex flex-col h-full px-8 py-10 overflow-hidden" style={{ maxWidth: 900, margin: '0 auto', width: '100%' }}>
              <SlideHeader
                eyebrow="SLIDE 2 / 4 — SITIOS CRÍTICOS"
                title="Infraestructura en riesgo"
                sub="7 instalaciones críticas dependen de batería SAI. Si no se restaura a tiempo, quedan sin suministro."
              />
              <div className="flex flex-col gap-2.5 flex-1 overflow-y-auto mt-6">
                {CRITICAL_SITES.map(s => {
                  const color = batteryColor(s.battery);
                  const pct = batteryPct(s.battery);
                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-4 rounded-xl px-4 py-3"
                      style={{ background: 'rgba(15,24,42,0.8)', border: '1px solid #0d1e35' }}
                    >
                      <span
                        className="text-[10px] font-mono font-bold w-16 flex-shrink-0 text-center px-1.5 py-1 rounded"
                        style={{
                          color,
                          background: `rgba(${hexToRgb(color)},0.12)`,
                          border: `1px solid rgba(${hexToRgb(color)},0.2)`,
                        }}
                      >
                        {s.id}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate text-white">{s.name}</div>
                        <div className="text-[11px]" style={{ color: '#475569' }}>{s.type}</div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0" style={{ width: 200 }}>
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#0d1e35' }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: color, transition: 'width 0.5s' }}
                          />
                        </div>
                        <span
                          className="text-sm font-black font-mono w-16 text-right"
                          style={{ color }}
                        >
                          {s.battery} min
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-lg px-4 py-2.5" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                <span className="text-xs" style={{ color: '#64748b' }}>
                  Los 7 requieren sustitución física de transformador. Con inventario limitado (1 unidad),
                  el agente Resource detecta escasez y fuerza priorización entre ellos.
                </span>
              </div>
            </div>
          </SlideShell>

          {/* ── SLIDE 3: TIPOS DE FALLO ── */}
          <SlideShell>
            <div className="flex flex-col h-full px-8 py-10" style={{ maxWidth: 900, margin: '0 auto', width: '100%' }}>
              <SlideHeader
                eyebrow="SLIDE 3 / 4 — TIPOS DE FALLO"
                title="47 fallos, tres tipos de respuesta"
                sub="Cada tipo determina qué agente actúa, con qué recursos y en cuánto tiempo."
              />
              <div className="grid grid-cols-3 gap-5 mt-8 flex-1">
                {[
                  {
                    count: 22, label: 'Conmutables', color: '#22d3ee',
                    time: 'Inmediato', method: 'Telecontrol remoto — sin brigada física',
                    agent: 'Remote Restoration',
                    items: ['Hasta N operaciones autorizadas', 'Sin material consumido', 'Clientes restaurados al instante'],
                    note: 'El parámetro Conmutables controla cuántos pueden operarse remotamente.',
                  },
                  {
                    count: 7, label: 'Transformadores', color: '#f97316',
                    time: '90 – 180 min', method: 'Sustitución física en campo',
                    agent: 'Crew-Dispatch · Resource',
                    items: ['1 transformador por fallo', 'Skill A requerido en brigada', 'Todos son sitios críticos'],
                    note: 'Con piezas limitadas solo hay 1 unidad para 7 fallos → conflicto garantizado.',
                  },
                  {
                    count: 18, label: 'Cables', color: '#818cf8',
                    time: '60 – 120 min', method: 'Reparación de línea en campo',
                    agent: 'Crew-Dispatch · Resource',
                    items: ['1 bobina de cable por fallo', 'Skill B requerido en brigada', 'Alta carga residencial'],
                    note: 'Las zonas costeras tienen los mayores volúmenes: Palamós 6.200, Palafrugell 5.800.',
                  },
                ].map(ft => (
                  <div
                    key={ft.label}
                    className="rounded-2xl p-6 flex flex-col gap-4"
                    style={{
                      background: `linear-gradient(135deg, rgba(${hexToRgb(ft.color)},0.07), rgba(${hexToRgb(ft.color)},0.02))`,
                      border: `1px solid rgba(${hexToRgb(ft.color)},0.2)`,
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <span
                        className="font-black leading-none"
                        style={{ fontSize: '3.5rem', color: ft.color, lineHeight: 1 }}
                      >
                        {ft.count}
                      </span>
                      <span
                        className="text-[10px] font-bold tracking-widest px-2 py-1 rounded-full"
                        style={{
                          color: ft.color,
                          background: `rgba(${hexToRgb(ft.color)},0.1)`,
                          border: `1px solid rgba(${hexToRgb(ft.color)},0.2)`,
                        }}
                      >
                        {ft.label.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white mb-0.5">{ft.method}</div>
                      <div className="text-xs font-mono" style={{ color: '#475569' }}>{ft.time}</div>
                    </div>
                    <ul className="flex flex-col gap-1.5">
                      {ft.items.map(item => (
                        <li key={item} className="flex items-start gap-1.5 text-xs" style={{ color: '#64748b' }}>
                          <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: ft.color }} />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <div
                      className="mt-auto text-[10px] font-mono px-2.5 py-1.5 rounded-lg"
                      style={{
                        background: `rgba(${hexToRgb(ft.color)},0.07)`,
                        border: `1px solid rgba(${hexToRgb(ft.color)},0.15)`,
                        color: '#475569',
                      }}
                    >
                      {ft.agent}
                    </div>
                    <p className="text-[10px] leading-relaxed" style={{ color: '#334155' }}>{ft.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </SlideShell>

          {/* ── SLIDE 4: TENSIONES ── */}
          <SlideShell>
            <div className="flex flex-col h-full px-8 py-10" style={{ maxWidth: 900, margin: '0 auto', width: '100%' }}>
              <SlideHeader
                eyebrow="SLIDE 4 / 4 — TENSIONES DEL ESCENARIO"
                title="Lo que hace difícil la respuesta"
                sub="Cuatro situaciones de presión que los parámetros pueden activar. Pruébalas por separado o en combinación."
              />
              <div className="grid grid-cols-2 gap-4 mt-7 flex-1">
                {TENSIONS.map(t => (
                  <div
                    key={t.title}
                    className="rounded-2xl p-6 flex flex-col gap-3"
                    style={{
                      background: 'rgba(15,24,42,0.8)',
                      border: '1px solid #0d1e35',
                      borderLeft: `3px solid ${t.color}`,
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.color }} />
                      <span className="text-sm font-black text-white">{t.title}</span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>{t.desc}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-center">
                <button
                  onClick={onEnter}
                  className="px-10 py-3.5 rounded-xl font-bold text-base tracking-wide"
                  style={{
                    background: 'linear-gradient(135deg,#0891b2,#0e7490)',
                    color: 'white',
                    boxShadow: '0 0 32px rgba(34,211,238,0.22), 0 4px 20px rgba(0,0,0,0.5)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'scale(1.04)';
                    e.currentTarget.style.boxShadow = '0 0 56px rgba(34,211,238,0.38), 0 4px 20px rgba(0,0,0,0.5)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 0 32px rgba(34,211,238,0.22), 0 4px 20px rgba(0,0,0,0.5)';
                  }}
                >
                  Acceder al Simulador →
                </button>
              </div>
            </div>
          </SlideShell>

        </div>
      </div>

      {/* NAVIGATION BAR */}
      <div
        className="flex items-center justify-between px-8 h-14 flex-shrink-0"
        style={{ borderTop: '1px solid #0d1e35', background: 'rgba(8,14,26,0.8)' }}
      >
        {/* Prev */}
        <button
          onClick={prev}
          disabled={current === 0}
          className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg transition-all"
          style={{
            color: current === 0 ? '#1e3a5f' : '#64748b',
            border: `1px solid ${current === 0 ? '#0d1e35' : '#1e2d45'}`,
            background: 'transparent',
            cursor: current === 0 ? 'default' : 'pointer',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Anterior
        </button>

        {/* Dots */}
        <div className="flex items-center gap-2.5">
          {Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === current ? 24 : 8,
                height: 8,
                background: i === current ? '#22d3ee' : '#1e3a5f',
                border: 'none',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>

        {/* Next / Enter */}
        {current < total - 1 ? (
          <button
            onClick={next}
            className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg transition-all"
            style={{
              color: '#64748b',
              border: '1px solid #1e2d45',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            Siguiente
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <button
            onClick={onEnter}
            className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg transition-all"
            style={{
              color: '#22d3ee',
              border: '1px solid rgba(34,211,238,0.3)',
              background: 'rgba(34,211,238,0.06)',
              cursor: 'pointer',
            }}
          >
            Abrir Simulador
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function SlideShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="h-full flex-shrink-0 overflow-hidden"
      style={{ width: '25%' }}
    >
      <div
        className="h-full overflow-hidden"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(34,211,238,0.04) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function SlideHeader({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <div className="flex-shrink-0">
      <div className="text-[10px] font-bold tracking-widest mb-2" style={{ color: '#22d3ee' }}>{eyebrow}</div>
      <h2 className="font-black leading-tight mb-1" style={{ fontSize: 'clamp(1.6rem,3vw,2.4rem)' }}>{title}</h2>
      <p className="text-sm" style={{ color: '#475569' }}>{sub}</p>
    </div>
  );
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
