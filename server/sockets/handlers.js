const { rooms, getOrCreateRoom, addPlayer, removePlayer, getPlayer } = require('../game/state');
const { startNewRound, checkGuess, escapeHTML } = require('../game/logic');
const logger = require('../utils/logger');

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    logger.info(`New connection established: ${socket.id}`);
    
    // Handle player joining
    socket.on('join-game', (data) => {
      const rawName = data.name || `Player${Math.floor(Math.random() * 1000)}`;
      const sanitizedName = escapeHTML(rawName.trim());
      // Default to "LOBBY" if no room is provided, strip space and upper case it
      const roomId = (data.roomId || 'LOBBY').trim().toUpperCase();
      
      socket.roomId = roomId;
      socket.playerName = sanitizedName;
      
      // Join Socket.IO room for broadcasting
      socket.join(roomId);
      
      const player = addPlayer(socket.id, sanitizedName, roomId);
      const room = getOrCreateRoom(roomId);
      
      logger.info(`Player ${sanitizedName} (${socket.id}) joined Room: ${roomId}`);
      
      // Send current state of the specific room to joining player
      socket.emit('game-state', {
        players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score, hasGuessed: p.hasGuessed })),
        currentDrawer: room.currentDrawer,
        isRoundActive: room.isRoundActive,
        roomId: roomId
      });
      
      // Sync drawing history to late joiners if round is active
      if (room.isRoundActive && room.drawingHistory.length > 0) {
        socket.emit('drawing-history', room.drawingHistory);
      }
      
      // Broadcast player joining to others in room
      io.to(roomId).emit('player-joined', {
        player: { id: player.id, name: player.name, score: player.score },
        totalPlayers: room.players.length
      });
      
      // Broadcast updated scoreboard to all room members
      io.to(roomId).emit('scoreboard-update', {
        players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score, hasGuessed: p.hasGuessed }))
      });
      
      // Start game if room contains enough players and round is not active
      if (room.players.length >= 2 && !room.isRoundActive) {
        logger.info(`Room ${roomId}: 2 or more players joined. Scheduling round start...`);
        setTimeout(() => {
          // Verify conditions still met after delay
          const activeRoom = rooms.get(roomId);
          if (activeRoom && activeRoom.players.length >= 2 && !activeRoom.isRoundActive) {
            startNewRound(io, roomId);
          }
        }, 2000);
      }
    });
    
    // Handle drawing stroke
    socket.on('draw', (data) => {
      const roomId = socket.roomId;
      if (!roomId) return;
      
      const room = rooms.get(roomId);
      if (!room) return;
      
      // Verify only current drawer is allowed to paint
      if (socket.id !== room.currentDrawer) return;
      
      // Record stroke history for mid-round sync
      room.drawingHistory.push(data);
      
      // Broadcast coordinates to room members (excluding drawer)
      socket.to(roomId).emit('draw', data);
    });
    
    // Handle guesses
    socket.on('guess', (data) => {
      const roomId = socket.roomId;
      if (!roomId) return;
      
      const room = rooms.get(roomId);
      if (!room) return;
      
      const player = getPlayer(socket.id, roomId);
      if (!player) return;
      
      const guess = data.guess;
      if (!guess) return;
      
      // Clean guess string
      const sanitizedGuess = escapeHTML(guess.trim());
      
      // Process guess correctness
      const isCorrect = checkGuess(sanitizedGuess, socket.id, io);
      
      // If incorrect guess, broadcast it to all room members as a chat message
      if (!isCorrect) {
        io.to(roomId).emit('message', {
          type: 'guess',
          player: player.name,
          text: sanitizedGuess
        });
      }
    });
    
    // Handle clear canvas request
    socket.on('clear-canvas', () => {
      const roomId = socket.roomId;
      if (!roomId) return;
      
      const room = rooms.get(roomId);
      if (!room) return;
      
      // Only drawer is authorized to clear the board
      if (socket.id !== room.currentDrawer) return;
      
      room.drawingHistory = [];
      io.to(roomId).emit('clear-canvas');
    });
    
    // Handle client disconnects
    socket.on('disconnect', () => {
      const roomId = socket.roomId;
      if (!roomId) return;
      
      const result = removePlayer(socket.id);
      if (result && result.player) {
        const { player, room } = result;
        logger.info(`Player ${player.name} (${socket.id}) disconnected from room ${roomId}`);
        
        // Notify others in room
        io.to(roomId).emit('player-left', {
          playerId: socket.id,
          playerName: player.name,
          totalPlayers: room.players.length
        });
        
        // Broadcast updated scoreboard to room
        io.to(roomId).emit('scoreboard-update', {
          players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score, hasGuessed: p.hasGuessed }))
        });
        
        // Pause active round if player count drops below 2
        if (room.players.length < 2) {
          logger.info(`Room ${roomId}: Players count below 2. Pausing room.`);
          room.isRoundActive = false;
          if (room.roundTimer) {
            clearTimeout(room.roundTimer);
            room.roundTimer = null;
          }
          io.to(roomId).emit('message', {
            type: 'system',
            text: 'Game paused. Need at least 2 players to play.'
          });
        }
      }
    });
  });
}

module.exports = { setupSocketHandlers };
