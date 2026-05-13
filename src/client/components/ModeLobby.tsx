import { useState } from 'react';

interface Props {
  onSolo: () => void;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  roomCode: string | null;
  roomError: string | null;
  memberCount: number;
  role: 'director' | 'observer' | null;
  connected: boolean;
  onEnterSimulator: () => void;
}

export function ModeLobby({
  onSolo,
  onCreateRoom,
  onJoinRoom,
  roomCode,
  roomError,
  memberCount,
  role,
  connected,
  onEnterSimulator,
}: Props) {
  const [joinCode, setJoinCode] = useState('');
  const [view, setView] = useState<'choose' | 'create' | 'join'>('choose');

  return (
    <div className="h-screen flex flex-col items-center justify-center" style={{ background: '#080e1a', color: 'white' }}>

      {/* Header */}
      <div className="mb-10 flex flex-col items-center gap-3">
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/SAP_2011_logo.svg/1280px-SAP_2011_logo.svg.png"
          alt="SAP" style={{ height: 22, opacity: 0.7 }}
        />
        <h1 className="text-2xl font-black tracking-tight">Storm Response Commander</h1>
        <p className="text-sm" style={{ color: '#475569' }}>Selecciona el modo de operación</p>
      </div>

      {/* Content */}
      {view === 'choose' && (
        <div className="grid grid-cols-3 gap-4 w-full max-w-2xl px-8">

          {/* Solo */}
          <ModeCard
            color="#22d3ee"
            icon={<UserIcon />}
            title="Modo Individual"
            desc="Simulación privada. Solo tú controlas los agentes y ves los resultados."
            cta="Entrar solo"
            onClick={onSolo}
          />

          {/* Create room */}
          <ModeCard
            color="#f59e0b"
            icon={<CrownIcon />}
            title="Crear Sala de Crisis"
            desc="Actúa como Director de Operaciones. Aprueba o rechaza las decisiones de los agentes."
            cta="Crear sala"
            onClick={() => { onCreateRoom(); setView('create'); }}
          />

          {/* Join room */}
          <ModeCard
            color="#60a5fa"
            icon={<ObserverIcon />}
            title="Unirse a Sala"
            desc="Observa la simulación en tiempo real con otros usuarios conectados."
            cta="Unirse"
            onClick={() => setView('join')}
          />
        </div>
      )}

      {/* Create room — waiting for members */}
      {view === 'create' && role === 'director' && (
        <div className="flex flex-col items-center gap-6 w-full max-w-sm px-8">
          <div className="w-full rounded-2xl p-8 text-center" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <div className="text-xs font-bold tracking-widest mb-2" style={{ color: '#f59e0b' }}>SALA CREADA</div>
            <div className="text-5xl font-black tracking-[0.2em] mb-3" style={{ color: '#f59e0b', fontFamily: 'monospace' }}>
              {roomCode}
            </div>
            <p className="text-sm mb-5" style={{ color: '#64748b' }}>
              Comparte este código con los Observadores para que se unan a la sala.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span style={{ color: '#94a3b8' }}>{memberCount} {memberCount === 1 ? 'participante' : 'participantes'}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full">
            <div className="text-xs font-bold px-3 py-2 rounded-lg" style={{ background: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)', textAlign: 'center' }}>
              Director de Operaciones — podrás aprobar/rechazar decisiones
            </div>
            <button
              onClick={onEnterSimulator}
              className="w-full py-3 rounded-xl font-bold text-sm"
              style={{ background: 'linear-gradient(135deg,#0891b2,#0e7490)', color: 'white', border: 'none', cursor: 'pointer' }}
            >
              Entrar al Simulador →
            </button>
          </div>

          <button
            onClick={onSolo}
            className="text-xs px-4 py-2 rounded-lg"
            style={{ background: '#1e2d45', color: '#64748b', border: '1px solid #334155', cursor: 'pointer' }}
          >
            ← Volver
          </button>
        </div>
      )}

      {/* Join room — enter code */}
      {view === 'join' && role === null && (
        <div className="flex flex-col items-center gap-5 w-full max-w-xs px-8">
          <div className="text-sm font-semibold" style={{ color: '#64748b' }}>Introduce el código de sala</div>
          <input
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
            placeholder="XXXX"
            className="w-full text-center text-3xl font-black tracking-[0.3em] rounded-xl px-4 py-4 outline-none"
            style={{
              background: '#0d1520', color: '#60a5fa',
              border: '2px solid #1e2d45', fontFamily: 'monospace',
            }}
            onKeyDown={e => { if (e.key === 'Enter' && joinCode.length === 4) onJoinRoom(joinCode); }}
          />
          {roomError && (
            <div className="text-sm font-semibold text-red-400">{roomError}</div>
          )}
          <button
            disabled={joinCode.length !== 4}
            onClick={() => onJoinRoom(joinCode)}
            className="w-full py-3 rounded-xl font-bold text-sm"
            style={{
              background: joinCode.length === 4 ? '#1d4ed8' : '#1e2d45',
              color: joinCode.length === 4 ? 'white' : '#334155',
              cursor: joinCode.length === 4 ? 'pointer' : 'not-allowed',
              border: 'none',
              transition: 'background 0.2s',
            }}
          >
            Unirse →
          </button>
          <button
            onClick={() => { setView('choose'); setJoinCode(''); }}
            className="text-xs px-4 py-2 rounded-lg"
            style={{ background: '#1e2d45', color: '#64748b', border: '1px solid #334155', cursor: 'pointer' }}
          >
            ← Volver
          </button>
        </div>
      )}

      {/* Observer joined — waiting */}
      {view === 'join' && role === 'observer' && (
        <div className="flex flex-col items-center gap-5 w-full max-w-sm px-8">
          <div className="w-full rounded-2xl p-8 text-center" style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.25)' }}>
            <div className="text-xs font-bold tracking-widest mb-2" style={{ color: '#60a5fa' }}>SALA UNIDA</div>
            <div className="text-4xl font-black tracking-[0.25em] mb-3" style={{ color: '#60a5fa', fontFamily: 'monospace' }}>
              {roomCode}
            </div>
            <p className="text-sm mb-4" style={{ color: '#64748b' }}>
              Esperando a que el Director inicie la simulación...
            </p>
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span style={{ color: '#94a3b8' }}>{memberCount} {memberCount === 1 ? 'participante' : 'participantes'}</span>
            </div>
          </div>
          <div className="text-xs font-bold px-3 py-2 rounded-lg" style={{ background: 'rgba(96,165,250,0.08)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)', textAlign: 'center' }}>
            Observador — visualización en tiempo real, sin control
          </div>
          <button
            onClick={onEnterSimulator}
            className="w-full py-3 rounded-xl font-bold text-sm"
            style={{ background: 'linear-gradient(135deg,#0891b2,#0e7490)', color: 'white', border: 'none', cursor: 'pointer' }}
          >
            Entrar al Simulador →
          </button>
        </div>
      )}

      {/* Connection status */}
      <div className="mt-10 flex items-center gap-2 text-xs" style={{ color: '#334155' }}>
        <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
        {connected ? 'Conectado al servidor' : 'Conectando...'}
      </div>
    </div>
  );
}

function ModeCard({
  color, icon, title, desc, cta, onClick,
}: {
  color: string; icon: React.ReactNode; title: string; desc: string; cta: string; onClick: () => void;
}) {
  const rgb = hexToRgb(color);
  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-4 p-6 rounded-2xl text-left transition-all duration-200"
      style={{
        background: `rgba(${rgb},0.05)`,
        border: `1px solid rgba(${rgb},0.2)`,
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = `rgba(${rgb},0.1)`;
        e.currentTarget.style.borderColor = `rgba(${rgb},0.4)`;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = `rgba(${rgb},0.05)`;
        e.currentTarget.style.borderColor = `rgba(${rgb},0.2)`;
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `rgba(${rgb},0.12)` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <div className="text-sm font-bold mb-1.5" style={{ color }}>{title}</div>
        <p className="text-xs leading-relaxed" style={{ color: '#475569' }}>{desc}</p>
      </div>
      <div
        className="mt-auto text-xs font-bold px-3 py-1.5 rounded-lg self-start"
        style={{ background: `rgba(${rgb},0.1)`, color, border: `1px solid rgba(${rgb},0.25)` }}
      >
        {cta} →
      </div>
    </button>
  );
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function CrownIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h18a2 2 0 012 2v6a2 2 0 01-2 2h-2M5 17l-1-6 4 3 4-6 4 6 4-3-1 6H5z" />
    </svg>
  );
}

function ObserverIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
