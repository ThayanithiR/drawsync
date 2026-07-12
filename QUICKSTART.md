# 🚀 QUICK START GUIDE

## Setup (One-time)

1. Open terminal in the `skribbl-clone` folder
2. Run: `npm install`
3. Wait for dependencies to install

## Running the Game

1. Start server: `npm start`
2. Open browser: `http://localhost:3000`
3. Open 2+ tabs to play with yourself OR share the link with friends on same network

## Game Rules

- **Drawer**: Draw the secret word shown at the top
- **Guessers**: Type your guess in the chat
- **Correct guess**: Shows in GREEN and ends round early
- **Timer**: 60 seconds per round
- **Rotation**: Drawer changes after each round

## Tips

- Use different colors and brush sizes for better drawings
- Clear canvas button removes everything
- Game needs minimum 2 players to start
- All players must be on the same network (or use ngrok for remote play)

## Troubleshooting

**"Cannot GET /"** → Server not running, do `npm start`
**Can't draw** → You're not the drawer this round
**No word showing** → You're guessing, not drawing
**Port 3000 in use** → Change port: `PORT=8080 npm start`

---

Have fun! 🎨
