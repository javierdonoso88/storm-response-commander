import { SimParams } from '../types';

interface Props {
  params: SimParams;
  onChange: (p: Partial<SimParams>) => void;
  onSimulate: () => void;
  running: boolean;
  kpi: { sla: number; safety: number; efficiency: number };
}

const storm2Options: SimParams['storm2Window'][] = ['T+4h', 'T+6h', 'T+8h', 'none'];

export function ParametersPanel({ params, onChange, onSimulate, running, kpi }: Props) {
  return (
    <div className="flex flex-col h-full">

      {/* Section header */}
      <div className="px-3 py-2 border-b" style={{ background: '#0d1520', borderColor: '#1e2d45' }}>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Parámetros</span>
      </div>

      <div className="flex flex-col gap-4 p-3 flex-1 overflow-y-auto">

        {/* SLA */}
        <SliderField
          label="SLA Objetivo"
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
          value={String(params.switchableFaults)}
          valueColor={params.switchableFaults < 15 ? '#f97316' : '#3b82f6'}
          min={5} max={22} step={1}
          current={params.switchableFaults}
          onChange={v => onChange({ switchableFaults: v })}
          accent={params.switchableFaults < 15 ? '#f97316' : '#3b82f6'}
        />

        {/* Limited parts toggle */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-400 font-medium">Piezas limitadas</label>
            <button
              onClick={() => onChange({ limitedParts: params.limitedParts === 1 ? 0 : 1 })}
              className="relative w-9 h-5 rounded-full transition-colors duration-200 border"
              style={{
                background: params.limitedParts === 1 ? '#2563eb' : '#1e2d45',
                borderColor: params.limitedParts === 1 ? '#3b82f6' : '#334155',
              }}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-transform duration-200 bg-white shadow-sm ${params.limitedParts === 1 ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {params.limitedParts === 1 && (
            <div className="text-[10px] rounded px-2 py-1 border" style={{ color: '#f97316', background: '#451a03', borderColor: '#7c2d12' }}>
              Solo 1 transformador disponible
            </div>
          )}
        </div>

        {/* Storm window */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400 font-medium">Ventana tormenta 2</label>
          <div className="grid grid-cols-2 gap-1">
            {storm2Options.map(opt => (
              <button
                key={opt}
                onClick={() => onChange({ storm2Window: opt })}
                className="text-[10px] py-1 px-2 rounded border transition-all font-mono"
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

        {/* Crews */}
        <SliderField
          label="Brigadas"
          value={String(params.availableCrews)}
          valueColor="#22c55e"
          min={8} max={22} step={1}
          current={params.availableCrews}
          onChange={v => onChange({ availableCrews: v })}
          accent="#22c55e"
        />

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
          <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-600">KPIs</span>
          <KPIRow label="SLA" sub="clientes cubiertos" value={kpi.sla} color={kpi.sla >= 80 ? '#22c55e' : kpi.sla >= 55 ? '#f97316' : '#ef4444'} />
          <KPIRow label="Seguridad" sub="sitios críticos" value={kpi.safety} color={kpi.safety === 100 ? '#22c55e' : kpi.safety >= 70 ? '#f97316' : '#ef4444'} />
          <KPIRow label="Eficiencia" sub="fallos gestionados" value={kpi.efficiency} color={kpi.efficiency >= 80 ? '#22c55e' : kpi.efficiency >= 50 ? '#3b82f6' : '#64748b'} />
        </div>

      </div>
    </div>
  );
}

function SliderField({ label, value, valueColor, min, max, step, current, onChange, accent }: {
  label: string; value: string; valueColor: string;
  min: number; max: number; step: number; current: number;
  onChange: (v: number) => void; accent: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <label className="text-xs text-slate-400 font-medium">{label}</label>
        <span className="text-xs font-bold font-mono" style={{ color: valueColor }}>{value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={current}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: accent, background: '#1e2d45' }}
      />
      <div className="flex justify-between text-[10px]" style={{ color: '#334155' }}>
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );
}

function KPIRow({ label, sub, value, color }: { label: string; sub: string; value: number; color: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold text-slate-400">{label}</span>
          <span className="text-[9px] text-slate-600">{sub}</span>
        </div>
        <span className="text-[11px] font-bold font-mono" style={{ color }}>{value}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1e2d45' }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}
