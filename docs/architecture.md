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
            │   └── tool_use: invoke_triage_priority + invoke_rerouting
            │       └── Promise.all → 2 agentes en paralelo
            │           ├── runTriagePriority()  → classify_fault × 47, set_priority × N, complete_assessment
            │           └── runRerouting()       → attempt_remote_switch × M, complete_rerouting
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
| `drolius_update` | `{ status, task?, report? }` | Actualiza chip de estado de Drolius en panel lateral; `status` es `'deployed'` (único estado emitido) |
| `safety_tick` | `{ elapsed, limit }` | Actualiza barra de progreso de seguridad |
| `kpi` | `{ sla, safety, efficiency, tiepi, mttr }` | Actualiza métricas finales |
| `done` | `{ elapsed }` | Cierra la simulación |

---

## Modelos

| Componente | Modelo | Razón |
|-----------|--------|-------|
| Orchestrator (Status Update) | `claude-4.6-sonnet` | Razonamiento narrativo visible en el resumen ejecutivo |
| Sub-agentes (Technician Briefing Agent, Remote Restoration Scada Agent, Service Dispatcher Agent, Resource Capacity Shortage Agent, Communications Insight Agent) | `claude-4.5-haiku` | Decisiones estructuradas de tool-use; menor latencia |

El deployment de Haiku se configura con `AICORE_HAIKU_DEPLOYMENT_ID`. Si no se define, ambos roles usan el deployment de Sonnet como fallback.

---



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

El `ScenarioState` (faults, crews, inventory, drolius) se crea en `runOrchestrator` y se pasa por referencia a cada agente. Las herramientas mutan el estado in-place:

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

// crew-dispatch.ts — dispatch_drolius
state.drolius.status = 'deployed';
emit({ type: 'drolius_update', status: 'deployed', task: faultId });
// genera informe instantáneamente (sin delays)
const report = generateReport(fault, mission);
return report;
// Drolius permanece en estado 'deployed' por el resto de la simulación
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

## Sistema de temas (oscuro / Joule)

El header del simulador incluye un desplegable de tema con tres opciones:

| Tema | Fondo | Borde | Acento |
|------|-------|-------|--------|
| Oscuro (default) | `#0d1520` navy | `#1e2d45` | `#22d3ee` cyan |
| SAP Joule | `#f3f5f8` blanco-gris | `#dde3ec` | `#6d28d9` púrpura SAP |
| Iberdrola | `#f2f7f4` verde-claro | `#c8ddd0` | `#00a651` verde Iberdrola |

**Implementación**:

- `ThemeContext.tsx` — React Context que expone `{ theme, setTheme }`. Soporta `Theme = 'dark' | 'joule' | 'iberdrola'`. Persiste en `localStorage('src-theme')` y escribe `data-theme="<tema>"` en `document.documentElement`.
- `globals.css` — variables en `:root` (dark), `[data-theme="joule"]` y `[data-theme="iberdrola"]`. Los dos temas claros comparten la misma estructura de tokens; difieren en el valor de `--accent` y en los matices de fondo (gris-azulado en Joule, verde-claro en Iberdrola). Los componentes detectan "tema claro" con `isLight = theme !== 'dark'`.
- Todos los componentes usan `var(--token)` en sus estilos inline. `MapPanel` y `ParametersPanel` también consumen `useTheme()` para lógica JS que no puede resolverse con CSS vars (URL del tile CartoDB `dark_all` ↔ `light_all`, color del borde de los nodos del mapa, y estilos condicionales del toggle switch).
- Las clases de Tailwind con valores arbitrarios (e.g. `bg-[#111c2e]`) se sobrescriben con selectores `[data-theme="joule"] .bg-\[#111c2e\]` en `globals.css`.

**Toggle switch (`ParametersPanel`):** El knob usa `position: absolute` con `left: 2px` (OFF) / `left: 16px` (ON) y `transition-all` para la animación. Se usa `left` explícito en lugar de `translateX` porque sin `left: 0` de partida, el transform opera desde la posición estática del elemento, que en algunos navegadores no es el borde izquierdo del botón. El estado OFF usa un gris medio (`#c4cdd9` Joule / `#334155` dark) para que el knob blanco sea visible en ambos temas.

**Chips de estado de la simulación (`App.tsx`):** Los colores de fondo/texto de los chips "En ejecución" y "Completado" usan tokens CSS `--status-running-bg/color` y `--status-done-bg/color`, definidos en `:root` (naranja-oscuro / verde-oscuro) y sobreescritos en `[data-theme="joule"]` (naranja-crema / verde-claro).

---

## Resumen Ejecutivo (`ResultsOverlay.tsx`)

Aparece automáticamente 800 ms después de recibir el evento `done`. Puede cerrarse y reabrirse con el botón "Ver Informe" del header hasta que se lance una nueva simulación.

**Secciones:**

| Sección | Fuente de datos |
|---------|----------------|
| KPI gauges circulares (SLA · Seguridad · Eficiencia) | `kpi` state del evento `kpi` |
| Indicadores operativos (clientes, fallos, críticos, pendientes) | `faults` array |
| KPIs de integración SAP (7 sistemas, incluido Drolius) | `actionMessages` + `faults` |
| Análisis del orquestador | `agentLogs.find(l => l.agent === 'orchestrator').text` |
| Acciones pendientes con mitigación | `faults.filter(f => f.status === 'fault')` |

**Limpieza y formateo de texto CoT:** `renderMarkdown()` convierte el texto generado por Claude a JSX con formato visual: encabezados `##`/`###` como etiquetas cian en mayúsculas, `**bold**` en blanco brillante, `*italic*` en slate claro, `` `código` `` con fondo cian oscuro, y listas `- item` como viñetas. Las líneas que empiezan por `**` (negrita) se distinguen correctamente de los bullets (`- ` / `* `) mediante regex precisas (`/^[-*]\s/`) para evitar bucles infinitos durante el render.

**Gauges SVG:** Arco de círculo calculado con `strokeDasharray = (value/100) × 2πr`. El arco vacío usa `var(--border)` y el lleno el color del umbral (verde ≥80, naranja ≥60, rojo <60). `zIndex: 2000` para solapar el mapa Leaflet (z-index máximo ~1000).

**Descarga PDF:** El botón "Descargar PDF" genera un documento HTML completo con fondo blanco en memoria (KPIs, stats operativos, integración SAP, análisis del orquestador, acciones pendientes con mitigación), lo abre en una ventana nueva con `window.open()` y llama a `window.print()` tras 400 ms para dar tiempo al render. Sin dependencias externas — todo el HTML y CSS se genera como string en el cliente.

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

---

## Sistema de internacionalización (ES / EN)

El selector de idioma (🌐 ES/EN) está disponible en la nav de la landing y en el header del simulador. Cambia el idioma de la UI y de todo el contenido generado por los agentes IA.

### Arquitectura

- `LanguageContext.tsx` — React Context que expone `{ lang, setLang }`. Tipo `Lang = 'es' | 'en'`. Persiste en `localStorage('src-lang')`.
- `src/client/i18n/es.ts` y `en.ts` — objetos tipados con ~270 strings organizados por sección (`nav`, `hero`, `params`, `map`, `gantt`, `log`, `panels`, `results`…).
- `src/client/i18n/index.ts` — exporta el hook `useT()` que devuelve el objeto de traducciones del idioma activo.
- Todos los componentes importan `useT()` y referencian strings como `t.params.simulate`, `t.map.header`, etc.

### Idioma en los agentes IA

El idioma se envía en el campo `language` de `SimParams` con cada petición `POST /api/simulate`. El `agentRunner.ts` inyecta automáticamente una instrucción de idioma al principio de **todos** los system prompts:

```
// language === 'en'
IMPORTANT: You must respond entirely in English. All your reasoning,
tool calls, summaries and messages must be written in English.

// language === 'es' (default)
IMPORTANTE: Debes responder completamente en español.
```

Esto garantiza que los logs CoT, acciones SAP, comunicaciones (SMS, prensa, regulatorio) y el resumen ejecutivo del orquestador se generan en el idioma seleccionado.

### Panel de orquestación (GanttPanel)

Rediseñado con layout HTML puro + SVG superpuesto para las flechas. Elimina el uso de `<foreignObject>` en SVG (incompatible con Safari). Los nodos son `div` absolutos con `ResizeObserver` para escalar el diagrama al espacio disponible. Los colores de los conectores se adaptan al tema activo (cyan/púrpura/verde).
