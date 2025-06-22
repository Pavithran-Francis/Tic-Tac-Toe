import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function JoinRoom({ setError }) {
  const [roomName, setRoomName] = useState('')
  const [passcode, setPasscode] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleJoinRoom = async (e) => {
    e.preventDefault()
    
    if (!roomName) {
      setError('Please enter a room name')
      return
    }
    
    if (!passcode || passcode.length !== 4 || !/^\d+$/.test(passcode)) {
      setError('Please enter a 4-digit passcode')
      return
    }

    if (!username.trim()) {
      setError('Please enter your username')
      return
    }
    
    try {
      setLoading(true)
      
      // Generate a unique player ID
      const playerId = 'player-' + Date.now().toString(16) + Math.random().toString(16).slice(2)
      
      // Store player info in localStorage for persistence
      localStorage.setItem('ticTacToePlayerId', playerId)
      localStorage.setItem('ticTacToeUsername', username)
      
      // First get room ID by name
      const searchResponse = await fetch(`https://tic-tac-toe-production-0897.up.railway.app/api/rooms?search=${encodeURIComponent(roomName)}`)
      
      if (!searchResponse.ok) {
        setError('Failed to search for room')
        setLoading(false)
        return
      }
      
      const rooms = await searchResponse.json()
      const room = rooms.find(r => r.name.toLowerCase() === roomName.toLowerCase())
      
      if (!room) {
        setError('Room not found')
        setLoading(false)
        return
      }
      
      // Then try to join with passcode
      const joinResponse = await fetch(`https://tic-tac-toe-production-0897.up.railway.app/api/rooms/${room.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          passcode,
          playerId
        }),
      })
      
      const joinData = await joinResponse.json()
      
      if (!joinResponse.ok) {
        setError(joinData.error || 'Failed to join room')
        setLoading(false)
        return
      }
      
      navigate(`/room?id=${room.id}&name=${roomName}&passcode=${passcode}&isCreator=false&playerId=${playerId}&username=${encodeURIComponent(username)}`)
    } catch (error) {
      setError('Failed to connect to server')
      console.error(error)
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Join a Room</h2>
      <form className="space-y-4">
        <div>
          <label className="block text-gray-700 mb-2">Your Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your username"
            disabled={loading}
          />
        </div>
        
        <div>
          <label className="block text-gray-700 mb-2">Room Name</label>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter room name"
            disabled={loading}
          />
        </div>
        
        <div>
          <label className="block text-gray-700 mb-2">Passcode (4 digits)</label>
          <input
            type="text"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            maxLength={4}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter 4-digit passcode"
            disabled={loading}
          />
        </div>
        
        <button
          onClick={handleJoinRoom}
          className={`w-full ${loading ? 'bg-green-400' : 'bg-green-500 hover:bg-green-600'} text-white py-2 px-4 rounded-lg`}
          disabled={loading}
        >
          {loading ? 'Joining...' : 'Join Room'}
        </button>
      </form>
    </div>
  )
}