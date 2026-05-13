import React, { useEffect, useState } from 'react';
import { ActionMessage, AgentLog, CommsMessage, ConflictEvent, Fault, KPIState } from '../types';

interface Props {
  faults: Fault[];
  kpi: KPIState;
  agentLogs: AgentLog[];
  commsMessages: CommsMessage[];
  actionMessages: ActionMessage[];
  conflicts: ConflictEvent[];
  elapsedLabel: string;
  onClose: () => void;
}

function hexToRgb(hex: string) {
  return `${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)}`;
}

function kpiColor(v: number) {
  return v >= 80 ? '#22c55e' : v >= 60 ? '#f97316' : '#ef4444';
}

function kpiGrade(v: number) {
  return v >= 80 ? 'ÓPTIMO' : v >= 60 ? 'ACEPTABLE' : 'CRÍTICO';
}

function stripEmoji(text: string): string {
  return text.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{1F300}-\u{1FAFF}]/gu, '').trim();
}

function renderMarkdown(raw: string) {
  const lines = raw
    .replace(/^[=\-]{3,}\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n');

  const nodes: React.ReactNode[] = [];
  let key = 0;

  const renderInline = (text: string): React.ReactNode => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`[^`]+`)/g);
    return parts.map((p, i) => {
      if (p.startsWith('**') && p.endsWith('**'))
        return <strong key={i} style={{ color: '#e2e8f0', fontWeight: 700 }}>{p.slice(2, -2)}</strong>;
      if (p.startsWith('*') && p.endsWith('*'))
        return <em key={i} style={{ color: '#cbd5e1' }}>{p.slice(1, -1)}</em>;
      if (p.startsWith('`') && p.endsWith('`'))
        return <code key={i} className="px-1 rounded text-xs font-mono" style={{ background: 'rgba(34,211,238,0.08)', color: '#22d3ee' }}>{p.slice(1, -1)}</code>;
      return p;
    });
  };

  let i = 0;
  while (i < lines.length) {
    const line = stripEmoji(lines[i]);

    if (!line) { i++; continue; }

    // H2 / H3
    if (/^#{2,3}\s+/.test(line)) {
      const text = line.replace(/^#{2,3}\s+/, '');
      nodes.push(
        <div key={key++} className="text-[10px] font-black tracking-widest mt-4 mb-1.5 first:mt-0" style={{ color: '#22d3ee' }}>
          {text.toUpperCase()}
        </div>
      );
      i++; continue;
    }

    // H1
    if (/^#\s+/.test(line)) {
      const text = line.replace(/^#\s+/, '');
      nodes.push(
        <div key={key++} className="text-xs font-black tracking-widest mt-4 mb-2 first:mt-0" style={{ color: '#22d3ee' }}>
          {text.toUpperCase()}
        </div>
      );
      i++; continue;
    }

    // Bullet list — collect consecutive items
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(stripEmoji(lines[i]))) {
        items.push(stripEmoji(lines[i]).replace(/^[-*]\s+/, ''));
        i++;
      }
      nodes.push(
        <ul key={key++} className="flex flex-col gap-1 my-1.5 ml-1">
          {items.map((item, j) => (
            <li key={j} className="flex gap-2 text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
              <span className="mt-[6px] w-1 h-1 rounded-full flex-shrink-0" style={{ background: '#334155' }} />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line)) {
      nodes.push(<div key={key++} className="my-3" style={{ height: 1, background: '#1e2d45' }} />);
      i++; continue;
    }

    // Paragraph — collect until blank line or next block element
    const paraLines: string[] = [];
    while (i < lines.length) {
      const l = stripEmoji(lines[i]);
      if (!l) break;
      if (/^#{1,6}\s/.test(l) || /^[-*]\s/.test(l) || /^---+$/.test(l)) break;
      paraLines.push(l);
      i++;
    }
    if (paraLines.length) {
      nodes.push(
        <p key={key++} className="text-sm leading-relaxed my-1" style={{ color: '#94a3b8' }}>
          {renderInline(paraLines.join(' '))}
        </p>
      );
    } else {
      i++; // safety: skip unrecognised line to avoid infinite loop
    }
  }

  return nodes;
}

function getMitigation(fault: Fault): { action: string; urgency: 'high' | 'medium' | 'low' } {
  if (fault.criticalSite) {
    return {
      action: `Reasignar brigada con prioridad máxima. ${fault.batteryMinutes != null ? `Batería restante estimada: ${fault.batteryMinutes} min.` : ''} Considerar generador móvil como medida inmediata.`,
      urgency: 'high',
    };
  }
  if (fault.type === 'transformer') {
    return { action: 'Asignar brigada con Skill A. Si inventario agotado, activar protocolo de reposición urgente en SAP IBP.', urgency: 'medium' };
  }
  if (fault.type === 'cable') {
    return { action: 'Asignar brigada con Skill B. Valorar rerouting manual de red si hay alimentación alternativa disponible.', urgency: 'medium' };
  }
  return { action: 'Evaluar posibilidad de conmutación manual o ampliar límite de operaciones de telecontrol.', urgency: 'low' };
}

const URGENCY_COLOR = { high: '#ef4444', medium: '#f97316', low: '#f59e0b' };
const URGENCY_LABEL = { high: 'CRÍTICO', medium: 'MODERADO', low: 'BAJO' };

function KpiBlock({ value, label }: { value: number; label: string }) {
  const color = kpiColor(value);
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-3 flex-1">
      <div className="relative flex items-center justify-center" style={{ width: 130, height: 130 }}>
        <svg width="130" height="130" viewBox="0 0 130 130" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="65" cy="65" r={r} fill="none" stroke="#1e2d45" strokeWidth="10" />
          <circle
            cx="65" cy="65" r={r} fill="none"
            stroke={color} strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            style={{ filter: `drop-shadow(0 0 6px ${color}88)`, transition: 'stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-3xl font-black leading-none" style={{ color }}>{value}%</span>
          <span className="text-[10px] font-black tracking-widest mt-1" style={{ color }}>{kpiGrade(value)}</span>
        </div>
      </div>
      <span className="text-[10px] font-bold tracking-widest" style={{ color: '#475569' }}>{label}</span>
    </div>
  );
}

function SapKpiCard({ system, value, label, color }: { system: string; value: string | number; label: string; color: string }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-1.5" style={{ background: `rgba(${hexToRgb(color)},0.06)`, border: `1px solid rgba(${hexToRgb(color)},0.2)` }}>
      <div className="text-[10px] font-mono truncate" style={{ color: `rgba(${hexToRgb(color)},0.6)` }}>{system}</div>
      <div className="text-3xl font-black" style={{ color }}>{value}</div>
      <div className="text-[11px] font-semibold text-white leading-tight">{label}</div>
    </div>
  );
}

export function ResultsOverlay({ faults, kpi, agentLogs, commsMessages, actionMessages, conflicts, elapsedLabel, onClose }: Props) {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), 50); return () => clearTimeout(t); }, []);

  function downloadReport() {
    const style = document.createElement('style');
    style.id = '__print_override__';
    style.textContent = `
      @media print {
        body > *:not(#results-print-root) { display: none !important; }
        #results-print-root {
          position: static !important;
          background: #080e1a !important;
          overflow: visible !important;
          backdrop-filter: none !important;
        }
        #results-print-root > div {
          max-height: none !important;
          overflow: visible !important;
          box-shadow: none !important;
          transform: none !important;
          border-radius: 0 !important;
        }
        .no-print { display: none !important; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      }
    `;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => { const el = document.getElementById('__print_override__'); if (el) el.remove(); }, 1500);
  }

  // Orchestrator narrative
  const orchLog = agentLogs.find(l => l.agent === 'orchestrator');
  const orchRaw = orchLog?.text ?? '';

  // Operational KPIs
  const totalClients = faults.reduce((s, f) => s + f.affectedClients, 0);
  const restored = faults.filter(f => f.status === 'restored');
  const enRoute = faults.filter(f => f.status === 'crew-en-route');
  const pending = faults.filter(f => f.status === 'fault');
  const attended = restored.length + enRoute.length;
  const attendedClients = [...restored, ...enRoute].reduce((s, f) => s + f.affectedClients, 0);
  const criticals = faults.filter(f => f.criticalSite);
  const criticalsCovered = criticals.filter(f => f.status !== 'fault');
  const criticalsPending = criticals.filter(f => f.status === 'fault');

  // SAP KPIs
  const uniqueSystems = new Set(actionMessages.map(a => a.system)).size;
  const fsmActions = actionMessages.filter(a => a.system === 'SAP Field Service Management' && a.msg.includes('Orden de trabajo')).length;
  const ibpMaterials = actionMessages.filter(a => a.system === 'SAP Integrated Business Planning' && a.msg.includes('Material reservado')).length;
  const ibpReplenish = actionMessages.filter(a => a.system === 'SAP Integrated Business Planning' && a.msg.includes('reposición')).length;
  const cxMessages = commsMessages.length;
  const ainSwitches = restored.length; // direct from fault state — more reliable than actionMessages
  const s4Assets = faults.length;

  // Pending actions sorted: critical first, then by clients desc
  const pendingSorted = [...pending].sort((a, b) => {
    if (a.criticalSite && !b.criticalSite) return -1;
    if (!a.criticalSite && b.criticalSite) return 1;
    return b.affectedClients - a.affectedClients;
  });

  return (
    <div
      id="results-print-root"
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: 'rgba(4,8,16,0.88)', backdropFilter: 'blur(14px)', zIndex: 2000, opacity: vis ? 1 : 0, transition: 'opacity 0.3s' }}
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
        {/* ── Header ── */}
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
            className="no-print ml-3 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
            style={{ background: 'rgba(255,255,255,0.04)', color: '#475569', border: '1px solid #1e2d45', cursor: 'pointer' }}
          >✕</button>
        </div>

        <div className="p-6 flex flex-col gap-5">

          {/* ── KPIs ── */}
          <div className="rounded-2xl px-8 py-6 flex items-center gap-8" style={{ background: 'rgba(10,18,35,0.6)', border: '1px solid #1e2d45' }}>
            <KpiBlock value={kpi.sla} label="SLA" />
            <div style={{ width: 1, height: 100, background: '#1e2d45', flexShrink: 0 }} />
            <KpiBlock value={kpi.safety} label="SEGURIDAD" />
            <div style={{ width: 1, height: 100, background: '#1e2d45', flexShrink: 0 }} />
            <KpiBlock value={kpi.efficiency} label="EFICIENCIA OPERATIVA" />
            <div style={{ width: 1, height: 100, background: '#1e2d45', flexShrink: 0 }} />
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="text-4xl font-black font-mono" style={{ color: '#22d3ee' }}>{elapsedLabel}</div>
              <div className="text-[10px] font-bold tracking-widest mt-1" style={{ color: '#475569' }}>DURACIÓN CICLO</div>
            </div>
          </div>

          {/* ── Operational stats ── */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { value: attendedClients.toLocaleString('es-ES'), unit: `/ ${totalClients.toLocaleString('es-ES')}`, label: 'Clientes atendidos', sub: `${Math.round(attendedClients / totalClients * 100)}% del total`, color: '#22c55e' },
              { value: `${attended}`, unit: `/ ${faults.length}`, label: 'Fallos atendidos', sub: `${restored.length} telecontrol · ${enRoute.length} brigadas`, color: '#3b82f6' },
              { value: `${criticalsCovered.length}`, unit: `/ ${criticals.length}`, label: 'Sitios críticos cubiertos', sub: criticalsCovered.length === criticals.length ? 'Cobertura total' : `${criticalsPending.length} sin cobertura`, color: criticalsCovered.length === criticals.length ? '#22c55e' : '#ef4444' },
              { value: `${pending.length}`, unit: '', label: 'Acciones pendientes', sub: pending.length === 0 ? 'Sin fallos sin atender' : `${pending.filter(f => f.criticalSite).length} críticos · ${pending.filter(f => !f.criticalSite).length} residenciales`, color: pending.length === 0 ? '#22c55e' : '#f97316' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-4" style={{ background: 'rgba(10,18,35,0.6)', border: '1px solid #1e2d45' }}>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-black" style={{ color: s.color }}>{s.value}</span>
                  {s.unit && <span className="text-sm font-bold" style={{ color: '#334155' }}>{s.unit}</span>}
                </div>
                <div className="text-xs font-bold text-white mb-0.5">{s.label}</div>
                <div className="text-[11px]" style={{ color: '#334155' }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* ── SAP Integration KPIs ── */}
          <div>
            <div className="text-[10px] font-bold tracking-widest mb-3" style={{ color: '#1e3a5f' }}>INTEGRACIÓN SAP</div>
            <div className="grid grid-cols-3 gap-3">
              <SapKpiCard system="SAP AI Core Orchestration" value={uniqueSystems} label="Sistemas SAP integrados" color="#f59e0b" />
              <SapKpiCard system="SAP Field Service Management" value={fsmActions} label="Órdenes de trabajo creadas" color="#60a5fa" />
              <SapKpiCard system="SAP Asset Intelligence Network" value={ainSwitches} label="Conmutaciones registradas en AIN" color="#4ade80" />
              <SapKpiCard system="SAP Integrated Business Planning" value={ibpMaterials} label={`Materiales reservados${ibpReplenish > 0 ? ` · ${ibpReplenish} reposición solicitada` : ''}`} color="#c084fc" />
              <SapKpiCard system="SAP Customer Experience" value={cxMessages} label="Mensajes enviados vía SAP CX" color="#f472b6" />
              <SapKpiCard system="SAP S/4HANA Asset Management" value={s4Assets} label="Activos analizados en S/4HANA" color="#22d3ee" />
            </div>
          </div>

          {/* ── Orchestrator executive summary ── */}
          <div>
            <div className="text-[10px] font-bold tracking-widest mb-3" style={{ color: '#1e3a5f' }}>ANÁLISIS DEL ORQUESTADOR</div>
            <div className="rounded-xl px-6 py-5" style={{ background: 'rgba(10,18,35,0.6)', border: '1px solid #1e2d45' }}>
              {orchRaw ? (
                <div>{renderMarkdown(orchRaw)}</div>
              ) : (
                <p className="text-sm italic" style={{ color: '#334155' }}>Resumen del orquestador no disponible.</p>
              )}
            </div>
          </div>

          {/* ── Pending actions ── */}
          {pendingSorted.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="text-[10px] font-bold tracking-widest" style={{ color: '#1e3a5f' }}>ACCIONES PENDIENTES</div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.25)' }}>
                  {pendingSorted.length} fallo{pendingSorted.length > 1 ? 's' : ''} sin resolver
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {pendingSorted.map(fault => {
                  const { action, urgency } = getMitigation(fault);
                  const uColor = URGENCY_COLOR[urgency];
                  return (
                    <div key={fault.id} className="rounded-xl p-4 flex gap-4" style={{ background: 'rgba(10,18,35,0.6)', border: `1px solid rgba(${hexToRgb(uColor)},0.25)` }}>
                      <div className="flex-shrink-0 mt-0.5">
                        <span className="text-[10px] font-black px-2 py-1 rounded" style={{ background: `rgba(${hexToRgb(uColor)},0.12)`, color: uColor, border: `1px solid rgba(${hexToRgb(uColor)},0.3)` }}>
                          {URGENCY_LABEL[urgency]}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-black text-white">{fault.id}</span>
                          <span className="text-xs font-mono" style={{ color: '#475569' }}>{fault.zone}</span>
                          <span className="text-xs font-mono" style={{ color: '#334155' }}>
                            {fault.type === 'transformer' ? 'Transformador' : fault.type === 'cable' ? 'Cable' : 'Conmutable'} · {fault.affectedClients.toLocaleString('es-ES')} clientes
                          </span>
                          {fault.criticalSite && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}>
                              {fault.criticalSite}
                            </span>
                          )}
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>
                          <span className="font-semibold" style={{ color: '#94a3b8' }}>Mitigación: </span>{action}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0 mt-auto" style={{ borderTop: '1px solid #0d1e35' }}>
          <div className="flex items-center gap-2">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/SAP_2011_logo.svg/1280px-SAP_2011_logo.svg.png" alt="SAP" style={{ height: 13, opacity: 0.25 }} />
            <span className="text-[11px] font-mono" style={{ color: '#1e3a5f' }}>Storm Response Commander · Iberdrola Girona</span>
          </div>
          <div className="no-print flex items-center gap-2">
            <button
              onClick={downloadReport}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold"
              style={{ background: 'rgba(34,211,238,0.05)', color: '#475569', border: '1px solid #1e2d45', cursor: 'pointer' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Descargar PDF
            </button>
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
    </div>
  );
}
