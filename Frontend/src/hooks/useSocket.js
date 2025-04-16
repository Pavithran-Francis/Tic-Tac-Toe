import { useEffect, useState } from 'react'
import io from 'socket.io-client'

export default function useSocket(roomId) {
  const [socket, setSocket] = useState(null)
  
  useEffect(() => {
    if (!roomId) return
    
    // Connect to the socket server
    const newSocket = io(import.meta.env.PROD 
      ? 'https://tic-tac-toe-backend-pavidev.up.railway.app/' 
      : 'http://localhost:3001')

    newSocket.on('connect', () => {
      console.log('Connected to socket server')
      newSocket.emit('join-room', roomId)
    })
    
    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
    })
    
    setSocket(newSocket)
    
    // Clean up on unmount
    return () => {
      if (newSocket) {
        newSocket.emit('leave-room', roomId)
        newSocket.disconnect()
      }
    }
  }, [roomId])

  // Function to make a move via REST API
  const makeMove = async (passcode, playerId, move) => {
    try {
      const response = await fetch(`${import.meta.env.PROD 
        ? 'https://tic-tac-toe-backend-pavidev.up.railway.app' 
        : 'http://localhost:3001'}/api/rooms/${roomId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          passcode,
          playerId,
          move,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to make move');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error making move:', error);
      throw error;
    }
  }

  // Function to restart the game
  const restartGame = async (passcode) => {
    try {
      const response = await fetch(`${import.meta.env.PROD 
        ? 'https://tic-tac-toe-backend-pavidev.up.railway.app' 
        : 'http://localhost:3001'}/api/rooms/${roomId}/restart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          passcode,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to restart game');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error restarting game:', error);
      throw error;
    }
  }

  // Function to leave the room
  const leaveRoom = async (passcode, playerId) => {
    try {
      const response = await fetch(`${import.meta.env.PROD 
        ? 'https://tic-tac-toe-backend-pavidev.up.railway.app' 
        : 'http://localhost:3001'}/api/rooms/${roomId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          passcode,
          playerId,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to leave room');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error leaving room:', error);
      throw error;
    }
  }
  
  return {
    socket,
    makeMove,
    restartGame,
    leaveRoom
  }
}