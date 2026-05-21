import { useEffect, useRef, useState } from 'react';
import { Fault, SimParams } from './types';
import { useSimulation } from './hooks/useSimulation';
import { ParametersPanel } from './components/ParametersPanel';
import { LogPanel } from './components/LogPanel';
import { GanttPanel } from './components/GanttPanel';
import { MapPanel } from './components/MapPanel';
import { StatsPanel } from './components/StatsPanel';
import { LandingPage } from './components/LandingPage';
import { ResultsOverlay } from './components/ResultsOverlay';

const DEFAULT_PARAMS: SimParams = {
  minuteSLA: 60,
  switchableFaults: 22,
  limitedParts: 0,
  storm2Window: 'T+6h',
  availableCrews: 22,
};

export default function App() {
  const [params, setParams] = useState<SimParams>(DEFAULT_PARAMS);
  const [initialFaults, setInitialFaults] = useState<Fault[]>([]);
  const [showLanding, setShowLanding] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { state, startSimulation, tickAgentProgress } = useSimulation(initialFaults);

  useEffect(() => {
    fetch('/api/scenario').then(r => r.json()).then(d => setInitialFaults(d.faults ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (state.running) { tickRef.current = setInterval(tickAgentProgress, 400); }
    else if (tickRef.current) clearInterval(tickRef.current);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [state.running, tickAgentProgress]);

  useEffect(() => {
    if (state.done) {
      const t = setTimeout(() => setShowResults(true), 800);
      return () => clearTimeout(t);
    }
  }, [state.done]);

  const safetyPct = state.safetyLimit > 0 ? Math.min(100, (state.safetyElapsed / state.safetyLimit) * 100) : 0;

  if (showLanding) {
    return <LandingPage onEnter={() => setShowLanding(false)} />;
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: '#0d1520' }}>

      {/* Header */}
      <header className="flex items-center gap-3 px-4 h-11 flex-shrink-0 border-b"
        style={{ background: '#0a0f1a', borderColor: '#1e2d45' }}>
        <span className="text-white font-bold text-sm tracking-wide flex items-center gap-2">
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/SAP_2011_logo.svg/1280px-SAP_2011_logo.svg.png" alt="SAP" style={{ height: 18, width: 'auto' }} />
          Storm Response Commander
        </span>

        {/* Status chip */}
        <div className="ml-2">
          {state.running ? (
            <span className="sap-tag" style={{ background: '#451a03', color: '#f97316' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" /> En ejecución
            </span>
          ) : state.done ? (
            <span className="sap-tag" style={{ background: '#052e16', color: '#22c55e' }}>✓ Completado</span>
          ) : (
            <span className="sap-tag" style={{ background: '#1e2d45', color: '#64748b' }}>Standby</span>
          )}
        </div>

        {/* Ver informe button */}
        {state.done && !state.running && (
          <button
            onClick={() => setShowResults(v => !v)}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-lg"
            style={{ background: showResults ? 'rgba(34,211,238,0.15)' : 'rgba(34,211,238,0.06)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.25)', cursor: 'pointer' }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Ver Informe
          </button>
        )}

        {/* Safety window bar */}
        <div className="ml-auto flex items-center gap-2" style={{ minWidth: 240 }}>
          <span className="text-xs text-slate-500 font-mono whitespace-nowrap">VENTANA {params.storm2Window}</span>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#1e2d45' }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${safetyPct}%`,
                background: safetyPct > 80 ? '#ef4444' : safetyPct > 60 ? '#f97316' : '#3b82f6',
              }} />
          </div>
          <span className="text-xs text-slate-500 font-mono whitespace-nowrap">{state.elapsedLabel}</span>
        </div>

        {/* Back to landing */}
        <button
          onClick={() => setShowLanding(true)}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.03)', color: '#475569', border: '1px solid #1e2d45', cursor: 'pointer' }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Inicio
        </button>
      </header>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside className="w-52 flex-shrink-0 border-r overflow-y-auto" style={{ background: '#111827', borderColor: '#1e2d45' }}>
          <ParametersPanel
            params={params}
            onChange={p => setParams(prev => ({ ...prev, ...p }))}
            onSimulate={() => { setShowResults(false); startSimulation(params); }}
            running={state.running}
            kpi={state.kpi}
            drolius={state.drolius}
          />
        </aside>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#0d1520' }}>

          {/* TOP: Map + Flow */}
          <div className="flex overflow-hidden gap-2 p-2" style={{ flex: '0 0 42%' }}>
            <div className="overflow-hidden rounded border flex-1" style={{ borderColor: '#1e2d45', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
              <MapPanel faults={state.faults.length > 0 ? state.faults : initialFaults} drolius={state.drolius} />
            </div>
            <div className="overflow-hidden flex-shrink-0" style={{ flex: '0 0 36%' }}>
              <GanttPanel agents={state.agents} conflicts={state.conflicts} />
            </div>
          </div>

          {/* BOTTOM: Log + Comms */}
          <div className="flex overflow-hidden gap-2 px-2 pb-2" style={{ flex: '0 0 58%' }}>
            <div className="overflow-hidden flex-1">
              <LogPanel logs={state.agentLogs} running={state.running} />
            </div>
            <div className="overflow-hidden flex-shrink-0" style={{ flex: '0 0 36%' }}>
              <StatsPanel messages={state.commsMessages} actionMessages={state.actionMessages} />
            </div>
          </div>

        </div>
      </div>

      {showResults && (
        <ResultsOverlay
          faults={state.faults}
          kpi={state.kpi}
          agentLogs={state.agentLogs}
          commsMessages={state.commsMessages}
          actionMessages={state.actionMessages}
          conflicts={state.conflicts}
          elapsedLabel={state.elapsedLabel}
          onClose={() => setShowResults(false)}
        />
      )}
    </div>
  );
}
