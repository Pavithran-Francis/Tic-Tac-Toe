import { useState } from 'react'
import CreateRoom from '../components/CreateRoom'
import JoinRoom from '../components/JoinRoom'
import RoomSearch from '../components/RoomSearch'

export default function Home() {
  const [error, setError] = useState('')
  const [searchResults, setSearchResults] = useState([])

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6">Tic Tac Toe</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
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
            
            {searchResults.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium mb-2">Search Results:</h3>
                <ul className="divide-y">
                  {searchResults.map(room => (
                    <li key={room.id} className="py-2">
                      <div className="flex justify-between items-center">
                        <span>{room.name}</span>
                        <span className="text-sm text-gray-500">
                          {room.playerCount}/2 players
                        </span>
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