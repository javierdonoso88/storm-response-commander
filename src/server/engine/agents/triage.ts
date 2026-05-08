import { SimParams, ScenarioState, AgentResult, SimEvent } from '../types';
import { runAgent, ToolDef } from '../agentRunner';

export async function runTriage(
  params: SimParams,
  state: ScenarioState,
  emit: (e: SimEvent) => void
): Promise<AgentResult> {
  let summary = 'Triage completado.';
  const criticalFaultIds: string[] = [];

  const faultList = state.faults.map(f =>
    `${f.id} | tipo:${f.type} | zona:${f.zone} | clientes:${f.affectedClients}` +
    (f.criticalSite ? ` | CRÍTICO:${f.criticalSite} batería:${f.batteryMinutes ?? 'N/A'}min` : '')
  ).join('\n');

  const tools: ToolDef[] = [
    {
      name: 'classify_fault',
      description: 'Clasifica un fallo individual por severidad y riesgo crítico.',
      input_schema: {
        type: 'object' as const,
        properties: {
          faultId: { type: 'string', description: 'ID del fallo, e.g. TRF-002' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          criticalSite: { type: 'boolean', description: 'Si afecta infraestructura crítica' },
          batteryRisk: { type: 'boolean', description: 'Si la batería puede agotarse antes del SLA' },
        },
        required: ['faultId', 'severity', 'criticalSite', 'batteryRisk'],
      },
      handler: async (input) => {
        const fault = state.faults.find(f => f.id === input.faultId);
        if (!fault) return `Error: fallo ${input.faultId} no encontrado en el escenario`;
        if (input.criticalSite && !criticalFaultIds.includes(input.faultId as string)) {
          criticalFaultIds.push(input.faultId as string);
        }
        return `OK: ${input.faultId} clasificado severidad=${input.severity}`;
      },
    },
    {
      name: 'complete_triage',
      description: 'Finaliza el triage con un resumen ejecutivo.',
      input_schema: {
        type: 'object' as const,
        properties: {
          summary: { type: 'string', description: 'Resumen ejecutivo del triage' },
          criticalFaultIds: { type: 'array', items: { type: 'string' }, description: 'IDs de fallos en sitios críticos' },
        },
        required: ['summary'],
      },
      handler: async (input) => {
        summary = input.summary as string;
        if (Array.isArray(input.criticalFaultIds)) {
          for (const id of input.criticalFaultIds as string[]) {
            if (!criticalFaultIds.includes(id)) criticalFaultIds.push(id);
          }
        }
        emit({ type: 'action', agent: 'triage', system: 'SAP S/4HANA Asset Management', msg: `${state.faults.length} activos analizados — ${criticalFaultIds.length} sitios críticos registrados en S/4HANA` });
        return 'Triage finalizado correctamente.';
      },
    },
  ];

  await runAgent({
    systemPrompt: `Eres el agente TRIAGE del sistema de Respuesta a Tormentas de Iberdrola (Girona).
Tu misión: analizar todos los fallos y clasificarlos por severidad y urgencia.
Considera la batería restante en sitios críticos, el tipo de fallo y los clientes afectados.
Llama a classify_fault para CADA fallo del listado, luego llama a complete_triage.
Sé analítico y operacional. Responde en español.`,
    userMessage: `INFORME DE INCIDENTE — Comarques de Girona
SLA objetivo: ${params.minuteSLA} min | Ventana tormenta 2: ${params.storm2Window}
Piezas limitadas: ${params.limitedParts === 1 ? 'SÍ — solo 1 transformador disponible' : 'NO'}

FALLOS ACTIVOS (${state.faults.length} total):
${faultList}

Clasifica todos los fallos usando classify_fault para cada uno, luego llama a complete_triage con el resumen.`,
    tools,
    emit,
    agentId: 'triage',
    maxTokens: 8192,
  });

  return {
    agentId: 'triage',
    summary,
    restoredFaults: [],
    dispatches: [],
    commsMessages: [],
  };
}
