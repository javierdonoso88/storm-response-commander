import Anthropic from '@anthropic-ai/sdk';
import { getAnthropicClient, MODEL } from './anthropicClient';
import { SimParams, ScenarioState, SimEvent, ApprovalSummary } from './types';
import { buildScenario } from './scenario';
import { runTriagePriority } from './agents/triage-priority';
import { runRerouting } from './agents/rerouting';
import { runCrewDispatch } from './agents/crew-dispatch';
import { runResource } from './agents/resource';
import { runComms } from './agents/comms';

function simTime(elapsedMs: number): string {
  const totalSecs = Math.floor(elapsedMs / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `T+${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function buildApprovalSummary(state: ScenarioState, params: SimParams): ApprovalSummary {
  const restored = state.faults.filter(f => f.status === 'restored');
  const physical = state.faults.filter(f => f.status === 'fault' && (f.type === 'transformer' || f.type === 'cable'));
  return {
    restoredByTelecontrol: restored.length,
    restoredClients: restored.reduce((s, f) => s + f.affectedClients, 0),
    physicalFaults: physical.map(f => ({
      id: f.id,
      zone: f.zone,
      type: f.type as 'transformer' | 'cable',
      clients: f.affectedClients,
      criticalSite: f.criticalSite,
      batteryMinutes: f.batteryMinutes,
    })),
    crewsAvailable: params.availableCrews,
  };
}

export async function runOrchestrator(
  params: SimParams,
  emit: (e: SimEvent) => void,
  approvalGate?: (summary: ApprovalSummary) => Promise<boolean>,
): Promise<void> {
  const startTime = Date.now();
  const state: ScenarioState = buildScenario({
    availableCrews: params.availableCrews,
    switchableFaults: params.switchableFaults,
    limitedParts: params.limitedParts,
  });

  emit({ type: 'action', agent: 'orchestrator', system: 'SAP AI Core Orchestration', msg: `Incidente registrado en AI Core — ${state.faults.length} fallos detectados, ${state.totalClients.toLocaleString()} clientes afectados` });

  const safetyLimitMin = params.storm2Window === 'T+4h' ? 240
    : params.storm2Window === 'T+6h' ? 360
    : params.storm2Window === 'T+8h' ? 480
    : 9999;

  let hadConflict = false;
  let orchestratorDone = false;

  const safetyInterval = setInterval(() => {
    emit({ type: 'safety_tick', elapsed: Math.floor((Date.now() - startTime) / 1000), limit: safetyLimitMin * 60 });
  }, 2000);

  const phase1Tools = new Set(['invoke_triage_priority', 'invoke_rerouting']);

  const handlers = new Map<string, () => Promise<string>>();

  handlers.set('invoke_triage_priority', async () => {
    emit({ type: 'agent_start', agent: 'triage-priority', t: simTime(Date.now() - startTime) });
    try {
      const result = await runTriagePriority(params, state, emit);
      emit({ type: 'agent_done', agent: 'triage-priority', summary: result.summary });
      return `Triage & Priority completado: ${result.summary}`;
    } catch (err) {
      const msg = `Error en triage-priority: ${String(err)}`;
      emit({ type: 'agent_done', agent: 'triage-priority', summary: msg });
      return msg;
    }
  });

  handlers.set('invoke_rerouting', async () => {
    emit({ type: 'agent_start', agent: 'rerouting', t: simTime(Date.now() - startTime) });
    try {
      const result = await runRerouting(params, state, emit);
      emit({ type: 'agent_done', agent: 'rerouting', summary: result.summary });
      return `Rerouting completado: ${result.summary}`;
    } catch (err) {
      const msg = `Error en rerouting: ${String(err)}`;
      emit({ type: 'agent_done', agent: 'rerouting', summary: msg });
      return msg;
    }
  });

  handlers.set('invoke_crew_dispatch', async () => {
    if (approvalGate) {
      const summary = buildApprovalSummary(state, params);
      emit({ type: 'pending_approval', summary });
      const approved = await approvalGate(summary);
      if (!approved) {
        emit({ type: 'action', agent: 'orchestrator', system: 'SAP AI Core Orchestration', msg: 'Director de Operaciones canceló el despacho de brigadas — calculando KPIs del estado actual' });
        await handlers.get('finalize')!();
        orchestratorDone = true;
        return 'Despacho rechazado por el Director de Operaciones. Misión finalizada con el estado actual.';
      }
      emit({ type: 'action', agent: 'orchestrator', system: 'SAP AI Core Orchestration', msg: 'Director de Operaciones aprobó el despacho de brigadas — continuando Fase 2' });
    }

    emit({ type: 'agent_start', agent: 'crew-dispatch', t: simTime(Date.now() - startTime) });
    try {
      const result = await runCrewDispatch(params, state, emit);
      emit({ type: 'agent_done', agent: 'crew-dispatch', summary: result.summary });
      return `Crew-dispatch completado: ${result.summary}`;
    } catch (err) {
      const msg = `Error en crew-dispatch: ${String(err)}`;
      emit({ type: 'agent_done', agent: 'crew-dispatch', summary: msg });
      return msg;
    }
  });

  handlers.set('invoke_resource', async () => {
    emit({ type: 'agent_start', agent: 'resource', t: simTime(Date.now() - startTime) });
    try {
      const result = await runResource(params, state, emit);
      hadConflict = result.hadConflict;
      emit({ type: 'agent_done', agent: 'resource', summary: result.summary });
      return `Resource completado: ${result.summary}`;
    } catch (err) {
      const msg = `Error en resource: ${String(err)}`;
      emit({ type: 'agent_done', agent: 'resource', summary: msg });
      return msg;
    }
  });

  handlers.set('invoke_comms', async () => {
    emit({ type: 'agent_start', agent: 'comms', t: simTime(Date.now() - startTime) });
    try {
      const result = await runComms(params, state, hadConflict, emit);
      emit({ type: 'agent_done', agent: 'comms', summary: result.summary });
      return `Comms completado: ${result.summary}`;
    } catch (err) {
      const msg = `Error en comms: ${String(err)}`;
      emit({ type: 'agent_done', agent: 'comms', summary: msg });
      return msg;
    }
  });

  handlers.set('finalize', async () => {
    const addressedFaults = state.faults.filter(f => f.status === 'restored' || f.status === 'crew-en-route');
    const totalAffectedClients = state.faults.reduce((s, f) => s + f.affectedClients, 0);
    const addressedClients = addressedFaults.reduce((s, f) => s + f.affectedClients, 0);
    const criticalFaults = state.faults.filter(f => f.criticalSite);
    const criticalCovered = criticalFaults.filter(f => f.status === 'crew-en-route' || f.status === 'restored');

    const slaScore = totalAffectedClients > 0
      ? Math.min(100, Math.round(addressedClients / totalAffectedClients * 100))
      : 100;
    const safetyScore = criticalFaults.length > 0
      ? Math.round((criticalCovered.length / criticalFaults.length) * 100)
      : 100;
    const efficiencyScore = Math.min(100, Math.round(addressedFaults.length / state.faults.length * 100));

    const estimatedTime = (f: typeof state.faults[0]) => {
      if (f.status === 'restored') return 10;
      if (f.status === 'crew-en-route' || f.status === 'repairing') return f.type === 'transformer' ? 135 : 90;
      return 240;
    };
    const tiepiValue = totalAffectedClients > 0
      ? Math.round(state.faults.reduce((s, f) => s + f.affectedClients * estimatedTime(f), 0) / totalAffectedClients)
      : 0;

    const mttrValue = addressedFaults.length > 0
      ? Math.round(addressedFaults.reduce((s, f) => s + estimatedTime(f), 0) / addressedFaults.length)
      : 0;

    emit({ type: 'kpi', sla: slaScore, safety: safetyScore, efficiency: efficiencyScore, tiepi: tiepiValue, mttr: mttrValue });
    emit({ type: 'action', agent: 'orchestrator', system: 'SAP AI Core Orchestration', msg: `Ciclo cerrado en AI Core — KPIs: SLA ${slaScore}%, Seguridad ${safetyScore}%, Eficiencia ${efficiencyScore}%, TIEPI ${tiepiValue} min, MTTR ${mttrValue} min` });
    emit({ type: 'done', elapsed: simTime(Date.now() - startTime) });
    return `Misión finalizada. KPIs: SLA=${slaScore}%, Seguridad=${safetyScore}%, Eficiencia=${efficiencyScore}%, TIEPI=${tiepiValue}min, MTTR=${mttrValue}min`;
  });

  const sdkTools: Anthropic.Tool[] = [
    {
      name: 'invoke_triage_priority',
      description: 'Ejecuta TRIAGE & PRIORITY: clasifica todos los fallos por severidad y rankea los físicos por urgencia.',
      input_schema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'invoke_rerouting',
      description: 'Ejecuta REMOTE RESTORATION: restaura fallos conmutables por telecontrol remoto.',
      input_schema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'invoke_crew_dispatch',
      description: 'Ejecuta CREW-DISPATCH: asigna brigadas a fallos físicos pendientes.',
      input_schema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'invoke_resource',
      description: 'Ejecuta RESOURCE: gestiona inventario y detecta conflictos de material.',
      input_schema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'invoke_comms',
      description: 'Ejecuta ALERTS & COMMS: redacta y envía SMS, nota de prensa y notificación regulatoria.',
      input_schema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'finalize',
      description: 'Finaliza la misión: calcula KPIs y cierra el ciclo de respuesta.',
      input_schema: { type: 'object', properties: {}, required: [] },
    },
  ];

  const systemPrompt = `Eres el STATUS UPDATE del sistema de Respuesta a Tormentas de Iberdrola (Girona).

PROTOCOLO OBLIGATORIO:
FASE 1 (PARALELA): Llama invoke_triage_priority + invoke_rerouting en el MISMO turno (los dos a la vez). Corren en paralelo.
FASE 2 (SECUENCIAL): Llama invoke_crew_dispatch, luego invoke_resource, luego invoke_comms (en ese orden, uno por turno).
CIERRE: Llama finalize para calcular KPIs y cerrar el ciclo.

Razona brevemente antes de cada fase. Actúa con decisión. Responde en español.`;

  const userMessage = `INCIDENTE ACTIVO — Comarques de Girona — T+00:00

PARÁMETROS:
  SLA objetivo        : ${params.minuteSLA} minutos
  Fallos conmutables  : ${params.switchableFaults}
  Inventario piezas   : ${params.limitedParts === 1 ? 'LIMITADO (1 transformador)' : 'COMPLETO'}
  Ventana tormenta 2  : ${params.storm2Window}
  Brigadas disponibles: ${params.availableCrews}

ESCENARIO:
  Fallos activos      : ${state.faults.length} total
  - Conmutables       : ${state.faults.filter(f => f.type === 'switchable').length}
  - Transformadores   : ${state.faults.filter(f => f.type === 'transformer').length}
  - Cables            : ${state.faults.filter(f => f.type === 'cable').length}
  Sitios críticos     : ${state.faults.filter(f => f.criticalSite).length}
  Clientes afectados  : ${state.totalClients.toLocaleString()}

Inicia el protocolo: llama invoke_triage_priority + invoke_rerouting en el MISMO turno.`;

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userMessage }];

  try {
    for (let turn = 0; turn < 20; turn++) {
      if (orchestratorDone) break;

      const anthropic = await getAnthropicClient();
      const stream = anthropic.messages.stream({
        model: MODEL,
        system: systemPrompt,
        messages,
        tools: sdkTools,
        max_tokens: 4096,
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          emit({ type: 'cot_chunk', text: event.delta.text, agent: 'orchestrator' });
        }
      }

      const finalMsg = await stream.finalMessage();
      messages.push({ role: 'assistant', content: finalMsg.content });

      if (finalMsg.stop_reason === 'end_turn') break;

      const toolBlocks = finalMsg.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
      );
      if (toolBlocks.length === 0) break;

      const isParallelPhase1 = toolBlocks.length > 1 && toolBlocks.every(b => phase1Tools.has(b.name));

      let toolResults: Anthropic.ToolResultBlockParam[];

      if (isParallelPhase1) {
        toolResults = await Promise.all(
          toolBlocks.map(async (block) => {
            const handler = handlers.get(block.name);
            let result: string;
            if (!handler) {
              result = `Error: herramienta desconocida "${block.name}"`;
            } else {
              try {
                result = await handler();
              } catch (err) {
                result = `Error ejecutando ${block.name}: ${String(err)}`;
              }
            }
            return { type: 'tool_result' as const, tool_use_id: block.id, content: result };
          })
        );
      } else {
        toolResults = [];
        for (const block of toolBlocks) {
          if (orchestratorDone) break;
          const handler = handlers.get(block.name);
          let result: string;
          if (!handler) {
            result = `Error: herramienta desconocida "${block.name}"`;
          } else {
            try {
              result = await handler();
            } catch (err) {
              result = `Error ejecutando ${block.name}: ${String(err)}`;
            }
          }
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
        }
      }

      if (orchestratorDone) break;

      messages.push({ role: 'user', content: toolResults });
    }
  } finally {
    clearInterval(safetyInterval);
  }
}
