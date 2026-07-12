const {
  rooms,
  getOrCreateRoom,
  deleteRoom,
  addPlayer,
  removePlayer,
  getPlayer,
  setCurrentDrawer,
  getNextDrawer,
  resetRound,
  markPlayerGuessed
} = require('../server/game/state');

describe('Room State Management', () => {
  beforeEach(() => {
    // Clear all rooms before each test
    for (const key of rooms.keys()) {
      deleteRoom(key);
    }
  });

  test('should create a room lazily and initialize its state', () => {
    const room = getOrCreateRoom('ROOM_A');
    expect(room).toBeDefined();
    expect(room.id).toBe('ROOM_A');
    expect(room.players).toEqual([]);
    expect(room.isRoundActive).toBe(false);
    expect(room.drawingHistory).toEqual([]);
  });

  test('should add players to a room correctly with initial scores', () => {
    const p1 = addPlayer('socket-1', 'Alice', 'ROOM_A');
    expect(p1.id).toBe('socket-1');
    expect(p1.name).toBe('Alice');
    expect(p1.score).toBe(0);
    expect(p1.hasGuessed).toBe(false);

    const room = getOrCreateRoom('ROOM_A');
    expect(room.players.length).toBe(1);
    expect(room.players[0]).toEqual(p1);
  });

  test('should retrieve player correctly', () => {
    addPlayer('socket-1', 'Alice', 'ROOM_A');
    const player = getPlayer('socket-1', 'ROOM_A');
    expect(player).toBeDefined();
    expect(player.name).toBe('Alice');
  });

  test('should rotate drawer correctly', () => {
    addPlayer('socket-1', 'Alice', 'ROOM_A');
    addPlayer('socket-2', 'Bob', 'ROOM_A');

    // Drawer is initially null
    setCurrentDrawer('ROOM_A', 'socket-1');
    expect(getNextDrawer('ROOM_A')).toBe('socket-2');

    setCurrentDrawer('ROOM_A', 'socket-2');
    expect(getNextDrawer('ROOM_A')).toBe('socket-1');
  });

  test('should reset round properly but preserve scores', () => {
    const room = getOrCreateRoom('ROOM_A');
    const p1 = addPlayer('socket-1', 'Alice', 'ROOM_A');
    p1.score = 150;
    p1.hasGuessed = true;
    
    room.isRoundActive = true;
    room.currentWord = 'apple';
    room.drawingHistory.push({ x0: 0, y0: 0, x1: 10, y1: 10 });
    room.correctGuessers.push('socket-1');

    resetRound('ROOM_A');

    expect(room.isRoundActive).toBe(false);
    expect(room.currentWord).toBeNull();
    expect(room.drawingHistory).toEqual([]);
    expect(room.correctGuessers).toEqual([]);
    expect(p1.hasGuessed).toBe(false);
    expect(p1.score).toBe(150); // Score remains preserved
  });

  test('should remove player and clean up room if empty', () => {
    addPlayer('socket-1', 'Alice', 'ROOM_A');
    expect(rooms.has('ROOM_A')).toBe(true);

    const result = removePlayer('socket-1');
    expect(result.player.name).toBe('Alice');
    expect(rooms.has('ROOM_A')).toBe(false); // Room deleted since it became empty
  });
});
