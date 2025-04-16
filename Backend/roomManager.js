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
  rooms = rooms.filter(room => {
    // Keep rooms that are active (last activity within timeout)
    return currentTime - room.lastActivity < INACTIVE_TIMEOUT;
  });
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
      X: null,
      O: null
    },
    winner: null,
    gameOver: false,
    lastActivity: Date.now(),
    createdAt: Date.now()
  };
  
  rooms.push(newRoom);
  
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
  
  // Return room data without passcode
  const { passcode: _, ...roomData } = room;
  return roomData;
}

function joinRoom(id, passcode, playerId) {
  const room = rooms.find(room => room.id === id);
  
  if (!room) {
    throw new CustomError('Room not found', 404);
  }
  
  if (room.passcode !== passcode) {
    throw new CustomError('Invalid passcode', 401);
  }
  
  if (room.playerCount >= 2) {
    throw new CustomError('Room is full', 409);
  }
  
  // Update last activity timestamp
  room.lastActivity = Date.now();
  
  // Add player to room
  if (!room.players.X) {
    room.players.X = playerId;
    room.playerCount++;
    return { 
      symbol: 'X',
      board: room.board,
      currentPlayer: room.currentPlayer
    };
  } else if (!room.players.O) {
    room.players.O = playerId;
    room.playerCount++;
    return { 
      symbol: 'O',
      board: room.board,
      currentPlayer: room.currentPlayer
    };
  }
  
  throw new CustomError('Room is full', 409);
}

function makeMove(id, passcode, playerId, move) {
  const room = rooms.find(room => room.id === id);
  
  if (!room) {
    throw new CustomError('Room not found', 404);
  }
  
  if (room.passcode !== passcode) {
    throw new CustomError('Invalid passcode', 401);
  }
  
  // Check if the game is already over
  if (room.gameOver) {
    throw new CustomError('Game is already over', 400);
  }
  
  // Update last activity timestamp
  room.lastActivity = Date.now();
  
  // Determine which player is making the move
  let playerSymbol = null;
  if (room.players.X === playerId) {
    playerSymbol = 'X';
  } else if (room.players.O === playerId) {
    playerSymbol = 'O';
  } else {
    throw new CustomError('Player not in this room', 403);
  }
  
  // Validate player and turn
  if (playerSymbol !== room.currentPlayer) {
    throw new CustomError('Not your turn', 400);
  }
  
  // Validate move
  if (move < 0 || move > 8 || room.board[move] !== null) {
    throw new CustomError('Invalid move', 400);
  }
  
  // Make move
  room.board[move] = playerSymbol;
  
  // Check for winner
  const winner = calculateWinner(room.board);
  if (winner) {
    room.winner = winner;
    room.gameOver = true;
    return { 
      board: room.board,
      currentPlayer: room.currentPlayer,
      winner,
      gameOver: true
    };
  }
  
  // Check for draw
  if (room.board.every(cell => cell !== null)) {
    room.gameOver = true;
    return { 
      board: room.board,
      currentPlayer: room.currentPlayer,
      winner: null,
      gameOver: true
    };
  }
  
  // Switch player
  room.currentPlayer = playerSymbol === 'X' ? 'O' : 'X';
  
  return { 
    board: room.board,
    currentPlayer: room.currentPlayer,
    winner: null,
    gameOver: false
  };
}

function calculateWinner(board) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  
  return null;
}

function restartGame(id, passcode) {
  const room = rooms.find(room => room.id === id);
  
  if (!room) {
    throw new CustomError('Room not found', 404);
  }
  
  if (room.passcode !== passcode) {
    throw new CustomError('Invalid passcode', 401);
  }
  
  // Update last activity timestamp
  room.lastActivity = Date.now();
  
  // Reset the game
  room.board = Array(9).fill(null);
  room.currentPlayer = 'X';
  room.winner = null;
  room.gameOver = false;
  
  return { 
    board: room.board,
    currentPlayer: room.currentPlayer,
    winner: null,
    gameOver: false
  };
}

function leaveRoom(id, passcode, playerId) {
  const roomIndex = rooms.findIndex(room => room.id === id);
  
  if (roomIndex === -1) {
    throw new CustomError('Room not found', 404);
  }
  
  if (rooms[roomIndex].passcode !== passcode) {
    throw new CustomError('Invalid passcode', 401);
  }
  
  // Update last activity timestamp
  rooms[roomIndex].lastActivity = Date.now();
  
  // Remove player from room
  if (rooms[roomIndex].players.X === playerId) {
    rooms[roomIndex].players.X = null;
    rooms[roomIndex].playerCount--;
  } else if (rooms[roomIndex].players.O === playerId) {
    rooms[roomIndex].players.O = null;
    rooms[roomIndex].playerCount--;
  }
  
  // If room is empty, remove it
  if (rooms[roomIndex].playerCount === 0) {
    rooms.splice(roomIndex, 1);
  }
  
  return true;
}

// Add a function to delete a room
function deleteRoom(id, passcode) {
  const roomIndex = rooms.findIndex(room => room.id === id);
  
  if (roomIndex === -1) {
    throw new CustomError('Room not found', 404);
  }
  
  if (rooms[roomIndex].passcode !== passcode) {
    throw new CustomError('Invalid passcode', 401);
  }
  
  // Remove the room
  rooms.splice(roomIndex, 1);
  
  return { success: true };
}

module.exports = {
  createRoom,
  searchRooms,
  getRoomById,
  joinRoom,
  makeMove,
  restartGame,
  leaveRoom,
  deleteRoom
};