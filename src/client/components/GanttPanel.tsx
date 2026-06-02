import { AgentId, AgentState } from '../types';

interface Props {
  agents: AgentState[];
  conflicts: { winner: AgentId; loser: AgentId; reason: string }[];
}

// ── Meta ─────────────────────────────────────────────────────────────────────

const AGENT_META: Record<AgentId | 'orchestrator', {
  label: string; sub: string; icon: string; accent: string; border: string;
}> = {
  orchestrator:      { label: 'Asset & Services', sub: 'SAP AI Core',             icon: '⚡', accent: '#ea580c', border: '#f97316' },
  'triage-priority': { label: 'Technician',        sub: 'S/4HANA Assets',          icon: '🔍', accent: '#7c3aed', border: '#a855f7' },
  rerouting:         { label: 'Remote SCADA',      sub: 'Asset Intelligence',      icon: '📡', accent: '#db2777', border: '#ec4899' },
  'crew-dispatch':   { label: 'Dispatcher',        sub: 'Field Service Mgmt',      icon: '🚛', accent: '#0369a1', border: '#38bdf8' },
  resource:          { label: 'Resources',         sub: 'IBP',                     icon: '📦', accent: '#065f46', border: '#34d399' },
  comms:             { label: 'Comms',             sub: 'SAP CX',                  icon: '📣', accent: '#7e22ce', border: '#c084fc' },
};

const AGENT_TOOLTIP: Record<AgentId | 'orchestrator', string> = {
  orchestrator:      'Coordina todos los agentes. Ejecuta la Fase 1 en paralelo y la Fase 2 en secuencial, y calcula los KPIs finales.',
  'triage-priority': 'Clasifica los 47 fallos por severidad e identifica sitios críticos con batería en riesgo. Rankea los fallos físicos por urgencia.',
  rerouting:         'Restaura suministro por telecontrol remoto sin enviar brigadas. Ejecuta hasta el límite de operaciones autorizadas del día.',
  'crew-dispatch':   'Asigna brigadas disponibles a fallos físicos. Respeta skills y la ventana de segunda tormenta.',
  resource:          'Verifica que el inventario cubre los materiales necesarios para las brigadas despachadas. Registra conflictos si hay déficit.',
  comms:             'Redacta y envía 3 comunicaciones: SMS a clientes, nota de prensa para medios locales y notificación al regulador.',
};

// ── Layout constants (px, used for SVG connector math) ────────────────────────
const NODE_W = 108;
const NODE_H = 72;
const GAP_X  = 32;  // horizontal gap between nodes in same row
const ROW_GAP = 44; // vertical gap between rows

// Row 1: Orchestrator (col 0) | TP (col 1) | RR (col 2)
// Row 2:                         CD (col 1) | RE (col 2) | CO (col 3)
// We'll compute positions relative to a viewBox and let SVG scale.

const COLS = 4;
const colX = (c: number) => c * (NODE_W + GAP_X);
const rowY = (r: number) => r * (NODE_H + ROW_GAP);

const TOTAL_W = colX(COLS - 1) + NODE_W;          // 3 * (108+32) + 108 = 528
const TOTAL_H = rowY(1) + NODE_H;                  // (72+44) + 72 = 188

// Node positions [col, row]
const POS: Record<AgentId | 'orchestrator', [number, number]> = {
  orchestrator:      [0, 0],
  'triage-priority': [1, 0],
  rerouting:         [2, 0],
  'crew-dispatch':   [1, 1],
  resource:          [2, 1],
  comms:             [3, 1],
};

// ── SVG connector helpers ──────────────────────────────────────────────────────

function cx(col: number) { return colX(col) + NODE_W / 2; }
function cy(row: number) { return rowY(row) + NODE_H / 2; }

// Right edge center of a node
function re(col: number, row: number) { return { x: colX(col) + NODE_W, y: rowY(row) + NODE_H / 2 }; }
// Left edge center
function le(col: number, row: number) { return { x: colX(col),           y: rowY(row) + NODE_H / 2 }; }
// Bottom edge center
function be(col: number, row: number) { return { x: cx(col),              y: rowY(row) + NODE_H }; }
// Top edge center
function te(col: number, row: number) { return { x: cx(col),              y: rowY(row) }; }

function bezier(x1: number, y1: number, x2: number, y2: number) {
  const dx = Math.abs(x2 - x1) * 0.5;
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

function Connector({ d, color = 'var(--border-accent)', animated = false }: { d: string; color?: string; animated?: boolean }) {
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={animated ? 1.5 : 1}
      strokeDasharray={animated ? '6 3' : undefined}
      opacity={0.7}
      markerEnd="url(#arrow)"
    />
  );
}

// ── Node component ─────────────────────────────────────────────────────────────

function N8nNode({ id, agent, x, y }: { id: AgentId | 'orchestrator'; agent?: AgentState; x: number; y: number }) {
  const meta  = AGENT_META[id];
  const status = (agent as AgentState | undefined)?.status ?? 'pending';
  const isRunning = status === 'running';
  const isDone    = status === 'done';

  const borderColor = isRunning ? meta.border : isDone ? '#22c55e' : 'var(--border)';
  const shadow      = isRunning ? `0 0 10px ${meta.border}55` : 'none';
  const bgAlpha     = isRunning ? '22' : isDone ? '11' : '00';

  return (
    <foreignObject x={x} y={y} width={NODE_W} height={NODE_H} style={{ overflow: 'visible' }}>
      <div
        title={AGENT_TOOLTIP[id]}
        style={{
          width: NODE_W,
          height: NODE_H,
          borderRadius: 10,
          border: `1.5px solid ${borderColor}`,
          background: `color-mix(in srgb, ${meta.accent}${bgAlpha} 100%, var(--bg-secondary))`,
          boxShadow: shadow,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          padding: '6px 4px',
          cursor: 'default',
          transition: 'border-color 0.3s, box-shadow 0.3s',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Running pulse ring */}
        {isRunning && (
          <div style={{
            position: 'absolute', inset: -1, borderRadius: 11,
            border: `1.5px solid ${meta.border}`,
            animation: 'ping 1.4s cubic-bezier(0,0,0.2,1) infinite',
            pointerEvents: 'none',
          }} />
        )}

        {/* Icon badge */}
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: `${meta.accent}33`,
          border: `1px solid ${meta.accent}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, lineHeight: 1, flexShrink: 0,
        }}>
          {meta.icon}
        </div>

        {/* Label */}
        <div style={{
          fontSize: 10, fontWeight: 700, textAlign: 'center', lineHeight: 1.2,
          color: 'var(--text-primary)', letterSpacing: '0.01em',
        }}>
          {meta.label}
        </div>

        {/* Sub */}
        <div style={{
          fontSize: 9, textAlign: 'center', lineHeight: 1.1,
          color: 'var(--text-ghost)', whiteSpace: 'nowrap', overflow: 'hidden',
          textOverflow: 'ellipsis', maxWidth: NODE_W - 8,
        }}>
          {meta.sub}
        </div>

        {/* Status dot row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 1 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: isRunning ? meta.border : isDone ? '#22c55e' : 'var(--text-ghost)',
            boxShadow: isRunning ? `0 0 4px ${meta.border}` : 'none',
          }} />
          <span style={{ fontSize: 9, color: isRunning ? meta.border : isDone ? '#22c55e' : 'var(--text-ghost)' }}>
            {isRunning ? 'Running' : isDone ? 'Done ✓' : 'Pending'}
          </span>
        </div>
      </div>
    </foreignObject>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────────

export function GanttPanel({ agents, conflicts }: Props) {
  const agentMap = new Map(agents.map(a => [a.id, a]));

  // Connector paths
  // Orchestrator → TP (row 0, col 0→1)
  const d_orch_tp  = bezier(...Object.values(re(0,0)) as [number,number,number,number], ...Object.values(le(1,0)) as [number,number,number,number]);
  // TP → RR (row 0, col 1→2)
  const d_tp_rr    = bezier(...Object.values(re(1,0)) as [number,number,number,number], ...Object.values(le(2,0)) as [number,number,number,number]);
  // Orchestrator bottom → CD left (col 0 bottom → col 1 row 1 left)
  const oBot = be(0, 0);
  const cdTop = te(1, 1);
  const d_orch_cd = `M ${oBot.x} ${oBot.y} C ${oBot.x} ${oBot.y + ROW_GAP * 0.6}, ${cdTop.x - (NODE_W / 2 + GAP_X * 0.5)} ${cdTop.y}, ${cdTop.x} ${cdTop.y}`;
  // RR bottom → CD left via merge
  const rrBot = be(2, 0);
  const d_rr_cd = `M ${rrBot.x} ${rrBot.y + 2} C ${rrBot.x} ${rrBot.y + ROW_GAP * 0.55}, ${cdTop.x + 40} ${cdTop.y - 8}, ${cdTop.x} ${cdTop.y}`;
  // CD → RE → CO (row 1, sequential)
  const d_cd_re = bezier(...Object.values(re(1,1)) as [number,number,number,number], ...Object.values(le(2,1)) as [number,number,number,number]);
  const d_re_co = bezier(...Object.values(re(2,1)) as [number,number,number,number], ...Object.values(le(3,1)) as [number,number,number,number]);

  // Phase label positions
  const phase1LabelX = colX(1) + (NODE_W * 2 + GAP_X) / 2;
  const phase2LabelX = colX(1) + (NODE_W * 3 + GAP_X * 2) / 2;

  return (
    <div className="panel-card flex flex-col h-full overflow-hidden">
      <div className="panel-header">
        <span style={{ color: 'var(--accent)' }}>◈</span>
        AGENT ORCHESTRATION FLOW
      </div>

      <div className="flex-1 flex flex-col overflow-hidden" style={{ minHeight: 0 }}>
        <div className="flex-1 flex items-center justify-center px-2 py-2" style={{ minHeight: 0 }}>
          <svg
            viewBox={`-4 -18 ${TOTAL_W + 8} ${TOTAL_H + 36}`}
            style={{ width: '100%', height: '100%', overflow: 'visible' }}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="var(--border-accent)" opacity="0.7" />
              </marker>
            </defs>

            {/* Phase labels */}
            <text x={phase1LabelX} y={-6} textAnchor="middle" fontSize={8} fontWeight={700}
              fill="var(--accent)" letterSpacing="0.08em" opacity={0.8}>
              PREPARATION · PARALLEL
            </text>
            <text x={phase2LabelX} y={rowY(1) - 6} textAnchor="middle" fontSize={8} fontWeight={700}
              fill="#f97316" letterSpacing="0.08em" opacity={0.8}>
              EXECUTION · SEQUENTIAL
            </text>

            {/* Connectors */}
            <Connector d={d_orch_tp} />
            <Connector d={d_tp_rr} />
            <Connector d={d_orch_cd} animated={false} />
            <Connector d={d_rr_cd} />
            <Connector d={d_cd_re} />
            <Connector d={d_re_co} />

            {/* Nodes */}
            {(Object.entries(POS) as [AgentId | 'orchestrator', [number, number]][]).map(([id, [col, row]]) => (
              <N8nNode
                key={id}
                id={id}
                agent={id === 'orchestrator' ? undefined : agentMap.get(id as AgentId)}
                x={colX(col)}
                y={rowY(row)}
              />
            ))}
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
