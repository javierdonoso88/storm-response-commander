import { useState } from 'react';
import { AgentId, AgentState } from '../types';

function Tooltip({ text, children, position = 'top' }: { text: string; children: React.ReactNode; position?: 'top' | 'bottom' }) {
  const [show, setShow] = useState(false);
  const isTop = position === 'top';
  return (
    <div className="relative" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 z-50 w-52 rounded px-2.5 py-2 text-xs text-slate-200 leading-snug pointer-events-none ${isTop ? 'bottom-full mb-2' : 'top-full mt-2'}`}
          style={{ background: '#1a2540', border: '1px solid #2d3f5e', boxShadow: '0 4px 16px rgba(0,0,0,0.6)' }}>
          {text}
          {isTop
            ? <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0" style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #2d3f5e' }} />
            : <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0" style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: '5px solid #2d3f5e' }} />
          }
        </div>
      )}
    </div>
  );
}

interface Props {
  agents: AgentState[];
  conflicts: { winner: AgentId; loser: AgentId; reason: string }[];
}

const AGENT_COLORS: Record<AgentId, { bg: string; ring: string; initials: string }> = {
  triage:          { bg: '#7c3aed', ring: '#a855f7', initials: 'TR' },
  rerouting:       { bg: '#db2777', ring: '#ec4899', initials: 'RR' },
  priority:        { bg: '#4f46e5', ring: '#6366f1', initials: 'PR' },
  'crew-dispatch': { bg: '#7e22ce', ring: '#a855f7', initials: 'CD' },
  resource:        { bg: '#1d4ed8', ring: '#3b82f6', initials: 'RE' },
  comms:           { bg: '#0f766e', ring: '#14b8a6', initials: 'CO' },
};

const AGENT_SHORT: Record<AgentId, string> = {
  triage: 'Triage',
  rerouting: 'Rerouting',
  priority: 'Priority',
  'crew-dispatch': 'Crew Dispatch',
  resource: 'Resource',
  comms: 'Comms',
};

const AGENT_TOOLTIP: Record<AgentId | 'orchestrator', string> = {
  orchestrator:    'Coordina todos los agentes. Ejecuta la Fase 1 en paralelo y la Fase 2 en secuencial, y calcula los KPIs finales.',
  triage:          'Clasifica los 47 fallos por severidad y riesgo. Identifica sitios críticos con batería en riesgo de agotarse antes del SLA.',
  rerouting:       'Restaura suministro por telecontrol remoto sin enviar brigadas. Ejecuta hasta el límite de operaciones autorizadas del día.',
  priority:        'Rankea los fallos físicos por urgencia. Prioriza sitios críticos por batería restante y envía alertas regulatorias si procede.',
  'crew-dispatch': 'Asigna brigadas disponibles a fallos físicos. Respeta skills (A=transformadores, B=cables) y la ventana de segunda tormenta.',
  resource:        'Verifica que el inventario cubre los materiales necesarios para las brigadas despachadas. Registra conflictos si hay déficit.',
  comms:           'Redacta y envía 3 comunicaciones obligatorias: SMS a clientes, nota de prensa para medios locales y notificación al regulador.',
};

const PHASE1: AgentId[] = ['triage', 'rerouting', 'priority'];
const PHASE2: AgentId[] = ['crew-dispatch', 'resource', 'comms'];

export function GanttPanel({ agents, conflicts }: Props) {
  const agentMap = new Map(agents.map(a => [a.id, a]));

  return (
    <div className="panel-card flex flex-col h-full overflow-hidden">
      <div className="panel-header">
        <span className="text-blue-400">◈</span>
        AGENT ORCHESTRATION FLOW
      </div>
      <div className="flex-1 overflow-y-auto p-3 flex flex-col items-center gap-3" style={{ minHeight: 0 }}>

        {/* Supervisor card */}
        <Tooltip text={AGENT_TOOLTIP['orchestrator']} position="bottom">
          <SupervisorCard />
        </Tooltip>
        <Arrow />

        {/* Phase 1 */}
        <PhaseLabel label="PREPARATION PHASE" parallel />
        <div className="flex items-center gap-2 w-full justify-center">
          {PHASE1.map((id, i) => (
            <div key={id} className="flex items-center gap-2">
                <Tooltip text={AGENT_TOOLTIP[id]}>
                  <AgentCard id={id} agent={agentMap.get(id)} />
                </Tooltip>
                {i < PHASE1.length - 1 && <FlowArrow />}
              </div>
          ))}
        </div>
        <Arrow />

        {/* Phase 2 */}
        <PhaseLabel label="EXECUTION PHASE" parallel={false} />
        <div className="flex items-center gap-2 w-full justify-center">
          {PHASE2.map((id, i) => (
            <div key={id} className="flex items-center gap-2">
                <Tooltip text={AGENT_TOOLTIP[id]}>
                  <AgentCard id={id} agent={agentMap.get(id)} />
                </Tooltip>
                {i < PHASE2.length - 1 && <FlowArrow />}
              </div>
          ))}
        </div>

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <div className="w-full mt-2 border-t border-[#1e2d45] pt-2">
            <div className="text-[13px] text-red-400 uppercase tracking-wider mb-1">⚡ Conflictos</div>
            {conflicts.slice(0, 2).map((c, i) => (
              <Tooltip key={i} text={c.reason} position="top">
                <div className="text-[13px] text-slate-500 bg-red-900/20 rounded px-2 py-1 mb-1 leading-snug cursor-help">
                  <span className="text-red-400">{c.winner.toUpperCase()}</span> &gt; <span>{c.loser.toUpperCase()}</span>
                </div>
              </Tooltip>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SupervisorCard() {
  return (
    <div className="flex flex-col items-center gap-1 bg-[#1a2540] border border-[#2d3f5e] rounded-lg p-3 w-28">
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
        style={{ background: 'linear-gradient(135deg, #c2410c, #ea580c)' }}>
        SV
      </div>
      <span className="text-xs font-bold text-white">Supervisor</span>
      <span className="text-[12px] text-slate-400">Orchestrator</span>
    </div>
  );
}

function AgentCard({ id, agent }: { id: AgentId; agent?: AgentState }) {
  const meta = AGENT_COLORS[id];
  const status = agent?.status ?? 'pending';
  const isRunning = status === 'running';
  const isDone = status === 'done';

  return (
    <div
      title={AGENT_TOOLTIP[id]}
      className="flex flex-col items-center gap-1 rounded-lg p-2.5 transition-all duration-300"
      style={{
        background: '#1a2540',
        border: `1px solid ${isRunning ? meta.ring : isDone ? '#1e3a1e' : '#1e2d45'}`,
        boxShadow: isRunning ? `0 0 12px ${meta.ring}40` : 'none',
        minWidth: 72,
      }}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white relative"
        style={{ backgroundColor: meta.bg }}
      >
        {meta.initials}
        {isRunning && (
          <span
            className="absolute inset-0 rounded-full"
            style={{
              border: `2px solid ${meta.ring}`,
              animation: 'ping 1.2s cubic-bezier(0,0,0.2,1) infinite',
            }}
          />
        )}
      </div>
      <span className="text-[12px] font-semibold text-center text-white leading-tight">
        {AGENT_SHORT[id]}
      </span>
      <StatusBadge status={status} color={meta.ring} />
      {agent?.startTime && (
        <span className="text-[13px] text-slate-600 font-mono">{agent.startTime}</span>
      )}
    </div>
  );
}

function StatusBadge({ status, color }: { status: AgentState['status']; color: string }) {
  if (status === 'pending')  return <span className="text-[13px] text-slate-500">Pending</span>;
  if (status === 'running')  return <span className="text-[13px] font-bold" style={{ color }}>Running…</span>;
  return <span className="text-[13px] text-green-400">Done ✓</span>;
}

function Arrow() {
  return (
    <div className="text-slate-600 text-base leading-none">▼</div>
  );
}

function FlowArrow() {
  return (
    <div className="text-slate-600 text-xs font-bold tracking-widest">›››</div>
  );
}

function PhaseLabel({ label, parallel }: { label: string; parallel: boolean }) {
  return (
    <div className="text-[13px] font-bold tracking-widest text-blue-400 uppercase">
      {label}{parallel ? ' (PARALLEL)' : ' (SEQUENTIAL)'}
    </div>
  );
}
