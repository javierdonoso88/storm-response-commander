import { useEffect, useState } from 'react';
import { ActionMessage, AgentState, CommsMessage, ConflictEvent, Fault, KPIState } from '../types';

interface Props {
  faults: Fault[];
  kpi: KPIState;
  agents: AgentState[];
  commsMessages: CommsMessage[];
  actionMessages: ActionMessage[];
  conflicts: ConflictEvent[];
  elapsedLabel: string;
  onClose: () => void;
}

const AGENT_COLOR: Record<string, string> = {
  triage: '#22d3ee',
  rerouting: '#4ade80',
  priority: '#fb923c',
  'crew-dispatch': '#60a5fa',
  resource: '#c084fc',
  comms: '#f472b6',
};

const AGENT_SYSTEM: Record<string, string> = {
  triage: 'SAP S/4HANA Asset Management',
  rerouting: 'SAP Asset Intelligence Network',
  priority: 'SAP Event Mesh + Business Rules',
  'crew-dispatch': 'SAP Field Service Management',
  resource: 'SAP Integrated Business Planning',
  comms: 'SAP Customer Experience',
};

function hexToRgb(hex: string) {
  return `${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)}`;
}

function kpiColor(v: number) {
  return v >= 80 ? '#22c55e' : v >= 60 ? '#f97316' : '#ef4444';
}

function kpiGrade(v: number) {
  return v >= 80 ? 'ÓPTIMO' : v >= 60 ? 'ACEPTABLE' : 'CRÍTICO';
}

function CircleGauge({ value, label }: { value: number; label: string }) {
  const [animated, setAnimated] = useState(0);
  const r = 40;
  const circ = 2 * Math.PI * r;
  const color = kpiColor(value);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(value), 120);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="104" height="104" viewBox="0 0 104 104">
        <circle cx="52" cy="52" r={r} fill="none" stroke="#1e2d45" strokeWidth="7" />
        <circle
          cx="52" cy="52" r={r}
          fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={circ}
          strokeDashoffset={circ - (animated / 100) * circ}
          strokeLinecap="round"
          transform="rotate(-90 52 52)"
          style={{ filter: `drop-shadow(0 0 8px ${color}55)`, transition: 'stroke-dashoffset 1.3s cubic-bezier(0.4,0,0.2,1)' }}
        />
        <text x="52" y="48" textAnchor="middle" fill="white" fontSize="19" fontWeight="900" fontFamily="system-ui">{value}%</text>
        <text x="52" y="62" textAnchor="middle" fill={color} fontSize="7" fontWeight="700" fontFamily="system-ui" letterSpacing="1.2">{kpiGrade(value)}</text>
      </svg>
      <span className="text-[11px] font-bold tracking-widest" style={{ color: '#475569' }}>{label}</span>
    </div>
  );
}

function StatCard({ value, unit, label, sub, color }: { value: string; unit?: string; label: string; sub: string; color: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'rgba(10,18,35,0.6)', border: '1px solid #1e2d45' }}>
      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-3xl font-black" style={{ color }}>{value}</span>
        {unit && <span className="text-sm font-bold" style={{ color: '#334155' }}>{unit}</span>}
      </div>
      <div className="text-xs font-bold text-white mb-1">{label}</div>
      <div className="text-[11px] leading-tight" style={{ color: '#334155' }}>{sub}</div>
    </div>
  );
}

function SapKpiCard({ system, value, label, color }: { system: string; value: string | number; label: string; color: string }) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2"
      style={{
        background: `linear-gradient(135deg,rgba(${hexToRgb(color)},0.07),rgba(${hexToRgb(color)},0.02))`,
        border: `1px solid rgba(${hexToRgb(color)},0.22)`,
      }}
    >
      <div className="text-[10px] font-mono tracking-wider truncate" style={{ color: `rgba(${hexToRgb(color)},0.7)` }}>{system}</div>
      <div className="text-3xl font-black" style={{ color }}>{value}</div>
      <div className="text-[11px] font-semibold text-white leading-tight">{label}</div>
    </div>
  );
}

export function ResultsOverlay({ faults, kpi, agents, commsMessages, actionMessages, conflicts, elapsedLabel, onClose }: Props) {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), 50); return () => clearTimeout(t); }, []);

  // Operational KPIs
  const totalClients = faults.reduce((s, f) => s + f.affectedClients, 0);
  const restored = faults.filter(f => f.status === 'restored');
  const enRoute = faults.filter(f => f.status === 'crew-en-route');
  const pending = faults.filter(f => f.status === 'fault');
  const attended = restored.length + enRoute.length;
  const attendedClients = [...restored, ...enRoute].reduce((s, f) => s + f.affectedClients, 0);
  const criticals = faults.filter(f => f.criticalSite);
  const criticalsCovered = criticals.filter(f => f.status !== 'fault');

  // SAP KPIs derived from actionMessages
  const uniqueSystems = new Set(actionMessages.map(a => a.system)).size;
  const fsmActions = actionMessages.filter(a => a.system === 'SAP Field Service Management' && a.msg.includes('Orden de trabajo'));
  const ibpMaterials = actionMessages.filter(a => a.system === 'SAP Integrated Business Planning' && a.msg.includes('Material reservado'));
  const ibpConflicts = actionMessages.filter(a => a.system === 'SAP Integrated Business Planning' && a.msg.includes('reposición'));
  const cxMessages = commsMessages.length;
  const ainSwitches = actionMessages.filter(a => a.system === 'SAP Asset Intelligence Network').length;
  const s4Assets = faults.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(4,8,16,0.87)', backdropFilter: 'blur(14px)', opacity: vis ? 1 : 0, transition: 'opacity 0.3s' }}
    >
      <div
        className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl flex flex-col"
        style={{
          background: 'linear-gradient(160deg,#0a1525 0%,#080e1a 100%)',
          border: '1px solid #1e2d45',
          boxShadow: '0 0 100px rgba(34,211,238,0.07), 0 40px 80px rgba(0,0,0,0.8)',
          transform: vis ? 'scale(1)' : 'scale(0.95)',
          transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #1e2d45' }}>
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-black tracking-widest" style={{ color: '#22d3ee' }}>RESUMEN EJECUTIVO</span>
          <span className="text-xs font-mono" style={{ color: '#1e3a5f' }}>·</span>
          <span className="text-xs font-mono" style={{ color: '#334155' }}>Ciclo completado · {elapsedLabel}</span>
          <span className="ml-auto text-[11px] font-bold px-3 py-1 rounded-full" style={{ background: '#052e16', color: '#22c55e', border: '1px solid #14532d' }}>
            ✓ MISIÓN COMPLETADA
          </span>
          <button
            onClick={onClose}
            className="ml-3 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
            style={{ background: 'rgba(255,255,255,0.04)', color: '#475569', border: '1px solid #1e2d45', cursor: 'pointer' }}
          >✕</button>
        </div>

        <div className="p-6 flex flex-col gap-5">

          {/* KPI Gauges + time */}
          <div className="rounded-2xl flex items-center justify-around py-6 px-8" style={{ background: 'rgba(10,18,35,0.6)', border: '1px solid #1e2d45' }}>
            <CircleGauge value={kpi.sla} label="SLA" />
            <div style={{ width: 1, height: 80, background: '#1e2d45' }} />
            <CircleGauge value={kpi.safety} label="SEGURIDAD" />
            <div style={{ width: 1, height: 80, background: '#1e2d45' }} />
            <CircleGauge value={kpi.efficiency} label="EFICIENCIA OPERATIVA" />
            <div style={{ width: 1, height: 80, background: '#1e2d45' }} />
            <div className="flex flex-col items-center gap-2">
              <div className="text-3xl font-black font-mono" style={{ color: '#22d3ee' }}>{elapsedLabel}</div>
              <div className="text-[11px] font-bold tracking-widest" style={{ color: '#475569' }}>DURACIÓN CICLO</div>
            </div>
          </div>

          {/* Operational KPIs */}
          <div>
            <div className="text-[10px] font-bold tracking-widest mb-3" style={{ color: '#1e3a5f' }}>INDICADORES OPERATIVOS</div>
            <div className="grid grid-cols-4 gap-3">
              <StatCard
                value={attendedClients.toLocaleString('es-ES')}
                unit={`/ ${totalClients.toLocaleString('es-ES')}`}
                label="Clientes restaurados"
                sub={`${Math.round(attendedClients / totalClients * 100)}% del total afectado`}
                color="#22c55e"
              />
              <StatCard
                value={`${attended}`}
                unit={`/ ${faults.length}`}
                label="Fallos atendidos"
                sub={`${restored.length} telecontrol · ${enRoute.length} brigadas`}
                color="#3b82f6"
              />
              <StatCard
                value={`${pending.length}`}
                label="Acciones pendientes"
                sub={pending.length === 0 ? 'Sin fallos sin atender' : `${pending.length} fallos sin brigada asignada`}
                color={pending.length === 0 ? '#22c55e' : '#ef4444'}
              />
              <StatCard
                value={`${criticalsCovered.length}`}
                unit={`/ ${criticals.length}`}
                label="Sitios críticos cubiertos"
                sub={criticalsCovered.length === criticals.length ? 'Cobertura total' : `${criticals.length - criticalsCovered.length} sin cobertura`}
                color={criticalsCovered.length === criticals.length ? '#22c55e' : '#f97316'}
              />
            </div>
          </div>

          {/* SAP KPIs */}
          <div>
            <div className="text-[10px] font-bold tracking-widest mb-3" style={{ color: '#1e3a5f' }}>INTEGRACIÓN SAP</div>
            <div className="grid grid-cols-3 gap-3">
              <SapKpiCard system="SAP AI Core Orchestration" value={uniqueSystems} label="Sistemas SAP integrados" color="#f59e0b" />
              <SapKpiCard system="SAP Field Service Management" value={fsmActions.length} label={`Órdenes de trabajo creadas`} color="#60a5fa" />
              <SapKpiCard system="SAP Asset Intelligence Network" value={ainSwitches} label="Conmutaciones registradas en AIN" color="#4ade80" />
              <SapKpiCard system="SAP Integrated Business Planning" value={ibpMaterials.length} label={`Materiales reservados en IBP${ibpConflicts.length > 0 ? ` · ${ibpConflicts.length} reposición` : ''}`} color="#c084fc" />
              <SapKpiCard system="SAP Customer Experience" value={cxMessages} label="Mensajes enviados vía SAP CX" color="#f472b6" />
              <SapKpiCard system="SAP S/4HANA Asset Management" value={s4Assets} label="Activos analizados en S/4HANA" color="#22d3ee" />
            </div>
          </div>

          {/* Agent summaries */}
          <div>
            <div className="text-[10px] font-bold tracking-widest mb-3" style={{ color: '#1e3a5f' }}>RESUMEN POR AGENTE</div>
            <div className="grid grid-cols-3 gap-3">
              {agents.map(agent => {
                const color = AGENT_COLOR[agent.id] ?? '#64748b';
                return (
                  <div
                    key={agent.id}
                    className="rounded-xl p-4"
                    style={{
                      background: `linear-gradient(135deg,rgba(${hexToRgb(color)},0.06),rgba(${hexToRgb(color)},0.02))`,
                      border: `1px solid rgba(${hexToRgb(color)},0.2)`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                      <span className="text-[11px] font-black tracking-widest" style={{ color }}>{agent.label}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed mb-2 line-clamp-3" style={{ color: '#64748b' }}>
                      {agent.summary ?? '—'}
                    </p>
                    <div className="text-[10px] font-mono" style={{ color: '#334155' }}>{AGENT_SYSTEM[agent.id] ?? ''}</div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid #0d1e35' }}>
          <div className="flex items-center gap-2">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/SAP_2011_logo.svg/1280px-SAP_2011_logo.svg.png" alt="SAP" style={{ height: 13, opacity: 0.25 }} />
            <span className="text-[11px] font-mono" style={{ color: '#1e3a5f' }}>Storm Response Commander · Iberdrola Girona</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-xs font-bold"
            style={{ background: 'rgba(34,211,238,0.07)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.2)', cursor: 'pointer' }}
          >
            Cerrar y volver al simulador
          </button>
        </div>

      </div>
    </div>
  );
}
