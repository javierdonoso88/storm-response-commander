import React, { useState } from 'react';
import { SimParams } from '../types';

interface Props {
  params: SimParams;
  onChange: (p: Partial<SimParams>) => void;
  onSimulate: () => void;
  running: boolean;
  kpi: { sla: number | null; safety: number | null; efficiency: number | null; tiepi: number | null; mttr: number | null };
}

const storm2Options: SimParams['storm2Window'][] = ['T+4h', 'T+6h', 'T+8h', 'none'];

function TooltipLabel({ label, tip }: { label: string; tip: string }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  return (
    <div
      className="flex items-center gap-1 min-w-0 cursor-default"
      onMouseEnter={e => {
        const r = e.currentTarget.getBoundingClientRect();
        setPos({ x: r.right + 10, y: r.top + r.height / 2 });
      }}
      onMouseLeave={() => setPos(null)}
    >
      <span className="text-xs text-slate-400 font-medium truncate">{label}</span>
      <span className="text-[10px] text-slate-600 flex-shrink-0 select-none">ⓘ</span>
      {pos && (
        <div
          className="fixed w-52 z-[9999] pointer-events-none"
          style={{ left: pos.x, top: pos.y, transform: 'translateY(-50%)' }}
        >
          <div className="rounded-lg px-3 py-2.5 text-[11px] leading-relaxed shadow-2xl" style={{ background: '#0a1525', border: '1px solid #1e3a5f', color: '#94a3b8' }}>
            {tip}
          </div>
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent" style={{ borderRightColor: '#1e3a5f' }} />
        </div>
      )}
    </div>
  );
}

export function ParametersPanel({ params, onChange, onSimulate, running, kpi }: Props) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="flex flex-col h-full">

      {/* Section header */}
      <div className="px-3 py-2 border-b" style={{ background: '#0d1520', borderColor: '#1e2d45' }}>
        <span className="text-[13px] font-semibold uppercase tracking-widest text-slate-500">Parámetros</span>
      </div>

      {/* Context block */}
      <div className="mx-3 mt-3 rounded-lg p-3 flex flex-col gap-2" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
            <span className="text-[10px] font-bold tracking-widest" style={{ color: '#ef4444' }}>INCIDENTE ACTIVO</span>
          </div>
          <button
            onClick={() => setShowInfo(true)}
            className="text-[10px] font-medium px-2 py-0.5 rounded transition-colors"
            style={{ color: '#64748b', border: '1px solid #1e3a5f', background: 'rgba(30,58,95,0.3)' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#3b82f6'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#1e3a5f'; }}
          >
            más info
          </button>
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: '#64748b' }}>
          Tormenta severa en <strong style={{ color: '#94a3b8' }}>Comarques de Girona</strong>. 127K clientes sin suministro, 7 sitios críticos con batería limitada. Configura los parámetros y ejecuta la simulación multi-agente.
        </p>
      </div>

      {/* Info modal */}
      {showInfo && <IncidentInfoModal onClose={() => setShowInfo(false)} />}

      <div className="flex flex-col gap-4 p-3 flex-1 overflow-y-auto">

        {/* SLA */}
        <SliderField
          label="SLA Objetivo"
          tip="Tiempo máximo para restaurar el suministro. Valores bajos (< 45 min) generan más conflictos de priorización entre agentes."
          value={`${params.minuteSLA} min`}
          valueColor={params.minuteSLA < 45 ? '#ef4444' : '#3b82f6'}
          min={30} max={120} step={5}
          current={params.minuteSLA}
          onChange={v => onChange({ minuteSLA: v })}
          accent={params.minuteSLA < 45 ? '#ef4444' : '#3b82f6'}
        />

        {/* Switchable faults */}
        <SliderField
          label="Conmutables"
          tip="Fallos que pueden restaurarse por telecontrol remoto de forma inmediata, sin brigada física. El resto requiere desplazamiento en campo."
          value={String(params.switchableFaults)}
          valueColor={params.switchableFaults < 15 ? '#f97316' : '#3b82f6'}
          min={5} max={22} step={1}
          current={params.switchableFaults}
          onChange={v => onChange({ switchableFaults: v })}
          accent={params.switchableFaults < 15 ? '#f97316' : '#3b82f6'}
        />

        {/* Limited parts toggle */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <TooltipLabel
              label="Piezas limitadas"
              tip="OFF: 2 transformadores disponibles. ON: solo 1 unidad — el agente Resource detecta escasez, prioriza el fallo más crítico y solicita reposición urgente a SAP IBP."
            />
            <button
              onClick={() => onChange({ limitedParts: params.limitedParts === 1 ? 0 : 1 })}
              className="relative w-9 h-5 flex-shrink-0 rounded-full transition-colors duration-200 border"
              style={{
                background: params.limitedParts === 1 ? '#2563eb' : '#1e2d45',
                borderColor: params.limitedParts === 1 ? '#3b82f6' : '#334155',
              }}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-transform duration-200 bg-white shadow-sm ${params.limitedParts === 1 ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {params.limitedParts === 1 && (
            <div className="text-[12px] rounded px-2 py-1 border" style={{ color: '#f97316', background: '#451a03', borderColor: '#7c2d12' }}>
              Solo 1 transformador disponible
            </div>
          )}
        </div>

        {/* Crews */}
        <SliderField
          label="Brigadas"
          tip="Equipos de campo disponibles en 6 bases: Girona, Figueres, Olot, Banyoles, Lloret y Blanes. Cada brigada atiende un fallo a la vez."
          value={String(params.availableCrews)}
          valueColor="#22c55e"
          min={8} max={22} step={1}
          current={params.availableCrews}
          onChange={v => onChange({ availableCrews: v })}
          accent="#22c55e"
        />

        {/* Storm window */}
        <div className="flex flex-col gap-1.5">
          <TooltipLabel
            label="Ventana tormenta 2"
            tip="Tiempo disponible antes de la segunda tormenta. El agente Crew-Dispatch descarta reparaciones que superen este límite para proteger a las brigadas."
          />
          <div className="grid grid-cols-2 gap-1">
            {storm2Options.map(opt => (
              <button
                key={opt}
                onClick={() => onChange({ storm2Window: opt })}
                className="text-[12px] py-1 px-2 rounded border transition-all font-mono"
                style={
                  params.storm2Window === opt
                    ? { background: '#1d4ed8', color: '#fff', borderColor: '#2563eb' }
                    : { background: '#1e2d45', color: '#64748b', borderColor: '#334155' }
                }
              >
                {opt === 'none' ? 'Sin tormenta' : opt}
              </button>
            ))}
          </div>
        </div>

        {/* Operator instructions */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold tracking-widest" style={{ color: '#475569' }}>INSTRUCCIONES AL ORQUESTADOR</span>
          <textarea
            value={params.instructions ?? ''}
            onChange={e => onChange({ instructions: e.target.value })}
            placeholder="Ej: Prioriza el hospital sobre cualquier otra incidencia. No despachar brigadas a zonas inundadas."
            rows={4}
            className="w-full rounded-lg text-[11px] leading-relaxed resize-none outline-none p-2.5"
            style={{
              background: '#0d1520',
              border: '1px solid #1e2d45',
              color: '#94a3b8',
              caretColor: '#3b82f6',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#1e2d45'; }}
          />
          <span className="text-[10px]" style={{ color: '#334155' }}>
            Se inyecta como contexto prioritario en el prompt del orquestador.
          </span>
        </div>

        {/* Simulate */}
        <button onClick={onSimulate} disabled={running} className="btn-primary w-full mt-1">
          {running ? (
            <>
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Simulando…
            </>
          ) : '▶ Simular'}
        </button>

        {/* KPIs */}
        <div className="border-t pt-3 flex flex-col gap-2.5" style={{ borderColor: '#1e2d45' }}>
          <span className="text-[13px] font-semibold uppercase tracking-widest text-slate-600">KPIs</span>
          <KPIRow label="SLA" sub="clientes cubiertos" value={kpi.sla} color={kpi.sla === null ? '#334155' : kpi.sla >= 80 ? '#22c55e' : kpi.sla >= 60 ? '#f97316' : '#ef4444'} />
          <KPIRow label="Seguridad" sub="sitios críticos" value={kpi.safety} color={kpi.safety === null ? '#334155' : kpi.safety === 100 ? '#22c55e' : kpi.safety >= 70 ? '#f97316' : '#ef4444'} />
          <KPIRow label="Eficiencia" sub="fallos gestionados" value={kpi.efficiency} color={kpi.efficiency === null ? '#334155' : kpi.efficiency >= 80 ? '#22c55e' : kpi.efficiency >= 60 ? '#f97316' : '#ef4444'} />
          <KPIMinuteRow label="TIEPI" sub="interrupción media" value={kpi.tiepi} color={kpi.tiepi === null ? '#334155' : kpi.tiepi <= 60 ? '#22c55e' : kpi.tiepi <= 120 ? '#f97316' : '#ef4444'} />
          <KPIMinuteRow label="MTTR" sub="tiempo medio reposición" value={kpi.mttr} color={kpi.mttr === null ? '#334155' : kpi.mttr <= 60 ? '#22c55e' : kpi.mttr <= 120 ? '#f97316' : '#ef4444'} />
        </div>

      </div>
    </div>
  );
}

function SliderField({ label, tip, value, valueColor, min, max, step, current, onChange, accent }: {
  label: string; tip: string; value: string; valueColor: string;
  min: number; max: number; step: number; current: number;
  onChange: (v: number) => void; accent: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center gap-2">
        <TooltipLabel label={label} tip={tip} />
        <span className="text-xs font-bold font-mono flex-shrink-0" style={{ color: valueColor }}>{value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={current}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: accent, background: '#1e2d45' }}
      />
      <div className="flex justify-between text-[12px]" style={{ color: '#334155' }}>
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );
}

function KPIMinuteRow({ label, sub, value, color }: { label: string; sub: string; value: number | null; color: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <div className="flex flex-col">
        <span className="text-[12px] font-semibold text-slate-400">{label}</span>
        <span className="text-[13px] text-slate-600">{sub}</span>
      </div>
      <span className="text-[13px] font-bold font-mono whitespace-nowrap" style={{ color: value === null ? '#334155' : color }}>
        {value === null ? '—' : `${value} min`}
      </span>
    </div>
  );
}

function KPIRow({ label, sub, value, color }: { label: string; sub: string; value: number | null; color: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <div className="flex flex-col">
          <span className="text-[12px] font-semibold text-slate-400">{label}</span>
          <span className="text-[13px] text-slate-600">{sub}</span>
        </div>
        <span className="text-[13px] font-bold font-mono" style={{ color: value === null ? '#334155' : color }}>
          {value === null ? '—' : `${value}%`}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1e2d45' }}>
        {value !== null && (
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
        )}
      </div>
    </div>
  );
}

function IncidentInfoModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl shadow-2xl flex flex-col"
        style={{ background: '#0d1520', border: '1px solid #1e3a5f' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0" style={{ background: '#0d1520', borderColor: '#1e2d45' }}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[13px] font-bold tracking-widest" style={{ color: '#ef4444' }}>INCIDENTE ACTIVO</span>
            <span className="text-[11px] font-mono" style={{ color: '#334155' }}>— Tormenta severa · Comarques de Girona</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-300 text-lg leading-none w-6 h-6 flex items-center justify-center rounded transition-colors"
          >×</button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-6">

          {/* Resumen */}
          <div className="rounded-lg p-4 flex flex-col gap-3" style={{ background: '#0a1120', border: '1px solid #1e2d45' }}>
            <InfoSectionTitle>Resumen del incidente</InfoSectionTitle>
            <div className="grid grid-cols-3 gap-3">
              <StatBox value="127.000" label="clientes sin suministro" color="#ef4444" />
              <StatBox value="47" label="fallos activos" color="#f97316" />
              <StatBox value="7" label="sitios críticos" color="#facc15" />
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: '#64748b' }}>
              Una tormenta severa ha golpeado simultáneamente múltiples zonas de las Comarques de Girona. Los agentes de IA deben coordinar la restauración priorizando la infraestructura crítica con batería limitada antes de que se agote, mientras gestionan los recursos físicos disponibles.
            </p>
          </div>

          {/* Sitios críticos */}
          <div className="flex flex-col gap-3">
            <InfoSectionTitle>Sitios críticos con SAI / batería</InfoSectionTitle>
            <p className="text-[11px]" style={{ color: '#475569' }}>Infraestructuras con suministro de emergencia que se agotará si no se restaura la red a tiempo.</p>
            <div className="flex flex-col gap-1.5">
              {[
                { id: 'TRF-002', site: 'CPD Ajuntament de Girona', type: 'Centro de datos', battery: 30, urgency: 'crítica' },
                { id: 'TRF-003', site: 'Centro de Diálisis de Girona', type: 'Salud', battery: 60, urgency: 'crítica' },
                { id: 'TRF-004', site: 'EDAR Banyoles', type: 'Agua / saneamiento', battery: 120, urgency: 'alta' },
                { id: 'TRF-006', site: "Comissaria Mossos d'Esquadra Figueres", type: 'Emergencias', battery: 180, urgency: 'alta' },
                { id: 'TRF-001', site: 'Hospital de Figueres', type: 'Hospital', battery: 240, urgency: 'media' },
                { id: 'TRF-007', site: 'Hospital Universitari de Santa Caterina', type: 'Hospital', battery: 360, urgency: 'media' },
                { id: 'TRF-005', site: "Punt d'Atenció Continuada Olot", type: 'Hospital', battery: 480, urgency: 'baja' },
              ].map(s => (
                <div key={s.id} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ background: '#0a1120', border: '1px solid #1e2d45' }}>
                  <span className="text-[10px] font-mono w-16 flex-shrink-0" style={{ color: '#334155' }}>{s.id}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium truncate" style={{ color: '#94a3b8' }}>{s.site}</div>
                    <div className="text-[10px]" style={{ color: '#475569' }}>{s.type}</div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[11px] font-mono font-bold" style={{ color: s.battery <= 60 ? '#ef4444' : s.battery <= 180 ? '#f97316' : '#64748b' }}>{s.battery} min</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide" style={{
                      color: s.urgency === 'crítica' ? '#fca5a5' : s.urgency === 'alta' ? '#fdba74' : s.urgency === 'media' ? '#fde68a' : '#94a3b8',
                      background: s.urgency === 'crítica' ? 'rgba(239,68,68,0.15)' : s.urgency === 'alta' ? 'rgba(249,115,22,0.15)' : s.urgency === 'media' ? 'rgba(250,204,21,0.12)' : 'rgba(148,163,184,0.1)',
                    }}>{s.urgency}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tipos de fallo */}
          <div className="flex flex-col gap-3">
            <InfoSectionTitle>Tipos de fallo</InfoSectionTitle>
            <div className="grid grid-cols-3 gap-3">
              <FaultTypeBox count={22} label="Conmutables" desc="Restauración remota por telecontrol, sin brigada física" color="#3b82f6" />
              <FaultTypeBox count={7} label="Transformadores" desc="Sustitución física de transformador en campo" color="#f97316" />
              <FaultTypeBox count={18} label="Cables" desc="Reparación física de línea en campo" color="#8b5cf6" />
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: '#475569' }}>
              El parámetro <strong style={{ color: '#64748b' }}>Conmutables</strong> controla cuántos fallos SW puede restaurar el agente Remote Restoration por telecontrol. Los que excedan el límite se degradan a fallo de cable y requieren brigada. Los parámetros <strong style={{ color: '#64748b' }}>Brigadas</strong> y <strong style={{ color: '#64748b' }}>Piezas limitadas</strong> afectan directamente a cuántos fallos físicos pueden atenderse.
            </p>
          </div>

          {/* Recursos */}
          <div className="flex flex-col gap-3">
            <InfoSectionTitle>Recursos disponibles</InfoSectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg p-3 flex flex-col gap-2" style={{ background: '#0a1120', border: '1px solid #1e2d45' }}>
                <span className="text-[10px] font-bold tracking-widest" style={{ color: '#22c55e' }}>BRIGADAS — 6 bases</span>
                {[
                  { base: 'Girona', n: 7 },
                  { base: 'Figueres', n: 4 },
                  { base: 'Olot', n: 3 },
                  { base: 'Lloret de Mar', n: 3 },
                  { base: 'Blanes', n: 3 },
                  { base: 'Banyoles', n: 2 },
                ].map(b => (
                  <div key={b.base} className="flex items-center justify-between">
                    <span className="text-[11px]" style={{ color: '#64748b' }}>{b.base}</span>
                    <span className="text-[11px] font-mono font-bold" style={{ color: '#475569' }}>{b.n}</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex items-center justify-between" style={{ borderColor: '#1e2d45' }}>
                  <span className="text-[11px] font-medium" style={{ color: '#64748b' }}>Total máximo</span>
                  <span className="text-[11px] font-mono font-bold" style={{ color: '#22c55e' }}>22</span>
                </div>
              </div>
              <div className="rounded-lg p-3 flex flex-col gap-2" style={{ background: '#0a1120', border: '1px solid #1e2d45' }}>
                <span className="text-[10px] font-bold tracking-widest" style={{ color: '#22c55e' }}>MATERIAL EN ALMACÉN</span>
                <MaterialRow label="Transformadores" value="2 ud" note="→ 1 ud si piezas limitadas" />
                <MaterialRow label="Bobinas de cable" value="40 ud" note="suficiente para todos los fallos" />
                <MaterialRow label="Generador móvil" value="1 ud" note="medida temporal" />
                <div className="mt-1 rounded p-2 text-[10px] leading-relaxed" style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', color: '#f97316' }}>
                  Con <strong>piezas limitadas ON</strong>, solo hay 1 transformador para 7 fallos. El agente Resource detecta la escasez y fuerza un conflicto de priorización.
                </div>
              </div>
            </div>
          </div>

          {/* Tensiones clave */}
          <div className="flex flex-col gap-3">
            <InfoSectionTitle>Tensiones del escenario</InfoSectionTitle>
            <div className="flex flex-col gap-2">
              {[
                { label: 'CPD Girona — 30 min de batería', desc: 'Si el SLA objetivo supera los 30 min, el fallo TRF-002 casi seguro incumplirá. El agente Triage debe asignarlo rango 1.', color: '#ef4444' },
                { label: 'Escasez de transformadores', desc: 'Con piezas limitadas, el agente Resource entra en conflicto garantizado: 1 transformador para 7 fallos críticos.', color: '#f97316' },
                { label: 'Ventana tormenta T+4h', desc: 'El agente Crew-Dispatch no puede asignar reparaciones con ETA > 210 min. Muchos transformadores quedarán sin brigada asignada.', color: '#facc15' },
                { label: 'Pocas brigadas disponibles', desc: 'Con < 12 brigadas, zonas costeras con alta carga (Palamós 6.200, Palafrugell 5.800, Sant Feliu 5.500) quedan sin atender.', color: '#8b5cf6' },
              ].map(t => (
                <div key={t.label} className="flex gap-3 rounded-lg px-3 py-2.5" style={{ background: '#0a1120', border: '1px solid #1e2d45' }}>
                  <div className="w-1.5 rounded-full flex-shrink-0 mt-0.5" style={{ background: t.color, minHeight: '16px' }} />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-semibold" style={{ color: '#94a3b8' }}>{t.label}</span>
                    <span className="text-[11px] leading-relaxed" style={{ color: '#475569' }}>{t.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function InfoSectionTitle({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] font-bold tracking-widest uppercase" style={{ color: '#475569' }}>{children}</span>;
}

function StatBox({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="rounded-lg p-3 flex flex-col gap-1 text-center" style={{ background: '#0d1520', border: '1px solid #1e2d45' }}>
      <span className="text-[20px] font-bold font-mono leading-none" style={{ color }}>{value}</span>
      <span className="text-[10px] leading-tight" style={{ color: '#475569' }}>{label}</span>
    </div>
  );
}

function FaultTypeBox({ count, label, desc, color }: { count: number; label: string; desc: string; color: string }) {
  return (
    <div className="rounded-lg p-3 flex flex-col gap-1.5" style={{ background: '#0a1120', border: '1px solid #1e2d45' }}>
      <span className="text-[22px] font-bold font-mono leading-none" style={{ color }}>{count}</span>
      <span className="text-[11px] font-semibold" style={{ color: '#64748b' }}>{label}</span>
      <span className="text-[10px] leading-tight" style={{ color: '#334155' }}>{desc}</span>
    </div>
  );
}

function MaterialRow({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px]" style={{ color: '#64748b' }}>{label}</span>
        <span className="text-[11px] font-mono font-bold" style={{ color: '#94a3b8' }}>{value}</span>
      </div>
      <span className="text-[10px]" style={{ color: '#334155' }}>{note}</span>
    </div>
  );
}
