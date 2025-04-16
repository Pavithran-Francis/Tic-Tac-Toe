import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Board from '../components/Board'
import useSocket from '../hooks/useSocket'

export default function Room() {
  const location = useLocation()
  const navigate = useNavigate()
  const searchParams = new URLSearchParams(location.search)
  
  const roomId = searchParams.get('id')
  const roomName = searchParams.get('name')
  const passcode = searchParams.get('passcode')
  const isCreator = searchParams.get('isCreator') === 'true'
  
  const [board, setBoard] = useState(Array(9).fill(null))
  const [isXNext, setIsXNext] = useState(true)
  const [status, setStatus] = useState('')
  const [players, setPlayers] = useState({
    creator: null,
    opponent: null,
  })
  const [playerId] = useState('player-' + Math.random().toString(36).substr(2, 9))
  const [winner, setWinner] = useState(null)
  
  // Connect to socket
  const socket = useSocket(roomId)
  
  // Initialize room data
  useEffect(() => {
    if (!roomId || !roomName || !passcode) {
      navigate('/')
      return
    }
    
    const fetchRoomData = async () => {
      try {
        const response = await fetch(`https://tic-tac-toe-backend-pavidev.up.railway.app/api/rooms/${roomId}?passcode=${passcode}`)
        
        if (!response.ok) {
          navigate('/')
          return
        }
        
        const roomData = await response.json()
        
        setBoard(roomData.board)
        setIsXNext(roomData.currentPlayer === 'X')
        
        if (isCreator) {
          setPlayers({
            creator: {
              id: playerId,
              symbol: 'X',
            },
            opponent: roomData.players.O ? { id: 'opponent', symbol: 'O' } : null,
          })
          
          setStatus(roomData.players.O ? "Game in progress" : "Waiting for opponent...")
        } else {
          setPlayers({
            creator: {
              id: 'creator',
              symbol: 'X',
            },
            opponent: {
              id: playerId,
              symbol: 'O',
            },
          })
          
          setStatus("Game in progress")
        }
      } catch (error) {
        console.error('Failed to fetch room data:', error)
        navigate('/')
      }
    }
    
    fetchRoomData()
  }, [roomId, roomName, passcode, isCreator, navigate, playerId])
  
  // Handle socket events
  useEffect(() => {
    if (!socket) return
    
    // When a player joins
    socket.on('user-joined', () => {
      if (isCreator) {
        setPlayers(prev => ({
          ...prev,
          opponent: { id: 'opponent', symbol: 'O' }
        }))
        setStatus("Opponent joined! Game in progress")
      }
    })
    
    // When a move is made
    socket.on('move-made', ({ board, currentPlayer }) => {
      setBoard(board)
      setIsXNext(currentPlayer === 'X')
    })
    
    // When a player leaves
    socket.on('user-left', () => {
      if (isCreator) {
        setPlayers(prev => ({
          ...prev,
          opponent: null
        }))
        setStatus("Opponent left. Waiting for new opponent...")
      } else {
        navigate('/')
      }
    })
    
    return () => {
      socket.off('user-joined')
      socket.off('move-made')
      socket.off('user-left')
    }
  }, [socket, isCreator, navigate])
  
  // Calculate winner
  useEffect(() => {
    const calculateWinner = (squares) => {
      const lines = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6],
      ]
      
      for (let i = 0; i < lines.length; i++) {
        const [a, b, c] = lines[i]
        if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
          return squares[a]
        }
      }
      
      return null
    }
    
    const winner = calculateWinner(board)
    
    if (winner) {
      setWinner(winner)
      setStatus(`Winner: ${winner}`)
    } else if (board.every(square => square !== null)) {
      setStatus('Game ended in a draw')
    } else if (players.opponent) {
      setStatus(`Next player: ${isXNext ? 'X' : 'O'}`)
    }
  }, [board, isXNext, players.opponent])
  
  // Handle move
  const handleMove = async (i) => {
    if (winner || board[i] || !players.opponent) return
    
    // Determine if this player can make a move
    const canMove = 
      (isCreator && isXNext) || 
      (!isCreator && !isXNext)
    
    if (!canMove) return
    
    try {
      const response = await fetch(`https://tic-tac-toe-backend-pavidev.up.railway.app/api/rooms/${roomId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          passcode,
          playerId,
          move: i
        }),
      })
      
      if (!response.ok) return
      
      const data = await response.json()
      
      setBoard(data.board)
      setIsXNext(data.currentPlayer === 'X')
      
      // Emit move to other player
      if (socket) {
        socket.emit('make-move', {
          roomId,
          board: data.board,
          currentPlayer: data.currentPlayer
        })
      }
    } catch (error) {
      console.error('Failed to make move:', error)
    }
  }
  
  // Handle exit room
  const handleExit = async () => {
    try {
      await fetch(`https://tic-tac-toe-backend-pavidev.up.railway.app/api/rooms/${roomId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          passcode,
          playerId
        }),
      })
    } catch (error) {
      console.error('Failed to leave room:', error)
    }
    
    navigate('/')
  }
  
  // Handle restart game
  const handleRestart = async () => {
    try {
      const response = await fetch(`https://tic-tac-toe-backend-pavidev.up.railway.app/api/rooms/${roomId}/restart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ passcode }),
      })
      
      if (!response.ok) return
      
      const data = await response.json()
      
      setBoard(data.board)
      setIsXNext(data.currentPlayer === 'X')
      setWinner(null)
      
      if (socket) {
        socket.emit('game-restart', {
          roomId,
          board: data.board,
          currentPlayer: data.currentPlayer
        })
      }
    } catch (error) {
      console.error('Failed to restart game:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Room: {roomName}</h1>
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
            Code: {passcode}
          </span>
        </div>
        
        <div className="mb-6">
          <p className="text-lg font-medium mb-2">{status}</p>
          <div className="flex space-x-4">
            <div className="bg-gray-100 px-3 py-2 rounded-md">
              You: {isCreator ? 'X' : 'O'}
            </div>
            {players.opponent ? (
              <div className="bg-gray-100 px-3 py-2 rounded-md">
                Opponent: {isCreator ? 'O' : 'X'}
              </div>
            ) : (
              <div className="bg-yellow-100 text-yellow-800 px-3 py-2 rounded-md">
                Waiting for opponent...
              </div>
            )}
          </div>
        </div>
        
        <Board board={board} onClick={handleMove} />
        
        <div className="flex space-x-4 mt-6">
          <button
            onClick={handleRestart}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg"
            disabled={!winner && !board.every(square => square !== null)}
          >
            Restart Game
          </button>
          <button
            onClick={handleExit}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg"
          >
            Exit Room
          </button>
        </div>
      </div>
    </div>
  )
}
