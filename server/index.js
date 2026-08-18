const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const { setupSocketHandlers } = require('./sockets/handlers');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// CORS middleware for API endpoints
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.CLIENT_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Custom request logger middleware
app.use((req, res, next) => {
  logger.info(`HTTP Request: ${req.method} ${req.url} - Client IP: ${req.ip}`);
  next();
});

// API endpoint to check if a room exists
const { rooms } = require('./game/state');
app.get('/api/rooms/check/:roomId', (req, res) => {
  const roomId = req.params.roomId.toUpperCase();
  const exists = rooms.has(roomId);
  res.json({ exists });
});

// API endpoint to get a random active room
app.get('/api/rooms/random', (req, res) => {
  const activeRooms = Array.from(rooms.keys());
  if (activeRooms.length > 0) {
    const randomRoom = activeRooms[Math.floor(Math.random() * activeRooms.length)];
    res.json({ success: true, roomId: randomRoom });
  } else {
    res.json({ success: false });
  }
});

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client')));

// Setup socket handlers
setupSocketHandlers(io);

// Start server
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Local access: http://localhost:${PORT}`);
    logger.info(`Open http://localhost:${PORT} in multiple browser tabs to play`);
  });
}

module.exports = server; // Export server for integration tests
