import { useEffect, useRef } from 'react';
import { AgentId, AgentLog } from '../types';

interface Props {
  logs: AgentLog[];
  running: boolean;
}

const AGENT_COLORS: Record<AgentId | 'orchestrator', string> = {
  orchestrator:      '#f59e0b',
  'triage-priority': '#a855f7',
  rerouting:         '#3b82f6',
  'crew-dispatch':   '#f97316',
  resource:          '#eab308',
  comms:             '#22c55e',
};

const PHASE1: (AgentId | 'orchestrator')[] = ['triage-priority', 'rerouting'];
const PHASE2: (AgentId | 'orchestrator')[] = ['crew-dispatch', 'resource', 'comms'];

export function LogPanel({ logs, running }: Props) {
  const logMap = new Map<string, AgentLog>();
  for (const l of logs) logMap.set(l.agent, l);

  const orchestratorLog = logMap.get('orchestrator');
  const phase1Logs = PHASE1.map(id => logMap.get(id));
  const phase2Logs = PHASE2.map(id => logMap.get(id));

  const hasPhases = phase1Logs.some(Boolean) || phase2Logs.some(Boolean);
  const hasAny = logMap.size > 0;

  return (
    <div className="panel-card flex flex-col h-full overflow-hidden">
      <div className="panel-header">
        <span className="text-purple-400">◈</span>
        LOG DE AGENTES
        {running && (
          <span className="ml-auto flex items-center gap-1 text-purple-400 text-[12px]">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" /> LIVE
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden p-2 gap-2" style={{ minHeight: 0 }}>
        {!hasAny && (
          <span className="text-xs text-slate-600 italic m-auto">
            Pulsa SIMULAR para ver el razonamiento de los agentes...
          </span>
        )}

        {/* Orchestrator — same height as other sections */}
        {orchestratorLog && (
          <div className="flex flex-col min-h-0" style={{ flex: '1 1 0' }}>
            <div className="text-[13px] text-amber-400 font-bold uppercase tracking-widest mb-1 px-1 flex-shrink-0">
              ── ASSET AND SERVICES ASSISTANT ──────────────
            </div>
            <div className="flex-1 min-h-0">
              <LogBlock log={orchestratorLog} />
            </div>
          </div>
        )}

        {/* Phase 1 — fills remaining space */}
        {phase1Logs.some(Boolean) && (
          <div className="flex flex-col min-h-0" style={{ flex: hasPhases && phase2Logs.some(Boolean) ? '1 1 0' : '1 1 0' }}>
            <div className="text-[13px] text-blue-400 font-bold uppercase tracking-widest mb-1 px-1 flex-shrink-0">
              ── PREPARATION PHASE (PARALLEL) ─────────────
            </div>
            <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
              {PHASE1.map((id, i) => (
                <LogBlock
                  key={id}
                  log={phase1Logs[i] ?? placeholderLog(id)}
                  placeholder={!phase1Logs[i]}
                />
              ))}
            </div>
          </div>
        )}

        {/* Phase 2 — fills remaining space */}
        {phase2Logs.some(Boolean) && (
          <div className="flex flex-col min-h-0" style={{ flex: '1 1 0' }}>
            <div className="text-[13px] text-blue-400 font-bold uppercase tracking-widest mb-1 px-1 flex-shrink-0">
              ── EXECUTION PHASE ────────────────────────────
            </div>
            <div className="grid grid-cols-3 gap-2 flex-1 min-h-0">
              {PHASE2.map((id, i) => (
                <LogBlock
                  key={id}
                  log={phase2Logs[i] ?? placeholderLog(id)}
                  placeholder={!phase2Logs[i]}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function placeholderLog(agent: AgentId | 'orchestrator'): AgentLog {
  return { agent, label: agent.toUpperCase(), text: '', complete: false };
}

function LogBlock({ log, placeholder = false }: {
  log: AgentLog;
  placeholder?: boolean;
}) {
  const textRef = useRef<HTMLPreElement>(null);
  const color = AGENT_COLORS[log.agent] ?? '#94a3b8';

  useEffect(() => {
    if (textRef.current) {
      textRef.current.scrollTop = textRef.current.scrollHeight;
    }
  }, [log.text]);

  return (
    <div
      className="rounded-md border flex flex-col overflow-hidden h-full"
      style={{
        borderColor: `${color}25`,
        backgroundColor: `${color}07`,
        opacity: placeholder ? 0.35 : 1,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-1.5 px-2 py-1 border-b flex-shrink-0"
        style={{ borderColor: `${color}20` }}
      >
        <span
          className="text-[13px] font-bold font-mono px-1.5 py-0.5 rounded"
          style={{ color, backgroundColor: `${color}18` }}
        >
          {log.label}
        </span>
        {!log.complete && !placeholder ? (
          <span
            className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0"
            style={{ backgroundColor: color, animation: 'pulse 1s ease-in-out infinite' }}
          />
        ) : log.complete ? (
          <span className="text-[13px] text-slate-500">✓</span>
        ) : null}
      </div>

      {/* Text — fills remaining block height */}
      <pre
        ref={textRef}
        className="overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words p-1.5"
        style={{
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontSize: '11px',
          lineHeight: 1.55,
          color: placeholder ? '#334155' : '#a5f3fc',
          margin: 0,
          flex: '1 1 0',
          minHeight: 0,
          maxHeight: undefined,
        }}
      >
        {placeholder ? '— pending —' : log.text}
        {!log.complete && !placeholder && (
          <span className="animate-blink" style={{ color }}>▋</span>
        )}
      </pre>
    </div>
  );
}
