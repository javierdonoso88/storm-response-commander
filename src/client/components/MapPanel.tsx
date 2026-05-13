import { Fragment, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Fault, FaultStatus } from '../types';
import { FAULT_COORDS, NETWORK_EDGES, MAP_CENTER, MAP_ZOOM } from '../data/mapData';

interface Props {
  faults: Fault[];
}

const STATUS_COLOR: Record<FaultStatus, string> = {
  fault: '#ef4444',
  switching: '#f59e0b',
  restored: '#22c55e',
  'crew-en-route': '#f97316',
  repairing: '#f97316',
  repaired: '#22c55e',
};

const STATUS_LABEL: Record<FaultStatus, string> = {
  fault: 'Avería',
  switching: 'Conmutando…',
  restored: 'Restaurado',
  'crew-en-route': 'Brigada en ruta',
  repairing: 'Reparando',
  repaired: 'Reparado',
};

const TYPE_LABEL: Record<string, string> = {
  switchable: 'Conmutable',
  transformer: 'Transformador',
  cable: 'Cable',
};

function edgeStyle(f1: Fault | undefined, f2: Fault | undefined) {
  const s1 = f1?.status ?? 'fault';
  const s2 = f2?.status ?? 'fault';
  const bothOk = (s: FaultStatus) => s === 'restored' || s === 'repaired';
  const isActive = (s: FaultStatus) => s === 'switching' || s === 'crew-en-route' || s === 'repairing';

  if (bothOk(s1) && bothOk(s2)) return { color: '#22c55e', weight: 2, opacity: 0.55 };
  if (isActive(s1) || isActive(s2)) return { color: '#f97316', weight: 2, opacity: 0.7 };
  return { color: '#1e3a5f', weight: 1.5, opacity: 0.8 };
}

export function MapPanel({ faults }: Props) {
  const faultMap = useMemo(() => {
    const m = new Map<string, Fault>();
    faults.forEach(f => m.set(f.id, f));
    return m;
  }, [faults]);

  const faultCount = faults.filter(f => f.status === 'fault').length;
  const enRouteCount = faults.filter(f => f.status === 'crew-en-route' || f.status === 'repairing').length;
  const switchedCount = faults.filter(f => f.status === 'restored' || f.status === 'repaired').length;

  return (
    <div className="panel-card flex flex-col h-full overflow-hidden">
      <div className="panel-header">
        <span className="text-green-400">◉</span>
        RED ELÉCTRICA — GIRONA
        <div className="ml-auto flex items-center gap-3 text-[12px]">
          <LegendDot color="#ef4444" label={`Avería (${faultCount})`} />
          <LegendDot color="#f97316" label={`Activo (${enRouteCount})`} />
          <LegendDot color="#22c55e" label={`OK (${switchedCount})`} />
        </div>
      </div>
      <div className="flex-1 min-h-0 relative" style={{ height: 0 }}>
        <MapContainer
          center={MAP_CENTER}
          zoom={MAP_ZOOM}
          style={{ height: '100%', width: '100%', background: '#0d1520' }}
          zoomControl={true}
          scrollWheelZoom={true}
          attributionControl={false}
        >
          {/* Dark CartoDB tiles */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={19}
          />

          {/* Network edges */}
          {NETWORK_EDGES.map(([id1, id2]) => {
            const c1 = FAULT_COORDS[id1];
            const c2 = FAULT_COORDS[id2];
            if (!c1 || !c2) return null;
            const f1 = faultMap.get(id1);
            const f2 = faultMap.get(id2);
            const style = edgeStyle(f1, f2);
            return (
              <Polyline
                key={`${id1}-${id2}`}
                positions={[c1, c2]}
                pathOptions={style}
              />
            );
          })}

          {/* Fault nodes */}
          {faults.map(fault => {
            const coords = FAULT_COORDS[fault.id];
            if (!coords) return null;

            const color = STATUS_COLOR[fault.status];
            const isCritical = !!fault.criticalSite;
            const isActive = fault.status === 'switching' || fault.status === 'crew-en-route';
            const radius = isCritical ? 9 : 6;

            return (
              <Fragment key={fault.id}>
                {/* Pulse ring for active faults */}
                {isActive && (
                  <CircleMarker
                    center={coords}
                    radius={radius + 10}
                    interactive={false}
                    pathOptions={{
                      fillColor: color,
                      fillOpacity: 0,
                      color: color,
                      weight: 2,
                      opacity: 0.5,
                      className: 'node-pulse-ring',
                    }}
                  />
                )}
                {/* Critical site outer ring */}
                {isCritical && (
                  <CircleMarker
                    center={coords}
                    radius={radius + 5}
                    interactive={false}
                    pathOptions={{
                      fillColor: 'transparent',
                      fillOpacity: 0,
                      color: color,
                      weight: 1.5,
                      opacity: 0.5,
                      dashArray: '4 3',
                    }}
                  />
                )}
                {/* Main node */}
                <CircleMarker
                  center={coords}
                  radius={radius}
                  pathOptions={{
                    fillColor: color,
                    fillOpacity: 0.92,
                    color: '#0d1520',
                    weight: 1.5,
                  }}
                >
                  <Tooltip
                    direction="top"
                    offset={[0, -radius - 2]}
                    opacity={0.95}
                    className="map-tooltip"
                  >
                    <div style={{ fontSize: 13, lineHeight: 1.5, minWidth: 160 }}>
                      <div style={{ fontWeight: 700, color: color, marginBottom: 2 }}>
                        {fault.id} — {fault.zone}
                      </div>
                      <div style={{ color: '#94a3b8' }}>
                        Tipo: {TYPE_LABEL[fault.type]}
                      </div>
                      {fault.criticalSite && (
                        <div style={{ color: '#f59e0b', fontWeight: 600 }}>
                          ⚠ {fault.criticalSite}
                          {fault.batteryMinutes != null && ` (batería: ${fault.batteryMinutes}min)`}
                        </div>
                      )}
                      {fault.affectedClients > 0 && (
                        <div style={{ color: '#94a3b8' }}>
                          Clientes: {fault.affectedClients.toLocaleString('es-ES')}
                        </div>
                      )}
                      <div style={{ marginTop: 3, fontWeight: 600, color: color }}>
                        {STATUS_LABEL[fault.status]}
                      </div>
                    </div>
                  </Tooltip>
                </CircleMarker>
              </Fragment>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: color }} />
      <span className="text-slate-400">{label}</span>
    </div>
  );
}
