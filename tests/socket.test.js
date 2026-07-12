const ioClient = require('socket.io-client');
const server = require('../server/index');
const { rooms, deleteRoom } = require('../server/game/state');

let port;

beforeAll((done) => {
  process.env.NODE_ENV = 'test';
  // Start server on a random open port
  server.listen(0, () => {
    port = server.address().port;
    done();
  });
});

afterAll((done) => {
  server.close(done);
});

describe('Socket.IO Game Integration Tests', () => {
  let client1, client2, client3;

  const createClient = (name, roomId) => {
    return ioClient(`http://localhost:${port}`, {
      'reconnection delay': 0,
      'force new connection': true,
      transports: ['websocket'],
    });
  };

  afterEach((done) => {
    // Disconnect any active connections
    if (client1 && client1.connected) client1.disconnect();
    if (client2 && client2.connected) client2.disconnect();
    if (client3 && client3.connected) client3.disconnect();

    // Clear backend rooms
    for (const key of rooms.keys()) {
      deleteRoom(key);
    }
    
    setTimeout(done, 150);
  });

  test('should allow multiple clients to join a room and receive player-joined updates', (done) => {
    client1 = createClient();
    client1.on('connect', () => {
      client1.emit('join-game', { name: 'Alice', roomId: 'ROOM_1' });
    });

    client1.on('game-state', (state) => {
      expect(state.roomId).toBe('ROOM_1');
      expect(state.players.length).toBe(1);
      
      // Connect second client
      client2 = createClient();
      client2.on('connect', () => {
        client2.emit('join-game', { name: 'Bob', roomId: 'ROOM_1' });
      });
      
      client1.on('player-joined', (data) => {
        if (data.player.name === 'Alice') return; // ignore self-join
        expect(data.player.name).toBe('Bob');
        expect(data.totalPlayers).toBe(2);
        done();
      });
    });
  });

  test('should maintain room isolation (ROOM_A events do not leak to ROOM_B)', (done) => {
    client1 = createClient();
    client2 = createClient();
    client3 = createClient();
    
    let client1Connected = false;
    let client2Connected = false;
    let client3Connected = false;

    // Connect client 1 & 2 to ROOM_A, client 3 to ROOM_B
    client1.on('connect', () => {
      client1.emit('join-game', { name: 'Alice', roomId: 'ROOM_A' });
    });
    client2.on('connect', () => {
      client2.emit('join-game', { name: 'Bob', roomId: 'ROOM_A' });
    });
    client3.on('connect', () => {
      client3.emit('join-game', { name: 'Charlie', roomId: 'ROOM_B' });
    });

    // Wait until game states are initialised
    let readyCount = 0;
    const checkReady = () => {
      readyCount++;
      if (readyCount === 3) {
        // Force Alice to be the drawer in ROOM_A so she can emit draw events
        const roomA = rooms.get('ROOM_A');
        roomA.currentDrawer = client1.id;
        roomA.isRoundActive = true;
        
        const drawPayload = { x0: 10, y0: 10, x1: 20, y1: 20, color: '#FF0000', size: 5 };
        
        let client2Received = false;
        let client3Received = false;
        
        client2.on('draw', (data) => {
          expect(data).toEqual(drawPayload);
          client2Received = true;
          
          // Wait a short time to verify Client 3 in Room B never received it
          setTimeout(() => {
            expect(client3Received).toBe(false);
            done();
          }, 100);
        });
        
        client3.on('draw', () => {
          client3Received = true;
        });
        
        client1.emit('draw', drawPayload);
      }
    };

    client1.on('game-state', checkReady);
    client2.on('game-state', checkReady);
    client3.on('game-state', checkReady);
  });
});
