import { Fault, Crew, Inventory, ScenarioState, DroliusUnit } from './types';

export const BASE_SCENARIO: ScenarioState = {
  totalClients: 127000,
  inventory: {
    transformers: 2,
    cables: 40,
    mobileGenerators: 1,
  },
  drolius: {
    status: 'available',
  } as DroliusUnit,
  faults: [
    // === SWITCHABLE FAULTS (22) — telecontrol remote operation ===
    { id: 'SW-001', type: 'switchable', zone: 'Girona Nord', affectedClients: 3200, gridPos: { col: 3, row: 1 }, status: 'fault' },
    { id: 'SW-002', type: 'switchable', zone: 'Girona Centre', affectedClients: 2800, gridPos: { col: 4, row: 1 }, status: 'fault' },
    { id: 'SW-003', type: 'switchable', zone: 'Girona Est', affectedClients: 1900, gridPos: { col: 5, row: 1 }, status: 'fault' },
    { id: 'SW-004', type: 'switchable', zone: 'Salt', affectedClients: 4100, gridPos: { col: 3, row: 2 }, status: 'fault' },
    { id: 'SW-005', type: 'switchable', zone: 'Sarrià de Ter', affectedClients: 1200, gridPos: { col: 4, row: 2 }, status: 'fault' },
    { id: 'SW-006', type: 'switchable', zone: 'Celrà', affectedClients: 890, gridPos: { col: 5, row: 2 }, status: 'fault' },
    { id: 'SW-007', type: 'switchable', zone: 'Bordils', affectedClients: 650, gridPos: { col: 6, row: 2 }, status: 'fault' },
    { id: 'SW-008', type: 'switchable', zone: 'Fornells de la Selva', affectedClients: 720, gridPos: { col: 3, row: 3 }, status: 'fault' },
    { id: 'SW-009', type: 'switchable', zone: 'Riudellots', affectedClients: 580, gridPos: { col: 4, row: 3 }, status: 'fault' },
    { id: 'SW-010', type: 'switchable', zone: 'Llambilles', affectedClients: 310, gridPos: { col: 5, row: 3 }, status: 'fault' },
    { id: 'SW-011', type: 'switchable', zone: 'Figueres Sud', affectedClients: 2900, gridPos: { col: 1, row: 1 }, status: 'fault' },
    { id: 'SW-012', type: 'switchable', zone: 'Figueres Nord', affectedClients: 2100, gridPos: { col: 2, row: 1 }, status: 'fault' },
    { id: 'SW-013', type: 'switchable', zone: 'Vilafant', affectedClients: 980, gridPos: { col: 1, row: 2 }, status: 'fault' },
    { id: 'SW-014', type: 'switchable', zone: 'Avinyonet de Puigventós', affectedClients: 420, gridPos: { col: 2, row: 2 }, status: 'fault' },
    { id: 'SW-015', type: 'switchable', zone: 'Olot Centre', affectedClients: 3400, gridPos: { col: 1, row: 3 }, status: 'fault' },
    { id: 'SW-016', type: 'switchable', zone: 'Olot Est', affectedClients: 1800, gridPos: { col: 2, row: 3 }, status: 'fault' },
    { id: 'SW-017', type: 'switchable', zone: 'Banyoles', affectedClients: 2600, gridPos: { col: 3, row: 4 }, status: 'fault' },
    { id: 'SW-018', type: 'switchable', zone: 'Mieres', affectedClients: 740, gridPos: { col: 2, row: 4 }, status: 'fault' },
    { id: 'SW-019', type: 'switchable', zone: 'Lloret de Mar Est', affectedClients: 3800, gridPos: { col: 6, row: 4 }, status: 'fault' },
    { id: 'SW-020', type: 'switchable', zone: 'Lloret de Mar Oest', affectedClients: 2900, gridPos: { col: 7, row: 4 }, status: 'fault' },
    { id: 'SW-021', type: 'switchable', zone: 'Blanes Nord', affectedClients: 4200, gridPos: { col: 6, row: 5 }, status: 'fault' },
    { id: 'SW-022', type: 'switchable', zone: 'Blanes Centre', affectedClients: 3100, gridPos: { col: 7, row: 5 }, status: 'fault' },

    // === TRANSFORMER FAULTS (7) — require physical transformer replacement ===
    {
      id: 'TRF-001', type: 'transformer', zone: 'Hospital Figueres',
      affectedClients: 0, criticalSite: 'Hospital de Figueres', criticalSiteType: 'hospital',
      batteryMinutes: 240, gridPos: { col: 1, row: 0 }, status: 'fault'
    },
    {
      id: 'TRF-002', type: 'transformer', zone: 'CPD Ajuntament Girona',
      affectedClients: 0, criticalSite: 'CPD Ajuntament Girona', criticalSiteType: 'cpd',
      batteryMinutes: 30, gridPos: { col: 4, row: 0 }, status: 'fault'
    },
    {
      id: 'TRF-003', type: 'transformer', zone: 'Centro Diálisis Girona',
      affectedClients: 0, criticalSite: 'Centro de Diálisis Girona', criticalSiteType: 'dialysis',
      batteryMinutes: 60, gridPos: { col: 5, row: 0 }, status: 'fault'
    },
    {
      id: 'TRF-004', type: 'transformer', zone: 'Depuradora Banyoles',
      affectedClients: 0, criticalSite: 'EDAR Banyoles', criticalSiteType: 'water',
      batteryMinutes: 120, gridPos: { col: 3, row: 5 }, status: 'fault'
    },
    {
      id: 'TRF-005', type: 'transformer', zone: 'PAC Olot',
      affectedClients: 0, criticalSite: "Punt d'Atenció Continuada Olot", criticalSiteType: 'hospital',
      batteryMinutes: 480, gridPos: { col: 1, row: 4 }, status: 'fault'
    },
    {
      id: 'TRF-006', type: 'transformer', zone: 'Comissaria Mossos Figueres',
      affectedClients: 0, criticalSite: 'Comissaria Mossos d\'Esquadra Figueres', criticalSiteType: 'emergency',
      batteryMinutes: 180, gridPos: { col: 2, row: 0 }, status: 'fault'
    },
    {
      id: 'TRF-007', type: 'transformer', zone: 'Hospital Santa Caterina',
      affectedClients: 0, criticalSite: 'Hospital Universitari de Santa Caterina', criticalSiteType: 'hospital',
      batteryMinutes: 360, gridPos: { col: 4, row: 5 }, status: 'fault'
    },

    // === CABLE FAULTS (18) — require physical cable repair ===
    { id: 'CAB-001', type: 'cable', zone: 'Girona Sud-1', affectedClients: 2200, gridPos: { col: 6, row: 1 }, status: 'fault' },
    { id: 'CAB-002', type: 'cable', zone: 'Girona Sud-2', affectedClients: 1800, gridPos: { col: 6, row: 0 }, status: 'fault' },
    { id: 'CAB-003', type: 'cable', zone: 'Girona Oest', affectedClients: 3100, gridPos: { col: 3, row: 0 }, status: 'fault' },
    { id: 'CAB-004', type: 'cable', zone: 'Quart', affectedClients: 920, gridPos: { col: 4, row: 4 }, status: 'fault' },
    { id: 'CAB-005', type: 'cable', zone: 'Bescanó', affectedClients: 1400, gridPos: { col: 5, row: 4 }, status: 'fault' },
    { id: 'CAB-006', type: 'cable', zone: 'Sant Gregori', affectedClients: 1100, gridPos: { col: 5, row: 5 }, status: 'fault' },
    { id: 'CAB-007', type: 'cable', zone: 'Cassà de la Selva', affectedClients: 3700, gridPos: { col: 6, row: 3 }, status: 'fault' },
    { id: 'CAB-008', type: 'cable', zone: 'Llagostera', affectedClients: 2900, gridPos: { col: 7, row: 3 }, status: 'fault' },
    { id: 'CAB-009', type: 'cable', zone: 'Santa Coloma de Farners', affectedClients: 4200, gridPos: { col: 7, row: 2 }, status: 'fault' },
    { id: 'CAB-010', type: 'cable', zone: 'Anglès', affectedClients: 2600, gridPos: { col: 7, row: 1 }, status: 'fault' },
    { id: 'CAB-011', type: 'cable', zone: 'Roses', affectedClients: 5100, gridPos: { col: 0, row: 0 }, status: 'fault' },
    { id: 'CAB-012', type: 'cable', zone: 'L\'Escala', affectedClients: 3800, gridPos: { col: 0, row: 1 }, status: 'fault' },
    { id: 'CAB-013', type: 'cable', zone: 'Torroella de Montgrí', affectedClients: 3200, gridPos: { col: 0, row: 2 }, status: 'fault' },
    { id: 'CAB-014', type: 'cable', zone: 'La Bisbal d\'Empordà', affectedClients: 4400, gridPos: { col: 0, row: 3 }, status: 'fault' },
    { id: 'CAB-015', type: 'cable', zone: 'Palafrugell', affectedClients: 5800, gridPos: { col: 0, row: 4 }, status: 'fault' },
    { id: 'CAB-016', type: 'cable', zone: 'Palamós', affectedClients: 6200, gridPos: { col: 0, row: 5 }, status: 'fault' },
    { id: 'CAB-017', type: 'cable', zone: 'Castell-Platja d\'Aro', affectedClients: 4100, gridPos: { col: 7, row: 0 }, status: 'fault' },
    { id: 'CAB-018', type: 'cable', zone: 'Sant Feliu de Guíxols', affectedClients: 5500, gridPos: { col: 7, row: 5 }, status: 'fault' },
  ],
  crews: [
    // BASE GIRONA (7 brigadas)
    { id: 'GIR-01', base: 'Girona', skills: ['A', 'B'], status: 'available' },
    { id: 'GIR-02', base: 'Girona', skills: ['A', 'B'], status: 'available' },
    { id: 'GIR-03', base: 'Girona', skills: ['B', 'C'], status: 'available' },
    { id: 'GIR-04', base: 'Girona', skills: ['B'], status: 'available' },
    { id: 'GIR-05', base: 'Girona', skills: ['B'], status: 'available' },
    { id: 'GIR-06', base: 'Girona', skills: ['A', 'B', 'C'], status: 'available' },
    { id: 'GIR-07', base: 'Girona', skills: ['B', 'C'], status: 'available' },
    // BASE FIGUERES (4 brigadas)
    { id: 'FIG-01', base: 'Figueres', skills: ['A', 'B'], status: 'available' },
    { id: 'FIG-02', base: 'Figueres', skills: ['B'], status: 'available' },
    { id: 'FIG-03', base: 'Figueres', skills: ['B'], status: 'available' },
    { id: 'FIG-04', base: 'Figueres', skills: ['A', 'B', 'C'], status: 'available' },
    // BASE OLOT (3 brigadas)
    { id: 'OLO-01', base: 'Olot', skills: ['A', 'B'], status: 'available' },
    { id: 'OLO-02', base: 'Olot', skills: ['B'], status: 'available' },
    { id: 'OLO-03', base: 'Olot', skills: ['B', 'C'], status: 'available' },
    // BASE BANYOLES (2 brigadas)
    { id: 'BAN-01', base: 'Banyoles', skills: ['A', 'B'], status: 'available' },
    { id: 'BAN-02', base: 'Banyoles', skills: ['B'], status: 'available' },
    // BASE LLORET (3 brigadas)
    { id: 'LLO-01', base: 'Lloret de Mar', skills: ['B', 'C'], status: 'available' },
    { id: 'LLO-02', base: 'Lloret de Mar', skills: ['B'], status: 'available' },
    { id: 'LLO-03', base: 'Lloret de Mar', skills: ['A', 'B'], status: 'available' },
    // BASE BLANES (3 brigadas)
    { id: 'BLA-01', base: 'Blanes', skills: ['B', 'C'], status: 'available' },
    { id: 'BLA-02', base: 'Blanes', skills: ['B'], status: 'available' },
    { id: 'BLA-03', base: 'Blanes', skills: ['A', 'B'], status: 'available' },
  ],
};

export function buildScenario(params: { availableCrews: number; switchableFaults: number; limitedParts: 0 | 1 }): ScenarioState {
  const state: ScenarioState = {
    ...BASE_SCENARIO,
    faults: BASE_SCENARIO.faults.map(f => ({ ...f, status: 'fault' as const })),
    crews: BASE_SCENARIO.crews.slice(0, params.availableCrews).map(c => ({ ...c, status: 'available' as const })),
    inventory: {
      ...BASE_SCENARIO.inventory,
      transformers: params.limitedParts === 1 ? 1 : 2,
    },
    drolius: { status: 'available' },
  };

  // Mark extra switchable faults as non-switchable (set to cable type) if below threshold
  const switchableInScenario = state.faults.filter(f => f.type === 'switchable');
  const toDegrade = switchableInScenario.length - params.switchableFaults;
  if (toDegrade > 0) {
    let degraded = 0;
    for (const fault of state.faults) {
      if (fault.type === 'switchable' && degraded < toDegrade) {
        fault.type = 'cable';
        degraded++;
      }
    }
  }

  return state;
}
