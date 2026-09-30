# DrawSync: Real-Time Enterprise Multiplayer Drawing & Guessing System

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-v4.7.2-black.svg)](https://socket.io/)
[![Jest](https://img.shields.io/badge/Jest-100%25%20Passing-brightgreen.svg)](https://jestjs.io/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A high-performance, real-time multiplayer drawing and word-guessing web application built using **Node.js**, **Express**, **Socket.IO**, and vanilla **HTML5/CSS3**. Engineered with production-grade software patterns, multi-tenant state isolation, responsive mobile canvas scaling, automated hint letter reveal engines, XSS sanitation, and comprehensive Jest integration tests.

---

## 📸 Live Deployment Links

- **Live Frontend (Vercel)**: [https://client-mocha-one-71.vercel.app](https://client-mocha-one-71.vercel.app)
- **Live Backend (Render)**: [https://drawsync-backend-udfw.onrender.com](https://drawsync-backend-udfw.onrender.com)
- **GitHub Repository**: [https://github.com/ThayanithiR/drawsync](https://github.com/ThayanithiR/drawsync)

---

## 🏗️ Architecture & System Design

DrawSync utilizes an event-driven, pub-sub architecture built on top of WebSockets for low-latency state synchronization across independent rooms.

```
                            ┌────────────────────────┐
                            │  Client Web Browser    │
                            │  (HTML5 / CSS3 / JS)   │
                            └───────────┬────────────┘
                                        │ HTTPS (Static Web Hosting)
                                        ▼
                            ┌────────────────────────┐
                            │     Express Server     │
                            └───────────┬────────────┘
                                        │ WebSockets (Socket.IO bi-directional)
                                        ▼
                            ┌────────────────────────┐
                            │   Socket IO Handler    │
                            └─────┬────────────┬─────┘
                                  │            │
                   Reads/Writes   ▼            ▼   Processes events
                   ┌───────────────────┐    ┌──────────────────┐
                   │   State Manager   │    │    Game Logic    │
                   │(Multi-Room Maps)  │    │(Game Loop/Timer) │
                   └───────────────────┘    └──────────┬───────┘
                                                       │ Audit Logs
                                                       ▼
                                            ┌──────────────────┐
                                            │  Winston Logger  │
                                            │(Console & Files) │
                                            └──────────────────┘
```

### Key Engineering Architecture Patterns
1. **Multi-Tenant State Isolation (`Map` Schema)**:
   - Uses an in-memory `Map` data structure mapping `roomId -> RoomState`.
   - Sockets join distinct Socket.IO rooms (`socket.join(roomId)`), ensuring drawing coordinates and chat messages are isolated to specific lobbies without cross-room leaks.

2. **Event-Driven Asynchronous Pipeline**:
   - Decoupled client-server interaction via strict socket contracts (`join-game`, `draw`, `guess`, `word-hint`, `scoreboard-update`, `round-start`, `round-end`).

3. **Touch-Safe Fixed Aspect-Ratio Canvas Engine**:
   - Standard 4:3 canvas coordinate mapping algorithm using `getBoundingClientRect()` relative normalization:
     $$\text{CanvasX} = (e.clientX - \text{rect.left}) \times \left(\frac{\text{canvas.width}}{\text{rect.width}}\right)$$
   - CSS `touch-action: none;` prevents browser gestures and page scrolling while drawing on mobile screens.

4. **Timed Hint & Letter Masking Engine**:
   - Masks secret words as blank placeholders (e.g., `_ _ _ _ _ (5)`).
   - Automated server timers schedule random letter unmasking (e.g. `_ P _ L _ (5)`) at 22s and 42s into a 60-second round.

5. **Security & XSS Compliance**:
   - HTML entity escaping on incoming raw strings (`<`, `>`, `&`, `"`, `'`).
   - Dynamic DOM nodes rendered via `textContent` / `createTextNode` to prevent client-side injection.

---

## 🌟 Features Overview

- 🎨 **Skribbl-Style Custom Join Screen**: Custom SVG avatar engine with cycling color palettes, eye styles, mouth styles, and dice randomizer.
- 🔒 **Multi-Room Lobby Isolation**: Create private rooms via 4-character codes or auto-join public random rooms.
- 💡 **Dynamic Word Hints & Letter Reveals**: Guesses see word length indicators `_ _ _ _ _ (5)` and letter hints revealed over time.
- ⚡ **Speed-Weighted Scoring**: Base 50 points + speed bonus up to 100 points proportional to remaining time; 20-point drawer bonus per correct guess.
- 📱 **Mobile Responsive Design**: Fully responsive layout with mobile touch support (`touch-action: none;`), fixed 4:3 aspect ratio, and fluid chat/leaderboard stack.
- 📊 **Real-time Leaderboard**: Instant rank and score updates with active drawer and correct guesser badges.
- 📝 **Structured Logging**: Winston logger handling console output and persistent log files (`combined.log`, `error.log`).

---

## 🧪 Automated Testing Suite

Comprehensive integration and unit testing powered by **Jest**.

### Execution
```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js --forceExit
```

### Test Coverage Breakdown
- **`tests/room.test.js`**: State creation, player rotation loops, scoreboard preservation, room cleanup on empty, and `getHintString` word masking algorithms.
- **`tests/room.test.js` / `tests/socket.test.js`**: Multi-client socket connection, event broadcasting, room isolation validation (verifying Room A events do not leak to Room B), and room creation validation.

---

## 🛠️ Local Development Setup

### Prerequisites
- Node.js (v18+)
- npm

### Installation & Run
```bash
# 1. Clone repository
git clone https://github.com/ThayanithiR/drawsync.git
cd drawsync

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Server starts at `http://localhost:3000`.

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for details.
