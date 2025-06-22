import { useEffect, useState } from 'react'
import io from 'socket.io-client'

export default function useSocket(roomId) {
  const [socket, setSocket] = useState(null)
  const [connectionError, setConnectionError] = useState(null)
  
  useEffect(() => {
    if (!roomId) return
    
    let newSocket = null;
    let hasJoined = false; // Track if we've joined to prevent duplicates
    
    const connectSocket = () => {
      try {
        // Clean up any existing socket first
        if (newSocket) {
          newSocket.disconnect();
        }
        
        // Connect to the socket server with more reliable options
        const serverUrl = import.meta.env.PROD 
          ? 'https://tic-tac-toe-production-0897.up.railway.app' 
          : 'http://localhost:3001';
          
        console.log(`Attempting to connect to socket server at: ${serverUrl}`);
        
        newSocket = io(serverUrl, {
          reconnectionAttempts: 10,
          reconnectionDelay: 2000,
          timeout: 20000,
          transports: ['websocket', 'polling'], // Try both transports
          upgrade: true,
          forceNew: true, // Force a new connection each time
          query: { roomId }, // Pass roomId as a query parameter
          withCredentials: true // Include credentials
        });

        newSocket.on('connect', () => {
          console.log('Successfully connected to socket server', newSocket.id);
          // Only join the room if we haven't already joined
          if (!hasJoined) {
            console.log(`Joining room: ${roomId}`);
            newSocket.emit('join-room', roomId);
            hasJoined = true;
          }
          setConnectionError(null);
        });
        
        newSocket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          setConnectionError(`Unable to connect to game server: ${error.message}`);
        });
        
        newSocket.on('disconnect', (reason) => {
          console.log('Socket disconnected:', reason);
          hasJoined = false; // Reset hasJoined so we can join again after reconnection
          
          if (reason === 'io server disconnect' || reason === 'transport close') {
            // the disconnection was initiated by the server or transport was closed, reconnect manually
            console.log('Attempting to reconnect...');
            setTimeout(connectSocket, 3000);
          }
        });
        
        newSocket.on('reconnect', (attemptNumber) => {
          console.log('Socket reconnected after', attemptNumber, 'attempts');
          // Re-join the room after reconnection
          if (!hasJoined) {
            console.log(`Re-joining room: ${roomId}`);
            newSocket.emit('join-room', roomId);
            hasJoined = true;
          }
          setConnectionError(null);
        });
        
        newSocket.on('reconnect_failed', () => {
          console.error('Socket reconnection failed after multiple attempts');
          setConnectionError('Lost connection to game server. Please refresh the page.');
        });
        
        newSocket.on('reconnect_attempt', (attemptNumber) => {
          console.log(`Reconnection attempt #${attemptNumber}`);
        });
        
        newSocket.on('error', (error) => {
          console.error('Socket error:', error);
          setConnectionError(`Connection error: ${error.message}`);
        });
        
        setSocket(newSocket);
      } catch (error) {
        console.error('Error setting up socket connection:', error);
        setConnectionError(`Failed to set up connection: ${error.message}`);
      }
    };
    
    connectSocket();
    
    // Clean up on unmount
    return () => {
      if (newSocket) {
        console.log('Cleaning up socket connection');
        try {
          if (newSocket.connected) {
            newSocket.emit('leave-room', roomId);
          }
          newSocket.disconnect();
          hasJoined = false;
        } catch (error) {
          console.error('Error during socket cleanup:', error);
        }
      }
    };
  }, [roomId]);
  
  return { socket, connectionError };
}