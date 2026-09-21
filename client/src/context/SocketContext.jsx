import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUserIds, setOnlineUserIds] = useState([]);

  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' ? window.location.origin : 'http://localhost:5000');
    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 3
    });

    newSocket.on('connect', () => {
      console.log('[Socket] Connected to server as', user.fullName);
    });

    newSocket.on('connect_error', (err) => {
      // In serverless environments where persistent sockets are disabled, fail gracefully
      console.warn('[Socket] Real-time connection notice:', err.message);
    });

    newSocket.on('presence_update', (data) => {
      if (data.onlineUserIds) {
        setOnlineUserIds(data.onlineUserIds);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, user?.id]);

  const isUserOnline = (userId) => {
    return onlineUserIds.includes(userId);
  };

  return (
    <SocketContext.Provider value={{ socket, onlineUserIds, isUserOnline }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
