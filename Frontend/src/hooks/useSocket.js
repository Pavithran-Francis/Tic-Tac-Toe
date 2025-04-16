import { useEffect, useState } from 'react'
import io from 'socket.io-client'

export default function useSocket(roomId) {
  const [socket, setSocket] = useState(null)
  const [connectionError, setConnectionError] = useState(null)
  
  useEffect(() => {
    if (!roomId) return
    
    let newSocket = null;
    const connectSocket = () => {
      // Clean up any existing socket first
      if (newSocket) {
        newSocket.disconnect();
      }
      
      // Connect to the socket server
      newSocket = io(import.meta.env.PROD 
        ? 'https://tic-tac-toe-backend-pavidev.up.railway.app/' 
        : 'http://localhost:3001', {
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          timeout: 10000
        });

      newSocket.on('connect', () => {
        console.log('Connected to socket server', newSocket.id);
        // Join the room
        newSocket.emit('join-room', roomId);
        setConnectionError(null);
      });
      
      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setConnectionError('Could not connect to game server');
      });
      
      newSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        if (reason === 'io server disconnect') {
          // the disconnection was initiated by the server, reconnect manually
          connectSocket();
        }
      });
      
      newSocket.on('reconnect', (attemptNumber) => {
        console.log('Socket reconnected after', attemptNumber, 'attempts');
        newSocket.emit('join-room', roomId);
        setConnectionError(null);
      });
      
      newSocket.on('reconnect_failed', () => {
        console.error('Socket reconnection failed');
        setConnectionError('Lost connection to game server');
      });
      
      setSocket(newSocket);
    };
    
    connectSocket();
    
    // Clean up on unmount
    return () => {
      if (newSocket) {
        console.log('Cleaning up socket');
        newSocket.emit('leave-room', roomId);
        newSocket.disconnect();
      }
    };
  }, [roomId]);
  
  return { socket, connectionError };
}