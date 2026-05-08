# Referencia de agentes

Todos los agentes comparten la misma interfaz de entrada/salida y usan el bucle genérico de `agentRunner.ts`. El estado del escenario (`ScenarioState`) se pasa por referencia — las herramientas lo mutan directamente.

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
