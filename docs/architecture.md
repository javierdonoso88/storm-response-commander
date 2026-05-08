# Arquitectura técnica

## Flujo de una simulación

```
Usuario configura parámetros → POST /api/simulate
    └─► runOrchestrator(params, emit)
            │
            ├── buildScenario()          # Genera estado inicial con 47 fallos + 22 brigadas
            ├── setInterval safety_tick  # Ticker de seguridad cada 2s
            │
            ├── [Turno 1] Orchestrator Claude
            │   └── tool_use: invoke_triage + invoke_rerouting + invoke_priority
            │       └── Promise.all → 3 agentes en paralelo
            │           ├── runTriage()        → classify_fault × 47, complete_triage
            │           ├── runRerouting()     → attempt_remote_switch × N, complete_rerouting
            │           └── runPriority()      → set_priority × M, send_regulatory_alert?, complete_prioritization
            │
            ├── [Turno 2] Orchestrator Claude
            │   └── tool_use: invoke_crew_dispatch
            │       └── runCrewDispatch() → dispatch_crew × K, skip_fault × J, complete_dispatch
            │
            ├── [Turno 3] Orchestrator Claude
            │   └── tool_use: invoke_resource
            │       └── runResource() → allocate_resource × L, flag_conflict?, complete_resources
            │
            ├── [Turno 4] Orchestrator Claude
            │   └── tool_use: invoke_comms
            │       └── runComms() → send_sms, send_press_release, send_regulatory, complete_comms
            │
            └── [Turno 5] Orchestrator Claude
                └── tool_use: finalize → emit kpi + done
```

Cada `emit()` se serializa como un evento SSE y se envía al cliente inmediatamente.

---

## SSE — Tipos de eventos

| Tipo | Payload | Acción en cliente |
|------|---------|-------------------|
| `cot_chunk` | `{ text, agent }` | Añade texto al log del agente |
| `agent_start` | `{ agent, t }` | Actualiza Gantt, marca agente activo |
| `agent_done` | `{ agent, summary }` | Cierra bloque en Gantt |
| `asset_update` | `{ id, status }` | Cambia color del nodo en el mapa |
| `comms` | `{ channel, msg }` | Añade mensaje al feed de comunicaciones |
| `action` | `{ agent, system, msg }` | Añade entrada al feed de Acciones SAP |
| `conflict` | `{ winner, loser, reason }` | Muestra alerta de conflicto |
| `safety_tick` | `{ elapsed, limit }` | Actualiza barra de progreso de seguridad |
| `kpi` | `{ sla, safety, efficiency }` | Actualiza métricas finales |
| `done` | `{ elapsed }` | Cierra la simulación |

---

## Adaptador SAP AI Core

El SDK de Anthropic hace llamadas a `/v1/messages`. SAP AI Core expone una API Bedrock-compatible con rutas distintas y formato de cuerpo diferente. El adaptador en `anthropicClient.ts` actúa como middleware transparente:

### Petición no-streaming

```
SDK → POST /v1/messages { model, stream: false, ... }
          │
          ▼ customFetch
- Elimina `model` del body (fijo en el deployment)
- Añade `anthropic_version: "bedrock-2023-05-31"` al body
- Reescribe URL → /invoke
- Reemplaza `x-api-key` por `Authorization: Bearer <token>`
- Añade `AI-Resource-Group: default`
          │
          ▼
AI Core → POST /invoke { anthropic_version, messages, max_tokens, ... }
```

### Petición streaming

```
SDK → POST /v1/messages { stream: true, ... }
          │
          ▼ customFetch
- Detecta `stream: true`, elimina del body
- Reescribe URL → /invoke-with-response-stream
- Mismas transformaciones de headers/body
          │
          ▼
AI Core → POST /invoke-with-response-stream
       ← SSE: data: {"type":"message_start",...}
               data: {"type":"content_block_delta",...}
               ...
          │
          ▼ injectEventLines()
       ← SSE: event: message_start
               data: {"type":"message_start",...}

               event: content_block_delta
               data: {"type":"content_block_delta",...}
               ...
          │
          ▼
SDK recibe SSE con event: lines → procesa normalmente
```

**Por qué hace falta `injectEventLines`**: AI Core (formato Bedrock) envía SSE con solo líneas `data:`, sin línea `event:` previa. El SDK de Anthropic comprueba `sse.event` para saber qué tipo de evento procesar; sin ella, `sse.event === null` y el stream no emite ningún chunk → error "request ended without sending any chunks". El transformer lee el campo `type` del JSON en cada `data:` y añade la línea `event: <type>` correspondiente.

### Token OAuth2

```typescript
// Cache con margen de 60s antes de expiración
if (tokenCache && tokenCache.expiresAt - now > 60_000) {
  return tokenCache.token;
}
// OAuth2 client_credentials hacia el tenant de BTP
POST TOKEN_URL
  Authorization: Basic base64(clientId:clientSecret)
  body: grant_type=client_credentials
```

---

## Bucle genérico de agente (`agentRunner.ts`)

```typescript
messages = [{ role: 'user', content: userMessage }]

for turn in 0..maxTurns:
  stream = anthropic.messages.stream({ system, messages, tools, max_tokens })
  
  for event in stream:
    if content_block_delta.text_delta:
      emit({ type: 'cot_chunk', text, agent: agentId })  // streaming en tiempo real
  
  finalMsg = await stream.finalMessage()
  messages.push({ role: 'assistant', content: finalMsg.content })
  
  if stop_reason == 'end_turn': break
  
  toolResults = []
  for block in finalMsg.content where block.type == 'tool_use':
    result = await handlers[block.name](block.input)
    toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
  
  if toolResults.empty: break
  messages.push({ role: 'user', content: toolResults })
```

Los handlers devuelven strings descriptivos en éxito o `"Error: ..."` en fallo, permitiendo que Claude se autocorrija en el siguiente turno.

---

## Estado compartido via closure

El `ScenarioState` (faults, crews, inventory) se crea en `runOrchestrator` y se pasa por referencia a cada agente. Las herramientas mutan el estado in-place:

```typescript
// rerouting.ts — attempt_remote_switch
fault.status = 'switching';
emit({ type: 'asset_update', id: fault.id, status: 'switching' });
await sleep(600);
fault.status = 'restored';
emit({ type: 'asset_update', id: fault.id, status: 'restored' });

// crew-dispatch.ts — dispatch_crew
crew.status = 'busy';
fault.status = 'crew-en-route';
emit({ type: 'asset_update', id: fault.id, status: 'crew-en-route' });
```

Esto garantiza que cuando `resource.ts` recibe el estado, los fallos ya tienen `status: 'crew-en-route'` asignado por crew-dispatch.

---

## KPIs (calculados en `finalize`)

```
SLA        = clientes_atendidos / clientes_afectados_totales × 100
             (clientes_atendidos = suma de affectedClients de fallos restored o crew-en-route)

Seguridad  = sitios_críticos_cubiertos / sitios_críticos_totales × 100
             (cubierto = status crew-en-route o restored)

Eficiencia = fallos_atendidos / fallos_totales × 100
             (atendido = status restored o crew-en-route)
```

---

## Despliegue en BTP Cloud Foundry

```yaml
# manifest.yml
applications:
- name: storm-response-commander
  memory: 64M
  disk_quota: 512M
  buildpacks: [nodejs_buildpack]
  command: node dist/server/index.js
  env:
    NODE_ENV: production
    NPM_CONFIG_PRODUCTION: false   # necesario para instalar devDependencies (TypeScript, Vite)
```

El script `heroku-postbuild` en `package.json` ejecuta `npm run build` durante el staging de CF, compilando TypeScript y Vite antes de iniciar la app.

```
cf push
  → npm install (incluyendo devDependencies por NPM_CONFIG_PRODUCTION=false)
  → heroku-postbuild → tsc + vite build
  → node dist/server/index.js
```
