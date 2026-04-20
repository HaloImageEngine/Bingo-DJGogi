# 🎧 DJ Gogi Bingo

A fun, music-themed **Bingo game** starring DJ Gogi — playable right in your browser with zero dependencies.

## How to Play

1. **Open `index.html`** in any modern web browser.
2. Your 5 × 5 Bingo card is generated randomly at the start of each game.  
   The centre square is a **FREE** space (pre-marked).
3. Click **🎲 Draw!** to call the next item from the DJ Gogi phrase pool.  
   Matching items on your card are **auto-marked** when drawn.  
   You can also **click any cell** to toggle it manually.
4. Score a **Bingo** by completing a row, column, or diagonal.
5. Click **🔄 New Game** (or the button in the victory modal) to shuffle a fresh card.

## Features

- 46-item DJ Gogi themed phrase pool (drops, genres, crowd moments, Gogi catch-phrases)
- Auto-mark cells when an item is called
- Manual cell toggle (click to mark / un-mark)
- Win detection: rows, columns, both diagonals
- Confetti celebration 🎉 and victory modal on Bingo
- All-called items shown as chips so nothing is missed
- Responsive layout — works on desktop and mobile
- Pure HTML / CSS / JavaScript — no build step, no dependencies

## Files

| File | Description |
|------|-------------|
| `index.html` | App shell and layout |
| `style.css` | Dark DJ-themed styles |
| `bingo.js` | Game logic (card generation, win detection, confetti) |

## Running Locally

```bash
# Any static file server works, e.g.:
npx serve .
# Then open http://localhost:3000
```

Or simply open `index.html` directly in your browser (`File → Open File`).
