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

// Custom request logger middleware
app.use((req, res, next) => {
  logger.info(`HTTP Request: ${req.method} ${req.url} - Client IP: ${req.ip}`);
  next();
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
