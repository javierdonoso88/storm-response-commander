import { ActionMessage, CommsMessage } from '../types';

interface Props {
  messages: CommsMessage[];
  actionMessages: ActionMessage[];
}

const CHANNEL_ICON: Record<string, string> = {
  sms: '📱',
  press: '📰',
  regulatory: '📋',
};

const CHANNEL_COLOR: Record<string, string> = {
  sms: 'text-blue-400',
  press: 'text-purple-400',
  regulatory: 'text-amber-400',
};

const CHANNEL_LABEL: Record<string, string> = {
  sms: 'SMS',
  press: 'PRENSA',
  regulatory: 'REGULATORIO',
};

const AGENT_LABEL: Record<string, string> = {
  orchestrator: 'ASSET AND SERVICES ASSISTANT',
  'triage-priority': 'TECHNICIAN BRIEFING AGENT',
  rerouting: 'REMOTE RESTORATION SCADA AGENT',
  'crew-dispatch': 'SERVICE DISPATCHER AGENT',
  resource: 'RESOURCE CAPACITY SHORTAGE AGENT',
  comms: 'COMMUNICATIONS INSIGHT AGENT',
};

const AGENT_COLOR: Record<string, string> = {
  orchestrator: 'text-amber-400',
  'triage-priority': 'text-purple-400',
  rerouting: 'text-green-400',
  'crew-dispatch': 'text-blue-400',
  resource: 'text-yellow-400',
  comms: 'text-pink-400',
};

const AGENT_DOT: Record<string, string> = {
  orchestrator: 'bg-amber-400',
  'triage-priority': 'bg-purple-400',
  rerouting: 'bg-green-400',
  'crew-dispatch': 'bg-blue-400',
  resource: 'bg-yellow-400',
  comms: 'bg-pink-400',
};

function timeAgo(ts: number): string {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m`;
}

export function StatsPanel({ messages, actionMessages }: Props) {
  return (
    <div className="panel-card flex flex-col h-full overflow-hidden">

      {/* ── Actions ── */}
      <div className="panel-header">
        <span className="text-emerald-400">⚙</span>
        ACCIONES SAP
        {actionMessages.length > 0 && (
          <span className="ml-auto text-[12px] bg-emerald-900/40 text-emerald-400 px-1.5 py-0.5 rounded">
            {actionMessages.length}
          </span>
        )}
      </div>
      <div className="overflow-y-auto p-2 flex flex-col gap-1.5" style={{ flex: '1 1 0', minHeight: 0 }}>
        {actionMessages.length === 0 && (
          <div className="text-xs text-slate-600 italic text-center mt-4">
            Las acciones de integración aparecerán aquí
          </div>
        )}
        {actionMessages.map((a, i) => (
          <div key={i} className="bg-[#111c2e] border border-[#1e2d45] rounded px-2 py-1.5 flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${AGENT_DOT[a.agent] ?? 'bg-slate-500'}`} />
              <span className={`text-[11px] font-bold font-mono ${AGENT_COLOR[a.agent] ?? 'text-slate-400'}`}>
                {AGENT_LABEL[a.agent] ?? a.agent.toUpperCase()}
              </span>
              <span className="text-[11px] text-slate-500 truncate ml-1">{a.system}</span>
              <span className="ml-auto text-[11px] text-slate-600 flex-shrink-0">{timeAgo(a.ts)}</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug line-clamp-2 pl-3" title={a.msg}>
              {a.msg}
            </p>
          </div>
        ))}
      </div>

      {/* ── Divider ── */}
      <div className="border-t" style={{ borderColor: '#1e2d45' }} />

      {/* ── Comunicaciones ── */}
      <div className="panel-header">
        <span className="text-cyan-400">◎</span>
        COMUNICACIONES
        {messages.length > 0 && (
          <span className="ml-auto text-[12px] bg-cyan-900/40 text-cyan-400 px-1.5 py-0.5 rounded">
            {messages.length} enviados
          </span>
        )}
      </div>
      <div className="overflow-y-auto p-2 flex flex-col gap-2" style={{ flex: '1 1 0', minHeight: 0 }}>
        {messages.length === 0 && (
          <div className="text-xs text-slate-600 italic text-center mt-4">
            Las comunicaciones aparecerán aquí durante la simulación
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className="bg-[#1a2540] border border-[#1e2d45] rounded p-2 flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{CHANNEL_ICON[msg.channel]}</span>
              <span className={`text-[12px] font-bold font-mono ${CHANNEL_COLOR[msg.channel]}`}>
                {CHANNEL_LABEL[msg.channel]}
              </span>
              <span className="ml-auto text-[12px] text-slate-600">{timeAgo(msg.ts)}</span>
            </div>
            <p className="text-[12px] text-slate-400 leading-snug line-clamp-3" title={msg.msg}>
              {msg.msg}
            </p>
          </div>
        ))}
      </div>

    </div>
  );
}
