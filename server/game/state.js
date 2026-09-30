// Multi-room game state manager
const logger = require('../utils/logger');

// Map of roomId -> roomState
const rooms = new Map();

// Helper to find a room by socketId
function findRoomBySocketId(socketId) {
  for (const [roomId, room] of rooms.entries()) {
    if (room.players.some(p => p.id === socketId)) {
      return room;
    }
  }
  return null;
}

function getOrCreateRoom(roomId) {
  if (!roomId) roomId = 'default';
  
  if (!rooms.has(roomId)) {
    logger.info(`Creating room: ${roomId}`);
    rooms.set(roomId, {
      id: roomId,
      players: [], // [{ id, name, score: 0, hasGuessed: false }]
      currentDrawer: null,
      currentWord: null,
      roundTime: 60,
      isRoundActive: false,
      roundTimer: null,
      hintTimers: [],
      revealedIndices: [],
      correctGuessers: [],
      drawingHistory: []
    });
  }
  return rooms.get(roomId);
}

function deleteRoom(roomId) {
  const room = rooms.get(roomId);
  if (room) {
    logger.info(`Deleting room: ${roomId}`);
    if (room.roundTimer) {
      clearTimeout(room.roundTimer);
      room.roundTimer = null;
    }
    if (room.hintTimers && room.hintTimers.length > 0) {
      room.hintTimers.forEach(t => clearTimeout(t));
      room.hintTimers = [];
    }
    rooms.delete(roomId);
  }
}

function addPlayer(socketId, name, roomId = 'default') {
  const room = getOrCreateRoom(roomId);
  
  // Check if player already in room
  let player = room.players.find(p => p.id === socketId);
  if (!player) {
    player = {
      id: socketId,
      name: name,
      score: 0,
      hasGuessed: false
    };
    room.players.push(player);
    logger.info(`Player ${name} (${socketId}) added to room ${roomId}`);
  }
  return player;
}

function removePlayer(socketId) {
  const room = findRoomBySocketId(socketId);
  if (!room) return null;
  
  const index = room.players.findIndex(p => p.id === socketId);
  let player = null;
  if (index !== -1) {
    player = room.players[index];
    room.players.splice(index, 1);
    logger.info(`Player ${player.name} (${socketId}) removed from room ${room.id}`);
  }
  
  // If drawer left, reset drawer and inactive round
  if (room.currentDrawer === socketId) {
    room.currentDrawer = null;
    room.isRoundActive = false;
    if (room.roundTimer) {
      clearTimeout(room.roundTimer);
      room.roundTimer = null;
    }
  }
  
  // Clean up room if empty
  if (room.players.length === 0) {
    deleteRoom(room.id);
  }
  
  return { player, room };
}

function getPlayer(socketId, roomId) {
  const room = roomId ? rooms.get(roomId) : findRoomBySocketId(socketId);
  if (!room) return null;
  return room.players.find(p => p.id === socketId);
}

function setCurrentDrawer(roomId, socketId) {
  const room = rooms.get(roomId);
  if (room) {
    room.currentDrawer = socketId;
    logger.info(`Room ${roomId}: Current drawer set to ${socketId}`);
  }
}

function getNextDrawer(roomId) {
  const room = rooms.get(roomId);
  if (!room || room.players.length === 0) return null;
  
  const currentIndex = room.players.findIndex(p => p.id === room.currentDrawer);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % room.players.length;
  return room.players[nextIndex].id;
}

function resetRound(roomId) {
  const room = rooms.get(roomId);
  if (room) {
    logger.info(`Room ${roomId}: Resetting round`);
    room.isRoundActive = false;
    room.currentWord = null;
    room.correctGuessers = [];
    room.drawingHistory = [];
    room.revealedIndices = [];
    room.players.forEach(p => p.hasGuessed = false);
    if (room.roundTimer) {
      clearTimeout(room.roundTimer);
      room.roundTimer = null;
    }
    if (room.hintTimers && room.hintTimers.length > 0) {
      room.hintTimers.forEach(t => clearTimeout(t));
      room.hintTimers = [];
    }
  }
}

function markPlayerGuessed(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  const player = room.players.find(p => p.id === socketId);
  if (player) {
    player.hasGuessed = true;
    if (!room.correctGuessers.includes(socketId)) {
      room.correctGuessers.push(socketId);
    }
    logger.info(`Room ${roomId}: Player ${player.name} guessed correctly`);
  }
}

module.exports = {
  rooms,
  findRoomBySocketId,
  getOrCreateRoom,
  deleteRoom,
  addPlayer,
  removePlayer,
  getPlayer,
  setCurrentDrawer,
  getNextDrawer,
  resetRound,
  markPlayerGuessed
};
