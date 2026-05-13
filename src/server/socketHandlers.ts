import { Server, Socket } from 'socket.io';
import { SimParams, SimEvent, ApprovalSummary } from './engine/types';
import { runOrchestrator } from './engine/orchestrator';
import {
  createRoom,
  joinRoom,
  getRoomBySocket,
  removeSocket,
  resolveApproval,
  waitForApproval,
} from './roomManager';

export function setupSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    socket.on('create_room', (callback: (res: object) => void) => {
      const room = createRoom(socket.id);
      socket.join(room.id);
      callback({ ok: true, roomId: room.id, code: room.code });
    });

    socket.on('join_room', ({ code }: { code: string }, callback: (res: object) => void) => {
      const room = joinRoom(code, socket.id);
      if (!room) {
        callback({ ok: false, error: 'Sala no encontrada. Verifica el código.' });
        return;
      }
      socket.join(room.id);
      const memberCount = 1 + room.observers.size;
      io.to(room.id).emit('member_update', { memberCount });
      callback({ ok: true, roomId: room.id, code: room.code });
    });

    socket.on('start_simulation', async ({ params, roomId }: { params: SimParams; roomId: string }) => {
      const room = getRoomBySocket(socket.id);
      if (!room || room.directorSocket !== socket.id || room.simRunning) return;

      room.simRunning = true;

      const emit = (event: SimEvent) => {
        io.to(roomId).emit('sim_event', event);
      };

      const approvalGate = async (summary: ApprovalSummary): Promise<boolean> => {
        return waitForApproval(roomId);
      };

      try {
        await runOrchestrator(params, emit, approvalGate);
      } catch (err) {
        console.error('Room simulation error:', err);
        emit({ type: 'done', elapsed: 'T+error' });
      } finally {
        room.simRunning = false;
      }
    });

    socket.on('resolve_approval', ({ roomId, approved }: { roomId: string; approved: boolean }) => {
      const room = getRoomBySocket(socket.id);
      if (!room || room.directorSocket !== socket.id) return;
      resolveApproval(roomId, approved);
    });

    socket.on('disconnect', () => {
      const result = removeSocket(socket.id);
      if (!result) return;
      const { room, wasDirector } = result;
      if (wasDirector) {
        io.to(room.id).emit('room_closed', { reason: 'El Director de Operaciones se ha desconectado' });
      } else {
        const memberCount = 1 + room.observers.size;
        io.to(room.id).emit('member_update', { memberCount });
      }
    });
  });
}
