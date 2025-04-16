import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function CreateRoom({ setError }) {
  const [roomName, setRoomName] = useState('')
  const [passcode, setPasscode] = useState('')
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
    
    try {
      const response = await fetch('http://localhost:3001/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: roomName, passcode }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || 'Failed to create room')
        return
      }
      
      navigate(`/room?id=${data.id}&name=${roomName}&passcode=${passcode}&isCreator=true`)
    } catch (error) {
      setError('Failed to connect to server')
      console.error(error)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Create a Room</h2>
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
          onClick={handleCreateRoom}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg"
        >
          Create Room
        </button>
      </form>
    </div>
  )
}