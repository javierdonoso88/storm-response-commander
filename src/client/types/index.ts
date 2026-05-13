export type AgentId = 'triage-priority' | 'rerouting' | 'crew-dispatch' | 'resource' | 'comms';
export type FaultStatus = 'fault' | 'switching' | 'restored' | 'crew-en-route' | 'repairing' | 'repaired';
export type FaultType = 'switchable' | 'transformer' | 'cable';

export interface SimParams {
  minuteSLA: number;
  switchableFaults: number;
  limitedParts: 0 | 1;
  storm2Window: 'T+4h' | 'T+6h' | 'T+8h' | 'none';
  availableCrews: number;
}

export interface Fault {
  id: string;
  type: FaultType;
  zone: string;
  affectedClients: number;
  criticalSite?: string;
  criticalSiteType?: 'hospital' | 'cpd' | 'dialysis' | 'water' | 'emergency';
  batteryMinutes?: number;
  gridPos: { col: number; row: number };
  status: FaultStatus;
}

export type AgentStatus = 'pending' | 'running' | 'done';

export interface AgentState {
  id: AgentId;
  label: string;
  status: AgentStatus;
  startTime?: string;
  summary?: string;
  progress: number;
}

export interface KPIState {
  sla: number | null;
  safety: number | null;
  efficiency: number | null;
  tiepi: number | null;
  mttr: number | null;
}

export interface CommsMessage {
  channel: 'sms' | 'press' | 'regulatory';
  msg: string;
  ts: number;
}

export interface ConflictEvent {
  winner: AgentId;
  loser: AgentId;
  reason: string;
}

export interface ActionMessage {
  agent: AgentId | 'orchestrator';
  system: string;
  msg: string;
  ts: number;
}

export interface AgentLog {
  agent: AgentId | 'orchestrator';
  label: string;
  text: string;
  complete: boolean;
  startTime?: string;
}

export type SimEvent =
  | { type: 'cot_chunk'; text: string; agent?: AgentId | 'orchestrator' }
  | { type: 'agent_start'; agent: AgentId; t: string }
  | { type: 'agent_done'; agent: AgentId; summary: string }
  | { type: 'asset_update'; id: string; status: FaultStatus }
  | { type: 'comms'; channel: 'sms' | 'press' | 'regulatory'; msg: string }
  | { type: 'safety_tick'; elapsed: number; limit: number }
  | { type: 'kpi'; sla: number; safety: number; efficiency: number; tiepi: number; mttr: number }
  | { type: 'conflict'; winner: AgentId; loser: AgentId; reason: string }
  | { type: 'action'; agent: AgentId | 'orchestrator'; system: string; msg: string }
  | { type: 'done'; elapsed: string };
