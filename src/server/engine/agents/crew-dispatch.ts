import { SimParams, ScenarioState, AgentResult, SimEvent } from '../types';
import { runAgent, ToolDef } from '../agentRunner';

export async function runCrewDispatch(
  params: SimParams,
  state: ScenarioState,
  emit: (e: SimEvent) => void
): Promise<AgentResult> {
  let summary = 'Despacho de brigadas completado.';
  const dispatches: { crewId: string; faultId: string }[] = [];

  const availableCrews = state.crews.filter(c => c.status === 'available');
  const physicalFaults = state.faults.filter(f =>
    (f.type === 'transformer' || f.type === 'cable') && f.status === 'fault'
  );

  const crewList = availableCrews.map(c =>
    `${c.id} | base:${c.base} | skills:${c.skills.join(',')}`
  ).join('\n');

  const faultList = physicalFaults.map(f =>
    `${f.id} | tipo:${f.type} | zona:${f.zone} | clientes:${f.affectedClients}` +
    (f.criticalSite ? ` | CRÍTICO:${f.criticalSite} (${f.criticalSiteType}) batería:${f.batteryMinutes ?? 'N/A'}min` : '')
  ).join('\n');

  const safetyLimitMin = params.storm2Window === 'T+4h' ? 240
    : params.storm2Window === 'T+6h' ? 360
    : params.storm2Window === 'T+8h' ? 480
    : 9999;

  const tools: ToolDef[] = [
    {
      name: 'dispatch_crew',
      description: 'Despacha una brigada a un fallo físico para reparación.',
      input_schema: {
        type: 'object' as const,
        properties: {
          crewId: { type: 'string', description: 'ID de la brigada (ej: B-01)' },
          faultId: { type: 'string', description: 'ID del fallo físico (ej: TRF-001)' },
          eta: { type: 'number', description: 'ETA estimada en minutos' },
          reason: { type: 'string', description: 'Justificación del despacho' },
        },
        required: ['crewId', 'faultId', 'eta', 'reason'],
      },
      handler: async (input) => {
        const crew = state.crews.find(c => c.id === input.crewId);
        const fault = state.faults.find(f => f.id === input.faultId);
        if (!crew) return `Error: brigada ${input.crewId} no encontrada`;
        if (!fault) return `Error: fallo ${input.faultId} no encontrado`;
        if (crew.status !== 'available') return `Error: brigada ${input.crewId} no disponible (estado: ${crew.status})`;
        if (fault.status !== 'fault') return `Error: fallo ${input.faultId} ya en proceso (estado: ${fault.status})`;
        crew.status = 'busy';
        crew.currentTask = input.faultId as string;
        fault.status = 'crew-en-route';
        dispatches.push({ crewId: crew.id, faultId: fault.id });
        emit({ type: 'asset_update', id: fault.id, status: 'crew-en-route' });
        emit({ type: 'action', agent: 'crew-dispatch', system: 'SAP Field Service Management', msg: `Orden de trabajo creada: ${crew.id} → ${fault.id} (${fault.zone}) — ETA ${input.eta} min` });
        return `OK: ${crew.id} despachado a ${fault.id} — ETA ${input.eta}min. ${fault.affectedClients.toLocaleString()} clientes afectados.`;
      },
    },
    {
      name: 'skip_fault',
      description: 'Marca un fallo como no asignable en este ciclo (sin brigada disponible o ventana insuficiente).',
      input_schema: {
        type: 'object' as const,
        properties: {
          faultId: { type: 'string', description: 'ID del fallo a omitir' },
          reason: { type: 'string', description: 'Motivo por el que no se puede asignar' },
        },
        required: ['faultId', 'reason'],
      },
      handler: async (input) => {
        return `OK: ${input.faultId} registrado sin asignar — ${input.reason}`;
      },
    },
    {
      name: 'complete_dispatch',
      description: 'Finaliza el despacho de brigadas con resumen ejecutivo.',
      input_schema: {
        type: 'object' as const,
        properties: {
          summary: { type: 'string', description: 'Resumen del despacho de brigadas' },
        },
        required: ['summary'],
      },
      handler: async (input) => {
        summary = input.summary as string;
        return 'Despacho finalizado.';
      },
    },
  ];

  await runAgent({
    systemPrompt: `Eres el agente CREW-DISPATCH del sistema de Respuesta a Tormentas de Iberdrola (Girona).
Tu misión: asignar brigadas disponibles a fallos físicos (transformadores y cables).
Reglas:
- Skill A = reparación transformadores | Skill B = reparación cables
- Prioridad: sitios críticos primero, ordenados por batería restante (menor = más urgente)
- Luego: residenciales por clientes afectados (mayor primero)
- Ventana de tormenta: ${params.storm2Window}. Límite seguridad: ${safetyLimitMin}min. Si es T+4h, evita asignar transformadores con ETA > 210min
- Si no hay brigada con el skill necesario disponible, usa skip_fault
Llama a dispatch_crew para cada asignación posible, skip_fault para inasignables, luego complete_dispatch.
Responde en español. Sé operacional y preciso.`,
    userMessage: `BRIGADAS DISPONIBLES (${availableCrews.length} total):
${crewList || 'Ninguna brigada disponible'}

FALLOS FÍSICOS PENDIENTES (${physicalFaults.length} total):
${faultList || 'Ningún fallo físico pendiente'}

SLA: ${params.minuteSLA}min | Ventana tormenta 2: ${params.storm2Window}
Tiempo reparación estimado: transformador 90-180min, cable 60-120min

Asigna brigadas con dispatch_crew, omite inasignables con skip_fault, luego complete_dispatch.${params.instructions?.trim() ? `\n\nINSTRUCCIONES DEL OPERADOR (prioridad máxima — ajusta asignaciones en consecuencia):\n${params.instructions.trim()}` : ''}`,
    tools,
    emit,
    agentId: 'crew-dispatch',
    maxTokens: 8192,
    haiku: true,
  });

  return {
    agentId: 'crew-dispatch',
    summary,
    restoredFaults: [],
    dispatches,
    commsMessages: [],
  };
}
