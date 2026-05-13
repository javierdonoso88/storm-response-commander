import { ApprovalSummary } from '../types';

interface Props {
  summary: ApprovalSummary;
  role: 'director' | 'observer';
  onApprove?: () => void;
  onReject?: () => void;
}

export function ApprovalGate({ summary, role, onApprove, onReject }: Props) {
  const criticalPending = summary.physicalFaults.filter(f => f.criticalSite);
  const transformers = summary.physicalFaults.filter(f => f.type === 'transformer');
  const cables = summary.physicalFaults.filter(f => f.type === 'cable');
  const totalPhysicalClients = summary.physicalFaults.reduce((s, f) => s + f.clients, 0);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[3000] p-6"
      style={{ background: 'rgba(4,8,18,0.92)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden"
        style={{ background: '#0a1525', border: '1px solid #1e3a5f', boxShadow: '0 24px 80px rgba(0,0,0,0.7)' }}
      >
        {/* Header */}
        <div className="px-7 py-5 border-b" style={{ borderColor: '#1e3a5f', background: 'linear-gradient(135deg, rgba(245,158,11,0.08), transparent)' }}>
          <div className="flex items-center gap-3 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
            <span className="text-xs font-bold tracking-widest" style={{ color: '#f59e0b' }}>
              {role === 'director' ? 'APROBACIÓN REQUERIDA' : 'ESPERANDO APROBACIÓN'}
            </span>
          </div>
          <h2 className="text-lg font-black text-white leading-tight">
            Fase 2 — Despacho de Brigadas
          </h2>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>
            {role === 'director'
              ? 'Revisa el plan de la IA antes de enviar brigadas al campo.'
              : 'El Director de Operaciones está revisando el plan de despacho.'}
          </p>
        </div>

        {/* Summary */}
        <div className="px-7 py-5 grid grid-cols-2 gap-5">

          {/* Phase 1 results */}
          <div className="flex flex-col gap-3">
            <div className="text-xs font-bold tracking-widest mb-1" style={{ color: '#22d3ee' }}>FASE 1 COMPLETADA</div>
            <StatRow
              label="Restaurados telecontrol"
              value={`${summary.restoredByTelecontrol} fallos`}
              sub={`${summary.restoredClients.toLocaleString()} clientes reconectados`}
              color="#22c55e"
            />
            <StatRow
              label="Fallos físicos pendientes"
              value={`${summary.physicalFaults.length} fallos`}
              sub={`${totalPhysicalClients.toLocaleString()} clientes afectados`}
              color="#f97316"
            />
            <StatRow
              label="Brigadas disponibles"
              value={`${summary.crewsAvailable}`}
              sub="equipos de campo listos"
              color="#60a5fa"
            />
          </div>

          {/* Physical fault breakdown */}
          <div className="flex flex-col gap-3">
            <div className="text-xs font-bold tracking-widest mb-1" style={{ color: '#f97316' }}>DESPACHO PROPUESTO</div>
            {criticalPending.length > 0 && (
              <div className="rounded-lg p-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <div className="text-xs font-bold mb-2" style={{ color: '#ef4444' }}>
                  {criticalPending.length} Sitio{criticalPending.length > 1 ? 's' : ''} crítico{criticalPending.length > 1 ? 's' : ''} sin suministro
                </div>
                {criticalPending.slice(0, 3).map(f => (
                  <div key={f.id} className="flex justify-between text-xs py-0.5" style={{ color: '#94a3b8' }}>
                    <span>{f.criticalSite}</span>
                    {f.batteryMinutes !== undefined && (
                      <span style={{ color: f.batteryMinutes < 60 ? '#ef4444' : '#f97316' }}>
                        batería {f.batteryMinutes} min
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-3">
              <TypeBadge count={transformers.length} label="Transformadores" color="#c084fc" />
              <TypeBadge count={cables.length} label="Cables MT/BT" color="#60a5fa" />
            </div>
            <div className="text-xs leading-relaxed" style={{ color: '#475569' }}>
              La IA asignará brigadas a los fallos de mayor prioridad respetando ventana de tormenta y SLA.
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-7 py-5 border-t" style={{ borderColor: '#1e2d45' }}>
          {role === 'director' ? (
            <div className="flex gap-3">
              <button
                onClick={onApprove}
                className="flex-1 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#15803d,#166534)', color: 'white', border: '1px solid #16a34a', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
                onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
              >
                <span style={{ fontSize: 16 }}>✓</span>
                Aprobar Despacho
              </button>
              <button
                onClick={onReject}
                className="flex-1 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.14)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
              >
                <span style={{ fontSize: 16 }}>✕</span>
                Cancelar Misión
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 py-2">
              <span className="w-4 h-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
              <span className="text-sm font-semibold" style={{ color: '#f59e0b' }}>
                El Director de Operaciones está revisando el plan...
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between items-baseline">
        <span className="text-xs" style={{ color: '#475569' }}>{label}</span>
        <span className="text-sm font-bold font-mono" style={{ color }}>{value}</span>
      </div>
      <span className="text-xs" style={{ color: '#334155' }}>{sub}</span>
    </div>
  );
}

function TypeBadge({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <div className="flex-1 rounded-lg p-2 text-center" style={{ background: 'rgba(15,24,42,0.8)', border: '1px solid #1e2d45' }}>
      <div className="text-xl font-black" style={{ color }}>{count}</div>
      <div className="text-[10px]" style={{ color: '#334155' }}>{label}</div>
    </div>
  );
}
