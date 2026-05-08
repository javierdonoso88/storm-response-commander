import { useEffect, useRef, useState } from 'react';
import { Fault, SimParams } from './types';
import { useSimulation } from './hooks/useSimulation';
import { ParametersPanel } from './components/ParametersPanel';
import { LogPanel } from './components/LogPanel';
import { GanttPanel } from './components/GanttPanel';
import { MapPanel } from './components/MapPanel';
import { StatsPanel } from './components/StatsPanel';

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

  const safetyPct = state.safetyLimit > 0 ? Math.min(100, (state.safetyElapsed / state.safetyLimit) * 100) : 0;

  return (
    <div className="flex flex-col h-screen" style={{ background: '#0d1520' }}>

      {/* Header */}
      <header className="flex items-center gap-3 px-4 h-11 flex-shrink-0 border-b"
        style={{ background: '#0a0f1a', borderColor: '#1e2d45' }}>
        <span className="text-white font-bold text-sm tracking-wide flex items-center gap-2">
          <span style={{ color: '#f59e0b', fontSize: 18 }}>⚡</span>
          Storm-Response Commander
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
      </header>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside className="w-52 flex-shrink-0 border-r overflow-y-auto" style={{ background: '#111827', borderColor: '#1e2d45' }}>
          <ParametersPanel
            params={params}
            onChange={p => setParams(prev => ({ ...prev, ...p }))}
            onSimulate={() => startSimulation(params)}
            running={state.running}
            kpi={state.kpi}
          />
        </aside>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#0d1520' }}>

          {/* TOP: Map + Flow */}
          <div className="flex overflow-hidden gap-2 p-2" style={{ flex: '0 0 42%' }}>
            <div className="overflow-hidden rounded border flex-1" style={{ borderColor: '#1e2d45', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
              <MapPanel faults={state.faults.length > 0 ? state.faults : initialFaults} />
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
    </div>
  );
}
