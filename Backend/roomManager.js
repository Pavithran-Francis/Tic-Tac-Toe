let rooms = [];

// Add timestamp for inactivity tracking
const INACTIVE_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

class CustomError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Cleanup function to remove inactive rooms
function cleanupInactiveRooms() {
  const currentTime = Date.now();
  const initialCount = rooms.length;
  rooms = rooms.filter(room => {
    // Keep rooms that are active (last activity within timeout)
    return currentTime - room.lastActivity < INACTIVE_TIMEOUT;
  });
  
  if (initialCount !== rooms.length) {
    console.log(`Cleaned up ${initialCount - rooms.length} inactive rooms`);
  }
}

// Run cleanup every minute
setInterval(cleanupInactiveRooms, 60 * 1000);

function createRoom(name, passcode) {
  // Check if room with the same name already exists
  if (rooms.some(room => room.name === name)) {
    throw new CustomError('Room with this name already exists', 409);
  }
  
  const newRoom = {
    id: Date.now().toString(),
    name,
    passcode,
    playerCount: 0,
    board: Array(9).fill(null),
    currentPlayer: 'X',
    players: {
      X: {
        id: null,
        username: null,
        score: 0
      },
      O: {
        id: null,
        username: null,
        score: 0
      }
    },
    winner: null,
    gameOver: false,
    lastActivity: Date.now(),
    createdAt: Date.now(),
    socketIds: new Set() // Track socket IDs to prevent duplicate connections
  };
  
  rooms.push(newRoom);
  console.log(`Room created: ${name} (${newRoom.id})`);
  
  return { id: newRoom.id, name: newRoom.name };
}

function searchRooms(searchTerm) {
  // Clean up inactive rooms first
  cleanupInactiveRooms();
  
  if (!searchTerm) {
    // Return all rooms (without passcodes)
    return rooms.map(({ id, name, playerCount, gameOver }) => ({ 
      id, 
      name, 
      playerCount,
      gameOver,
      isFull: playerCount >= 2
    }));
  }
  
  const filteredRooms = rooms.filter(room => 
    room.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Return filtered rooms (without passcodes)
  return filteredRooms.map(({ id, name, playerCount, gameOver }) => ({ 
    id, 
    name, 
    playerCount,
    gameOver,
    isFull: playerCount >= 2
  }));
}

function getRoomById(id, passcode) {
  const room = rooms.find(room => room.id === id);
  
  if (!room) {
    throw new CustomError('Room not found', 404);
  }
  
  if (room.passcode !== passcode) {
    throw new CustomError('Invalid passcode', 401);
  }
  
  // Update last activity timestamp
  room.lastActivity = Date.now();
  
  // Return room data without passcode and socketIds
  const { passcode: _, socketIds: __, ...roomData } = room;
  return roomData;
}

function joinRoom(id, passcode, playerId, username, socketId = null) {
  const room = rooms.find(room => room.id === id);
  
  if (!room) {
    throw new CustomError('Room not found', 404);
  }
  
  if (room.passcode !== passcode) {
    throw new CustomError('Invalid passcode', 401);
  }
  
  // Check if this player is already in the room - prevent double joining
  if (room.players.X.id === playerId) {
    console.log(`Player ${playerId} already joined as X in room ${id}`);
    // Add socketId to tracking if provided
    if (socketId && !room.socketIds.has(socketId)) {
      room.socketIds.add(socketId);
    }
    return { 
      symbol: 'X',
      board: room.board,
      currentPlayer: room.currentPlayer
    };
  }
  
  if (room.players.O.id === playerId) {
    console.log(`Player ${playerId} already joined as O in room ${id}`);
    // Add socketId to tracking if provided
    if (socketId && !room.socketIds.has(socketId)) {
      room.socketIds.add(socketId);
    }
    return { 
      symbol: 'O',
      board: room.board,
      currentPlayer: room.currentPlayer
    };
  }
  
  // Check if room is full (both positions filled)
  if (room.players.X.id && room.players.O.id) {
    throw new CustomError('Room is full', 409);
  }
  
  // Update last activity timestamp
  room.lastActivity = Date.now();
  
  // Add socketId to tracking if provided
  if (socketId) {
    room.socketIds.add(socketId);
  }
  
  // Add player to room
  if (!room.players.X.id) {
    room.players.X.id = playerId;
    room.players.X.username = username || 'Player X';
    room.playerCount++;
    console.log(`Player ${playerId} joined as X in room ${id}`);
    return { 
      symbol: 'X',
      board: room.board,
      currentPlayer: room.currentPlayer
    };
  } else if (!room.players.O.id) {
    room.players.O.id = playerId;
    room.players.O.username = username || 'Player O';
    room.playerCount++;
    console.log(`Player ${playerId} joined as O in room ${id}`);
    return { 
      symbol: 'O',
      board: room.board,
      currentPlayer: room.currentPlayer
    };
  }
  
  // This should never happen due to the earlier check, but just in case
  throw new CustomError('Room is full', 409);
}

function updatePlayerInfo(roomId, playerId, username, symbol) {
  const room = rooms.find(room => room.id === roomId);
  
  if (!room) {
    throw new CustomError('Room not found', 404);
  }
  
  // Update the player's username
  if (symbol === 'X' && room.players.X.id === playerId) {
    room.players.X.username = username;
  } else if (symbol === 'O' && room.players.O.id === playerId) {
    room.players.O.username = username;
  } else {
    throw new CustomError('Player not found in room', 404);
  }
  
  // Update last activity timestamp
  room.lastActivity = Date.now();
  
  return true;
}

// Track socket connections
function registerSocketInRoom(roomId, socketId) {
  const room = rooms.find(room => room.id === roomId);
  
  if (!room) {
    return false;
  }
  
  if (!room.socketIds) {
    room.socketIds = new Set();
  }
  
  room.socketIds.add(socketId);
  console.log(`Socket ${socketId} registered in room ${roomId}`);
  return true;
}

// Remove socket connections
function removeSocketFromRoom(roomId, socketId) {
  const room = rooms.find(room => room.id === roomId);
  
  if (!room || !room.socketIds) {
    return false;
  }
  
  room.socketIds.delete(socketId);
  console.log(`Socket ${socketId} removed from room ${roomId}`);
  return true;
}

// Rest of your existing functions (makeMove, calculateWinner, restartGame)
// ...

function leaveRoom(id, passcode, playerId, socketId = null) {
  const roomIndex = rooms.findIndex(room => room.id === id);
  
  if (roomIndex === -1) {
    throw new CustomError('Room not found', 404);
  }
  
  if (rooms[roomIndex].passcode !== passcode) {
    throw new CustomError('Invalid passcode', 401);
  }
  
  // Update last activity timestamp
  rooms[roomIndex].lastActivity = Date.now();
  
  // If a socketId was provided, remove it from tracking
  if (socketId && rooms[roomIndex].socketIds) {
    rooms[roomIndex].socketIds.delete(socketId);
    
    // If there are still other sockets connected for this player, don't remove the player yet
    if (rooms[roomIndex].socketIds.size > 0) {
      return true;
    }
  }
  
  // Remove player from room
  if (rooms[roomIndex].players.X.id === playerId) {
    rooms[roomIndex].players.X.id = null;
    rooms[roomIndex].playerCount--;
    console.log(`Player ${playerId} (X) left room ${id}`);
  } else if (rooms[roomIndex].players.O.id === playerId) {
    rooms[roomIndex].players.O.id = null;
    rooms[roomIndex].playerCount--;
    console.log(`Player ${playerId} (O) left room ${id}`);
  }
  
  // If room is empty, remove it
  if (rooms[roomIndex].playerCount === 0) {
    console.log(`Room ${id} is empty, removing it`);
    rooms.splice(roomIndex, 1);
  }
  
  return true;
}

function getRoomCount() {
  return rooms.length;
}

module.exports = {
  createRoom,
  searchRooms,
  getRoomById,
  joinRoom,
  updatePlayerInfo,
  makeMove,
  restartGame,
  leaveRoom,
  getRoomCount,
  registerSocketInRoom,
  removeSocketFromRoom
};