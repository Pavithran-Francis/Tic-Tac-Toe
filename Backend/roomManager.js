let rooms = []

class CustomError extends Error {
  constructor(message, statusCode) {
    super(message)
    this.statusCode = statusCode
  }
}

function createRoom(name, passcode) {
  // Check if room with the same name already exists
  if (rooms.some(room => room.name === name)) {
    throw new CustomError('Room with this name already exists', 409)
  }
  
  const newRoom = {
    id: Date.now().toString(),
    name,
    passcode,
    playerCount: 1,
    board: Array(9).fill(null),
    currentPlayer: 'X',
    players: {
      X: null,
      O: null
    }
  }
  
  rooms.push(newRoom)
  
  return { id: newRoom.id, name: newRoom.name }
}

function searchRooms(searchTerm) {
  if (!searchTerm) {
    // Return all rooms (without passcodes)
    return rooms.map(({ id, name, playerCount }) => ({ id, name, playerCount }))
  }
  
  const filteredRooms = rooms.filter(room => 
    room.name.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  // Return filtered rooms (without passcodes)
  return filteredRooms.map(({ id, name, playerCount }) => ({ id, name, playerCount }))
}

function getRoomById(id, passcode) {
  const room = rooms.find(room => room.id === id)
  
  if (!room) {
    throw new CustomError('Room not found', 404)
  }
  
  if (room.passcode !== passcode) {
    throw new CustomError('Invalid passcode', 401)
  }
  
  // Return room data without passcode
  const { passcode: _, ...roomData } = room
  return roomData
}

function joinRoom(id, passcode, playerId) {
  const room = rooms.find(room => room.id === id)
  
  if (!room) {
    throw new CustomError('Room not found', 404)
  }
  
  if (room.passcode !== passcode) {
    throw new CustomError('Invalid passcode', 401)
  }
  
  if (room.playerCount >= 2) {
    throw new CustomError('Room is full', 409)
  }
  
  // Add player to room
  if (!room.players.X) {
    room.players.X = playerId
  } else {
    room.players.O = playerId
  }
  
  room.playerCount++
  
  return { 
    symbol: room.players.X === playerId ? 'X' : 'O',
    board: room.board,
    currentPlayer: room.currentPlayer
  }
}

function makeMove(id, passcode, playerId, move) {
  const room = rooms.find(room => room.id === id)
  
  if (!room) {
    throw new CustomError('Room not found', 404)
  }
  
  if (room.passcode !== passcode) {
    throw new CustomError('Invalid passcode', 401)
  }
  
  // Validate player and turn
  const playerSymbol = room.players.X === playerId ? 'X' : 'O'
  
  if (playerSymbol !== room.currentPlayer) {
    throw new CustomError('Not your turn', 400)
  }
  
  // Validate move
  if (move < 0 || move > 8 || room.board[move] !== null) {
    throw new CustomError('Invalid move', 400)
  }
  
  // Make move
  room.board[move] = playerSymbol
  room.currentPlayer = playerSymbol === 'X' ? 'O' : 'X'
  
  return { 
    board: room.board,
    currentPlayer: room.currentPlayer
  }
}

function restartGame(id, passcode) {
  const room = rooms.find(room => room.id === id)
  
  if (!room) {
    throw new CustomError('Room not found', 404)
  }
  
  if (room.passcode !== passcode) {
    throw new CustomError('Invalid passcode', 401)
  }
  
  // Reset the game
  room.board = Array(9).fill(null)
  room.currentPlayer = 'X'
  
  return { 
    board: room.board,
    currentPlayer: room.currentPlayer
  }
}

function leaveRoom(id, passcode, playerId) {
  const roomIndex = rooms.findIndex(room => room.id === id)
  
  if (roomIndex === -1) {
    throw new CustomError('Room not found', 404)
  }
  
  if (rooms[roomIndex].passcode !== passcode) {
    throw new CustomError('Invalid passcode', 401)
  }
  
  // Remove player from room
  if (rooms[roomIndex].players.X === playerId) {
    rooms[roomIndex].players.X = null
    rooms[roomIndex].playerCount--
  } else if (rooms[roomIndex].players.O === playerId) {
    rooms[roomIndex].players.O = null
    rooms[roomIndex].playerCount--
  }
  
  // If room is empty, remove it
  if (rooms[roomIndex].playerCount === 0) {
    rooms.splice(roomIndex, 1)
  }
  
  return true
}

module.exports = {
  createRoom,
  searchRooms,
  getRoomById,
  joinRoom,
  makeMove,
  restartGame,
  leaveRoom
}