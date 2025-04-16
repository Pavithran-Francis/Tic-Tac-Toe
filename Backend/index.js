const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const roomManager = require('./roomManager');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: ["https://tic-tac-toe-game-pavidev.vercel.app", "http://localhost:5173"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json()); // Parse incoming JSON

// Socket.IO with its own CORS
const io = new Server(server, {
  cors: {
    origin: ["https://tic-tac-toe-game-pavidev.vercel.app", "http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Track socket connections by room and player ID
const socketConnections = new Map();

// Socket.IO logic
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // Extract roomId from query params if available
  const { roomId } = socket.handshake.query;
  if (roomId) {
    console.log(`Socket ${socket.id} connected with roomId ${roomId}`);
    roomManager.registerSocketInRoom(roomId, socket.id);
  }

  // When a user joins a room
  socket.on('join-room', (roomId) => {
    console.log(`Socket ${socket.id} joining room: ${roomId}`);
    
    // Join the socket.io room
    socket.join(roomId);
    
    // Register this socket with the room
    roomManager.registerSocketInRoom(roomId, socket.id);
    
    // Notify other clients in the room (but don't broadcast to everyone)
    socket.to(roomId).emit('user-joined', { id: socket.id });
  });

  // New event for player information sharing
  socket.on('player-info', ({ roomId, playerId, username, symbol }) => {
    console.log(`Player info shared in room ${roomId}: ${username} (${symbol})`);
    
    // Store the association between socket, room, and player
    if (!socketConnections.has(socket.id)) {
      socketConnections.set(socket.id, { roomId, playerId });
    }
    
    // Only broadcast to other clients in the room
    socket.to(roomId).emit('player-info', { playerId, username, symbol });
    
    // Update room data in our manager
    try {
      roomManager.updatePlayerInfo(roomId, playerId, username, symbol);
    } catch (error) {
      console.log('Error updating player info:', error.message);
    }
  });

  // When a move is made
  socket.on('make-move', ({ roomId, board, currentPlayer, winner, gameOver }) => {
    socket.to(roomId).emit('move-made', { board, currentPlayer, winner, gameOver });
  });

  // When game is restarted
  socket.on('game-restart', ({ roomId, board, currentPlayer }) => {
    socket.to(roomId).emit('game-restarted', { board, currentPlayer });
  });

  // When a player explicitly leaves
  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    
    // Remove from tracking
    roomManager.removeSocketFromRoom(roomId, socket.id);
    
    // Get player info if we have it
    const playerInfo = socketConnections.get(socket.id);
    if (playerInfo && playerInfo.roomId === roomId) {
      // Attempt to remove player from room if this was their last connection
      try {
        roomManager.leaveRoom(roomId, null, playerInfo.playerId, socket.id);
      } catch (error) {
        console.log('Error removing player on leave:', error.message);
      }
      
      socketConnections.delete(socket.id);
    }
    
    // Notify others
    socket.to(roomId).emit('user-left', { id: socket.id });
    console.log(`Socket ${socket.id} left room: ${roomId}`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    
    // Check if this socket was associated with a room and player
    const playerInfo = socketConnections.get(socket.id);
    if (playerInfo) {
      const { roomId, playerId } = playerInfo;
      
      // Attempt to leave room
      try {
        roomManager.removeSocketFromRoom(roomId, socket.id);
        
        // This will only fully remove the player if there are no other
        // sockets for this player still connected
        roomManager.leaveRoom(roomId, null, playerId, socket.id);
      } catch (error) {
        console.log('Error handling disconnect:', error.message);
      }
      
      // Notify others in the room
      socket.to(roomId).emit('user-left', { id: socket.id });
      
      // Remove from our tracking
      socketConnections.delete(socket.id);
    }
  });
});

// RESTful API Routes
app.post('/api/rooms', (req, res) => {
  const { name, passcode } = req.body;

  if (!name || !passcode) {
    return res.status(400).json({ error: 'Room name and passcode are required' });
  }

  if (passcode.length !== 4 || !/^\d+$/.test(passcode)) {
    return res.status(400).json({ error: 'Passcode must be 4 digits' });
  }

  try {
    const room = roomManager.createRoom(name, passcode);
    res.status(201).json({ id: room.id, name: room.name });
  } catch (error) {
    res.status(error.statusCode || 409).json({ error: error.message });
  }
});

// The rest of your API routes remain largely the same

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    roomCount: roomManager.getRoomCount(),
    socketConnectionCount: socketConnections.size
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🎮 Backend live on port ${PORT}`);
});