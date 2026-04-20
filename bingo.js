/**
 * DJ Gogi Bingo – Game Logic
 * A 5×5 Bingo game with DJ / music themed phrases.
 */

'use strict';

// ── DJ Gogi themed Bingo pool (at least 24 + FREE = 25 unique items) ─────────
const BINGO_POOL = [
  // ── DJ craft ──
  'Drop the Bass',
  'Scratch the Record',
  'On the Decks',
  'Mix It Up',
  'Beat Drop',
  'Turn It Up',
  'Fade Out',
  'Vinyl Spin',
  'Beatmatch',
  'Four-on-the-Floor',
  'Crossfade',
  'Sample Flip',
  'Loop It',
  'Reverb Heavy',
  'Sub-woofer Shake',
  // ── Crowd/vibe ──
  'Hands in the Air',
  'Crowd Goes Wild',
  'One More Track',
  'Floor Filler',
  'Encore!',
  'Mosh Pit',
  'Rave Ready',
  'Lights Down',
  'Laser Show',
  'DJ Gogi in the House',
  'Request Denied',
  'VIP Section',
  'After Party',
  'Headphones On',
  'Volume to 11',
  // ── Music genres ──
  'House Music',
  'Techno Vibes',
  'Hip-Hop Beats',
  'EDM Drop',
  'Drum & Bass',
  'Trap Nation',
  'K-Pop Remix',
  '80s Throwback',
  'Reggaeton',
  'Dubstep Wobble',
  // ── Gogi catchphrases ──
  'Gogi Says Drop!',
  'Gogi\'s Anthem',
  'The Gogi Shuffle',
  'Gogi Approved ✓',
  'Gogi Goes Hard',
];

// Ensure pool is large enough
console.assert(BINGO_POOL.length >= 24, 'BINGO_POOL must have at least 24 items');

// ── Utility helpers ───────────────────────────────────────────────────────────

/** Shuffle an array in-place using Fisher-Yates. */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Pick the first n unique items from a shuffled copy of arr. */
function sample(arr, n) {
  return shuffle([...arr]).slice(0, n);
}

// ── Win-pattern definitions (indices 0-24 on the 5×5 grid) ──────────────────
function buildWinPatterns() {
  const patterns = [];
  // Rows
  for (let r = 0; r < 5; r++) {
    patterns.push([0, 1, 2, 3, 4].map(c => r * 5 + c));
  }
  // Columns
  for (let c = 0; c < 5; c++) {
    patterns.push([0, 1, 2, 3, 4].map(r => r * 5 + c));
  }
  // Diagonals
  patterns.push([0, 6, 12, 18, 24]);
  patterns.push([4, 8, 12, 16, 20]);
  return patterns;
}

const WIN_PATTERNS = buildWinPatterns();
const FREE_CELL_INDEX = 12; // centre of 5×5

// ── Game state ────────────────────────────────────────────────────────────────
let cardItems = [];      // array of 25 labels (index 12 = "FREE")
let markedCells = new Set();
let calledItems = [];
let remainingPool = [];
let bingoAchieved = false;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const bingoGrid     = document.getElementById('bingoGrid');
const callerBox     = document.getElementById('callerBox');
const callerText    = document.getElementById('callerText');
const calledList    = document.getElementById('calledList');
const calledCount   = document.getElementById('calledCount');
const drawBtn       = document.getElementById('drawBtn');
const newGameBtn    = document.getElementById('newGameBtn');
const winBanner     = document.getElementById('winBanner');
const winModal      = document.getElementById('winModal');
const winMessage    = document.getElementById('winMessage');
const modalOverlay  = document.getElementById('modalOverlay');
const keepPlayingBtn  = document.getElementById('keepPlayingBtn');
const newGameModalBtn = document.getElementById('newGameModalBtn');

// ── Confetti canvas ───────────────────────────────────────────────────────────
let confettiCanvas, confettiCtx, confettiParticles = [], confettiAnim;

function createConfettiCanvas() {
  confettiCanvas = document.createElement('canvas');
  confettiCanvas.id = 'confettiCanvas';
  confettiCanvas.width  = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
  document.body.appendChild(confettiCanvas);
  confettiCtx = confettiCanvas.getContext('2d');
}

function spawnConfetti() {
  const colors = ['#e94560','#f5a623','#533483','#0f3460','#00d2ff','#fff'];
  const count = window.matchMedia('(max-width: 600px)').matches ? 60 : 100;
  confettiParticles = Array.from({ length: count }, () => ({
    x: Math.random() * confettiCanvas.width,
    y: -10 - Math.random() * 40,
    w: 6 + Math.random() * 8,
    h: 10 + Math.random() * 8,
    color: colors[Math.floor(Math.random() * colors.length)],
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - .5) * .2,
    vx: (Math.random() - .5) * 3,
    vy: 2 + Math.random() * 4,
    gravity: .12,
  }));
}

function animateConfetti() {
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiParticles.forEach(p => {
    p.x  += p.vx;
    p.y  += p.vy;
    p.vy += p.gravity;
    p.angle += p.spin;
    confettiCtx.save();
    confettiCtx.translate(p.x, p.y);
    confettiCtx.rotate(p.angle);
    confettiCtx.fillStyle = p.color;
    confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    confettiCtx.restore();
  });
  confettiParticles = confettiParticles.filter(p => p.y < confettiCanvas.height + 20);
  if (confettiParticles.length > 0) {
    confettiAnim = requestAnimationFrame(animateConfetti);
  } else {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
}

function launchConfetti() {
  if (!confettiCanvas) createConfettiCanvas();
  confettiCanvas.width  = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
  cancelAnimationFrame(confettiAnim);
  spawnConfetti();
  animateConfetti();
}

// ── Game functions ────────────────────────────────────────────────────────────

function initGame() {
  // Build card: 24 random items + FREE in centre
  const picked = sample(BINGO_POOL, 24);
  cardItems = [
    ...picked.slice(0, FREE_CELL_INDEX),
    'FREE',
    ...picked.slice(FREE_CELL_INDEX),
  ];

  markedCells = new Set([FREE_CELL_INDEX]); // FREE is pre-marked
  calledItems = [];
  remainingPool = shuffle([...BINGO_POOL]);
  bingoAchieved = false;

  renderCard();
  renderCalledList();
  callerText.innerHTML = 'Press <strong>Draw!</strong> to start';
  callerBox.classList.remove('flash');
  winBanner.classList.add('hidden');
  hideModal();
  drawBtn.disabled = false;
}

function renderCard() {
  bingoGrid.innerHTML = '';
  cardItems.forEach((label, idx) => {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = idx;
    cell.textContent = label;

    if (idx === FREE_CELL_INDEX) {
      cell.classList.add('free', 'marked');
    } else if (markedCells.has(idx)) {
      cell.classList.add('marked');
    }

    cell.addEventListener('click', () => onCellClick(idx));
    bingoGrid.appendChild(cell);
  });
}

function renderCalledList() {
  calledList.innerHTML = '';
  calledItems.forEach(item => {
    const chip = document.createElement('span');
    chip.className = 'called-chip';
    chip.textContent = item;
    calledList.prepend(chip); // newest first
  });
  calledCount.textContent = `(${calledItems.length})`;
}

function onCellClick(idx) {
  if (idx === FREE_CELL_INDEX) return; // FREE always marked
  if (markedCells.has(idx)) {
    // Toggle off (allow un-marking)
    markedCells.delete(idx);
  } else {
    markedCells.add(idx);
  }
  updateCellDisplay(idx);
  checkWin();
}

function updateCellDisplay(idx) {
  const cell = bingoGrid.querySelector(`[data-index="${idx}"]`);
  if (!cell) return;
  cell.classList.toggle('marked', markedCells.has(idx));
}

function drawItem() {
  if (remainingPool.length === 0) {
    callerText.textContent = '🎉 All items called!';
    drawBtn.disabled = true;
    return;
  }
  const item = remainingPool.pop();
  calledItems.push(item);

  // Flash the caller box
  callerBox.classList.remove('flash');
  void callerBox.offsetWidth; // reflow to restart animation
  callerBox.classList.add('flash');
  callerText.textContent = item;

  // Auto-mark matching cells on the player's card
  cardItems.forEach((label, idx) => {
    if (label === item) {
      markedCells.add(idx);
      updateCellDisplay(idx);
    }
  });

  renderCalledList();
  checkWin();

  if (remainingPool.length === 0) {
    drawBtn.disabled = true;
  }
}

function checkWin() {
  const newWins = WIN_PATTERNS.filter(pattern =>
    pattern.every(idx => markedCells.has(idx))
  );

  if (newWins.length === 0) return;

  // Highlight winning cells
  newWins.flat().forEach(idx => {
    const cell = bingoGrid.querySelector(`[data-index="${idx}"]`);
    if (cell) cell.classList.add('winning');
  });

  if (!bingoAchieved) {
    bingoAchieved = true;
    winBanner.classList.remove('hidden');
    launchConfetti();

    const winType = describeWin(newWins[0]);
    winMessage.textContent = `${winType} — DJ Gogi drops the 🎧!`;
    showModal();
  }
}

function describeWin(pattern) {
  const rows = [[0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24]];
  const cols = [[0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24]];
  const diag1 = [0,6,12,18,24];
  const diag2 = [4,8,12,16,20];

  const key = pattern.join(',');
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].join(',') === key) return `Row ${i + 1} Bingo`;
  }
  for (let i = 0; i < cols.length; i++) {
    if (cols[i].join(',') === key) return `Column ${i + 1} Bingo`;
  }
  if (diag1.join(',') === key) return 'Diagonal Bingo';
  if (diag2.join(',') === key) return 'Diagonal Bingo';
  return 'Bingo';
}

function showModal() {
  winModal.classList.remove('hidden');
  modalOverlay.classList.remove('hidden');
}

function hideModal() {
  winModal.classList.add('hidden');
  modalOverlay.classList.add('hidden');
}

// ── Event listeners ───────────────────────────────────────────────────────────
drawBtn.addEventListener('click', drawItem);
newGameBtn.addEventListener('click', initGame);
keepPlayingBtn.addEventListener('click', hideModal);
newGameModalBtn.addEventListener('click', () => { hideModal(); initGame(); });
modalOverlay.addEventListener('click', hideModal);

window.addEventListener('resize', () => {
  if (confettiCanvas) {
    confettiCanvas.width  = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
});

// ── Kick off ──────────────────────────────────────────────────────────────────
initGame();
