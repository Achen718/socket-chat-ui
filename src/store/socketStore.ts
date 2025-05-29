import { create } from 'zustand';
import { Socket } from 'socket.io-client';
import { initializeSocket, disconnectSocket, SocketEvents } from '@/lib/socket';
import { User } from '@/types';

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;

  connect: (user: User) => void;
  disconnect: () => void;
}

export const useSocketStore = create<SocketState>((set) => ({
  socket: null,
  isConnected: false,

  connect: (user) => {
    if (!user) return;

    const socketInstance = initializeSocket(user);

    socketInstance.on(SocketEvents.CONNECT, () => {
      set({ isConnected: true });
    });

    socketInstance.on(SocketEvents.DISCONNECT, () => {
      set({ isConnected: false });
    });

    set({ socket: socketInstance });
  },

  disconnect: () => {
    disconnectSocket();
    set({ socket: null, isConnected: false });
  },
}));
