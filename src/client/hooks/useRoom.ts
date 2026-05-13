import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { ApprovalSummary, SimEvent, SimParams } from '../types';

export type RoomRole = 'director' | 'observer';

export interface RoomState {
  connected: boolean;
  roomId: string | null;
  roomCode: string | null;
  role: RoomRole | null;
  memberCount: number;
  pendingApproval: ApprovalSummary | null;
  closed: boolean;
  error: string | null;
}

const INITIAL_ROOM_STATE: RoomState = {
  connected: false,
  roomId: null,
  roomCode: null,
  role: null,
  memberCount: 0,
  pendingApproval: null,
  closed: false,
  error: null,
};

export function useRoom(onEvent: (e: SimEvent) => void) {
  const socketRef = useRef<Socket | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const [roomState, setRoomState] = useState<RoomState>(INITIAL_ROOM_STATE);

  useEffect(() => {
    const socket = io({ transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () =>
      setRoomState(prev => ({ ...prev, connected: true }))
    );
    socket.on('disconnect', () =>
      setRoomState(prev => ({ ...prev, connected: false }))
    );

    socket.on('sim_event', (event: SimEvent) => {
      if (event.type === 'pending_approval') {
        setRoomState(prev => ({ ...prev, pendingApproval: event.summary }));
      } else {
        onEventRef.current(event);
      }
    });

    socket.on('member_update', ({ memberCount }: { memberCount: number }) =>
      setRoomState(prev => ({ ...prev, memberCount }))
    );

    socket.on('room_closed', () =>
      setRoomState(prev => ({ ...prev, closed: true, pendingApproval: null }))
    );

    return () => { socket.disconnect(); };
  }, []);

  const createRoom = useCallback(() => {
    socketRef.current?.emit('create_room', (res: { ok: boolean; roomId?: string; code?: string; error?: string }) => {
      if (res.ok && res.roomId && res.code) {
        setRoomState(prev => ({
          ...prev,
          roomId: res.roomId!,
          roomCode: res.code!,
          role: 'director',
          memberCount: 1,
          error: null,
        }));
      }
    });
  }, []);

  const joinRoom = useCallback((code: string) => {
    socketRef.current?.emit('join_room', { code }, (res: { ok: boolean; roomId?: string; code?: string; error?: string }) => {
      if (res.ok && res.roomId && res.code) {
        setRoomState(prev => ({
          ...prev,
          roomId: res.roomId!,
          roomCode: res.code!,
          role: 'observer',
          memberCount: 1,
          error: null,
        }));
      } else {
        setRoomState(prev => ({ ...prev, error: res.error ?? 'Error desconocido' }));
      }
    });
  }, []);

  const startSimulation = useCallback((params: SimParams) => {
    const roomId = socketRef.current ? roomState.roomId : null;
    if (!roomId) return;
    socketRef.current?.emit('start_simulation', { params, roomId });
  }, [roomState.roomId]);

  const resolveApproval = useCallback((approved: boolean) => {
    const roomId = roomState.roomId;
    if (!roomId) return;
    socketRef.current?.emit('resolve_approval', { roomId, approved });
    setRoomState(prev => ({ ...prev, pendingApproval: null }));
  }, [roomState.roomId]);

  const leaveRoom = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setRoomState(INITIAL_ROOM_STATE);
    const socket = io({ transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('connect', () => setRoomState(prev => ({ ...prev, connected: true })));
    socket.on('disconnect', () => setRoomState(prev => ({ ...prev, connected: false })));
    socket.on('sim_event', (event: SimEvent) => {
      if (event.type === 'pending_approval') {
        setRoomState(prev => ({ ...prev, pendingApproval: event.summary }));
      } else {
        onEventRef.current(event);
      }
    });
    socket.on('member_update', ({ memberCount }: { memberCount: number }) =>
      setRoomState(prev => ({ ...prev, memberCount }))
    );
    socket.on('room_closed', () =>
      setRoomState(prev => ({ ...prev, closed: true, pendingApproval: null }))
    );
  }, []);

  return { roomState, createRoom, joinRoom, startSimulation, resolveApproval, leaveRoom };
}
