import { CommsMessage } from '../types';

interface Props {
  messages: CommsMessage[];
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

function timeAgo(ts: number): string {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m`;
}

export function StatsPanel({ messages }: Props) {
  return (
    <div className="panel-card flex flex-col h-full overflow-hidden">
      <div className="panel-header">
        <span className="text-cyan-400">◎</span>
        COMMS FEED
        {messages.length > 0 && (
          <span className="ml-auto text-[10px] bg-cyan-900/40 text-cyan-400 px-1.5 py-0.5 rounded">
            {messages.length} enviados
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2" style={{ minHeight: 0 }}>
        {messages.length === 0 && (
          <div className="text-xs text-slate-600 italic text-center mt-4">
            Las comunicaciones aparecerán aquí durante la simulación
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className="bg-[#1a2540] border border-[#1e2d45] rounded p-2 flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{CHANNEL_ICON[msg.channel]}</span>
              <span className={`text-[10px] font-bold font-mono ${CHANNEL_COLOR[msg.channel]}`}>
                {CHANNEL_LABEL[msg.channel]}
              </span>
              <span className="ml-auto text-[10px] text-slate-600">{timeAgo(msg.ts)}</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-snug line-clamp-3" title={msg.msg}>
              {msg.msg}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
