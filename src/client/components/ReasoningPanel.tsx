import { useEffect, useRef } from 'react';

interface Props {
  text: string;
  running: boolean;
}

export function ReasoningPanel({ text, running }: Props) {
  const textareaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [text]);

  return (
    <div className="panel-card flex flex-col h-full overflow-hidden">
      <div className="panel-header">
        <span className="text-purple-400">◈</span>
        CHAIN OF THOUGHT — ORCHESTRATOR
        {running && (
          <span className="ml-auto flex items-center gap-1 text-purple-400">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            LIVE
          </span>
        )}
      </div>
      <div
        ref={textareaRef}
        className="flex-1 overflow-y-auto p-3 cot-text"
        style={{ minHeight: 0 }}
      >
        {text || (
          <span className="text-slate-600 italic">
            Ajusta los parámetros y pulsa SIMULAR para iniciar el análisis multi-agente...
          </span>
        )}
        {running && <span className="animate-blink text-purple-400">▋</span>}
      </div>
    </div>
  );
}
