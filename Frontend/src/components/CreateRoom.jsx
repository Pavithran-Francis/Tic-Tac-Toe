import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function CreateRoom({ setError }) {
  const [roomName, setRoomName] = useState('')
  const [passcode, setPasscode] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleCreateRoom = async (e) => {
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
      
      const response = await fetch('https://tic-tac-toe-production-0897.up.railway.app/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: roomName, passcode }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || 'Failed to create room')
        setLoading(false)
        return
      }
      
      // After creating a room, join it with the generated player ID
      const joinResponse = await fetch(`https://tic-tac-toe-production-0897.up.railway.app/api/rooms/${data.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          passcode,
          playerId,
          username
        }),
      })
      
      if (!joinResponse.ok) {
        const joinData = await joinResponse.json()
        setError(joinData.error || 'Failed to join room')
        setLoading(false)
        return
      }
      
      navigate(`/room?id=${data.id}&name=${roomName}&passcode=${passcode}&isCreator=true&playerId=${playerId}&username=${encodeURIComponent(username)}`)
    } catch (error) {
      setError('Failed to connect to server')
      console.error(error)
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Create a Room</h2>
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
          onClick={handleCreateRoom}
          className={`w-full ${loading ? 'bg-blue-400' : 'bg-blue-500 hover:bg-blue-600'} text-white py-2 px-4 rounded-lg`}
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Room'}
        </button>
      </form>
    </div>
  )
}