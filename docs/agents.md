# Referencia de agentes

Todos los agentes comparten la misma interfaz de entrada/salida y usan el bucle genérico de `agentRunner.ts`. El estado del escenario (`ScenarioState`) se pasa por referencia — las herramientas lo mutan directamente.

Cada agente emite eventos `action` vinculados a su sistema SAP de integración. Estos eventos alimentan el panel **Acciones SAP** del frontend en tiempo real. Solo el agente **Communications Insight Agent** puede emitir eventos `comms` (SMS, prensa, regulatorio).

| Agente | ID interno | Sistema SAP |
|--------|-----------|------------|
| Asset and Services Assistant | `orchestrator` | SAP AI Core Orchestration |
| Technician Briefing Agent | `triage-priority` | SAP S/4HANA Asset Management + Event Mesh |
| Remote Restoration Scada Agent | `rerouting` | SAP Asset Intelligence Network |
| Service Dispatcher Agent | `crew-dispatch` | SAP Field Service Management · Drolius · ANYbotics |
| Resource Capacity Shortage Agent | `resource` | SAP Integrated Business Planning |
| Communications Insight Agent | `comms` | SAP Customer Experience |

---

## Orchestrator

**Archivo**: `src/server/engine/orchestrator.ts`

El orquestador es un agente Claude con herramientas que invocan a los demás agentes. No usa `runAgent` sino un bucle propio para poder detectar y ejecutar en paralelo la Fase 1.

**Protocolo**:
```
Fase 1 (paralelo)  : invoke_triage_priority + invoke_rerouting
Fase 2 (secuencial): invoke_crew_dispatch → invoke_resource → invoke_comms
Cierre             : finalize
```

**Detección de paralelismo**: si todos los `tool_use` del turno pertenecen a `phase1Tools = {'invoke_triage_priority', 'invoke_rerouting'}`, se ejecutan con `Promise.all`. En cualquier otro caso, loop secuencial.

**Configuración del modelo**: `max_tokens: 8192` (aumentado desde 4096 para evitar que la Fase 2 se omita cuando Claude genera razonamiento largo tras los resultados de la Fase 1). El system prompt prohíbe explícitamente el análisis extendido entre fases.

**Herramientas**:

| Herramienta | Descripción |
|-------------|-------------|
| `invoke_triage_priority` | Ejecuta el agente Technician Briefing Agent |
| `invoke_rerouting` | Ejecuta el agente Remote Restoration Scada Agent |
| `invoke_crew_dispatch` | Ejecuta el agente Service Dispatcher Agent |
| `invoke_resource` | Ejecuta el agente Resource Capacity Shortage Agent |
| `invoke_comms` | Ejecuta el agente Communications Insight Agent |
| `finalize` | Calcula KPIs (SLA, Seguridad, Eficiencia, TIEPI, MTTR) y emite `kpi` + `done` |

**Eventos `action` emitidos**:
- Al iniciar: `SAP AI Core Orchestration` — incidente registrado con recuento de fallos y clientes
- Al cerrar (`finalize`): `SAP AI Core Orchestration` — ciclo finalizado con KPIs calculados

---

## Technician Briefing Agent

**Archivo**: `src/server/engine/agents/triage-priority.ts`  
**Entrada**: lista completa de los 47 fallos (ID, tipo, zona, clientes, sitio crítico, batería) + lista de fallos físicos  
**Propósito**: clasificar todos los fallos por severidad y rankear los físicos por urgencia para Service Dispatcher Agent

**Etapas internas**:
1. **Triage** — `classify_fault` para cada uno de los 47 fallos
2. **Priority** — `set_priority` para cada fallo físico (transformadores y cables)
3. `complete_assessment` — resumen ejecutivo conjunto

**Herramientas**:

| Herramienta | Parámetros | Efecto |
|-------------|-----------|--------|
| `classify_fault` | `faultId, severity, criticalSite, batteryRisk` | Registra clasificación (read-only) |
| `set_priority` | `faultId, rank, reason, slaRisk` | Registra orden de atención (read-only) |
| `complete_assessment` | `summary` | Cierra el agente con resumen ejecutivo |

**Eventos `action` emitidos** (`SAP S/4HANA Asset Management + Event Mesh`):
- En `complete_assessment`: número de activos analizados, sitios críticos identificados y fallos físicos rankeados

**Criterios de clasificación**:
- `critical` — sitio crítico con batería < SLA o < 30 min
- `high` — sitio crítico con batería suficiente, o residencial con > 3.000 clientes
- `medium` — residencial 500–3.000 clientes
- `low` — residencial < 500 clientes

**Regla de priorización**:
1. Sitios críticos ordenados por batería restante ASC (menor batería = más urgente)
2. Residenciales por clientes afectados DESC

---

## Remote Restoration Scada Agent

**Archivo**: `src/server/engine/agents/rerouting.ts`  
**Entrada**: fallos conmutables pendientes + límite de operaciones de telecontrol  
**Propósito**: restaurar el máximo de suministro sin enviar brigadas, usando telecontrol remoto

**Herramientas**:

| Herramienta | Parámetros | Efecto en estado |
|-------------|-----------|-----------------|
| `attempt_remote_switch` | `faultId` | `fault.status: fault → switching → restored`, emite `asset_update` ×2 |
| `complete_rerouting` | `summary` | Cierra agente con resumen de operaciones |

**Eventos `action` emitidos** (`SAP Asset Intelligence Network`):
- Por cada `attempt_remote_switch` exitosa: conmutación ejecutada con ID de fallo, zona y clientes reconectados

**Restricciones**:
- Solo puede operar `params.switchableFaults` conmutaciones (límite autorizado del día)
- El handler valida el límite y devuelve error si se supera, forzando a Claude a parar

**Efecto observable**: los nodos del mapa cambian de rojo → amarillo (switching) → verde (restored) con un delay de 600ms simulando la latencia de telecontrol.

---

## Service Dispatcher Agent

**Archivo**: `src/server/engine/agents/crew-dispatch.ts`  
**Entrada**: brigadas disponibles + fallos físicos pendientes + ventana de segunda tormenta + estado de Drolius  
**Propósito**: asignar brigadas a fallos, respetando skills y la ventana de seguridad; opcionalmente desplegar Drolius para inspección previa

**Herramientas**:

| Herramienta | Parámetros | Efecto en estado |
|-------------|-----------|-----------------|
| `dispatch_crew` | `crewId, faultId, eta, reason` | `crew.status = 'busy'`, `fault.status = 'crew-en-route'`, emite `asset_update` |
| `dispatch_drolius` | `faultId, mission` | Emite `drolius_update` × 1 (deployed), devuelve informe; Drolius permanece desplegado |
| `skip_fault` | `faultId, reason` | Registra fallo sin asignar (sin efecto en estado) |
| `complete_dispatch` | `summary` | Cierra agente |

**Eventos `action` emitidos** (`SAP Field Service Management`):
- Por cada `dispatch_crew` exitoso: orden de trabajo creada con brigada, fallo, zona y ETA

**Eventos emitidos** (`Drolius · ANYbotics`):
- Despliegue: `Drolius desplegado → <zona> (<faultId>) — misión: <tipo>`

**Misiones Drolius** (`mission`):

| Misión | Información devuelta |
|--------|---------------------|
| `battery_check` | Nivel de batería SAI (BMS directo), temperatura transformador, carga actual, recomendación de urgencia |
| `zone_access` | Condiciones de zona, obstáculos detectados, ajuste de ETA para brigada |
| `damage_assessment` | Tipo de daño, materiales necesarios, nivel de seguridad de zona |

**Comportamiento de Drolius**: solo una misión por simulación. El robot pasa de `available` a `deployed` de forma permanente: emite un único `drolius_update` (deployed) y devuelve el informe instantáneamente sin delays. Permanece en estado `deployed` en la ubicación del fallo por el resto de la simulación. Los informes son deterministas basados en los datos del fallo (no aleatorios) para asegurar coherencia entre simulaciones. Claude recibe el informe como resultado de herramienta y puede ajustar sus decisiones de despacho en consecuencia.

**Skills**:
- Skill **A** → reparación de transformadores
- Skill **B** → reparación de cables
- Skill **C** → operaciones auxiliares

**Ventana de tormenta**: si `storm2Window = T+4h`, Claude debe evitar despachar transformadores con ETA > 210 min. El system prompt lo especifica explícitamente.

---

## Resource Capacity Shortage Agent

**Archivo**: `src/server/engine/agents/resource.ts`  
**Entrada**: fallos con `status: 'crew-en-route'` + inventario actual  
**Propósito**: verificar que hay material suficiente para todas las brigadas desplegadas y registrar conflictos

**Herramientas**:

| Herramienta | Parámetros | Efecto en estado |
|-------------|-----------|-----------------|
| `allocate_resource` | `faultId, resourceType` | Decrementa `inventory[resourceType]` |
| `flag_conflict` | `faultId, reason` | Emite `conflict`, activa `hadConflict = true` |
| `complete_resources` | `summary` | Cierra agente |

**Eventos `action` emitidos** (`SAP Integrated Business Planning`):
- Por cada `allocate_resource`: material reservado en IBP (tipo y fallo destino)
- Por cada `flag_conflict`: solicitud de reposición de material registrada en IBP

**`resourceType`**: `transformer` \| `cable` \| `mobile_generator`

**Escenario de conflicto** (`limitedParts = 1`): solo hay 1 transformador en inventario para 7 fallos de transformador. Claude debe asignar el transformador al sitio crítico con menos batería y registrar conflicto para los restantes. El `hadConflict` se propaga a Communications Insight Agent para que lo mencione en la notificación regulatoria.

---

## Communications Insight Agent

**Archivo**: `src/server/engine/agents/comms.ts`  
**Entrada**: resumen del incidente (restaurados, brigadas, clientes, sitios críticos, `hadConflict`, sitios con batería bajo SLA)  
**Propósito**: redactar y emitir 3 comunicaciones obligatorias. Es el **único agente** autorizado a emitir eventos `comms`.

**Herramientas**:

| Herramienta | Canal | Restricciones |
|-------------|-------|--------------|
| `send_sms` | SMS masivo a clientes | ≤ 160 chars, debe mencionar "Iberdrola" |
| `send_press_release` | Medios locales (El Punt Avui, Diari de Girona, RAC1) | Puede estar en catalán |
| `send_regulatory` | CTEPC / CNMC | Formal, incluye datos técnicos; si `hadConflict` o batería crítica, debe mencionarlo |
| `complete_comms` | — | Cierra agente |

**Orden obligatorio**: SMS → Nota de prensa → Regulatorio → `complete_comms`.

**Contexto enriquecido**: el user message incluye la lista de sitios críticos con batería restante y un flag explícito si alguno está por debajo del SLA objetivo, para que Claude pueda incluir la información correcta en la notificación regulatoria.

**Eventos `action` emitidos** (`SAP Customer Experience`):
- En `send_sms`: SMS masivo enviado vía SAP CX con preview del texto
- En `send_press_release`: nota de prensa publicada hacia medios locales de Girona
- En `send_regulatory`: notificación regulatoria enviada hacia CTEPC/CNMC

---

## Parámetros de simulación (`SimParams`)

| Parámetro | Rango | Descripción |
|-----------|-------|-------------|
| `minuteSLA` | 30–120 | Tiempo máximo de restauración comprometido (min) |
| `switchableFaults` | 5–22 | Operaciones de telecontrol autorizadas para la jornada |
| `limitedParts` | 0 \| 1 | 0 = inventario completo (2 transformadores); 1 = solo 1 disponible |
| `storm2Window` | T+4h \| T+6h \| T+8h \| none | Ventana antes de la segunda tormenta; condiciona las decisiones de Service Dispatcher Agent |
| `availableCrews` | 8–22 | Brigadas activas (subconjunto de las 22 del escenario base) |

El orden de los parámetros en el panel lateral: SLA → Conmutables → Piezas limitadas → Brigadas → Ventana tormenta 2.

Todos los controles incluyen un tooltip informativo accesible al pasar el cursor. Los KPIs muestran `—` hasta que finaliza la simulación.

**KPIs calculados por `finalize`**:

| KPI | Fórmula | Escala |
|-----|---------|--------|
| SLA | % clientes con resolución en curso (telecontrol o brigada) | % (mayor es mejor) |
| Seguridad | % sitios críticos cubiertos | % (mayor es mejor) |
| Eficiencia | % fallos físicos atendidos | % (mayor es mejor) |
| TIEPI | Σ(clientes_i × tiempo_estimado_i) / total_clientes | minutos (menor es mejor) |
| MTTR | Σ(tiempo_estimado fallos atendidos) / total_fallos_atendidos | minutos (menor es mejor) |

Tiempos estimados por estado: restaurado (telecontrol) = 10 min · crew-en-route transformer = 135 min · crew-en-route cable = 90 min · fallo sin atender = 240 min.

---

## Estados de un fallo

```
fault → crew-en-route             (brigada asignada, agente Service Dispatcher Agent)
fault → switching → restored      (telecontrol, agente Remote Restoration Scada Agent)
```

El frontend mapea cada estado a un color en el mapa:

| Estado | Color |
|--------|-------|
| `fault` | Rojo |
| `switching` | Amarillo parpadeando |
| `restored` | Verde |
| `crew-en-route` | Naranja |

> Los estados `repairing` y `repaired` están definidos en `types.ts` para uso futuro pero no se asignan en la simulación actual — las brigadas despachadas permanecen en `crew-en-route` hasta el cierre del ciclo.
