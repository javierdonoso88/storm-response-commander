// Real GPS coordinates for each fault in Girona province (Spain)
// [lat, lng] — WGS84
export const FAULT_COORDS: Record<string, [number, number]> = {
  // === SWITCHABLE FAULTS (telecontrol) ===
  'SW-001': [42.0010, 2.8120],   // Girona Nord
  'SW-002': [41.9830, 2.8220],   // Girona Centre
  'SW-003': [41.9800, 2.8500],   // Girona Est
  'SW-004': [41.9745, 2.7937],   // Salt
  'SW-005': [41.9967, 2.8395],   // Sarrià de Ter
  'SW-006': [41.9393, 2.8547],   // Celrà
  'SW-007': [41.9605, 2.9070],   // Bordils
  'SW-008': [41.9239, 2.7935],   // Fornells de la Selva
  'SW-009': [41.8970, 2.7940],   // Riudellots de la Selva
  'SW-010': [41.8750, 2.8070],   // Llambilles
  'SW-011': [42.2550, 2.9700],   // Figueres Sud
  'SW-012': [42.2750, 2.9600],   // Figueres Nord
  'SW-013': [42.2880, 2.9620],   // Vilafant
  'SW-014': [42.2370, 2.9350],   // Avinyonet de Puigventós
  'SW-015': [42.1824, 2.4901],   // Olot Centre
  'SW-016': [42.1820, 2.5150],   // Olot Est
  'SW-017': [42.1166, 2.7646],   // Banyoles
  'SW-018': [42.0950, 2.6380],   // Mieres
  'SW-019': [41.7050, 2.8700],   // Lloret de Mar Est
  'SW-020': [41.6984, 2.8300],   // Lloret de Mar Oest
  'SW-021': [41.6820, 2.7946],   // Blanes Nord
  'SW-022': [41.6730, 2.7800],   // Blanes Centre

  // === TRANSFORMER FAULTS ===
  'TRF-001': [42.2678, 2.9615],  // Hospital de Figueres
  'TRF-002': [41.9838, 2.8197],  // CPD Ajuntament Girona
  'TRF-003': [41.9750, 2.8320],  // Centro Diálisis Girona
  'TRF-004': [42.1050, 2.7700],  // EDAR Banyoles
  'TRF-005': [42.1800, 2.4850],  // PAC Olot
  'TRF-006': [42.2700, 2.9550],  // Comissaria Mossos Figueres
  'TRF-007': [41.9860, 2.7820],  // Hospital Santa Caterina (Salt)

  // === CABLE FAULTS ===
  'CAB-001': [41.9610, 2.8340],  // Girona Sud-1
  'CAB-002': [41.9500, 2.8420],  // Girona Sud-2
  'CAB-003': [41.9870, 2.7870],  // Girona Oest
  'CAB-004': [41.9716, 2.7788],  // Quart
  'CAB-005': [41.9557, 2.7437],  // Bescanó
  'CAB-006': [42.0010, 2.7640],  // Sant Gregori
  'CAB-007': [41.8875, 2.8704],  // Cassà de la Selva
  'CAB-008': [41.8274, 2.8920],  // Llagostera
  'CAB-009': [41.8633, 2.6580],  // Santa Coloma de Farners
  'CAB-010': [41.9606, 2.5343],  // Anglès
  'CAB-011': [42.2672, 3.1778],  // Roses
  'CAB-012': [42.1167, 3.1378],  // L'Escala
  'CAB-013': [42.0445, 3.1299],  // Torroella de Montgrí
  'CAB-014': [41.9619, 2.9984],  // La Bisbal d'Empordà
  'CAB-015': [41.9019, 3.1628],  // Palafrugell
  'CAB-016': [41.8459, 3.1299],  // Palamós
  'CAB-017': [41.8128, 3.0603],  // Castell-Platja d'Aro
  'CAB-018': [41.7820, 2.9985],  // Sant Feliu de Guíxols
};

// Network topology edges — pairs of fault IDs connected by MV distribution lines
export const NETWORK_EDGES: [string, string][] = [
  // === Figueres subnetwork ===
  ['TRF-006', 'SW-012'],
  ['TRF-001', 'SW-011'],
  ['TRF-001', 'SW-012'],
  ['SW-011', 'SW-012'],
  ['SW-012', 'SW-013'],
  ['SW-011', 'SW-014'],
  // Figueres → Costa Brava Nord
  ['SW-012', 'CAB-011'],
  ['SW-014', 'CAB-012'],
  ['CAB-011', 'CAB-012'],
  ['CAB-012', 'CAB-013'],

  // === Olot subnetwork ===
  ['TRF-005', 'SW-015'],
  ['SW-015', 'SW-016'],
  ['SW-015', 'CAB-010'],
  ['SW-016', 'SW-018'],
  ['SW-018', 'CAB-010'],
  ['SW-018', 'SW-017'],

  // === Banyoles subnetwork ===
  ['SW-017', 'TRF-004'],
  ['SW-017', 'CAB-006'],
  ['CAB-006', 'SW-001'],

  // === Girona city ===
  ['TRF-002', 'SW-001'],
  ['TRF-002', 'SW-002'],
  ['TRF-003', 'SW-002'],
  ['TRF-003', 'SW-003'],
  ['TRF-007', 'CAB-003'],
  ['TRF-007', 'SW-004'],
  ['SW-001', 'SW-002'],
  ['SW-002', 'SW-003'],
  ['SW-002', 'CAB-003'],
  ['CAB-003', 'SW-004'],
  ['SW-004', 'SW-005'],
  ['SW-005', 'SW-001'],
  ['SW-004', 'CAB-004'],
  ['CAB-004', 'CAB-005'],
  ['CAB-005', 'CAB-009'],
  ['CAB-004', 'SW-008'],

  // Girona → SE / Costa Brava
  ['SW-003', 'SW-006'],
  ['SW-003', 'CAB-001'],
  ['CAB-001', 'CAB-002'],
  ['CAB-002', 'SW-006'],
  ['SW-006', 'SW-007'],
  ['SW-007', 'CAB-013'],
  ['CAB-001', 'SW-008'],

  // La Selva interior
  ['SW-008', 'SW-009'],
  ['SW-009', 'SW-010'],
  ['SW-010', 'CAB-007'],
  ['CAB-007', 'CAB-014'],
  ['CAB-007', 'CAB-008'],
  ['CAB-009', 'CAB-007'],

  // Baix Empordà coast
  ['CAB-013', 'CAB-014'],
  ['CAB-014', 'CAB-015'],
  ['CAB-015', 'CAB-016'],
  ['CAB-016', 'CAB-017'],
  ['CAB-017', 'CAB-018'],
  ['CAB-008', 'CAB-017'],
  ['CAB-008', 'CAB-018'],

  // Lloret / Blanes coast
  ['CAB-008', 'SW-019'],
  ['SW-019', 'SW-020'],
  ['SW-020', 'SW-021'],
  ['SW-021', 'SW-022'],
  ['SW-022', 'CAB-018'],

  // Main backbone Figueres → Girona
  ['SW-014', 'SW-017'],
  ['SW-013', 'SW-001'],
  ['CAB-010', 'CAB-006'],
];

export const MAP_CENTER: [number, number] = [42.02, 2.87];
export const MAP_ZOOM = 9;
