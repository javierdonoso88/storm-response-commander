import { SimParams, ScenarioState, AgentResult, SimEvent } from '../types';
import { runAgent, ToolDef } from '../agentRunner';

export async function runPriority(
  params: SimParams,
  state: ScenarioState,
  emit: (e: SimEvent) => void
): Promise<AgentResult> {
  let summary = 'Priorización completada.';
  const orderedIds: string[] = [];
  const commsMessages: { channel: 'sms' | 'press' | 'regulatory'; msg: string }[] = [];

  const physicalFaults = state.faults.filter(f =>
    (f.type === 'transformer' || f.type === 'cable') && f.status === 'fault'
  );

  const faultList = physicalFaults.map(f =>
    `${f.id} | tipo:${f.type} | zona:${f.zone} | clientes:${f.affectedClients}` +
    (f.criticalSite ? ` | CRÍTICO:${f.criticalSite} (${f.criticalSiteType}) batería:${f.batteryMinutes ?? 'N/A'}min` : '')
  ).join('\n');

  const tools: ToolDef[] = [
    {
      name: 'set_priority',
      description: 'Asigna un rango de prioridad a un fallo físico para el despacho de brigadas.',
      input_schema: {
        type: 'object' as const,
        properties: {
          faultId: { type: 'string', description: 'ID del fallo' },
          rank: { type: 'number', description: 'Número de orden (1 = más urgente)' },
          reason: { type: 'string', description: 'Justificación de la prioridad asignada' },
          slaRisk: { type: 'boolean', description: 'Si existe riesgo de incumplimiento del SLA' },
        },
        required: ['faultId', 'rank', 'reason', 'slaRisk'],
      },
      handler: async (input) => {
        const fault = state.faults.find(f => f.id === input.faultId);
        if (!fault) return `Error: fallo ${input.faultId} no encontrado`;
        if (!orderedIds.includes(input.faultId as string)) {
          orderedIds.push(input.faultId as string);
        }
        return `OK: ${input.faultId} asignado rango ${input.rank}`;
      },
    },
    {
      name: 'send_regulatory_alert',
      description: 'Envía notificación regulatoria urgente al CTEPC/CNMC para sitios críticos con riesgo de batería.',
      input_schema: {
        type: 'object' as const,
        properties: {
          text: { type: 'string', description: 'Texto de la notificación regulatoria' },
        },
        required: ['text'],
      },
      handler: async (input) => {
        const msg = input.text as string;
        commsMessages.push({ channel: 'regulatory', msg });
        emit({ type: 'comms', channel: 'regulatory', msg });
        emit({ type: 'action', agent: 'priority', system: 'SAP Event Mesh + Business Rules', msg: 'Alerta regulatoria publicada en Event Mesh → CTEPC/CNMC' });
        return 'Notificación regulatoria enviada.';
      },
    },
    {
      name: 'complete_prioritization',
      description: 'Finaliza la priorización con el resumen ejecutivo.',
      input_schema: {
        type: 'object' as const,
        properties: {
          summary: { type: 'string', description: 'Resumen de la priorización' },
        },
        required: ['summary'],
      },
      handler: async (input) => {
        summary = input.summary as string;
        emit({ type: 'action', agent: 'priority', system: 'SAP Event Mesh + Business Rules', msg: `Reglas de priorización ejecutadas — ${orderedIds.length} fallos físicos rankeados` });
        return 'Priorización finalizada.';
      },
    },
  ];

  await runAgent({
    systemPrompt: `Eres el agente PRIORITY del sistema de Respuesta a Tormentas de Iberdrola (Girona).
Tu misión: rankear todos los fallos físicos por urgencia para guiar el despacho de brigadas.
Reglas:
- Sitios críticos (hospitales, CPDs, diálisis) con poca batería tienen máxima prioridad
- Ordena por: batería restante ASC (más urgente primero), luego clientes afectados DESC
- Si algún sitio crítico tiene batería < ${params.minuteSLA}min, envía send_regulatory_alert
Llama a set_priority para CADA fallo físico, luego complete_prioritization.
Responde en español. Sé preciso.`,
    userMessage: `FALLOS FÍSICOS A PRIORIZAR (${physicalFaults.length} total):
${faultList}

SLA objetivo: ${params.minuteSLA} min | Ventana: ${params.storm2Window}
Tiempo estimado reparación: transformador 90-180min, cable 60-120min

Asigna prioridad a todos los fallos usando set_priority, luego complete_prioritization.`,
    tools,
    emit,
    agentId: 'priority',
    maxTokens: 8192,
  });

  return {
    agentId: 'priority',
    summary,
    restoredFaults: [],
    dispatches: [],
    commsMessages,
  };
}
