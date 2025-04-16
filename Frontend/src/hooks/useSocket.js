import { useEffect, useState } from 'react'
import io from 'socket.io-client'

export default function useSocket(roomId) {
  const [socket, setSocket] = useState(null)
  
  useEffect(() => {
    if (!roomId) return
    
    // Connect to the socket server
    const newSocket = io(import.meta.env.PROD 
      ? 'https://tic-tac-toe-backend-pavidev.vercel.app/' 
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
  
  return socket
}