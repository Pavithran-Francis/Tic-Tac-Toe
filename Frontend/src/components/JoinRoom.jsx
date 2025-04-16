import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function JoinRoom({ setError }) {
  const [roomName, setRoomName] = useState('')
  const [passcode, setPasscode] = useState('')
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
    
    try {
      // First get room ID by name
      const searchResponse = await fetch(`https://tic-tac-toe-backend-pavidev.up.railway.app/api/rooms?search=${roomName}`)
      const rooms = await searchResponse.json()
      
      if (!searchResponse.ok) {
        setError('Failed to search for room')
        return
      }
      
      const room = rooms.find(r => r.name === roomName)
      
      if (!room) {
        setError('Room not found')
        return
      }
      
      // Then try to join with passcode
      const joinResponse = await fetch(`https://tic-tac-toe-backend-pavidev.up.railway.app/api/rooms/${room.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          passcode,
          playerId: 'player-' + Math.random().toString(36).substr(2, 9)
        }),
      })
      
      const joinData = await joinResponse.json()
      
      if (!joinResponse.ok) {
        setError(joinData.error || 'Failed to join room')
        return
      }
      
      navigate(`/room?id=${room.id}&name=${roomName}&passcode=${passcode}&isCreator=false`)
    } catch (error) {
      setError('Failed to connect to server')
      console.error(error)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Join a Room</h2>
      <form className="space-y-4">
        <div>
          <label className="block text-gray-700 mb-2">Room Name</label>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter room name"
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
          />
        </div>
        
        <button
          onClick={handleJoinRoom}
          className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg"
        >
          Join Room
        </button>
      </form>
    </div>
  )
}