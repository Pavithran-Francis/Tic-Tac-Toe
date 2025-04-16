const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const roomManager = require('./roomManager')

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: ["https://tic-tac-toe-game-pavidev.vercel.app", "http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Middleware
app.use(cors({
  origin: ["https://tic-tac-toe-game-pavidev.vercel.app", "http://localhost:5173"]
}));
app.use(express.json())

// Socket.io
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`)
  
  socket.on('join-room', (roomId) => {
    socket.join(roomId)
    socket.to(roomId).emit('user-joined', { id: socket.id })
    console.log(`${socket.id} joined room: ${roomId}`)
  })
  
  socket.on('make-move', ({ roomId, board, currentPlayer }) => {
    socket.to(roomId).emit('move-made', { board, currentPlayer })
  })
  
  socket.on('game-restart', ({ roomId, board, currentPlayer }) => {
    socket.to(roomId).emit('game-restarted', { board, currentPlayer })
  })
  
  socket.on('leave-room', (roomId) => {
    socket.leave(roomId)
    socket.to(roomId).emit('user-left', { id: socket.id })
    console.log(`${socket.id} left room: ${roomId}`)
  })
  
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`)
  })
})

// Room API routes
app.post('/api/rooms', (req, res) => {
  const { name, passcode } = req.body
  
  if (!name || !passcode) {
    return res.status(400).json({ error: 'Room name and passcode are required' })
  }
  
  if (passcode.length !== 4 || !/^\d+$/.test(passcode)) {
    return res.status(400).json({ error: 'Passcode must be 4 digits' })
  }
  
  try {
    const room = roomManager.createRoom(name, passcode)
    res.status(201).json({ id: room.id, name: room.name })
  } catch (error) {
    res.status(409).json({ error: error.message })
  }
})

app.get('/api/rooms', (req, res) => {
  const { search } = req.query
  
  try {
    const rooms = roomManager.searchRooms(search)
    res.status(200).json(rooms)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/rooms/:id', (req, res) => {
  const { id } = req.params
  const { passcode } = req.query
  
  try {
    const room = roomManager.getRoomById(id, passcode)
    res.status(200).json(room)
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message })
  }
})

app.post('/api/rooms/:id', (req, res) => {
  const { id } = req.params
  const { passcode, playerId } = req.body
  
  try {
    const result = roomManager.joinRoom(id, passcode, playerId)
    res.status(200).json(result)
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message })
  }
})

app.put('/api/rooms/:id', (req, res) => {
  const { id } = req.params
  const { passcode, playerId, move } = req.body
  
  try {
    const result = roomManager.makeMove(id, passcode, playerId, move)
    res.status(200).json(result)
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message })
  }
})

app.post('/api/rooms/:id/restart', (req, res) => {
  const { id } = req.params
  const { passcode } = req.body
  
  try {
    const result = roomManager.restartGame(id, passcode)
    res.status(200).json(result)
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message })
  }
})

app.delete('/api/rooms/:id', (req, res) => {
  const { id } = req.params
  const { passcode, playerId } = req.body
  
  try {
    roomManager.leaveRoom(id, passcode, playerId)
    res.status(200).json({ success: true })
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message })
  }
})

// const PORT = process.env.PORT || 3001
// server.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`)
// })

const cors = require('cors');
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}))