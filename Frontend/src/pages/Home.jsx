import { useState, useEffect } from 'react'
import CreateRoom from '../components/CreateRoom'
import JoinRoom from '../components/JoinRoom'
import RoomSearch from '../components/RoomSearch'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const [error, setError] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [allRooms, setAllRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState(() => localStorage.getItem('ticTacToeUsername') || '')
  const navigate = useNavigate()

  // Fetch all rooms when component mounts
  useEffect(() => {
    fetchAllRooms()
    // Set up polling to refresh rooms every 10 seconds
    const intervalId = setInterval(fetchAllRooms, 10000)
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId)
  }, [])

  const fetchAllRooms = async () => {
    try {
      setLoading(true)
      const response = await fetch('https://tic-tac-toe-production-0897.up.railway.app/api/rooms')
      
      if (!response.ok) {
        console.error('Failed to fetch rooms:', response.status)
        setLoading(false)
        return
      }
      
      const data = await response.json()
      setAllRooms(data)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching rooms:', error)
      setLoading(false)
    }
  }

  const handleJoinExistingRoom = (roomId, roomName) => {
    // Check if username is set
    if (!username.trim()) {
      setError('Please enter your username in the form below before joining a room')
      return
    }
    
    // Show passcode prompt
    const passcode = prompt(`Enter 4-digit passcode for room "${roomName}":`)
    
    if (!passcode) return
    
    if (passcode.length !== 4 || !/^\d+$/.test(passcode)) {
      setError('Passcode must be 4 digits')
      return
    }
    
    // Generate a unique player ID
    const playerId = 'player-' + Date.now().toString(16) + Math.random().toString(16).slice(2)
    
    // Try to join the room
    joinRoomWithId(roomId, roomName, passcode, playerId)
  }

  const joinRoomWithId = async (roomId, roomName, passcode, playerId) => {
    try {
      const joinResponse = await fetch(`https://tic-tac-toe-production-0897.up.railway.app/api/rooms/${roomId}`, {
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
        return
      }
      
      // Store player info in localStorage for persistence
      localStorage.setItem('ticTacToePlayerId', playerId)
      localStorage.setItem('ticTacToeUsername', username)
      
      // Navigate to the room
      navigate(`/room?id=${roomId}&name=${roomName}&passcode=${passcode}&isCreator=false&playerId=${playerId}&username=${encodeURIComponent(username)}`)
    } catch (error) {
      setError('Failed to connect to server')
      console.error(error)
    }
  }

  // Handle username change for quick join
  const handleUsernameChange = (e) => {
    setUsername(e.target.value)
    localStorage.setItem('ticTacToeUsername', e.target.value)
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6">Tic Tac Toe</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
            <button 
              className="float-right font-bold"
              onClick={() => setError('')}
            >
              &times;
            </button>
          </div>
        )}

        <div className="space-y-6">
          <CreateRoom setError={setError} />
          <JoinRoom setError={setError} />
          
          <div className="border-t pt-4">
            <RoomSearch 
              setSearchResults={setSearchResults} 
              setError={setError}
            />
            
            {/* Quick Join Username */}
            <div className="mt-4 mb-4">
              <label className="block text-gray-700 mb-2">Your Username for Quick Join</label>
              <input
                type="text"
                value={username}
                onChange={handleUsernameChange}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your username"
              />
            </div>
            
            {/* Display all active rooms */}
            <div className="mt-4">
              <h3 className="font-medium mb-2">Available Rooms:</h3>
              {loading ? (
                <p className="text-gray-500 text-center py-2">Loading rooms...</p>
              ) : allRooms.length > 0 ? (
                <ul className="divide-y">
                  {allRooms
                    .filter(room => !room.gameOver && !room.isFull)
                    .map(room => (
                      <li key={room.id} className="py-2">
                        <div className="flex justify-between items-center">
                          <span>{room.name}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">
                              {room.playerCount}/2 players
                            </span>
                            <button
                              onClick={() => handleJoinExistingRoom(room.id, room.name)}
                              className="bg-green-500 hover:bg-green-600 text-white text-sm py-1 px-2 rounded"
                            >
                              Join
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-center py-2">No active rooms available</p>
              )}
            </div>
            
            {/* Display search results separately if there are any */}
            {searchResults.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium mb-2">Search Results:</h3>
                <ul className="divide-y">
                  {searchResults.map(room => (
                    <li key={room.id} className="py-2">
                      <div className="flex justify-between items-center">
                        <span>{room.name}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">
                            {room.playerCount}/2 players
                          </span>
                          {!room.isFull && (
                            <button
                              onClick={() => handleJoinExistingRoom(room.id, room.name)}
                              className="bg-green-500 hover:bg-green-600 text-white text-sm py-1 px-2 rounded"
                            >
                              Join
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}