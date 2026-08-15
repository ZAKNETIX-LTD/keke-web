import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';

import { getStoredToken } from '../api/client';
import { API_URL } from '../lib/types';

function rawToken(stored: string | null) {
  if (!stored) return null;
  return stored.startsWith('Bearer ') ? stored.slice(7) : stored;
}

/** Keeps admin ops data fresh via Socket.io `admin:ops` room. */
export function useAdminRealtime(enabled: boolean) {
  const qc = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const token = rawToken(getStoredToken());
    if (!token) return;

    const socket = io(API_URL, {
      path: '/socket.io',
      auth: { token },
      transports: ['polling', 'websocket'],
      upgrade: true,
      rememberUpgrade: false,
      reconnection: true,
      reconnectionDelay: 1500,
    });
    socketRef.current = socket;

    const bumpOps = () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'trips'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'sos'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'riders'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'notifications'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'payouts'] });
    };

    socket.on('connect', () => {
      socket.emit('admin:ready');
    });

    socket.on('admin:trip', () => {
      bumpOps();
    });

    socket.on('admin:alert', (payload: { type?: string }) => {
      bumpOps();
      if (payload?.type === 'sos') {
        void qc.invalidateQueries({ queryKey: ['admin', 'sos'] });
      }
      if (payload?.type === 'ticket') {
        void qc.invalidateQueries({ queryKey: ['admin', 'tickets'] });
      }
    });

    socket.on('admin:trip-message', (payload: { tripId?: string }) => {
      if (payload?.tripId) {
        void qc.invalidateQueries({
          queryKey: ['admin', 'trip', payload.tripId, 'messages'],
        });
      }
    });

    socket.on('admin:support-message', (payload: { ticketId?: string }) => {
      bumpOps();
      void qc.invalidateQueries({ queryKey: ['admin', 'tickets'] });
      if (payload?.ticketId) {
        void qc.invalidateQueries({
          queryKey: ['admin', 'ticket', payload.ticketId],
        });
      }
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, qc]);
}
