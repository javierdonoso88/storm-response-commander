import { EventEmitter } from 'events';

export interface Room {
  id: string;
  code: string;
  directorSocket: string;
  observers: Set<string>;
  approvalEmitter: EventEmitter;
  simRunning: boolean;
}

const rooms = new Map<string, Room>();
const codeToId = new Map<string, string>();

function generateCode(): string {
  let code: string;
  do {
    code = Math.random().toString(36).substring(2, 6).toUpperCase();
  } while (codeToId.has(code));
  return code;
}

export function createRoom(socketId: string): Room {
  const code = generateCode();
  const id = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const room: Room = {
    id,
    code,
    directorSocket: socketId,
    observers: new Set(),
    approvalEmitter: new EventEmitter(),
    simRunning: false,
  };
  rooms.set(id, room);
  codeToId.set(code, id);
  return room;
}

export function joinRoom(code: string, socketId: string): Room | null {
  const id = codeToId.get(code.toUpperCase());
  if (!id) return null;
  const room = rooms.get(id);
  if (!room) return null;
  room.observers.add(socketId);
  return room;
}

export function getRoom(id: string): Room | null {
  return rooms.get(id) ?? null;
}

export function getRoomBySocket(socketId: string): Room | null {
  for (const room of rooms.values()) {
    if (room.directorSocket === socketId || room.observers.has(socketId)) {
      return room;
    }
  }
  return null;
}

export function removeSocket(socketId: string): { room: Room; wasDirector: boolean } | null {
  const room = getRoomBySocket(socketId);
  if (!room) return null;
  const wasDirector = room.directorSocket === socketId;
  room.observers.delete(socketId);
  if (wasDirector) {
    rooms.delete(room.id);
    codeToId.delete(room.code);
    room.approvalEmitter.emit('decision', false);
  }
  return { room, wasDirector };
}

export function resolveApproval(roomId: string, approved: boolean): void {
  rooms.get(roomId)?.approvalEmitter.emit('decision', approved);
}

export function waitForApproval(roomId: string, timeoutMs = 300_000): Promise<boolean> {
  return new Promise((resolve) => {
    const room = rooms.get(roomId);
    if (!room) { resolve(false); return; }
    const onDecision = (approved: boolean) => {
      clearTimeout(timer);
      resolve(approved);
    };
    const timer = setTimeout(() => {
      room.approvalEmitter.removeListener('decision', onDecision);
      resolve(false);
    }, timeoutMs);
    room.approvalEmitter.once('decision', onDecision);
  });
}
