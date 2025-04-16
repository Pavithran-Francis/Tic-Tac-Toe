import { useState } from 'react'

export default function RoomSearch({ setSearchResults, setError }) {
  const [searchTerm, setSearchTerm] = useState('')

  const handleSearch = async (e) => {
    e.preventDefault()
    
    try {
      const response = await fetch(`http://localhost:3001/api/rooms?search=${searchTerm}`)
      const data = await response.json()
      
      if (!response.ok) {
        setError('Failed to search rooms')
        return
      }
      
      setSearchResults(data)
    } catch (error) {
      setError('Failed to connect to server')
      console.error(error)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Search Rooms</h2>
      <form className="flex space-x-2" onSubmit={handleSearch}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search by room name"
        />
        <button 
          type="submit"
          className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg"
        >
          Search
        </button>
      </form>
    </div>
  )
}