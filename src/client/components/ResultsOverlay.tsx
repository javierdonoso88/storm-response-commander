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

function MinuteKpiCard({ label, sublabel, value, thresholds }: { label: string; sublabel: string; value: number | null; thresholds: [number, number] }) {
  const color = value === null ? '#334155' : value <= thresholds[0] ? '#22c55e' : value <= thresholds[1] ? '#f97316' : '#ef4444';
  const grade = value === null ? '' : value <= thresholds[0] ? 'ÓPTIMO' : value <= thresholds[1] ? 'ACEPTABLE' : 'CRÍTICO';
  return (
    <div className="flex items-center gap-4 flex-1">
      <div>
        <div className="text-[10px] font-black tracking-widest mb-0.5" style={{ color: '#475569' }}>{label}</div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black font-mono" style={{ color }}>{value === null ? '—' : value}</span>
          {value !== null && <span className="text-base font-bold" style={{ color }}>min</span>}
        </div>
        {grade && <div className="text-[10px] font-black tracking-widest mt-0.5" style={{ color }}>{grade}</div>}
      </div>
      <div className="text-[11px] leading-relaxed max-w-[180px]" style={{ color: '#334155' }}>{sublabel}</div>
    </div>
  );
}

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
    const orchLog = agentLogs.find(l => l.agent === 'orchestrator');
    const orchPlain = (orchLog?.text ?? '')
      .replace(/^#{1,6}\s*/gm, '')
      .replace(/\*\*(.*?)\*\*/gs, '$1')
      .replace(/\*(.*?)\*/gs, '$1')
      .replace(/^[=\-]{3,}\s*$/gm, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{1F300}-\u{1FAFF}]/gu, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const pendingRows = [...faults].filter(f => f.status === 'fault')
      .sort((a, b) => {
        if (a.criticalSite && !b.criticalSite) return -1;
        if (!a.criticalSite && b.criticalSite) return 1;
        return b.affectedClients - a.affectedClients;
      });

    const totalClients = faults.reduce((s, f) => s + f.affectedClients, 0);
    const restored = faults.filter(f => f.status === 'restored');
    const enRoute = faults.filter(f => f.status === 'crew-en-route');
    const attended = restored.length + enRoute.length;
    const attendedClients = [...restored, ...enRoute].reduce((s, f) => s + f.affectedClients, 0);
    const criticals = faults.filter(f => f.criticalSite);
    const criticalsCovered = criticals.filter(f => f.status !== 'fault');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Resumen Ejecutivo — Storm Response Commander</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #1e293b; padding: 32px 40px; font-size: 13px; }
  h1 { font-size: 22px; font-weight: 900; color: #0f172a; margin-bottom: 2px; }
  .subtitle { color: #64748b; font-size: 11px; margin-bottom: 28px; }
  .section-label { font-size: 9px; font-weight: 800; letter-spacing: 0.12em; color: #94a3b8; text-transform: uppercase; margin-bottom: 10px; margin-top: 24px; }
  .kpi-row { display: flex; gap: 16px; margin-bottom: 4px; }
  .kpi-box { flex: 1; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; text-align: center; }
  .kpi-value { font-size: 32px; font-weight: 900; }
  .kpi-grade { font-size: 9px; font-weight: 800; letter-spacing: 0.1em; margin-top: 2px; }
  .kpi-label { font-size: 10px; color: #94a3b8; margin-top: 6px; font-weight: 600; letter-spacing: 0.05em; }
  .duration-box { border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; text-align: center; min-width: 120px; }
  .duration-value { font-size: 28px; font-weight: 900; color: #0891b2; font-family: monospace; }
  .duration-label { font-size: 10px; color: #94a3b8; margin-top: 4px; font-weight: 600; letter-spacing: 0.05em; }
  .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .stat-box { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; }
  .stat-value { font-size: 24px; font-weight: 900; }
  .stat-unit { font-size: 12px; font-weight: 700; color: #94a3b8; margin-left: 3px; }
  .stat-label { font-size: 11px; font-weight: 700; color: #1e293b; margin-top: 3px; }
  .stat-sub { font-size: 10px; color: #94a3b8; margin-top: 2px; }
  .sap-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .sap-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
  .sap-system { font-size: 9px; font-family: monospace; color: #94a3b8; margin-bottom: 4px; }
  .sap-value { font-size: 24px; font-weight: 900; }
  .sap-label { font-size: 10px; font-weight: 600; color: #334155; margin-top: 2px; }
  .narrative { border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; line-height: 1.7; color: #334155; white-space: pre-wrap; }
  .pending-row { border: 1px solid #fde68a; border-radius: 8px; padding: 12px 14px; margin-bottom: 8px; display: flex; gap: 14px; align-items: flex-start; }
  .pending-badge { font-size: 9px; font-weight: 800; padding: 3px 7px; border-radius: 4px; white-space: nowrap; margin-top: 1px; }
  .pending-id { font-size: 12px; font-weight: 900; color: #0f172a; }
  .pending-meta { font-size: 10px; color: #94a3b8; margin-top: 1px; }
  .pending-action { font-size: 11px; color: #475569; margin-top: 5px; line-height: 1.5; }
  .footer { margin-top: 36px; padding-top: 14px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; color: #94a3b8; font-size: 10px; }
  .badge-green { background: #dcfce7; color: #16a34a; }
  .badge-orange { background: #ffedd5; color: #ea580c; }
  .badge-red { background: #fee2e2; color: #dc2626; }
  @media print { body { padding: 20px 28px; } }
</style>
</head>
<body>
  <h1>Resumen Ejecutivo</h1>
  <div class="subtitle">Storm Response Commander · Iberdrola Girona · Ciclo completado · ${elapsedLabel}</div>

  <div class="section-label">KPIs DE MISIÓN</div>
  <div class="kpi-row">
    <div class="kpi-box">
      <div class="kpi-value" style="color:${kpiColor(kpi.sla ?? 0)}">${kpi.sla}%</div>
      <div class="kpi-grade" style="color:${kpiColor(kpi.sla ?? 0)}">${kpiGrade(kpi.sla ?? 0)}</div>
      <div class="kpi-label">SLA</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-value" style="color:${kpiColor(kpi.safety ?? 0)}">${kpi.safety}%</div>
      <div class="kpi-grade" style="color:${kpiColor(kpi.safety ?? 0)}">${kpiGrade(kpi.safety ?? 0)}</div>
      <div class="kpi-label">SEGURIDAD</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-value" style="color:${kpiColor(kpi.efficiency ?? 0)}">${kpi.efficiency}%</div>
      <div class="kpi-grade" style="color:${kpiColor(kpi.efficiency ?? 0)}">${kpiGrade(kpi.efficiency ?? 0)}</div>
      <div class="kpi-label">EFICIENCIA OPERATIVA</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-value" style="color:${kpi.tiepi != null && kpi.tiepi <= 60 ? '#16a34a' : kpi.tiepi != null && kpi.tiepi <= 120 ? '#ea580c' : '#dc2626'}">${kpi.tiepi ?? '—'}<span style="font-size:14px;font-weight:600"> min</span></div>
      <div class="kpi-grade" style="color:${kpi.tiepi != null && kpi.tiepi <= 60 ? '#16a34a' : kpi.tiepi != null && kpi.tiepi <= 120 ? '#ea580c' : '#dc2626'}">${kpi.tiepi != null ? (kpi.tiepi <= 60 ? 'ÓPTIMO' : kpi.tiepi <= 120 ? 'ACEPTABLE' : 'CRÍTICO') : ''}</div>
      <div class="kpi-label">TIEPI</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-value" style="color:${kpi.mttr != null && kpi.mttr <= 60 ? '#16a34a' : kpi.mttr != null && kpi.mttr <= 120 ? '#ea580c' : '#dc2626'}">${kpi.mttr ?? '—'}<span style="font-size:14px;font-weight:600"> min</span></div>
      <div class="kpi-grade" style="color:${kpi.mttr != null && kpi.mttr <= 60 ? '#16a34a' : kpi.mttr != null && kpi.mttr <= 120 ? '#ea580c' : '#dc2626'}">${kpi.mttr != null ? (kpi.mttr <= 60 ? 'ÓPTIMO' : kpi.mttr <= 120 ? 'ACEPTABLE' : 'CRÍTICO') : ''}</div>
      <div class="kpi-label">MTTR</div>
    </div>
    <div class="duration-box">
      <div class="duration-value">${elapsedLabel}</div>
      <div class="duration-label">DURACIÓN CICLO</div>
    </div>
  </div>

  <div class="section-label">INDICADORES OPERATIVOS</div>
  <div class="stat-grid">
    <div class="stat-box">
      <div><span class="stat-value" style="color:#16a34a">${attendedClients.toLocaleString('es-ES')}</span><span class="stat-unit">/ ${totalClients.toLocaleString('es-ES')}</span></div>
      <div class="stat-label">Clientes atendidos</div>
      <div class="stat-sub">${Math.round(attendedClients / totalClients * 100)}% del total</div>
    </div>
    <div class="stat-box">
      <div><span class="stat-value" style="color:#2563eb">${attended}</span><span class="stat-unit">/ ${faults.length}</span></div>
      <div class="stat-label">Fallos atendidos</div>
      <div class="stat-sub">${restored.length} telecontrol · ${enRoute.length} brigadas</div>
    </div>
    <div class="stat-box">
      <div><span class="stat-value" style="color:${criticalsCovered.length === criticals.length ? '#16a34a' : '#dc2626'}">${criticalsCovered.length}</span><span class="stat-unit">/ ${criticals.length}</span></div>
      <div class="stat-label">Sitios críticos cubiertos</div>
      <div class="stat-sub">${criticalsCovered.length === criticals.length ? 'Cobertura total' : `${criticals.length - criticalsCovered.length} sin cobertura`}</div>
    </div>
    <div class="stat-box">
      <div><span class="stat-value" style="color:${pendingRows.length === 0 ? '#16a34a' : '#ea580c'}">${pendingRows.length}</span></div>
      <div class="stat-label">Acciones pendientes</div>
      <div class="stat-sub">${pendingRows.length === 0 ? 'Sin fallos sin atender' : `${pendingRows.filter(f => f.criticalSite).length} críticos · ${pendingRows.filter(f => !f.criticalSite).length} residenciales`}</div>
    </div>
  </div>

  <div class="section-label">INTEGRACIÓN SAP</div>
  <div class="sap-grid">
    <div class="sap-box"><div class="sap-system">SAP AI Core Orchestration</div><div class="sap-value" style="color:#d97706">${new Set(actionMessages.map(a => a.system)).size}</div><div class="sap-label">Sistemas SAP integrados</div></div>
    <div class="sap-box"><div class="sap-system">SAP Field Service Management</div><div class="sap-value" style="color:#2563eb">${actionMessages.filter(a => a.system === 'SAP Field Service Management' && a.msg.includes('Orden de trabajo')).length}</div><div class="sap-label">Órdenes de trabajo creadas</div></div>
    <div class="sap-box"><div class="sap-system">SAP Asset Intelligence Network</div><div class="sap-value" style="color:#16a34a">${restored.length}</div><div class="sap-label">Conmutaciones registradas en AIN</div></div>
    <div class="sap-box"><div class="sap-system">SAP Integrated Business Planning</div><div class="sap-value" style="color:#9333ea">${actionMessages.filter(a => a.system === 'SAP Integrated Business Planning' && a.msg.includes('Material reservado')).length}</div><div class="sap-label">Materiales reservados</div></div>
    <div class="sap-box"><div class="sap-system">SAP Customer Experience</div><div class="sap-value" style="color:#db2777">${commsMessages.length}</div><div class="sap-label">Mensajes enviados vía SAP CX</div></div>
    <div class="sap-box"><div class="sap-system">SAP S/4HANA Asset Management</div><div class="sap-value" style="color:#0891b2">${faults.length}</div><div class="sap-label">Activos analizados en S/4HANA</div></div>
  </div>

  ${orchPlain ? `
  <div class="section-label">ANÁLISIS STATUS UPDATE</div>
  <div class="narrative">${orchPlain.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
  ` : ''}

  ${pendingRows.length > 0 ? `
  <div class="section-label">ACCIONES PENDIENTES (${pendingRows.length})</div>
  ${pendingRows.map(fault => {
    const { action, urgency } = getMitigation(fault);
    const bg = urgency === 'high' ? '#fee2e2' : urgency === 'medium' ? '#ffedd5' : '#fef9c3';
    const col = urgency === 'high' ? '#dc2626' : urgency === 'medium' ? '#ea580c' : '#ca8a04';
    const lbl = URGENCY_LABEL[urgency];
    return `<div class="pending-row" style="border-color:${col}33">
      <div class="pending-badge" style="background:${bg};color:${col}">${lbl}</div>
      <div style="flex:1">
        <div class="pending-id">${fault.id} <span style="font-weight:400;color:#64748b;font-size:11px">${fault.zone} · ${fault.type === 'transformer' ? 'Transformador' : fault.type === 'cable' ? 'Cable' : 'Conmutable'} · ${fault.affectedClients.toLocaleString('es-ES')} clientes${fault.criticalSite ? ` · ${fault.criticalSite}` : ''}</span></div>
        <div class="pending-action"><strong>Mitigación:</strong> ${action}</div>
      </div>
    </div>`;
  }).join('')}
  ` : ''}

  <div class="footer">
    <span>Storm Response Commander · Iberdrola Girona</span>
    <span>Generado el ${new Date().toLocaleString('es-ES')}</span>
  </div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 400);
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
            className="ml-3 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
            style={{ background: 'rgba(255,255,255,0.04)', color: '#475569', border: '1px solid #1e2d45', cursor: 'pointer' }}
          >✕</button>
        </div>

        <div className="p-6 flex flex-col gap-5">

          {/* ── KPIs ── */}
          <div className="rounded-2xl px-8 py-6 flex flex-col gap-5" style={{ background: 'rgba(10,18,35,0.6)', border: '1px solid #1e2d45' }}>
            <div className="flex items-center gap-8">
              <KpiBlock value={kpi.sla ?? 0} label="SLA" />
              <div style={{ width: 1, height: 100, background: '#1e2d45', flexShrink: 0 }} />
              <KpiBlock value={kpi.safety ?? 0} label="SEGURIDAD" />
              <div style={{ width: 1, height: 100, background: '#1e2d45', flexShrink: 0 }} />
              <KpiBlock value={kpi.efficiency ?? 0} label="EFICIENCIA OPERATIVA" />
              <div style={{ width: 1, height: 100, background: '#1e2d45', flexShrink: 0 }} />
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className="text-4xl font-black font-mono" style={{ color: '#22d3ee' }}>{elapsedLabel}</div>
                <div className="text-[10px] font-bold tracking-widest mt-1" style={{ color: '#475569' }}>DURACIÓN CICLO</div>
              </div>
            </div>
            <div style={{ height: 1, background: '#1e2d45' }} />
            <div className="flex items-center gap-10">
              <MinuteKpiCard label="TIEPI" sublabel="Tiempo de Interrupción Equiv. Potencia Instalada" value={kpi.tiepi} thresholds={[60, 120]} />
              <div style={{ width: 1, height: 48, background: '#1e2d45', flexShrink: 0 }} />
              <MinuteKpiCard label="MTTR" sublabel="Mean Time To Repair — Tiempo medio de reposición" value={kpi.mttr} thresholds={[60, 120]} />
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

          {/* ── Status Update executive summary ── */}
          <div>
            <div className="text-[10px] font-bold tracking-widest mb-3" style={{ color: '#1e3a5f' }}>ANÁLISIS STATUS UPDATE</div>
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
          <div className="flex items-center gap-2">
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
