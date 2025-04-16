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
  const urlPlayerId = searchParams.get('playerId')
  
  const [board, setBoard] = useState(Array(9).fill(null))
  const [isXNext, setIsXNext] = useState(true)
  const [status, setStatus] = useState('')
  const [players, setPlayers] = useState({
    creator: null,
    opponent: null,
  })
  // Get playerId from URL or localStorage, or generate a new one
  const [playerId] = useState(() => {
    return urlPlayerId || 
           localStorage.getItem('ticTacToePlayerId') || 
           'player-' + Date.now().toString(16) + Math.random().toString(16).slice(2)
  })
  const [playerSymbol, setPlayerSymbol] = useState(null)
  const [winner, setWinner] = useState(null)
  const [gameOver, setGameOver] = useState(false)
  const [error, setError] = useState(null)
  
  // Connect to socket
  const socket = useSocket(roomId)
  
  // Initialize room data
  useEffect(() => {
    if (!roomId || !roomName || !passcode) {
      navigate('/')
      return
    }
    
    // Save playerId to localStorage for persistence
    localStorage.setItem('ticTacToePlayerId', playerId)
    
    const fetchRoomData = async () => {
      try {
        const response = await fetch(`https://tic-tac-toe-backend-pavidev.up.railway.app/api/rooms/${roomId}?passcode=${passcode}`)
        
        if (!response.ok) {
          console.error('Failed to fetch room data:', response.status)
          setError('Failed to fetch room data')
          return
        }
        
        const roomData = await response.json()
        
        setBoard(roomData.board)
        setIsXNext(roomData.currentPlayer === 'X')
        
        if (roomData.winner) {
          setWinner(roomData.winner)
          setGameOver(true)
          setStatus(`Winner: ${roomData.winner}`)
        } else if (roomData.board.every(square => square !== null)) {
          setGameOver(true)
          setStatus('Game ended in a draw')
        }
        
        // If player is already in the room, set their symbol
        if (roomData.players.X === playerId) {
          setPlayerSymbol('X')
        } else if (roomData.players.O === playerId) {
          setPlayerSymbol('O')
        } else {
          // Player is not in the room, try to join
          try {
            const joinResponse = await fetch(`https://tic-tac-toe-backend-pavidev.up.railway.app/api/rooms/${roomId}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                passcode,
                playerId
              }),
            })
            
            if (!joinResponse.ok) {
              const joinData = await joinResponse.json()
              console.error('Failed to join room:', joinData)
              setError(joinData.error || 'Failed to join room')
              return
            }
            
            const joinData = await joinResponse.json()
            setPlayerSymbol(joinData.symbol)
            
          } catch (error) {
            console.error('Error joining room:', error)
            setError('Failed to join room')
          }
        }
        
        // Setup players display
        setPlayers({
          creator: {
            id: roomData.players.X || 'creator',
            symbol: 'X',
          },
          opponent: roomData.players.O ? { 
            id: roomData.players.O, 
            symbol: 'O' 
          } : null,
        })
        
        if (!roomData.players.O) {
          setStatus("Waiting for opponent...")
        } else if (winner) {
          setStatus(`Winner: ${winner}`)
        } else if (roomData.board.every(square => square !== null)) {
          setStatus('Game ended in a draw')
        } else {
          setStatus(`Next player: ${roomData.currentPlayer}`)
        }
        
      } catch (error) {
        console.error('Failed to fetch room data:', error)
        setError('Failed to connect to server')
      }
    }
    
    fetchRoomData()
    
    // Poll for room updates every 3 seconds
    const intervalId = setInterval(fetchRoomData, 3000)
    
    return () => clearInterval(intervalId)
  }, [roomId, roomName, passcode, playerId, navigate])
  
  // Handle socket events
  useEffect(() => {
    if (!socket) return
    
    // When a player joins
    socket.on('user-joined', () => {
      console.log('User joined')
      // Refresh the room data when someone joins
      fetch(`https://tic-tac-toe-backend-pavidev.up.railway.app/api/rooms/${roomId}?passcode=${passcode}`)
        .then(res => res.json())
        .then(roomData => {
          setPlayers({
            creator: {
              id: roomData.players.X || 'creator',
              symbol: 'X',
            },
            opponent: roomData.players.O ? { 
              id: roomData.players.O, 
              symbol: 'O' 
            } : null,
          })
          
          if (roomData.players.O) {
            setStatus("Game in progress")
          }
        })
        .catch(err => console.error('Error fetching after user joined:', err))
    })
    
    // When a move is made
    socket.on('move-made', ({ board, currentPlayer, winner, gameOver }) => {
      console.log('Move made:', { board, currentPlayer, winner, gameOver })
      setBoard(board)
      setIsXNext(currentPlayer === 'X')
      
      if (winner) {
        setWinner(winner)
        setGameOver(true)
        setStatus(`Winner: ${winner}`)
      } else if (gameOver) {
        setGameOver(true)
        setStatus('Game ended in a draw')
      } else {
        setStatus(`Next player: ${currentPlayer}`)
      }
    })
    
    // When game is restarted
    socket.on('game-restarted', ({ board, currentPlayer }) => {
      console.log('Game restarted')
      setBoard(board)
      setIsXNext(currentPlayer === 'X')
      setWinner(null)
      setGameOver(false)
      setStatus(`Next player: ${currentPlayer}`)
    })
    
    // When a player leaves
    socket.on('user-left', () => {
      console.log('User left')
      // Refresh the room data when someone leaves
      fetch(`https://tic-tac-toe-backend-pavidev.up.railway.app/api/rooms/${roomId}?passcode=${passcode}`)
        .then(res => res.json())
        .then(roomData => {
          setPlayers({
            creator: {
              id: roomData.players.X || 'creator',
              symbol: 'X',
            },
            opponent: roomData.players.O ? { 
              id: roomData.players.O, 
              symbol: 'O' 
            } : null,
          })
          
          if (!roomData.players.O) {
            setStatus("Opponent left. Waiting for new opponent...")
          }
        })
        .catch(err => console.error('Error fetching after user left:', err))
    })
    
    return () => {
      socket.off('user-joined')
      socket.off('move-made')
      socket.off('game-restarted')
      socket.off('user-left')
    }
  }, [socket, roomId, passcode])
  
  // Handle move
  const handleMove = async (i) => {
    if (winner || gameOver || board[i] || !playerSymbol) return
    
    // Determine if this player can make a move
    const canMove = (isXNext && playerSymbol === 'X') || (!isXNext && playerSymbol === 'O')
    
    if (!canMove) {
      console.log('Not your turn')
      return
    }
    
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
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Failed to make move:', errorData)
        setError(errorData.error || 'Failed to make move')
        return
      }
      
      const data = await response.json()
      
      setBoard(data.board)
      setIsXNext(data.currentPlayer === 'X')
      
      if (data.winner) {
        setWinner(data.winner)
        setGameOver(true)
        setStatus(`Winner: ${data.winner}`)
      } else if (data.gameOver) {
        setGameOver(true)
        setStatus('Game ended in a draw')
      } else {
        setStatus(`Next player: ${data.currentPlayer}`)
      }
      
      // Emit move to other player
      if (socket) {
        socket.emit('make-move', {
          roomId,
          board: data.board,
          currentPlayer: data.currentPlayer,
          winner: data.winner,
          gameOver: data.gameOver
        })
      }
    } catch (error) {
      console.error('Failed to make move:', error)
      setError('Failed to connect to server')
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
    if (!gameOver && !winner && !board.every(square => square !== null)) {
      return
    }
    
    try {
      const response = await fetch(`https://tic-tac-toe-backend-pavidev.up.railway.app/api/rooms/${roomId}/restart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ passcode }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Failed to restart game:', errorData)
        setError(errorData.error || 'Failed to restart game')
        return
      }
      
      const data = await response.json()
      
      setBoard(data.board)
      setIsXNext(data.currentPlayer === 'X')
      setWinner(null)
      setGameOver(false)
      setStatus(`Next player: ${data.currentPlayer}`)
      
      if (socket) {
        socket.emit('game-restart', {
          roomId,
          board: data.board,
          currentPlayer: data.currentPlayer
        })
      }
    } catch (error) {
      console.error('Failed to restart game:', error)
      setError('Failed to connect to server')
    }
  }

  // Determine if restart button should be enabled
  const canRestart = gameOver || winner || board.every(square => square !== null)

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Room: {roomName}</h1>
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
            Code: {passcode}
          </span>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
            <button 
              className="float-right font-bold"
              onClick={() => setError(null)}
            >
              &times;
            </button>
          </div>
        )}
        
        <div className="mb-6">
          <p className="text-lg font-medium mb-2">{status}</p>
          <div className="flex space-x-4">
            <div className="bg-gray-100 px-3 py-2 rounded-md">
              You: {playerSymbol || '...'}
            </div>
            {players.opponent ? (
              <div className="bg-gray-100 px-3 py-2 rounded-md">
                Opponent: {playerSymbol === 'X' ? 'O' : 'X'}
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
            className={`flex-1 ${canRestart 
              ? 'bg-green-500 hover:bg-green-600' 
              : 'bg-gray-300 cursor-not-allowed'} text-white py-2 px-4 rounded-lg`}
            disabled={!canRestart}
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