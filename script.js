// script.js

// DOM refs
const butterfly   = document.getElementById('butterfly');
const gameOverBox = document.getElementById('game-over');
const pauseBox    = document.getElementById('pause-message');

// Net parameters
const NUM_NETS        = 6;    // six nets
const BASE_NET_SPEED  = 1;    // leftmost net px/frame
const MAX_NET_SPEED   = 8;    // rightmost net px/frame
const SPEED_INCREMENT = (MAX_NET_SPEED - BASE_NET_SPEED) / (NUM_NETS - 1);
const NET_SIZE        = 80;   // CSS width/height of each .net

// Butterfly speed levels
const SPEED_LEVELS = [1, 3, 6];
let speedIndex     = 0;
let speed          = SPEED_LEVELS[speedIndex];

// Prepare nets
const nets     = [];
const svgMarkup = `
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 25 L50 75 M25 50 L75 50" stroke="red" stroke-width="4"/>
    <path d="M32.5 32.5 L67.5 67.5 M67.5 32.5 L32.5 67.5" stroke="red" stroke-width="4"/>
    <circle cx="50" cy="50" r="25" stroke="red" stroke-width="4" fill="none"/>
  </svg>
`;

for (let i = 0; i < NUM_NETS; i++) {
  const div = document.createElement('div');
  div.className = 'net';
  const centerX = (i + 1) * window.innerWidth / (NUM_NETS + 1);
  div.style.left = `${centerX - NET_SIZE/2}px`;
  div.style.top  = `${window.innerHeight * 0.25}px`;
  div.innerHTML  = svgMarkup;
  document.body.appendChild(div);

  let speedY = BASE_NET_SPEED + i * SPEED_INCREMENT;
  if (i >= NUM_NETS - 3) speedY *= 0.7;  // optional slowdown for rightmost three

  nets.push({ el: div, y: window.innerHeight * 0.25, dir: 1, speedY });
}

// Butterfly state
let bx = 0;
let by = window.innerHeight / 2;
let dy = 0;
let paused = false;
let running = true;
let gameOver = false;
let spacePressed = false;

// Physics
const GRAVITY        = 0.2;
const MAX_FALL_SPEED = 5;
const MAX_RISE_SPEED = -5;

// Wing animation
let flapInterval = null;
let singleFlapTimeout = null;
let wingsUp = false;

// Input
document.addEventListener('keydown', e => {
  if (gameOver) {
    if (e.key.toLowerCase() === 'y') restartGame();
    return;
  }
  if (e.key === 'ArrowRight') {
    speedIndex = Math.min(SPEED_LEVELS.length - 1, speedIndex + 1);
    speed = SPEED_LEVELS[speedIndex];
  }
  else if (e.key === 'ArrowLeft') {
    speedIndex = Math.max(0, speedIndex - 1);
    speed = SPEED_LEVELS[speedIndex];
  }
  else if (e.key === ' ') {
    if (!spacePressed) {
      spacePressed = true;
      dy = Math.max(MAX_RISE_SPEED, dy - 2.5);
      butterfly.textContent = '/\\';
      wingsUp = true;
      singleFlapTimeout = setTimeout(() => {
        butterfly.textContent = '\\/';
        wingsUp = false;
      }, 200);
    }
    if (!flapInterval) {
      flapInterval = setInterval(() => {
        butterfly.textContent = wingsUp ? '\\/' : '/\\';
        wingsUp = !wingsUp;
      }, 200);
    }
  }
  else if (e.key === 'p') {
    paused = !paused;
    pauseBox.hidden = !paused;
  }
  else if (e.key === 'q') {
    running = false;
    gameOver = true;
    gameOverBox.hidden = false;
    pauseBox.hidden    = true;
    stopFlap();
  }
});

document.addEventListener('keyup', e => {
  if (e.key === ' ') {
    spacePressed = false;
    stopFlap();
    butterfly.textContent = '\\/';
    wingsUp = false;
  }
});

function stopFlap() {
  clearInterval(flapInterval);
  clearTimeout(singleFlapTimeout);
  flapInterval = singleFlapTimeout = null;
}

// Main loop
function gameLoop() {
  if (!running) return;
  if (!paused) {
    // Butterfly movement
    bx += speed;
    if (bx > window.innerWidth) bx = -50;
    dy = spacePressed
      ? Math.max(MAX_RISE_SPEED, dy - 0.5)
      : Math.min(MAX_FALL_SPEED, dy + GRAVITY);
    by += dy;
    by = Math.max(0, Math.min(window.innerHeight - 30, by));
    butterfly.style.left = bx + 'px';
    butterfly.style.top  = by + 'px';

    // Nets
    nets.forEach(n => {
      const MIN_Y = 50;
      const MAX_Y = window.innerHeight - 130;
      n.y += n.speedY * n.dir;
      if (n.y < MIN_Y || n.y > MAX_Y) n.dir *= -1;
      n.el.style.top = `${n.y}px`;

      // collision: point vs. circle
      const b = butterfly.getBoundingClientRect();
      const m = n.el.getBoundingClientRect();
      const cx = b.left + b.width/2, cy = b.top + b.height/2;
      const nx = m.left + m.width/2,   ny = m.top  + m.height/2;
      const r  = m.width/2 * 0.9;
      const dx = cx - nx, dyDist = cy - ny;
      if (dx*dx + dyDist*dyDist < r*r && !gameOver) {
        running = false;
        gameOver = true;
        gameOverBox.hidden = false;
        pauseBox.hidden    = true;
        stopFlap();
      }
    });
  }
  requestAnimationFrame(gameLoop);
}

// Start
gameLoop();

function restartGame() {
  bx = 0; by = window.innerHeight / 2; dy = 0;
  speedIndex = 0; speed = SPEED_LEVELS[speedIndex];
  paused = false; running = true; gameOver = false; spacePressed = false;
  stopFlap();
  gameOverBox.hidden = pauseBox.hidden = true;
  butterfly.textContent = '\\/';
  gameLoop();
}