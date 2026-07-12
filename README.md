# DrawSync: Enterprise-Grade Real-Time Multiplayer Game

A real-time multiplayer drawing and guessing game built with **Node.js**, **Express**, and **Socket.IO**. Refactored and enhanced with industry-standard design patterns, multi-lobby isolation, structured logging, XSS security compliance, and comprehensive test coverage. 

Designed to demonstrate production-ready engineering practices for the **Deutsche Bank Group (TDI)** role.

---

## 🏗️ Architecture & System Design

DrawSync utilizes an event-driven, pub-sub architecture built around WebSockets for real-time synchronization. The backend maintains an in-memory database of room states and implements a robust game loop.

```
                  ┌────────────────────────┐
                  │      Client Browser    │
                  └───────────┬────────────┘
                              │ HTTPS (Static files: HTML/CSS/JS)
                              ▼
                  ┌────────────────────────┐
                  │      Express Server    │
                  └───────────┬────────────┘
                              │ WebSockets (Socket.IO)
                              ▼
                  ┌────────────────────────┐
                  │   Socket IO Handler    │
                  └─────┬────────────┬─────┘
                        │            │
         Reads/Writes   ▼            ▼   Processes events
         ┌───────────────────┐    ┌──────────────────┐
         │    RoomManager    │    │    Game Logic    │
         │ (State/Scoreboard)│    │(Game Loop/Timer) │
         └───────────────────┘    └──────────┬───────┘
                                             │ Logs events
                                             ▼
                                  ┌──────────────────┐
                                  │  Winston Logger  │
                                  │ (File & Console) │
                                  └──────────────────┘
```

### Key Engineering Patterns
1. **State Isolation (Multi-Lobbies)**: Uses a `Map` structure to represent independent rooms. Sockets join specific Socket.IO namespaces/rooms (e.g. `ROOM_A`), preventing cross-lobby leaks of drawing coordinates or chat guessing.
2. **Event-Driven Execution**: State changes are driven entirely by asynchronous socket events (`join-game`, `draw`, `guess`, `disconnect`), maintaining decoupling between the presentation layer and game logic.
3. **Decoupled Logging (Observability)**: Uses a centralized logger, allowing independent transport formatting (colorized console logs for development vs. structured JSON file logs for production audits).

---

## 🚀 Key Technical Highlights

### 1. Security Compliance (XSS Prevention)
To defend against Cross-Site Scripting (XSS) via usernames or chat guesses:
- **Server-Side Sanitation**: A custom HTML character escaper sanitizes incoming player names and guess strings, replacing characters like `<`, `>`, `&`, `"`, and `'` with safe HTML entities before broadcasting.
- **Client-Side Sanitation**: Dynamically created DOM elements use `textContent` and `createTextNode` instead of vulnerability-prone `innerHTML`, ensuring data is never parsed as executable code by the browser layout engine.

### 2. Algorithmic Scoring & Real-Time Scoreboard
Points are calculated dynamically on the server:
- **Speed-Weighted Guesses**: Guessers receive a base score of 50 points plus up to 100 bonus points proportional to the time remaining in the round (`Math.round((timeLeft / totalTime) * 100)`).
- **Drawer Incentive**: The drawer is awarded a 20-point bonus each time a guesser answers correctly, motivating clear illustrations.
- **Real-Time Sidebar**: Emits `scoreboard-update` events to render players in real-time, sorting by score in descending order.

### 3. Asynchronous Timer Safety & Lifecycle Management
Standard MVP implementations suffer from race conditions (e.g. timers firing after disconnections). DrawSync fixes this:
- **Timer Cleansing**: `clearTimeout` is called immediately on round completion, drawer exit, or when the player count drops below 2.
- **Lobby Pause**: When a player leaves and the count drops below 2, the game gracefully pauses, resetting active parameters and notifying remaining players.
- **Late Joiner Sync**: Sockets store coordinate history (`drawingHistory`) per room on the server. Late-joining players receive a `drawing-history` payload to render existing strokes immediately.

### 4. Enterprise Observability (Winston Logger)
Replaced `console.log` with a production-grade Winston logger:
- Generates `logs/combined.log` for standard audit logging.
- Generates `logs/error.log` for high-severity issues.
- Outputs human-readable colorized logs in the console in development, and JSON output in file logs for easier ingestion into log collectors (e.g., Splunk, ELK stack).

---

## 🧪 Testing Suite

Automated testing is integrated using **Jest** and **Supertest** to ensure reliability and maintainability.

### Running Tests
Run the test suite sequentially to prevent WebSocket port collision:
```bash
npm test
```

### Coverage Areas
1. **Unit Tests (`tests/room.test.js`)**:
   - Lazily initializing room instances.
   - Managing addition and removal of players.
   - Drawer rotation loops (handling index rollover).
   - State reset behavior (e.g. clearing guesses while keeping player score values).
2. **Integration Tests (`tests/socket.test.js`)**:
   - Establishing mock connections using `socket.io-client`.
   - Verifying multi-client synchronization.
   - Validating **Room Isolation** (proving that coordinates drawn in `ROOM_A` are not leaked to players in `ROOM_B`).

---

## 🛠️ Installation & Running Guide

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation
1. Clone or navigate to the project directory:
   ```bash
   cd skribbl-clone
   ```
2. Install dependencies (including Winston, Jest, and Socket.IO client helpers):
   ```bash
   npm install
   ```

### Command Scripts
- **Start Production Server**: `npm start`
- **Start Dev Server**: `npm run dev`
- **Execute Test Suite**: `npm test`

### Running the App
1. Start the server:
   ```bash
   npm start
   ```
2. Open your browser to `http://localhost:3000`.
3. Enter your name and click **Create Room**. Copy the URL with the generated 4-letter room code (e.g., `http://localhost:3000/?room=ABCD`).
4. Paste the URL into another tab or window to join as a second player and start drawing!

---

## 🌐 Production Deployment (Decoupled Vercel + Render)

To demonstrate a modern, scalable web architecture for your resume, host the static client on **Vercel** and the stateful, real-time WebSocket backend on **Render.com**.

### 1. Deploy the Backend (Render.com)
1. Commit your repository to GitHub.
2. Log into Render and click **New +** > **Web Service**.
3. Link your GitHub repository and select the **Free** tier.
4. Set the following configurations:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Go to **Environment Variables** and add:
   - `CLIENT_URL`: `https://your-app-name.vercel.app` (This secures the Socket.IO CORS configuration so only your Vercel frontend can connect).
6. Click **Deploy**. Render will generate a backend service URL (e.g., `https://drawsync-backend.onrender.com`).

### 2. Configure the Client Connection
1. In [client/script.js](file:///c:/Users/Hp/Desktop/skribbl-clone/client/script.js#L101-L105), update the placeholder URL with your Render service URL:
   ```javascript
   const socketUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
     ? ''
     : 'https://your-backend-service-url.onrender.com'; // Insert your Render URL here
   ```
2. Commit and push this change to your repository.

### 3. Deploy the Frontend (Vercel)
1. Log into Vercel and click **Add New** > **Project**.
2. Select your repository.
3. In the project settings, configure:
   - **Root Directory**: `client` (Select the `client` directory so Vercel only compiles and delivers your static assets).
   - **Framework Preset**: `Other`
4. Click **Deploy**. Vercel will provide your live URL (e.g., `https://your-app-name.vercel.app`).

