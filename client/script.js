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
// ============================================
// AVATAR CUSTOMIZER & SKRIBBL.IO STATE
// ============================================
const AVATAR_COLORS = [
  { id: 'purple-stripes', bg: '#AF52DE', stripe: true },
  { id: 'green', bg: '#34C759', stripe: false },
  { id: 'yellow', bg: '#FFCC00', stripe: false },
  { id: 'orange', bg: '#FF9500', stripe: false },
  { id: 'red', bg: '#FF3B30', stripe: false },
  { id: 'blue', bg: '#007AFF', stripe: false },
  { id: 'pink', bg: '#FF2D55', stripe: false },
  { id: 'cyan', bg: '#30B0C7', stripe: false }
];

let avatarColorIdx = 0; // Default purple with stripes like the skribbl.io screenshot
let avatarEyesIdx = 0;  // Default stitched eyes
let avatarMouthIdx = 0; // Default stitched mouth

function renderAvatarSVG(colorIdx, eyesIdx, mouthIdx) {
  const col = AVATAR_COLORS[colorIdx % AVATAR_COLORS.length];
  
  let defs = '';
  let fillAttr = col.bg;
  if (col.stripe) {
    defs = `
      <defs>
        <pattern id="avatar-stripes" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="10" stroke="#8A2BE2" stroke-width="4" />
          <line x1="0" y1="0" x2="0" y2="10" stroke="#D175FF" stroke-width="2" />
        </pattern>
      </defs>`;
    fillAttr = 'url(#avatar-stripes)';
  }

  // Eyes SVG paths
  let eyesSVG = '';
  switch (eyesIdx % 6) {
    case 0: // Stitched / cross eyes
      eyesSVG = `
        <line x1="36" y1="42" x2="48" y2="42" stroke="#000" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="42" y1="38" x2="42" y2="46" stroke="#000" stroke-width="3" stroke-linecap="round"/>
        <line x1="62" y1="42" x2="74" y2="42" stroke="#000" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="68" y1="38" x2="68" y2="46" stroke="#000" stroke-width="3" stroke-linecap="round"/>`;
      break;
    case 1: // Normal dots
      eyesSVG = `
        <ellipse cx="42" cy="42" rx="4" ry="5" fill="#000"/>
        <ellipse cx="68" cy="42" rx="4" ry="5" fill="#000"/>`;
      break;
    case 2: // Happy / curved ^ ^
      eyesSVG = `
        <path d="M36 44 Q42 37 48 44" stroke="#000" stroke-width="3.5" stroke-linecap="round" fill="none"/>
        <path d="M62 44 Q68 37 74 44" stroke="#000" stroke-width="3.5" stroke-linecap="round" fill="none"/>`;
      break;
    case 3: // Angry eyes \ /
      eyesSVG = `
        <line x1="36" y1="38" x2="48" y2="44" stroke="#000" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="74" y1="38" x2="62" y2="44" stroke="#000" stroke-width="3.5" stroke-linecap="round"/>
        <circle cx="42" cy="45" r="2.5" fill="#000"/>
        <circle cx="68" cy="45" r="2.5" fill="#000"/>`;
      break;
    case 4: // Cyclops with crown
      eyesSVG = `
        <circle cx="55" cy="42" r="9" fill="#fff" stroke="#000" stroke-width="3"/>
        <circle cx="55" cy="42" r="4.5" fill="#000"/>
        <polygon points="45,18 49,26 55,16 61,26 65,18 63,28 47,28" fill="#FFD700" stroke="#000" stroke-width="2"/>`;
      break;
    case 5: // Cool sunglasses
      eyesSVG = `
        <polygon points="34,38 50,38 47,49 37,49" fill="#000"/>
        <polygon points="60,38 76,38 73,49 63,49" fill="#000"/>
        <line x1="50" y1="41" x2="60" y2="41" stroke="#000" stroke-width="3"/>`;
      break;
  }

  // Mouth SVG paths
  let mouthSVG = '';
  switch (mouthIdx % 6) {
    case 0: // Stitched mouth
      mouthSVG = `
        <line x1="40" y1="62" x2="70" y2="62" stroke="#000" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="45" y1="58" x2="45" y2="66" stroke="#000" stroke-width="2" stroke-linecap="round"/>
        <line x1="50" y1="58" x2="50" y2="66" stroke="#000" stroke-width="2" stroke-linecap="round"/>
        <line x1="55" y1="58" x2="55" y2="66" stroke="#000" stroke-width="2" stroke-linecap="round"/>
        <line x1="60" y1="58" x2="60" y2="66" stroke="#000" stroke-width="2" stroke-linecap="round"/>
        <line x1="65" y1="58" x2="65" y2="66" stroke="#000" stroke-width="2" stroke-linecap="round"/>`;
      break;
    case 1: // Smile
      mouthSVG = `
        <path d="M42 58 Q55 70 68 58" stroke="#000" stroke-width="3.5" stroke-linecap="round" fill="none"/>`;
      break;
    case 2: // Wavy mouth
      mouthSVG = `
        <path d="M42 62 Q48 56 55 62 T68 62" stroke="#000" stroke-width="3" stroke-linecap="round" fill="none"/>`;
      break;
    case 3: // Open O mouth
      mouthSVG = `
        <ellipse cx="55" cy="62" rx="6" ry="8" fill="#4a0e4e" stroke="#000" stroke-width="3"/>`;
      break;
    case 4: // Tongue out
      mouthSVG = `
        <path d="M43 59 Q55 64 67 59" stroke="#000" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M51 61 Q55 72 59 61 Z" fill="#FF3B30" stroke="#000" stroke-width="2"/>`;
      break;
    case 5: // Sad mouth
      mouthSVG = `
        <path d="M43 66 Q55 56 67 66" stroke="#000" stroke-width="3.5" stroke-linecap="round" fill="none"/>`;
      break;
  }

  return `
    <svg viewBox="0 0 110 110" width="110" height="110" xmlns="http://www.w3.org/2000/svg">
      ${defs}
      <!-- Shoulders / Torso -->
      <path d="M22 100 Q26 80 55 80 Q84 80 88 100 Z" fill="${col.bg}" stroke="#000" stroke-width="4.5" stroke-linejoin="round"/>
      <!-- Head -->
      <circle cx="55" cy="50" r="28" fill="${col.bg}" stroke="#000" stroke-width="4.5"/>
      <!-- Pattern overlay if striped -->
      ${col.stripe ? `<circle cx="55" cy="50" r="27" fill="${fillAttr}" />` : ''}
      ${col.stripe ? `<path d="M22 100 Q26 80 55 80 Q84 80 88 100 Z" fill="${fillAttr}" />` : ''}
      <!-- Head border overlay to keep sharp outline -->
      <circle cx="55" cy="50" r="28" fill="none" stroke="#000" stroke-width="4.5"/>
      <path d="M22 100 Q26 80 55 80 Q84 80 88 100 Z" fill="none" stroke="#000" stroke-width="4.5" stroke-linejoin="round"/>
      <!-- Eyes -->
      ${eyesSVG}
      <!-- Mouth -->
      ${mouthSVG}
    </svg>`;
}

// ============================================
// JOIN SCREEN & ROOM MANAGEMENT
// ============================================
function setupJoinScreen() {
  const joinForm = document.getElementById('join-form');
  const playerNameInput = document.getElementById('player-name');
  const roomCodeInput = document.getElementById('room-code');
  const avatarPreview = document.getElementById('avatar-preview');
  const btnCreatePrivate = document.getElementById('btn-create-private');
  const btnDice = document.getElementById('btn-dice');

  // Backend URL helper for API calls
  const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? ''
    : 'https://drawsync-backend-udfw.onrender.com';

  // Render initial avatar
  function updateAvatar() {
    if (avatarPreview) {
      avatarPreview.innerHTML = renderAvatarSVG(avatarColorIdx, avatarEyesIdx, avatarMouthIdx);
    }
  }
  updateAvatar();

  // Avatar Arrow Navigation
  document.getElementById('arrow-color-left')?.addEventListener('click', () => {
    avatarColorIdx = (avatarColorIdx - 1 + AVATAR_COLORS.length) % AVATAR_COLORS.length;
    updateAvatar();
  });
  document.getElementById('arrow-color-right')?.addEventListener('click', () => {
    avatarColorIdx = (avatarColorIdx + 1) % AVATAR_COLORS.length;
    updateAvatar();
  });

  document.getElementById('arrow-eyes-left')?.addEventListener('click', () => {
    avatarEyesIdx = (avatarEyesIdx - 1 + 6) % 6;
    updateAvatar();
  });
  document.getElementById('arrow-eyes-right')?.addEventListener('click', () => {
    avatarEyesIdx = (avatarEyesIdx + 1) % 6;
    updateAvatar();
  });

  document.getElementById('arrow-mouth-left')?.addEventListener('click', () => {
    avatarMouthIdx = (avatarMouthIdx - 1 + 6) % 6;
    updateAvatar();
  });
  document.getElementById('arrow-mouth-right')?.addEventListener('click', () => {
    avatarMouthIdx = (avatarMouthIdx + 1) % 6;
    updateAvatar();
  });

  // Dice randomize
  btnDice?.addEventListener('click', () => {
    avatarColorIdx = Math.floor(Math.random() * AVATAR_COLORS.length);
    avatarEyesIdx = Math.floor(Math.random() * 6);
    avatarMouthIdx = Math.floor(Math.random() * 6);
    updateAvatar();
  });

  // Check URL query parameters (e.g. ?room=ABCD)
  const btnPlay = document.getElementById('btn-play');
  const urlParams = new URLSearchParams(window.location.search);
  const roomFromUrl = urlParams.get('room');
  if (roomFromUrl && roomCodeInput) {
    roomCodeInput.value = roomFromUrl.toUpperCase();
    if (btnPlay) btnPlay.textContent = 'Join Room';
  }

  // Dynamically update button label if room code is typed
  roomCodeInput?.addEventListener('input', () => {
    if (btnPlay) {
      if (roomCodeInput.value.trim().length > 0) {
        btnPlay.textContent = 'Join Room';
      } else {
        btnPlay.textContent = 'Play!';
      }
    }
  });

  // Execution helper
  function executeJoin(roomId, createMode) {
    currentRoomId = roomId;
    initializeGame(roomId, createMode);
  }

  // Form Submit (Play! Button)
  joinForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!joinForm.reportValidity()) return;

    playerName = playerNameInput.value.trim() || 'Player';
    const enteredRoom = roomCodeInput ? roomCodeInput.value.trim().toUpperCase() : '';

    if (enteredRoom) {
      // User entered a room code -> join directly (server validates existence)
      executeJoin(enteredRoom, false);
    } else {
      // User left room code empty -> try to find a random room, fallback to creating one
      try {
        const response = await fetch(`${apiBase}/api/rooms/random`);
        const data = await response.json();

        if (data.success && data.roomId) {
          executeJoin(data.roomId, false);
        } else {
          // No rooms available — create a new one
          let roomId = '';
          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
          for (let i = 0; i < 4; i++) {
            roomId += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          executeJoin(roomId, true);
        }
      } catch (err) {
        console.error('Failed to get random room:', err);
        // Fallback: create a new room if API fails
        let roomId = '';
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        for (let i = 0; i < 4; i++) {
          roomId += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        executeJoin(roomId, true);
      }
    }
  });

  // Create Private Room Button
  btnCreatePrivate?.addEventListener('click', () => {
    if (!joinForm.reportValidity()) return;

    playerName = playerNameInput.value.trim() || 'Player';
    
    // Generate a random 4-character room code
    let roomId = '';
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let i = 0; i < 4; i++) {
      roomId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    executeJoin(roomId, true);
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
  
  // Join the room with player details and customized avatar
  socket.emit('join-game', { 
    name: playerName, 
    roomId: roomId, 
    create: create,
    avatar: { color: avatarColorIdx, eyes: avatarEyesIdx, mouth: avatarMouthIdx }
  });
  
  // Screen switch happens in 'game-state' listener after server confirms the join
}

// ============================================
// SOCKET LISTENERS
// ============================================
function setupSocketListeners() {
  // Initial game state — server confirmed the join
  socket.on('game-state', (data) => {
    updatePlayerCount(data.players.length);
    currentRoomId = data.roomId;
    currentDrawerId = data.currentDrawer;
    
    // Set UI displays
    document.getElementById('display-room-code').textContent = data.roomId;
    
    // Update URL query parameters silently so users can copy the path
    const newUrl = `${window.location.origin}${window.location.pathname}?room=${data.roomId}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);

    // Now switch to game screen (server confirmed join)
    document.getElementById('join-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
  });

  // Server rejected the join (room doesn't exist, etc.)
  socket.on('error-message', (data) => {
    alert(data.text || 'Failed to join room.');
    // Disconnect and stay on join screen
    socket.disconnect();
    socket = null;
  });

  // Socket connection error (server down, CORS, cold start timeout)
  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err);
    alert('Could not connect to game server. Please try again.');
    socket.disconnect();
    socket = null;
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
