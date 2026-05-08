import { AgentId, AgentState } from '../types';

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
  'crew-dispatch': 'Crew Dispatch',
  resource: 'Resource',
  comms: 'Comms',
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

      <div className="flex-1 flex flex-col items-center justify-evenly px-2 py-1 overflow-hidden" style={{ minHeight: 0 }}>

        {/* Supervisor */}
        <SupervisorCard />

        <Arrow />

        {/* Phase 1 */}
        <div className="flex flex-col items-center gap-1 w-full">
          <PhaseLabel label="PREPARATION" parallel />
          <div className="flex items-center gap-2 w-full justify-center">
            {PHASE1.map((id, i) => (
              <div key={id} className="flex items-center gap-1">
                <AgentCard id={id} agent={agentMap.get(id)} />
                {i < PHASE1.length - 1 && <FlowArrow />}
              </div>
            ))}
          </div>
        </div>

        <Arrow />

        {/* Phase 2 */}
        <div className="flex flex-col items-center gap-1 w-full">
          <PhaseLabel label="EXECUTION" parallel={false} />
          <div className="flex items-center gap-2 w-full justify-center">
            {PHASE2.map((id, i) => (
              <div key={id} className="flex items-center gap-1">
                <AgentCard id={id} agent={agentMap.get(id)} />
                {i < PHASE2.length - 1 && <FlowArrow />}
              </div>
            ))}
          </div>
        </div>

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <div className="w-full border-t border-[#1e2d45] pt-1">
            <div className="text-[11px] text-red-400 uppercase tracking-wider mb-0.5">⚡ Conflictos</div>
            {conflicts.slice(0, 2).map((c, i) => (
              <div key={i} className="text-[11px] text-slate-500 bg-red-900/20 rounded px-2 py-0.5 mb-0.5 leading-snug">
                <span className="text-red-400">{c.winner.toUpperCase()}</span> &gt; <span>{c.loser.toUpperCase()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SupervisorCard() {
  return (
    <div className="flex items-center gap-2 bg-[#1a2540] border border-[#2d3f5e] rounded-lg px-3 py-1.5">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #c2410c, #ea580c)' }}>
        SV
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-bold text-white leading-tight">Supervisor</span>
        <span className="text-[11px] text-slate-400 leading-tight">Orchestrator</span>
      </div>
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
      className="flex flex-col items-center gap-0.5 rounded-lg p-2 transition-all duration-300"
      style={{
        background: '#1a2540',
        border: `1px solid ${isRunning ? meta.ring : isDone ? '#1e3a1e' : '#1e2d45'}`,
        boxShadow: isRunning ? `0 0 10px ${meta.ring}40` : 'none',
        minWidth: 64,
      }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white relative"
        style={{ backgroundColor: meta.bg }}
      >
        {meta.initials}
        {isRunning && (
          <span
            className="absolute inset-0 rounded-full"
            style={{ border: `2px solid ${meta.ring}`, animation: 'ping 1.2s cubic-bezier(0,0,0.2,1) infinite' }}
          />
        )}
      </div>
      <span className="text-[11px] font-semibold text-center text-white leading-tight">
        {AGENT_SHORT[id]}
      </span>
      <StatusBadge status={status} color={meta.ring} />
    </div>
  );
}

function StatusBadge({ status, color }: { status: AgentState['status']; color: string }) {
  if (status === 'pending') return <span className="text-[10px] text-slate-500">Pending</span>;
  if (status === 'running') return <span className="text-[10px] font-bold" style={{ color }}>Running…</span>;
  return <span className="text-[10px] text-green-400">Done ✓</span>;
}

function Arrow() {
  return <div className="text-slate-600 text-sm leading-none">▼</div>;
}

function FlowArrow() {
  return <div className="text-slate-600 text-xs font-bold">›</div>;
}

function PhaseLabel({ label, parallel }: { label: string; parallel: boolean }) {
  return (
    <div className="text-[11px] font-bold tracking-widest text-blue-400 uppercase">
      {label} <span className="text-slate-600 font-normal normal-case tracking-normal">
        {parallel ? '(parallel)' : '(sequential)'}
      </span>
    </div>
  );
}
