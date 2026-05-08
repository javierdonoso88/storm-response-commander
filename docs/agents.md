# Referencia de agentes

Todos los agentes comparten la misma interfaz de entrada/salida y usan el bucle genérico de `agentRunner.ts`. El estado del escenario (`ScenarioState`) se pasa por referencia — las herramientas lo mutan directamente.

Cada agente emite eventos `action` vinculados a su sistema SAP de integración ficticia. Estos eventos alimentan el panel **Acciones SAP** del frontend en tiempo real.

| Agente | Sistema SAP |
|--------|------------|
| Orchestrator | SAP AI Core Orchestration |
| Triage | SAP S/4HANA Asset Management |
| Rerouting | SAP Asset Intelligence Network |
| Priority | SAP Event Mesh + Business Rules |
| Crew-Dispatch | SAP Field Service Management |
| Resource | SAP Integrated Business Planning |
| Comms | SAP Customer Experience |

---

## Orchestrator

**Archivo**: `src/server/engine/orchestrator.ts`

El orquestador es un agente Claude con herramientas que invocan a los demás agentes. No usa `runAgent` sino un bucle propio para poder detectar y ejecutar en paralelo la Fase 1.

**Protocolo**:
```
Fase 1 (paralelo)  : invoke_triage + invoke_rerouting + invoke_priority
Fase 2 (secuencial): invoke_crew_dispatch → invoke_resource → invoke_comms
Cierre             : finalize
```

**Detección de paralelismo**: si todos los `tool_use` del turno pertenecen a `phase1Tools`, se ejecutan con `Promise.all`. En cualquier otro caso, loop secuencial.

**Herramientas**:

| Herramienta | Descripción |
|-------------|-------------|
| `invoke_triage` | Ejecuta el agente Triage |
| `invoke_rerouting` | Ejecuta el agente Rerouting |
| `invoke_priority` | Ejecuta el agente Priority |
| `invoke_crew_dispatch` | Ejecuta el agente Crew-Dispatch |
| `invoke_resource` | Ejecuta el agente Resource |
| `invoke_comms` | Ejecuta el agente Comms |
| `finalize` | Calcula KPIs y emite `kpi` + `done` |

**Eventos `action` emitidos**:
- Al iniciar: `SAP AI Core Orchestration` — incidente registrado con recuento de fallos y clientes
- Al cerrar (`finalize`): `SAP AI Core Orchestration` — ciclo finalizado con KPIs calculados

---

## Triage

**Archivo**: `src/server/engine/agents/triage.ts`  
**Entrada**: lista completa de los 47 fallos (ID, tipo, zona, clientes, sitio crítico, batería)  
**Propósito**: clasificar cada fallo por severidad y riesgo para guiar las fases posteriores

**Herramientas**:

| Herramienta | Parámetros | Efecto |
|-------------|-----------|--------|
| `classify_fault` | `faultId, severity, criticalSite, batteryRisk` | Registra clasificación (read-only) |
| `complete_triage` | `summary, criticalFaultIds[]` | Cierra el agente con resumen ejecutivo |

**Eventos `action` emitidos** (`SAP S/4HANA Asset Management`):
- En `complete_triage`: número de activos analizados y sitios críticos registrados en S/4HANA

**Criterios de clasificación**:
- `critical` — sitio crítico con batería < SLA o < 30 min
- `high` — sitio crítico con batería suficiente, o residencial con > 3.000 clientes
- `medium` — residencial 500–3.000 clientes
- `low` — residencial < 500 clientes

---

## Rerouting

**Archivo**: `src/server/engine/agents/rerouting.ts`  
**Entrada**: fallos conmutables pendientes + límite de operaciones de telecontrol  
**Propósito**: restaurar el máximo de suministro sin enviar brigadas, usando telecontrol remoto

**Herramientas**:

| Herramienta | Parámetros | Efecto en estado |
|-------------|-----------|-----------------|
| `attempt_remote_switch` | `faultId` | `fault.status: fault → switching → restored`, emite `asset_update` ×2 |
| `complete_rerouting` | `summary, smsText` | Cierra agente + emite `comms:sms` |

**Eventos `action` emitidos** (`SAP Asset Intelligence Network`):
- Por cada `attempt_remote_switch` exitosa: conmutación ejecutada con ID de fallo, zona y clientes reconectados

**Restricciones**:
- Solo puede operar `params.switchableFaults` conmutaciones (límite autorizado del día)
- El handler valida el límite y devuelve error si se supera, forzando a Claude a parar

**Efecto observable**: los nodos del mapa cambian de rojo → amarillo (switching) → verde (restored) con un delay de 600ms simulando la latencia de telecontrol.

---

## Priority

**Archivo**: `src/server/engine/agents/priority.ts`  
**Entrada**: fallos físicos (transformadores + cables) pendientes  
**Propósito**: establecer el orden de atención para Crew-Dispatch y emitir alertas regulatorias si procede

**Herramientas**:

| Herramienta | Parámetros | Efecto en estado |
|-------------|-----------|-----------------|
| `set_priority` | `faultId, rank, reason, slaRisk` | Registra orden (read-only) |
| `send_regulatory_alert` | `text` | Emite `comms:regulatory` |
| `complete_prioritization` | `summary` | Cierra agente |

**Eventos `action` emitidos** (`SAP Event Mesh + Business Rules`):
- En `send_regulatory_alert`: alerta publicada en Event Mesh hacia CTEPC/CNMC
- En `complete_prioritization`: reglas de priorización ejecutadas con recuento de fallos rankeados

**Regla de priorización**:
1. Sitios críticos ordenados por batería restante ASC (menor batería = más urgente)
2. Residenciales por clientes afectados DESC
3. Si batería < SLA en algún crítico → `send_regulatory_alert` obligatorio

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

**Ventana de tormenta**: si `storm2Window = T+4h`, Claude debe evitar despachar transformadores con ETA > 210 min (brigada no terminará antes de la segunda tormenta). El sistema prompt lo especifica explícitamente.

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

**Escenario de conflicto** (`limitedParts = 1`): solo hay 1 transformador en inventario para 7 fallos de transformador. Claude debe asignar el transformador al sitio crítico con menos batería y registrar conflicto para los restantes. El `hadConflict` se propaga al agente Comms para que lo mencione en la notificación regulatoria.

---

## Comms

**Archivo**: `src/server/engine/agents/comms.ts`  
**Entrada**: resumen del incidente (restaurados, brigadas, clientes, sitios críticos, `hadConflict`)  
**Propósito**: redactar y emitir 3 comunicaciones obligatorias

**Herramientas**:

| Herramienta | Canal | Restricciones |
|-------------|-------|--------------|
| `send_sms` | SMS masivo a clientes | ≤ 160 chars, debe mencionar "Iberdrola" |
| `send_press_release` | Medios locales (El Punt Avui, Diari de Girona, RAC1) | Puede estar en catalán |
| `send_regulatory` | CTEPC / CNMC | Formal, incluye datos técnicos; si `hadConflict`, debe mencionarlo |
| `complete_comms` | — | Cierra agente |

**Orden obligatorio**: SMS → Nota de prensa → Regulatorio → complete_comms.

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

---

## Estados de un fallo

```
fault → switching → restored      (telecontrol, agente Rerouting)
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
