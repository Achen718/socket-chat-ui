import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { useAuthStore } from '@/store';
import { initializeSocket, disconnectSocket, SocketEvents } from '@/lib/socket';

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
}

export const useSocket = (): UseSocketReturn => {
  const user = useAuthStore((state) => state.user);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    if (!user) {
      // Disconnect socket if user logs out
      disconnectSocket();
      setSocket(null);
      setIsConnected(false);
      return;
    }

    // Initialize socket connection
    const socketInstance = initializeSocket(user);
    setSocket(socketInstance);

    // Set up event listeners
    const onConnect = () => {
      setIsConnected(true);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    socketInstance.on(SocketEvents.CONNECT, onConnect);
    socketInstance.on(SocketEvents.DISCONNECT, onDisconnect);

    // Set initial connection state
    setIsConnected(socketInstance.connected);

    // Cleanup function
    return () => {
      socketInstance.off(SocketEvents.CONNECT, onConnect);
      socketInstance.off(SocketEvents.DISCONNECT, onDisconnect);
    };
  }, [user]);

  return { socket, isConnected };
};

export default useSocket;
