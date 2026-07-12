const { rooms, getOrCreateRoom, setCurrentDrawer, getNextDrawer, resetRound, markPlayerGuessed, findRoomBySocketId } = require('./state');
const { getRandomWord } = require('./words');
const logger = require('../utils/logger');

// Escape HTML utility for basic XSS prevention
function escapeHTML(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>"']/g, (match) => {
    const escapes = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;'
    };
    return escapes[match];
  });
}

function startNewRound(io, roomId) {
  const room = getOrCreateRoom(roomId);
  
  // Clear any existing timer
  if (room.roundTimer) {
    clearTimeout(room.roundTimer);
    room.roundTimer = null;
  }
  
  resetRound(roomId);
  
  // Check if we have enough players
  if (room.players.length < 2) {
    logger.info(`Room ${roomId}: Round cannot start. Need at least 2 players.`);
    io.to(roomId).emit('message', {
      type: 'system',
      text: 'Game paused. Need at least 2 players to play.'
    });
    return;
  }
  
  // Get next drawer
  const nextDrawer = getNextDrawer(roomId);
  if (!nextDrawer) return;
  
  setCurrentDrawer(roomId, nextDrawer);
  room.currentWord = getRandomWord();
  room.isRoundActive = true;
  room.roundStartTime = Date.now();
  
  const drawer = room.players.find(p => p.id === nextDrawer);
  const drawerName = drawer ? drawer.name : 'Unknown';
  logger.info(`Room ${roomId}: New round started. Drawer: ${drawerName} (${nextDrawer}), Word: ${room.currentWord}`);
  
  // Notify all players in the room about the new round
  io.to(roomId).emit('round-start', {
    drawerId: nextDrawer,
    roundTime: room.roundTime
  });
  
  // Send word only to the drawer
  io.to(nextDrawer).emit('your-word', {
    word: room.currentWord
  });
  
  // Broadcast initial scoreboard for the round (reset guess indicator)
  io.to(roomId).emit('scoreboard-update', {
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      score: p.score,
      hasGuessed: p.hasGuessed
    }))
  });
  
  // Set timer for round end
  room.roundTimer = setTimeout(() => {
    endRound(io, roomId);
  }, room.roundTime * 1000);
}

function endRound(io, roomId) {
  const room = getOrCreateRoom(roomId);
  if (!room.isRoundActive) return;
  
  const word = room.currentWord;
  
  // Clear timer
  if (room.roundTimer) {
    clearTimeout(room.roundTimer);
    room.roundTimer = null;
  }
  
  resetRound(roomId);
  logger.info(`Room ${roomId}: Round ended. Word was: ${word}`);
  
  // Broadcast round end
  io.to(roomId).emit('round-end', {
    word: word,
    correctGuessers: room.correctGuessers
  });
  
  // Update scoreboard at the end of round
  io.to(roomId).emit('scoreboard-update', {
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      score: p.score,
      hasGuessed: p.hasGuessed
    }))
  });
  
  // Start next round after a delay
  setTimeout(() => {
    // Re-verify room still exists and has enough players before starting
    const activeRoom = rooms.get(roomId);
    if (activeRoom && activeRoom.players.length >= 2) {
      startNewRound(io, roomId);
    }
  }, 5000);
}

function checkGuess(guess, socketId, io) {
  const room = findRoomBySocketId(socketId);
  if (!room) return false;
  if (!room.isRoundActive) return false;
  if (!room.currentWord) return false;
  if (socketId === room.currentDrawer) return false;
  
  const player = room.players.find(p => p.id === socketId);
  if (!player || player.hasGuessed) return false;
  
  // Case-insensitive comparison
  const isCorrect = guess.trim().toLowerCase() === room.currentWord.toLowerCase();
  
  if (isCorrect) {
    markPlayerGuessed(room.id, socketId);
    
    // Scoring Algorithm:
    // Speed points: based on how fast they guessed (percentage of time left * 100) + 50 points base
    const elapsedMs = Date.now() - room.roundStartTime;
    const elapsedSec = elapsedMs / 1000;
    const timeRemaining = Math.max(0, room.roundTime - elapsedSec);
    const speedPoints = Math.round((timeRemaining / room.roundTime) * 100);
    const scoreAwarded = Math.max(50, speedPoints + 50); // min 50, max 150 points
    
    player.score += scoreAwarded;
    logger.info(`Room ${room.id}: Player ${player.name} guessed correctly. Awarded: ${scoreAwarded} points (Speed: ${speedPoints})`);
    
    // Drawer points: 20 points bonus per correct guesser
    const drawer = room.players.find(p => p.id === room.currentDrawer);
    if (drawer) {
      drawer.score += 20;
      logger.info(`Room ${room.id}: Drawer ${drawer.name} awarded 20 points bonus.`);
    }
    
    // Broadcast correct guess
    const escapedName = escapeHTML(player.name);
    io.to(room.id).emit('message', {
      type: 'correct',
      player: escapedName,
      text: `${escapedName} guessed correctly!`
    });
    
    // Broadcast updated scoreboard immediately
    io.to(room.id).emit('scoreboard-update', {
      players: room.players.map(p => ({
        id: p.id,
        name: p.name,
        score: p.score,
        hasGuessed: p.hasGuessed
      }))
    });
    
    // Check if all guessers have guessed correctly
    const guessers = room.players.filter(p => p.id !== room.currentDrawer);
    const allGuessed = guessers.length > 0 && guessers.every(p => p.hasGuessed);
    
    if (allGuessed) {
      logger.info(`Room ${room.id}: All guessers guessed correctly. Ending round early.`);
      endRound(io, room.id);
    }
    
    return true;
  }
  
  return false;
}

module.exports = {
  escapeHTML,
  startNewRound,
  endRound,
  checkGuess
};
