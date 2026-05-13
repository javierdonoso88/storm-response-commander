# Referencia de agentes

Todos los agentes comparten la misma interfaz de entrada/salida y usan el bucle genérico de `agentRunner.ts`. El estado del escenario (`ScenarioState`) se pasa por referencia — las herramientas lo mutan directamente.

Cada agente emite eventos `action` vinculados a su sistema SAP de integración. Estos eventos alimentan el panel **Acciones SAP** del frontend en tiempo real. Solo el agente **Alerts & Comms** puede emitir eventos `comms` (SMS, prensa, regulatorio).

| Agente | ID interno | Sistema SAP |
|--------|-----------|------------|
| Orchestrator | `orchestrator` | SAP AI Core Orchestration |
| Triage & Priority | `triage-priority` | SAP S/4HANA Asset Management + Event Mesh |
| Remote Restoration | `rerouting` | SAP Asset Intelligence Network |
| Crew-Dispatch | `crew-dispatch` | SAP Field Service Management |
| Resource | `resource` | SAP Integrated Business Planning |
| Alerts & Comms | `comms` | SAP Customer Experience |

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

**Herramientas**:

| Herramienta | Descripción |
|-------------|-------------|
| `invoke_triage_priority` | Ejecuta el agente Triage & Priority |
| `invoke_rerouting` | Ejecuta el agente Remote Restoration |
| `invoke_crew_dispatch` | Ejecuta el agente Crew-Dispatch |
| `invoke_resource` | Ejecuta el agente Resource |
| `invoke_comms` | Ejecuta el agente Alerts & Comms |
| `finalize` | Calcula KPIs (SLA, Seguridad, Eficiencia, TIEPI, MTTR) y emite `kpi` + `done` |

**Eventos `action` emitidos**:
- Al iniciar: `SAP AI Core Orchestration` — incidente registrado con recuento de fallos y clientes
- Al cerrar (`finalize`): `SAP AI Core Orchestration` — ciclo finalizado con KPIs calculados

---

## Triage & Priority

**Archivo**: `src/server/engine/agents/triage-priority.ts`  
**Entrada**: lista completa de los 47 fallos (ID, tipo, zona, clientes, sitio crítico, batería) + lista de fallos físicos  
**Propósito**: clasificar todos los fallos por severidad y rankear los físicos por urgencia para Crew-Dispatch

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

## Remote Restoration

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

## Crew-Dispatch

**Archivo**: `src/server/engine/agents/crew-dispatch.ts`  
**Entrada**: brigadas disponibles + fallos físicos pendientes + ventana de segunda tormenta  
**Propósito**: asignar brigadas a fallos, respetando skills y la ventana de seguridad

**Herramientas**:

| Herramienta | Parámetros | Efecto en estado |
|-------------|-----------|-----------------|
| `dispatch_crew` | `crewId, faultId, eta, reason` | `crew.status = 'busy'`, `fault.status = 'crew-en-route'`, emite `asset_update` |
| `skip_fault` | `faultId, reason` | Registra fallo sin asignar (sin efecto en estado) |
| `complete_dispatch` | `summary` | Cierra agente |

**Eventos `action` emitidos** (`SAP Field Service Management`):
- Por cada `dispatch_crew` exitoso: orden de trabajo creada con brigada, fallo, zona y ETA

**Skills**:
- Skill **A** → reparación de transformadores
- Skill **B** → reparación de cables
- Skill **C** → operaciones auxiliares

**Ventana de tormenta**: si `storm2Window = T+4h`, Claude debe evitar despachar transformadores con ETA > 210 min. El system prompt lo especifica explícitamente.

---

## Resource

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

**Escenario de conflicto** (`limitedParts = 1`): solo hay 1 transformador en inventario para 7 fallos de transformador. Claude debe asignar el transformador al sitio crítico con menos batería y registrar conflicto para los restantes. El `hadConflict` se propaga a Alerts & Comms para que lo mencione en la notificación regulatoria.

---

## Alerts & Comms

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
| `storm2Window` | T+4h \| T+6h \| T+8h \| none | Ventana antes de la segunda tormenta; condiciona las decisiones de Crew-Dispatch |
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
fault → switching → restored      (telecontrol, agente Remote Restoration)
fault → crew-en-route             (brigada asignada, agente Crew-Dispatch)
```

El frontend mapea cada estado a un color en el mapa:

| Estado | Color |
|--------|-------|
| `fault` | Rojo |
| `switching` | Amarillo parpadeando |
| `restored` | Verde |
| `crew-en-route` | Naranja |

> Los estados `repairing` y `repaired` están definidos en `types.ts` para uso futuro pero no se asignan en la simulación actual — las brigadas despachadas permanecen en `crew-en-route` hasta el cierre del ciclo.
