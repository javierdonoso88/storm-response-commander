# ⚡ Storm-Response Commander

Sistema multi-agente de IA para la simulación de respuesta a incidentes eléctricos por tormenta. Modela la operativa real de Iberdrola en las Comarques de Girona: 47 fallos activos, 22 brigadas, sitios críticos con batería y ventana de segunda tormenta.

**Demo en vivo:** [storm-response-commander.cfapps.eu10.hana.ondemand.com](https://storm-response-commander.cfapps.eu10.hana.ondemand.com)

---

## Qué hace

Al iniciar una simulación, un orquestador Claude coordina 6 agentes especializados que razonan sobre el escenario en tiempo real:

| Fase | Agentes | Modo |
|------|---------|------|
| 1 — Evaluación | Triage · Rerouting · Priority | Paralelo |
| 2 — Ejecución | Crew-Dispatch → Resource → Comms | Secuencial |

Cada agente recibe el estado del escenario, usa herramientas concretas para tomar decisiones (conmutar fallos, despachar brigadas, asignar material, enviar comunicaciones) y emite eventos SSE que actualizan el mapa, los logs y los KPIs en tiempo real.

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│  React Frontend                                                  │
│  MapPanel · LogPanel · GanttPanel · ParametersPanel · StatsPanel│
└────────────────────┬────────────────────────────────────────────┘
                     │  SSE /api/simulate
┌────────────────────▼────────────────────────────────────────────┐
│  Express Server                                                  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Orchestrator (Claude)                                   │    │
│  │  invoke_triage ─┐                                       │    │
│  │  invoke_rerouting ─┤ Promise.all (Fase 1)               │    │
│  │  invoke_priority ─┘                                     │    │
│  │  invoke_crew_dispatch → invoke_resource → invoke_comms  │    │
│  │  finalize                                               │    │
│  └──────────────────────────┬──────────────────────────────┘    │
│                              │ runAgent()                        │
│  ┌───────────┐  ┌──────────┐ │ ┌──────────┐  ┌──────────────┐  │
│  │  Triage   │  │Rerouting │ │ │ Priority │  │Crew-Dispatch │  │
│  └───────────┘  └──────────┘ │ └──────────┘  └──────────────┘  │
│  ┌───────────┐  ┌──────────┐ │                                  │
│  │ Resource  │  │  Comms   │ │                                  │
│  └───────────┘  └──────────┘ │                                  │
│                              │                                  │
│  ┌───────────────────────────▼──────────────────────────────┐   │
│  │  SAP AI Core — Anthropic Claude Sonnet 4.6               │   │
│  │  OAuth2 · /invoke · /invoke-with-response-stream         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

Ver [docs/architecture.md](docs/architecture.md) para el detalle técnico completo.

---

## Escenario base

- **127.000 clientes** — Comarques de Girona
- **47 fallos activos**: 22 conmutables (telecontrol), 7 transformadores, 18 cables
- **7 sitios críticos**: hospitales, CPDs, diálisis, depuradoras, comisarías — con batería limitada
- **22 brigadas** en 6 bases: Girona, Figueres, Olot, Banyoles, Lloret, Blanes
- **Parámetros configurables**: SLA, brigadas disponibles, inventario limitado, ventana de segunda tormenta

---

## Tecnología

| Capa | Stack |
|------|-------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React-Leaflet |
| Backend | Node.js, Express, SSE |
| IA | Anthropic Claude Sonnet 4.6 vía SAP AI Core |
| SDK | `@anthropic-ai/sdk` con adaptador custom para AI Core |
| Deploy | SAP BTP Cloud Foundry (`nodejs_buildpack`) |

---

## Instalación local

**Requisitos**: Node.js ≥ 18, acceso a SAP AI Core

```bash
git clone https://github.com/javierdonoso88/storm-response-commander
cd storm-response-commander
npm install
```

Configura las variables de entorno (opcional — hay valores por defecto para el tenant de demo):

```bash
export AICORE_CLIENT_ID=...
export AICORE_CLIENT_SECRET=...
export AICORE_TOKEN_URL=...
export AICORE_API_URL=...
export AICORE_DEPLOYMENT_ID=...
export AICORE_RESOURCE_GROUP=default
```

Arranca en modo desarrollo:

```bash
npm run dev
# Cliente: http://localhost:5173
# Servidor: http://localhost:3001
```

---

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor + cliente en modo desarrollo (hot reload) |
| `npm run build` | Compila TypeScript + Vite para producción |
| `npm start` | Arranca el servidor de producción |

---

## Despliegue en Cloud Foundry

```bash
cf push
```

El buildpack ejecuta `heroku-postbuild` → `npm run build` automáticamente durante el staging, por lo que no es necesario compilar localmente antes de desplegar.

Variables de entorno en CF:

```bash
cf set-env storm-response-commander AICORE_CLIENT_ID ...
cf set-env storm-response-commander AICORE_CLIENT_SECRET ...
cf set-env storm-response-commander AICORE_TOKEN_URL ...
cf set-env storm-response-commander AICORE_DEPLOYMENT_ID ...
cf restage storm-response-commander
```

---

## Estructura del proyecto

```
src/
├── client/
│   ├── App.tsx                  # Layout principal y orquestación de estado
│   ├── hooks/useSimulation.ts   # Gestión de SSE y estado de simulación
│   ├── components/
│   │   ├── MapPanel.tsx         # Mapa de Girona con nodos de fallo
│   │   ├── LogPanel.tsx         # Logs CoT en tiempo real por agente
│   │   ├── ParametersPanel.tsx  # Controles + KPIs
│   │   ├── GanttPanel.tsx       # Timeline de ejecución de agentes
│   │   └── StatsPanel.tsx       # Feed de comunicaciones
│   └── data/mapData.ts          # Posiciones geográficas
└── server/
    ├── index.ts                 # Express server
    ├── routes/simulation.ts     # Endpoint SSE /api/simulate
    └── engine/
        ├── types.ts             # Tipos: Fault, Crew, SimEvent, SimParams…
        ├── scenario.ts          # Escenario base y buildScenario()
        ├── anthropicClient.ts   # Adaptador SAP AI Core + SSE transformer
        ├── agentRunner.ts       # Bucle genérico de tool-use con streaming
        ├── orchestrator.ts      # Agente orquestador + ejecución paralela Fase 1
        └── agents/
            ├── triage.ts        # Clasificación de fallos
            ├── rerouting.ts     # Conmutación remota
            ├── priority.ts      # Rankeado + alertas regulatorias
            ├── crew-dispatch.ts # Asignación de brigadas
            ├── resource.ts      # Inventario + conflictos de material
            └── comms.ts         # SMS · Prensa · Regulatorio
```

---

## Documentación adicional

- [Arquitectura técnica](docs/architecture.md) — SSE, adaptador AI Core, modelo de streaming
- [Referencia de agentes](docs/agents.md) — Herramientas, prompts y decisiones de cada agente
