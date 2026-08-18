// Client-side game logic
let socket;
let canvas;
let ctx;
let isDrawing = false;
let currentColor = '#000000';
let brushSize = 4;
let playerName = '';
let isPlayerDrawer = false;
let roundTimeRemaining = 0;
let timerInterval = null;
let currentRoomId = '';
let currentDrawerId = null;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  setupJoinScreen();
});

// ============================================
// JOIN SCREEN & ROOM MANAGEMENT
// ============================================
function setupJoinScreen() {
  const joinForm = document.getElementById('join-form');
  const tabCreate = document.getElementById('tab-create');
  const tabJoin = document.getElementById('tab-join');
  const roomCodeGroup = document.getElementById('room-code-group');
  const roomCodeInput = document.getElementById('room-code');
  
  const createActions = document.getElementById('create-actions');
  const joinActions = document.getElementById('join-actions');
  const btnSubmit = document.getElementById('btn-submit');
  const btnJoin = document.getElementById('btn-join');
  const btnJoinRandom = document.getElementById('btn-join-random');
  
  let joinMode = 'create'; // 'create' or 'join'
  
  // Backend URL helper for API calls
  const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? ''
    : 'https://drawsync-backend-udfw.onrender.com';
  
  // Check for room code in URL query string (e.g. ?room=ABCD)
  const urlParams = new URLSearchParams(window.location.search);
  const roomFromUrl = urlParams.get('room');
  
  if (roomFromUrl) {
    joinMode = 'join';
    tabCreate.classList.remove('active');
    tabJoin.classList.add('active');
    roomCodeGroup.classList.remove('hidden');
    roomCodeInput.value = roomFromUrl.toUpperCase();
    roomCodeInput.disabled = true; // Lock it to URL room code
    roomCodeInput.required = true;
    createActions.classList.add('hidden');
    joinActions.classList.remove('hidden');
  }

  // Handle Create Tab click
  tabCreate.addEventListener('click', () => {
    if (roomFromUrl) return; // Disallow tab switching if room is locked from URL
    joinMode = 'create';
    tabJoin.classList.remove('active');
    tabCreate.classList.add('active');
    roomCodeGroup.classList.add('hidden');
    roomCodeInput.required = false;
    roomCodeInput.value = '';
    createActions.classList.remove('hidden');
    joinActions.classList.add('hidden');
  });

  // Handle Join Tab click
  tabJoin.addEventListener('click', () => {
    if (roomFromUrl) return;
    joinMode = 'join';
    tabCreate.classList.remove('active');
    tabJoin.classList.add('active');
    roomCodeGroup.classList.remove('hidden');
    roomCodeInput.required = true;
    createActions.classList.add('hidden');
    joinActions.classList.remove('hidden');
  });

  // Helper to handle client initialization
  function executeJoin(roomId, createMode) {
    currentRoomId = roomId;
    initializeGame(roomId, createMode);
  }

  // Form Submission (handles Create Room)
  joinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (joinMode !== 'create') return;
    
    const nameInput = document.getElementById('player-name');
    playerName = nameInput.value.trim();
    
    if (playerName) {
      // Generate a random 4-character room code
      let roomId = '';
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      for (let i = 0; i < 4; i++) {
        roomId += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      executeJoin(roomId, true);
    }
  });

  // Join Room button click
  btnJoin.addEventListener('click', async () => {
    roomCodeInput.required = true;
    if (!joinForm.reportValidity()) return;
    
    const nameInput = document.getElementById('player-name');
    playerName = nameInput.value.trim();
    const roomId = roomCodeInput.value.trim().toUpperCase();
    
    if (roomId.length !== 4) {
      alert('Please enter a valid 4-character Room Code.');
      return;
    }
    
    try {
      const response = await fetch(`${apiBase}/api/rooms/check/${roomId}`);
      const data = await response.json();
      
      if (data.exists) {
        executeJoin(roomId, false);
      } else {
        alert('Create room first');
      }
    } catch (err) {
      console.error('Failed to check room:', err);
      alert('Server communication error. Please try again.');
    }
  });

  // Join Random Room button click
  btnJoinRandom.addEventListener('click', async () => {
    roomCodeInput.required = false;
    if (!joinForm.reportValidity()) {
      roomCodeInput.required = true;
      return;
    }
    roomCodeInput.required = true;
    
    const nameInput = document.getElementById('player-name');
    playerName = nameInput.value.trim();
    
    try {
      const response = await fetch(`${apiBase}/api/rooms/random`);
      const data = await response.json();
      
      if (data.success && data.roomId) {
        executeJoin(data.roomId, false);
      } else {
        alert('No room available');
      }
    } catch (err) {
      console.error('Failed to get random room:', err);
      alert('Server communication error. Please try again.');
    }
  });
}

// ============================================
// GAME INITIALIZATION
// ============================================
function initializeGame(roomId, create = false) {
  // Connect to socket (Option B: Decoupled Vercel/Render support)
  const socketUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? ''
    : 'https://drawsync-backend-udfw.onrender.com';
    
  socket = io(socketUrl);
  
  // Setup canvas
  canvas = document.getElementById('game-canvas');
  ctx = canvas.getContext('2d');
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Setup event listeners
  setupSocketListeners();
  setupCanvasListeners();
  setupControlListeners();
  setupChatListeners();
  setupCopyLinkListener();
  
  // Join the room
  socket.emit('join-game', { name: playerName, roomId: roomId, create: create });
  
  // Switch to game screen
  document.getElementById('join-screen').classList.remove('active');
  document.getElementById('game-screen').classList.add('active');
}

// ============================================
// SOCKET LISTENERS
// ============================================
function setupSocketListeners() {
  // Initial game state
  socket.on('game-state', (data) => {
    updatePlayerCount(data.players.length);
    currentRoomId = data.roomId;
    currentDrawerId = data.currentDrawer;
    
    // Set UI displays
    document.getElementById('display-room-code').textContent = data.roomId;
    
    // Update URL query parameters silently so users can copy the path
    const newUrl = `${window.location.origin}${window.location.pathname}?room=${data.roomId}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);
  });
  
  // Player joined
  socket.on('player-joined', (data) => {
    addSystemMessage(`${data.player.name} joined the lobby`);
  });
  
  // Player left
  socket.on('player-left', (data) => {
    updatePlayerCount(data.totalPlayers);
    addSystemMessage(`${data.playerName} left the lobby`);
    
    if (data.playerId === currentDrawerId) {
      currentDrawerId = null;
    }
  });

  // Scoreboard Update
  socket.on('scoreboard-update', (data) => {
    updateScoreboard(data.players);
    updatePlayerCount(data.players.length);
  });
  
  // Round start
  socket.on('round-start', (data) => {
    clearCanvas();
    isPlayerDrawer = (data.drawerId === socket.id);
    currentDrawerId = data.drawerId;
    roundTimeRemaining = data.roundTime;
    
    if (isPlayerDrawer) {
      enableDrawingMode();
      updateRoundStatus('You are drawing!');
      document.getElementById('word-display').textContent = '...';
    } else {
      disableDrawingMode();
      updateRoundStatus('Guess the drawing!');
      document.getElementById('word-display').textContent = '';
    }
    
    startTimer();
  });
  
  // Receive word (only for drawer)
  socket.on('your-word', (data) => {
    document.getElementById('word-display').textContent = data.word.toUpperCase();
  });
  
  // Round end
  socket.on('round-end', (data) => {
    stopTimer();
    document.getElementById('word-display').textContent = data.word.toUpperCase();
    updateRoundStatus(`Round over! The word was: ${data.word}`);
    addSystemMessage(`Round ended. Word was: ${data.word}`);
    disableDrawingMode();
    currentDrawerId = null;
  });
  
  // Drawing data
  socket.on('draw', (data) => {
    if (!isPlayerDrawer) {
      drawLine(data.x0, data.y0, data.x1, data.y1, data.color, data.size);
    }
  });

  // Late joiners sync history
  socket.on('drawing-history', (history) => {
    clearCanvas();
    history.forEach(stroke => {
      drawLine(stroke.x0, stroke.y0, stroke.x1, stroke.y1, stroke.color, stroke.size);
    });
  });
  
  // Chat messages
  socket.on('message', (data) => {
    if (data.type === 'correct') {
      addCorrectMessage(data.text);
    } else if (data.type === 'system') {
      addSystemMessage(data.text);
    } else {
      addChatMessage(data.player, data.text);
    }
  });
  
  // Clear canvas
  socket.on('clear-canvas', () => {
    clearCanvas();
  });

  // Handle server errors (e.g. attempting to join a non-existent room)
  socket.on('error-message', (data) => {
    alert(data.text);
    if (socket && socket.connected) {
      socket.disconnect();
    }
    document.getElementById('game-screen').classList.remove('active');
    document.getElementById('join-screen').classList.add('active');
  });
}

// ============================================
// CANVAS LISTENERS (MOUSE & TOUCH)
// ============================================
function setupCanvasListeners() {
  let lastX = 0;
  let lastY = 0;
  
  // Helper to retrieve canvas relative coordinates
  function getCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function startPainting(e) {
    if (!isPlayerDrawer) return;
    isDrawing = true;
    const coords = getCoordinates(e);
    lastX = coords.x;
    lastY = coords.y;
    
    // Prevent scrolling when drawing on touch screens
    if (e.cancelable) e.preventDefault();
  }

  function paint(e) {
    if (!isDrawing || !isPlayerDrawer) return;
    
    const coords = getCoordinates(e);
    drawLine(lastX, lastY, coords.x, coords.y, currentColor, brushSize);
    
    // Emit drawing coordinates
    socket.emit('draw', {
      x0: lastX,
      y0: lastY,
      x1: coords.x,
      y1: coords.y,
      color: currentColor,
      size: brushSize
    });
    
    lastX = coords.x;
    lastY = coords.y;

    if (e.cancelable) e.preventDefault();
  }

  function stopPainting() {
    isDrawing = false;
  }

  // Mouse events
  canvas.addEventListener('mousedown', startPainting);
  canvas.addEventListener('mousemove', paint);
  canvas.addEventListener('mouseup', stopPainting);
  canvas.addEventListener('mouseleave', stopPainting);

  // Touch events for mobile compatibility
  canvas.addEventListener('touchstart', startPainting, { passive: false });
  canvas.addEventListener('touchmove', paint, { passive: false });
  canvas.addEventListener('touchend', stopPainting);
}

// ============================================
// CONTROL LISTENERS
// ============================================
function setupControlListeners() {
  // Brush size range input
  const brushSizeInput = document.getElementById('brush-size');
  const brushSizeValue = document.getElementById('brush-size-value');
  
  brushSizeInput.addEventListener('input', (e) => {
    brushSize = parseInt(e.target.value);
    brushSizeValue.textContent = brushSize;
  });
  
  // Color selection
  const colorButtons = document.querySelectorAll('.color-btn');
  colorButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      colorButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentColor = btn.dataset.color;
    });
  });
  
  // Clear canvas button
  document.getElementById('clear-btn').addEventListener('click', () => {
    if (isPlayerDrawer) {
      socket.emit('clear-canvas');
      clearCanvas();
    }
  });
}

// ============================================
// CHAT LISTENERS
// ============================================
function setupChatListeners() {
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    
    if (message) {
      socket.emit('guess', { guess: message });
      chatInput.value = '';
    }
  });
}

// ============================================
// COPY ROOM LINK WIDGET
// ============================================
function setupCopyLinkListener() {
  const copyBtn = document.getElementById('copy-link-btn');
  const tooltip = document.getElementById('copy-tooltip');
  
  copyBtn.addEventListener('click', () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${currentRoomId}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      // Trigger temporary visual tooltip animation
      tooltip.classList.add('show');
      setTimeout(() => {
        tooltip.classList.remove('show');
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  });
}

// ============================================
// DRAWING FUNCTIONS
// ============================================
function drawLine(x0, y0, x1, y1, color, size) {
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ============================================
// UI UPDATE FUNCTIONS
// ============================================
function updatePlayerCount(count) {
  document.getElementById('player-count').textContent = count;
}

function updateRoundStatus(text) {
  document.getElementById('round-status').textContent = text;
}

function enableDrawingMode() {
  document.getElementById('drawing-controls').classList.remove('hidden');
  document.getElementById('canvas-overlay').classList.remove('active');
  canvas.style.cursor = 'crosshair';
}

function disableDrawingMode() {
  document.getElementById('drawing-controls').classList.add('hidden');
  canvas.style.cursor = 'not-allowed';
}

// Scoreboard Rendering
function updateScoreboard(players) {
  const scoreboardList = document.getElementById('players-list');
  scoreboardList.innerHTML = ''; // clear cards
  
  // Sort players by score descending
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  
  sortedPlayers.forEach((player, index) => {
    const card = document.createElement('div');
    card.className = 'player-card';
    
    // Highlight if player is self
    if (player.id === socket.id) {
      card.classList.add('self');
    }
    
    // Highlight status
    if (player.id === currentDrawerId) {
      card.classList.add('drawing');
    } else if (player.hasGuessed) {
      card.classList.add('guessed');
    }
    
    // Rank number
    const rank = document.createElement('div');
    rank.className = 'player-rank';
    rank.textContent = `#${index + 1}`;
    
    // Player Name
    const nameEl = document.createElement('div');
    nameEl.className = 'player-name';
    nameEl.textContent = player.name;
    
    // Badges/Status Indicators
    const badgeEl = document.createElement('div');
    badgeEl.className = 'player-badge';
    if (player.id === currentDrawerId) {
      badgeEl.textContent = '🎨';
      badgeEl.title = 'Drawing';
    } else if (player.hasGuessed) {
      badgeEl.textContent = '✓';
      badgeEl.title = 'Guessed Correctly';
    }
    
    // Score display
    const scoreEl = document.createElement('div');
    scoreEl.className = 'player-score';
    scoreEl.textContent = `${player.score} pts`;
    
    card.appendChild(rank);
    card.appendChild(nameEl);
    card.appendChild(badgeEl);
    card.appendChild(scoreEl);
    
    scoreboardList.appendChild(card);
  });
}

function startTimer() {
  stopTimer(); // Clear any existing interval
  
  const timerDisplay = document.getElementById('timer');
  timerDisplay.textContent = roundTimeRemaining;
  timerDisplay.classList.remove('warning');
  
  timerInterval = setInterval(() => {
    roundTimeRemaining--;
    timerDisplay.textContent = roundTimeRemaining;
    
    if (roundTimeRemaining <= 10) {
      timerDisplay.classList.add('warning');
    }
    
    if (roundTimeRemaining <= 0) {
      stopTimer();
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// ============================================
// CHAT RENDERING (SECURE / XSS PREVENTED)
// ============================================
function addChatMessage(playerName, text) {
  const chatMessages = document.getElementById('chat-messages');
  const messageDiv = document.createElement('div');
  messageDiv.className = 'chat-message';
  
  const nameSpan = document.createElement('span');
  nameSpan.className = 'player-name';
  nameSpan.textContent = playerName + ': ';
  
  const textNode = document.createTextNode(text);
  
  messageDiv.appendChild(nameSpan);
  messageDiv.appendChild(textNode);
  
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addSystemMessage(text) {
  const chatMessages = document.getElementById('chat-messages');
  const messageDiv = document.createElement('div');
  messageDiv.className = 'chat-message system';
  messageDiv.textContent = text;
  
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addCorrectMessage(text) {
  const chatMessages = document.getElementById('chat-messages');
  const messageDiv = document.createElement('div');
  messageDiv.className = 'chat-message correct';
  messageDiv.textContent = '✓ ' + text;
  
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
