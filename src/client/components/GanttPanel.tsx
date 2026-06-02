import { AgentId, AgentState } from '../types';
import { useTheme } from '../contexts/ThemeContext';

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
  orchestrator:      { label: 'Asset & Services', sub: 'SAP AI Core',         icon: '⚡' },
  'triage-priority': { label: 'Technician',        sub: 'S/4HANA Assets',     icon: '🔍' },
  rerouting:         { label: 'Remote SCADA',      sub: 'Asset Intelligence',  icon: '📡' },
  'crew-dispatch':   { label: 'Dispatcher',        sub: 'Field Service Mgmt',  icon: '🚛' },
  resource:          { label: 'Resources',         sub: 'IBP',                icon: '📦' },
  comms:             { label: 'Comms',             sub: 'SAP CX',             icon: '📣' },
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
const NW = 112;
const NH = 76;
const GX = 36;
const GY = 44;

const colX = (c: number) => c * (NW + GX);
const ROW0_Y = 0;
const ROW1_Y = NH + GY;

const TOTAL_W = colX(4) + NW;
const TOTAL_H = ROW1_Y + NH;

function cx(col: number) { return colX(col) + NW / 2; }

function right(col: number, row: number)  { return { x: colX(col) + NW, y: (row === 0 ? ROW0_Y : ROW1_Y) + NH / 2 }; }
function left(col: number, row: number)   { return { x: colX(col),       y: (row === 0 ? ROW0_Y : ROW1_Y) + NH / 2 }; }
function bottom(col: number, row: number) { return { x: cx(col),          y: (row === 0 ? ROW0_Y : ROW1_Y) + NH }; }

function bezier(x1: number, y1: number, x2: number, y2: number, dx?: number) {
  const d = dx ?? Math.abs(x2 - x1) * 0.5;
  return `M ${x1} ${y1} C ${x1 + d} ${y1}, ${x2 - d} ${y2}, ${x2} ${y2}`;
}

function roundedPath(pts: [number, number][], r = 12): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const d0x = x1 - x0, d0y = y1 - y0;
    const d1x = x2 - x1, d1y = y2 - y1;
    const len0 = Math.sqrt(d0x * d0x + d0y * d0y);
    const len1 = Math.sqrt(d1x * d1x + d1y * d1y);
    const t0 = Math.min(r, len0 / 2) / len0;
    const t1 = Math.min(r, len1 / 2) / len1;
    const px = x1 - d0x * t0, py = y1 - d0y * t0;
    const qx = x1 + d1x * t1, qy = y1 + d1y * t1;
    d += ` L ${px} ${py} Q ${x1} ${y1} ${qx} ${qy}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last[0]} ${last[1]}`;
  return d;
}

// ── Node — uses CSS vars for theme-aware colors ───────────────────────────────
function N8nNode({ id, agent, x, y }: { id: AgentId | 'orchestrator'; agent?: AgentState; x: number; y: number }) {
  const meta    = AGENT_META[id];
  const color   = AGENT_COLOR[id];
  const status  = (agent as AgentState | undefined)?.status ?? 'pending';
  const isRunning = status === 'running';
  const isDone    = status === 'done';

  const borderColor = isRunning ? color : isDone ? '#22c55e' : 'var(--border)';
  const bgColor     = isRunning ? `${color}18` : isDone ? `${color}0a` : 'var(--bg-secondary)';
  const shadow      = isRunning ? `0 0 12px ${color}55` : 'none';
  const pendingDot  = 'var(--text-ghost)';
  const pendingText = 'var(--text-ghost)';

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
        {isRunning && (
          <div style={{
            position: 'absolute', inset: -1, borderRadius: 11,
            border: `1.5px solid ${color}`,
            animation: 'ping 1.4s cubic-bezier(0,0,0.2,1) infinite',
            pointerEvents: 'none',
          }} />
        )}

        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: `${color}28`,
          border: `1px solid ${color}50`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, lineHeight: 1, flexShrink: 0,
        }}>
          {meta.icon}
        </div>

        <div style={{
          fontSize: 10.5, fontWeight: 700, textAlign: 'center', lineHeight: 1.2,
          color: 'var(--text-primary)', letterSpacing: '0.01em',
        }}>
          {meta.label}
        </div>

        <div style={{
          fontSize: 8.5, textAlign: 'center', lineHeight: 1.1,
          color: 'var(--text-ghost)', whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: NW - 8,
        }}>
          {meta.sub}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: isRunning ? color : isDone ? '#22c55e' : pendingDot,
            boxShadow: isRunning ? `0 0 5px ${color}` : 'none',
          }} />
          <span style={{ fontSize: 9, color: isRunning ? color : isDone ? '#22c55e' : pendingText }}>
            {isRunning ? 'Running' : isDone ? 'Done ✓' : 'Pending'}
          </span>
        </div>
      </div>
    </foreignObject>
  );
}

function Conn({ d, accent }: { d: string; accent: string }) {
  return (
    <path d={d} fill="none" stroke={accent} strokeWidth={1.2}
      opacity={0.65} markerEnd="url(#arr)" />
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function GanttPanel({ agents, conflicts }: Props) {
  const agentMap = new Map(agents.map(a => [a.id, a]));
  const { theme } = useTheme();

  // Connector color adapts to theme
  const accent = theme === 'dark' ? '#38bdf8' : theme === 'joule' ? '#6d28d9' : '#00a651';

  // ── Connector paths ──────────────────────────────────────────────────────
  // 1. Orch → Technician (bezier curve up-right)
  const orch_r  = right(0, 1);
  const tech_l  = left(1, 0);
  const d_orch_tech = `M ${orch_r.x} ${orch_r.y} C ${orch_r.x + 40} ${orch_r.y}, ${tech_l.x - 40} ${tech_l.y}, ${tech_l.x} ${tech_l.y}`;

  // 2. Orch → Remote SCADA (straight right)
  const scada_l = left(1, 1);
  const d_orch_scada = bezier(orch_r.x, orch_r.y, scada_l.x, scada_l.y, 28);

  // 3. Orch → Dispatcher: route under the row (bottom of col0 → below → bottom of col2)
  const orch_b  = bottom(0, 1);
  const disp_b  = bottom(2, 1);
  const underY  = ROW1_Y + NH + 18;
  const d_orch_disp = roundedPath([[orch_b.x, orch_b.y], [orch_b.x, underY], [disp_b.x, underY], [disp_b.x, disp_b.y]]);

  // 4. Dispatcher → Resources
  const d_disp_res = bezier(right(2,1).x, right(2,1).y, left(3,1).x, left(3,1).y);

  // 5. Resources → Comms
  const d_res_comms = bezier(right(3,1).x, right(3,1).y, left(4,1).x, left(4,1).y);

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
            viewBox={`-4 -24 ${TOTAL_W + 8} ${TOTAL_H + 50}`}
            style={{ width: '100%', height: '100%', overflow: 'visible' }}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill={accent} opacity="0.65" />
              </marker>
            </defs>

            {/* Phase labels */}
            <text x={phase1X} y={ROW0_Y - 12} textAnchor="middle"
              fontSize={7.5} fontWeight={700} fill="var(--accent)" letterSpacing="0.08em" opacity={0.8}>
              PREPARATION · PARALLEL
            </text>
            <text x={phase2X} y={ROW1_Y - 8} textAnchor="middle"
              fontSize={7.5} fontWeight={700} fill="#f97316" letterSpacing="0.08em" opacity={0.8}>
              EXECUTION · SEQUENTIAL
            </text>

            {/* Connectors */}
            <Conn d={d_orch_tech}  accent={accent} />
            <Conn d={d_orch_scada} accent={accent} />
            <Conn d={d_orch_disp}  accent={accent} />
            <Conn d={d_disp_res}   accent={accent} />
            <Conn d={d_res_comms}  accent={accent} />

            {/* Nodes */}
            <N8nNode id="orchestrator"      agent={undefined}                        x={colX(0)} y={ROW1_Y} />
            <N8nNode id="triage-priority"   agent={agentMap.get('triage-priority')}  x={colX(1)} y={ROW0_Y} />
            <N8nNode id="rerouting"         agent={agentMap.get('rerouting')}        x={colX(1)} y={ROW1_Y} />
            <N8nNode id="crew-dispatch"     agent={agentMap.get('crew-dispatch')}    x={colX(2)} y={ROW1_Y} />
            <N8nNode id="resource"          agent={agentMap.get('resource')}         x={colX(3)} y={ROW1_Y} />
            <N8nNode id="comms"             agent={agentMap.get('comms')}            x={colX(4)} y={ROW1_Y} />
          </svg>
        </div>

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
