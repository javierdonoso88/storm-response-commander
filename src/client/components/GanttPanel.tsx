import { useRef, useEffect, useState } from 'react';
import { AgentId, AgentState, AgentStatus } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useT } from '../i18n';

interface Props {
  agents: AgentState[];
  conflicts: { winner: AgentId; loser: AgentId; reason: string }[];
  orchestratorStatus?: AgentStatus;
}

const AGENT_COLOR: Record<AgentId | 'orchestrator', string> = {
  orchestrator:      '#f59e0b',
  'triage-priority': '#a855f7',
  rerouting:         '#3b82f6',
  'crew-dispatch':   '#f97316',
  resource:          '#eab308',
  comms:             '#22c55e',
};

// ── Node component (pure HTML — no foreignObject) ─────────────────────────────
function N8nNode({
  id, agent, style, nodeRef,
}: {
  id: AgentId | 'orchestrator';
  agent?: AgentState;
  style?: React.CSSProperties;
  nodeRef?: React.Ref<HTMLDivElement>;
}) {
  const t = useT();
  const ga = t.gantt.agents;
  const AGENT_META: Record<AgentId | 'orchestrator', { label: string; sub: string; icon: string }> = {
    orchestrator:      { label: ga.orchestratorLabel, sub: ga.orchestratorSub, icon: '⚡' },
    'triage-priority': { label: ga.triageLabel,       sub: ga.triageSub,       icon: '🔍' },
    rerouting:         { label: ga.reroutingLabel,    sub: ga.reroutingSub,    icon: '📡' },
    'crew-dispatch':   { label: ga.dispatchLabel,     sub: ga.dispatchSub,     icon: '🚛' },
    resource:          { label: ga.resourceLabel,     sub: ga.resourceSub,     icon: '📦' },
    comms:             { label: ga.commsLabel,        sub: ga.commsSub,        icon: '📣' },
  };
  const AGENT_TOOLTIP: Record<AgentId | 'orchestrator', string> = {
    orchestrator:      ga.orchestratorTip,
    'triage-priority': ga.triageTip,
    rerouting:         ga.reroutingTip,
    'crew-dispatch':   ga.dispatchTip,
    resource:          ga.resourceTip,
    comms:             ga.commsTip,
  };
  const meta      = AGENT_META[id];
  const color     = AGENT_COLOR[id];
  const status    = agent?.status ?? 'pending';
  const isRunning = status === 'running';
  const isDone    = status === 'done';

  const borderColor = isRunning ? color : isDone ? '#22c55e' : 'var(--border)';
  const bgColor     = isRunning ? `${color}18` : isDone ? `${color}0a` : 'var(--bg-secondary)';
  const shadow      = isRunning ? `0 0 12px ${color}55` : 'none';

  return (
    <div
      ref={nodeRef}
      title={AGENT_TOOLTIP[id]}
      style={{
        position: 'absolute',
        width: 108, height: 76,
        borderRadius: 10,
        border: `1.5px solid ${borderColor}`,
        background: bgColor,
        boxShadow: shadow,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 3, padding: '6px 4px',
        transition: 'border-color 0.3s, box-shadow 0.3s',
        boxSizing: 'border-box',
        overflow: 'hidden',
        cursor: 'default',
        ...style,
      }}
    >
      {/* Pulse ring */}
      {isRunning && (
        <div style={{
          position: 'absolute', inset: -1, borderRadius: 11,
          border: `1.5px solid ${color}`,
          animation: 'ping 1.4s cubic-bezier(0,0,0.2,1) infinite',
          pointerEvents: 'none',
        }} />
      )}

      {/* Icon */}
      <div style={{
        width: 30, height: 30, borderRadius: 8,
        background: `${color}28`, border: `1px solid ${color}50`,
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
        overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100,
      }}>
        {meta.sub}
      </div>

      {/* Status indicator */}
      <div
        className={isRunning ? 'n8n-node-running' : undefined}
        style={{ display: 'flex', alignItems: 'center', gap: 3 }}
      >
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: isRunning ? color : isDone ? '#22c55e' : 'var(--text-ghost)',
          boxShadow: isRunning ? `0 0 5px ${color}` : 'none',
        }} />
        <span style={{ fontSize: 9, color: isRunning ? color : isDone ? '#22c55e' : 'var(--text-ghost)' }}>
          {isRunning ? t.gantt.running : isDone ? t.gantt.done : t.gantt.pending}
        </span>
      </div>
    </div>
  );
}

// ── Bezier / rounded path helpers ─────────────────────────────────────────────
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
    const len0 = Math.sqrt(d0x ** 2 + d0y ** 2);
    const len1 = Math.sqrt(d1x ** 2 + d1y ** 2);
    const t0 = Math.min(r, len0 / 2) / len0;
    const t1 = Math.min(r, len1 / 2) / len1;
    d += ` L ${x1 - d0x * t0} ${y1 - d0y * t0} Q ${x1} ${y1} ${x1 + d1x * t1} ${y1 + d1y * t1}`;
  }
  d += ` L ${pts[pts.length - 1][0]} ${pts[pts.length - 1][1]}`;
  return d;
}

// ── Main ──────────────────────────────────────────────────────────────────────

// Layout constants (px) — defined outside component so useEffect closure can reference totalW
const NW = 108, NH = 76, GX = 32, GY = 40;
const row0Y = 18;
const row1Y = row0Y + NH + GY;
const totalW = (NW + GX) * 4 + NW;
const totalH = row1Y + NH + 22;

export function GanttPanel({ agents, conflicts, orchestratorStatus = 'pending' }: Props) {
  const agentMap = new Map(agents.map(a => [a.id, a]));
  const { theme } = useTheme();
  const t = useT();
  const accent = theme === 'dark' ? '#38bdf8' : theme === 'joule' ? '#6d28d9' : '#00a651';
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      const available = entry.contentRect.width - 20;
      setScale(Math.min(1, available / totalW));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const orchAgent: AgentState = {
    id: 'triage-priority',
    label: 'Asset and Services Assistant',
    status: orchestratorStatus,
    progress: orchestratorStatus === 'running' ? 50 : orchestratorStatus === 'done' ? 100 : 0,
  };

  const nodes = [
    { id: 'orchestrator'    as const, left: 0,               top: row1Y },
    { id: 'triage-priority' as const, left: NW + GX,          top: row0Y },
    { id: 'rerouting'       as const, left: NW + GX,          top: row1Y },
    { id: 'crew-dispatch'   as const, left: (NW + GX) * 2,    top: row1Y },
    { id: 'resource'        as const, left: (NW + GX) * 3,    top: row1Y },
    { id: 'comms'           as const, left: (NW + GX) * 4,    top: row1Y },
  ];

  const mid = (node: typeof nodes[0]) => ({
    cx: node.left + NW / 2,
    cy: node.top + NH / 2,
    r:  node.left + NW,
    l:  node.left,
    b:  node.top + NH,
  });

  const orch  = mid(nodes[0]);
  const tech  = mid(nodes[1]);
  const scada = mid(nodes[2]);
  const disp  = mid(nodes[3]);
  const res   = mid(nodes[4]);
  const comm  = mid(nodes[5]);

  const d1 = `M ${orch.r} ${orch.cy} C ${orch.r + 36} ${orch.cy}, ${tech.l - 36} ${tech.cy}, ${tech.l} ${tech.cy}`;
  const d2 = bezier(orch.r, orch.cy, scada.l, scada.cy, 24);
  const underY = row1Y + NH + 14;
  const d3 = roundedPath([[orch.cx, orch.b], [orch.cx, underY], [disp.cx, underY], [disp.cx, disp.b]]);
  const d4 = bezier(disp.r, disp.cy, res.l, res.cy);
  const d5 = bezier(res.r, res.cy, comm.l, comm.cy);

  const phase1X = tech.cx;
  const phase2X = (disp.cx + comm.cx) / 2;

  return (
    <div className="panel-card flex flex-col h-full overflow-hidden">
      <div className="panel-header">
        <span style={{ color: 'var(--accent)' }}>◈</span>
        {t.gantt.header}
      </div>

      <div ref={containerRef} className="flex-1 overflow-hidden"
        style={{ minHeight: 0, position: 'relative' }}>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '8px 10px',
        }}>
          <div style={{
            position: 'relative',
            width: totalW,
            height: totalH,
            flexShrink: 0,
            transformOrigin: 'center center',
            transform: `scale(${scale})`,
          }}>
            {/* SVG arrows layer */}
            <svg
              style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}
              width={totalW} height={totalH}
            >
              <defs>
                <marker id="arr2" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill={accent} opacity="0.65" />
                </marker>
              </defs>
              <text x={phase1X} y={row0Y - 6} textAnchor="middle"
                fontSize={7} fontWeight="700" fill="var(--accent)" letterSpacing="0.08em" opacity="0.8">
                {t.gantt.phase1}
              </text>
              <text x={phase2X} y={row1Y - 6} textAnchor="middle"
                fontSize={7} fontWeight="700" fill="#f97316" letterSpacing="0.08em" opacity="0.8">
                {t.gantt.phase2}
              </text>
              {[d1, d2, d3, d4, d5].map((d, i) => (
                <path key={i} d={d} fill="none" stroke={accent} strokeWidth={1.2}
                  opacity={0.65} markerEnd="url(#arr2)" />
              ))}
            </svg>

            {/* HTML nodes */}
            <N8nNode id="orchestrator"    agent={orchAgent}                      style={{ left: nodes[0].left, top: nodes[0].top }} />
            <N8nNode id="triage-priority" agent={agentMap.get('triage-priority')} style={{ left: nodes[1].left, top: nodes[1].top }} />
            <N8nNode id="rerouting"       agent={agentMap.get('rerouting')}       style={{ left: nodes[2].left, top: nodes[2].top }} />
            <N8nNode id="crew-dispatch"   agent={agentMap.get('crew-dispatch')}   style={{ left: nodes[3].left, top: nodes[3].top }} />
            <N8nNode id="resource"        agent={agentMap.get('resource')}        style={{ left: nodes[4].left, top: nodes[4].top }} />
            <N8nNode id="comms"           agent={agentMap.get('comms')}           style={{ left: nodes[5].left, top: nodes[5].top }} />
          </div>
        </div>

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 px-3 pb-2 flex flex-col gap-1"
            style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-panel)' }}>
            <div className="text-[10px] font-bold tracking-widest text-red-400 uppercase pt-1.5">⚡ {t.gantt.conflicts}</div>
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
