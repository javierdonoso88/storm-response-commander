import { AgentId, AgentState } from '../types';

interface Props {
  agents: AgentState[];
  conflicts: { winner: AgentId; loser: AgentId; reason: string }[];
}

// ── Colors — same as LogPanel ────────────────────────────────────────────────
const AGENT_COLOR: Record<AgentId | 'orchestrator', string> = {
  orchestrator:      '#f59e0b',
  'triage-priority': '#a855f7',
  rerouting:         '#3b82f6',
  'crew-dispatch':   '#f97316',
  resource:          '#eab308',
  comms:             '#22c55e',
};

const AGENT_META: Record<AgentId | 'orchestrator', { label: string; sub: string; icon: string }> = {
  orchestrator:      { label: 'Asset & Services', sub: 'SAP AI Core',        icon: '⚡' },
  'triage-priority': { label: 'Technician',        sub: 'S/4HANA Assets',    icon: '🔍' },
  rerouting:         { label: 'Remote SCADA',      sub: 'Asset Intelligence', icon: '📡' },
  'crew-dispatch':   { label: 'Dispatcher',        sub: 'Field Service Mgmt', icon: '🚛' },
  resource:          { label: 'Resources',         sub: 'IBP',               icon: '📦' },
  comms:             { label: 'Comms',             sub: 'SAP CX',            icon: '📣' },
};

const AGENT_TOOLTIP: Record<AgentId | 'orchestrator', string> = {
  orchestrator:      'Coordina todos los agentes. Ejecuta la Fase 1 en paralelo y la Fase 2 en secuencial, y calcula los KPIs finales.',
  'triage-priority': 'Clasifica los 47 fallos por severidad e identifica sitios críticos con batería en riesgo. Rankea los fallos físicos por urgencia.',
  rerouting:         'Restaura suministro por telecontrol remoto sin enviar brigadas. Ejecuta hasta el límite de operaciones autorizadas del día.',
  'crew-dispatch':   'Asigna brigadas disponibles a fallos físicos. Respeta skills y la ventana de segunda tormenta.',
  resource:          'Verifica que el inventario cubre los materiales necesarios para las brigadas despachadas. Registra conflictos si hay déficit.',
  comms:             'Redacta y envía 3 comunicaciones: SMS a clientes, nota de prensa para medios locales y notificación al regulador.',
};

// ── Layout ───────────────────────────────────────────────────────────────────
// Col 0: Orchestrator  (x=0)
// Col 1: Technician    (x=1, row=0)  /  Remote SCADA (x=1, row=1)
// Col 2: Dispatcher    (x=2, row=1)
// Col 3: Resources     (x=3, row=1)
// Col 4: Comms         (x=4, row=1)
//
// Row 0 (top):    Technician
// Row 1 (middle): Orchestrator, Remote SCADA, Dispatcher, Resources, Comms

const NW = 112;  // node width
const NH = 76;   // node height
const GX = 36;   // horizontal gap
const GY = 44;   // vertical gap between row 0 and row 1

const colX = (c: number) => c * (NW + GX);
const ROW0_Y = 0;
const ROW1_Y = NH + GY;

const TOTAL_W = colX(4) + NW;           // 4*(112+36)+112 = 704
const TOTAL_H = ROW1_Y + NH;            // (76+44)+76 = 196

// Node center helpers
function cx(col: number) { return colX(col) + NW / 2; }
function cy(row: number) { return (row === 0 ? ROW0_Y : ROW1_Y) + NH / 2; }

// Edge attachment helpers (row: 0=top, 1=mid)
function right(col: number, row: number)  { return { x: colX(col) + NW, y: (row === 0 ? ROW0_Y : ROW1_Y) + NH / 2 }; }
function left(col: number, row: number)   { return { x: colX(col),       y: (row === 0 ? ROW0_Y : ROW1_Y) + NH / 2 }; }
function top(col: number, row: number)    { return { x: cx(col),          y: row === 0 ? ROW0_Y : ROW1_Y }; }
function bottom(col: number, row: number) { return { x: cx(col),          y: (row === 0 ? ROW0_Y : ROW1_Y) + NH }; }

function bezier(x1: number, y1: number, x2: number, y2: number, dx?: number) {
  const d = dx ?? Math.abs(x2 - x1) * 0.5;
  return `M ${x1} ${y1} C ${x1 + d} ${y1}, ${x2 - d} ${y2}, ${x2} ${y2}`;
}

const ACCENT = '#38bdf8'; // connector color

// ── Node ─────────────────────────────────────────────────────────────────────
function N8nNode({ id, agent, x, y }: { id: AgentId | 'orchestrator'; agent?: AgentState; x: number; y: number }) {
  const meta   = AGENT_META[id];
  const color  = AGENT_COLOR[id];
  const status = (agent as AgentState | undefined)?.status ?? 'pending';
  const isRunning = status === 'running';
  const isDone    = status === 'done';

  const borderColor = isRunning ? color : isDone ? '#22c55e' : '#1e3a5f';
  const bgColor     = isRunning ? `${color}18` : isDone ? '#16532411' : '#0d192a';
  const shadow      = isRunning ? `0 0 12px ${color}55` : 'none';

  return (
    <foreignObject x={x} y={y} width={NW} height={NH} style={{ overflow: 'visible' }}>
      <div
        title={AGENT_TOOLTIP[id]}
        style={{
          width: NW, height: NH,
          borderRadius: 10,
          border: `1.5px solid ${borderColor}`,
          background: bgColor,
          boxShadow: shadow,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 3, padding: '6px 4px',
          cursor: 'default',
          transition: 'border-color 0.3s, box-shadow 0.3s',
          position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Running pulse ring */}
        {isRunning && (
          <div style={{
            position: 'absolute', inset: -1, borderRadius: 11,
            border: `1.5px solid ${color}`,
            animation: 'ping 1.4s cubic-bezier(0,0,0.2,1) infinite',
            pointerEvents: 'none',
          }} />
        )}

        {/* Icon badge */}
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: `${color}28`,
          border: `1px solid ${color}50`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, lineHeight: 1, flexShrink: 0,
        }}>
          {meta.icon}
        </div>

        {/* Label */}
        <div style={{
          fontSize: 10.5, fontWeight: 700, textAlign: 'center', lineHeight: 1.2,
          color: 'var(--text-primary)', letterSpacing: '0.01em',
        }}>
          {meta.label}
        </div>

        {/* Sub */}
        <div style={{
          fontSize: 8.5, textAlign: 'center', lineHeight: 1.1,
          color: 'var(--text-ghost)', whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: NW - 8,
        }}>
          {meta.sub}
        </div>

        {/* Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: isRunning ? color : isDone ? '#22c55e' : '#334155',
            boxShadow: isRunning ? `0 0 5px ${color}` : 'none',
          }} />
          <span style={{ fontSize: 9, color: isRunning ? color : isDone ? '#22c55e' : '#475569' }}>
            {isRunning ? 'Running' : isDone ? 'Done ✓' : 'Pending'}
          </span>
        </div>
      </div>
    </foreignObject>
  );
}

// ── Connector ─────────────────────────────────────────────────────────────────
function Conn({ d, color = ACCENT }: { d: string; color?: string }) {
  return (
    <path d={d} fill="none" stroke={color} strokeWidth={1.2}
      opacity={0.65} markerEnd="url(#arr)" />
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function GanttPanel({ agents, conflicts }: Props) {
  const agentMap = new Map(agents.map(a => [a.id, a]));

  // ── Connector paths ──────────────────────────────────────────────────────
  // 1. Orch right → Technician left (col0 row1 → col1 row0, curve up)
  const orch_r  = right(0, 1);
  const tech_l  = left(1, 0);
  const d_orch_tech = `M ${orch_r.x} ${orch_r.y} C ${orch_r.x + 40} ${orch_r.y}, ${tech_l.x - 40} ${tech_l.y}, ${tech_l.x} ${tech_l.y}`;

  // 2. Orch right → Remote SCADA left (col0 row1 → col1 row1, straight)
  const scada_l = left(1, 1);
  const d_orch_scada = bezier(orch_r.x, orch_r.y, scada_l.x, scada_l.y, 28);

  // 3. Technician → Orch return arc (top loop)
  const tech_b  = bottom(1, 0);
  const orch_t  = top(0, 1);
  const loopY   = ROW0_Y - 22;
  const d_tech_orch = `M ${tech_b.x} ${tech_b.y} L ${tech_b.x} ${loopY} L ${orch_t.x} ${loopY} L ${orch_t.x} ${orch_t.y}`;

  // 4. Remote SCADA → Orch return (bottom of scada → left → orch bottom)
  const scada_b  = bottom(1, 1);
  const orch_b   = bottom(0, 1);
  const scadaRetY = ROW1_Y + NH + 14;
  const d_scada_orch = `M ${scada_b.x} ${scada_b.y} L ${scada_b.x} ${scadaRetY} L ${orch_b.x} ${scadaRetY} L ${orch_b.x} ${orch_b.y}`;

  // 5. Orch → Dispatcher: arc over the top — separate lane from Technician return (loopY=-22)
  const orch_top = top(0, 1);
  const disp_top = top(2, 1);
  const dispLaneY = ROW0_Y - 6;   // just above row1 nodes, below Technician loop lane
  const d_orch_disp = `M ${orch_top.x} ${orch_top.y} L ${orch_top.x} ${dispLaneY} L ${disp_top.x} ${dispLaneY} L ${disp_top.x} ${disp_top.y}`;

  // 6. Dispatcher → Resources (same row)
  const d_disp_res = bezier(right(2,1).x, right(2,1).y, left(3,1).x, left(3,1).y);

  // 7. Resources → Comms (same row)
  const d_res_comms = bezier(right(3,1).x, right(3,1).y, left(4,1).x, left(4,1).y);

  // 8. Comms → Orch return (bottom arc below all)
  const comms_b = bottom(4, 1);
  const retY    = ROW1_Y + NH + 28;
  const d_comms_orch = `M ${comms_b.x} ${comms_b.y} L ${comms_b.x} ${retY} L ${orch_b.x} ${retY} L ${orch_b.x} ${orch_b.y}`;

  // Phase label positions
  const phase1X = cx(1);
  const phase2X = (cx(2) + cx(4)) / 2;

  return (
    <div className="panel-card flex flex-col h-full overflow-hidden">
      <div className="panel-header">
        <span style={{ color: 'var(--accent)' }}>◈</span>
        AGENT ORCHESTRATION FLOW
      </div>

      <div className="flex-1 flex flex-col overflow-hidden" style={{ minHeight: 0 }}>
        <div className="flex-1 flex items-center justify-center px-3 py-2" style={{ minHeight: 0 }}>
          <svg
            viewBox={`-4 -36 ${TOTAL_W + 8} ${TOTAL_H + 58}`}
            style={{ width: '100%', height: '100%', overflow: 'visible' }}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill={ACCENT} opacity="0.65" />
              </marker>
            </defs>

            {/* Phase labels */}
            <text x={phase1X} y={ROW0_Y - 24} textAnchor="middle"
              fontSize={7.5} fontWeight={700} fill="var(--accent)" letterSpacing="0.08em" opacity={0.8}>
              PREPARATION · PARALLEL
            </text>
            <text x={phase2X} y={ROW1_Y - 8} textAnchor="middle"
              fontSize={7.5} fontWeight={700} fill="#f97316" letterSpacing="0.08em" opacity={0.8}>
              EXECUTION · SEQUENTIAL
            </text>

            {/* Connectors */}
            <Conn d={d_orch_tech} />
            <Conn d={d_orch_scada} />
            <Conn d={d_tech_orch} />
            <Conn d={d_scada_orch} />
            <Conn d={d_orch_disp} />
            <Conn d={d_disp_res} />
            <Conn d={d_res_comms} />
            <Conn d={d_comms_orch} />

            {/* Nodes */}
            <N8nNode id="orchestrator"      agent={undefined}                        x={colX(0)} y={ROW1_Y} />
            <N8nNode id="triage-priority"   agent={agentMap.get('triage-priority')}  x={colX(1)} y={ROW0_Y} />
            <N8nNode id="rerouting"         agent={agentMap.get('rerouting')}        x={colX(1)} y={ROW1_Y} />
            <N8nNode id="crew-dispatch"     agent={agentMap.get('crew-dispatch')}    x={colX(2)} y={ROW1_Y} />
            <N8nNode id="resource"          agent={agentMap.get('resource')}         x={colX(3)} y={ROW1_Y} />
            <N8nNode id="comms"             agent={agentMap.get('comms')}            x={colX(4)} y={ROW1_Y} />
          </svg>
        </div>

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <div className="px-3 pb-2 flex flex-col gap-1" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="text-[10px] font-bold tracking-widest text-red-400 uppercase pt-1.5">⚡ Conflictos</div>
            {conflicts.slice(0, 2).map((c, i) => (
              <div key={i} title={c.reason}
                className="text-[10px] rounded px-2 py-1 leading-snug cursor-help"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--text-muted)' }}>
                <span className="text-red-400 font-bold">{c.winner.toUpperCase()}</span>
                <span className="mx-1" style={{ color: 'var(--text-ghost)' }}>›</span>
                {c.loser.toUpperCase()}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
