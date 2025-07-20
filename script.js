// script.js

// DOM refs
const butterfly   = document.getElementById('butterfly');
const scoreBox    = document.getElementById('score');
const gameOverBox = document.getElementById('game-over');
const pauseBox    = document.getElementById('pause-message');

// Net parameters
const NUM_NETS        = 6;
const BASE_NET_SPEED  = 1;
const MAX_NET_SPEED   = 8;
const SPEED_INCREMENT = (MAX_NET_SPEED - BASE_NET_SPEED) / (NUM_NETS - 1);

// Prepare nets
const nets = [];
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
  const cx = (i + 1) * window.innerWidth / (NUM_NETS + 1);
  div.style.left = `${cx - 40}px`;
  div.style.top  = `${window.innerHeight * 0.25}px`;
  div.innerHTML = svgMarkup;
  document.body.appendChild(div);

  let speedY = BASE_NET_SPEED + i * SPEED_INCREMENT;
  if (i >= NUM_NETS - 3) speedY *= 0.7;
  nets.push({ el: div, y: window.innerHeight * 0.25, dir: 1, speedY });
}

// Flower & scoring logic
const flowers = [];
let score = 0;

function isColliding(a, b) {
  const r1 = a.getBoundingClientRect();
  const r2 = b.getBoundingClientRect();
  return !(r1.right < r2.left ||
           r1.left  > r2.right ||
           r1.bottom< r2.top  ||
           r1.top   > r2.bottom);
}

function spawnFlowers() {
  const w  = window.innerWidth * 0.75;
  const h  = window.innerHeight * 0.75;
  const x0 = (window.innerWidth  - w) / 2;
  const y0 = (window.innerHeight - h) / 2;
  for (let i = 0; i < 4; i++) {
    const f = document.createElement('div');
    f.className = 'flower';
    f.innerText = '🌸';
    f.style.left = `${x0 + Math.random() * w}px`;
    f.style.top  = `${y0 + Math.random() * h}px`;
    document.body.appendChild(f);
    flowers.push(f);
  }
}

function checkFlowers() {
  flowers.forEach((f, i) => {
    if (f && isColliding(butterfly, f)) {
      score++;
      scoreBox.innerText = `Score: ${score}`;
      f.remove();
      flowers[i] = null;
      // Spawn a new flower in its place
      const w  = window.innerWidth * 0.75;
      const h  = window.innerHeight * 0.75;
      const x0 = (window.innerWidth  - w) / 2;
      const y0 = (window.innerHeight - h) / 2;
      const newFlower = document.createElement('div');
      newFlower.className = 'flower';
      newFlower.innerText = '🌸';
      newFlower.style.left = `${x0 + Math.random() * w}px`;
      newFlower.style.top  = `${y0 + Math.random() * h}px`;
      document.body.appendChild(newFlower);
      flowers[i] = newFlower;
    }
  });
}

// Butterfly state & physics
const SPEED_LEVELS = [1, 3, 6];
let speedIndex     = 0;
let speed          = SPEED_LEVELS[0];
let bx = 0;
let by = window.innerHeight / 2;
let dy = 0;
let paused       = false;
let running      = true;
let gameOver     = false;
let spacePressed = false;
const GRAVITY        = 0.2;
const MAX_FALL_SPEED = 5;
const MAX_RISE_SPEED = -5;

// Wing animation
let flapInt = null;
let singleFlap = null;
let wingsUp = false;

function stopFlap() {
  clearInterval(flapInt);
  clearTimeout(singleFlap);
  flapInt = singleFlap = null;
}

// Input handlers
document.addEventListener('keydown', e => {
  if (gameOver) {
    if (e.key.toLowerCase() === 'y') restartGame();
    return;
  }
  switch (e.key) {
    case 'ArrowRight':
      speedIndex = Math.min(SPEED_LEVELS.length - 1, speedIndex + 1);
      speed = SPEED_LEVELS[speedIndex];
      break;
    case 'ArrowLeft':
      speedIndex = Math.max(0, speedIndex - 1);
      speed = SPEED_LEVELS[speedIndex];
      break;
    case ' ':
      if (!spacePressed) {
        spacePressed = true;
        dy = Math.max(MAX_RISE_SPEED, dy - 2.5);
        butterfly.textContent = '/\\';
        wingsUp = true;
        singleFlap = setTimeout(() => {
          butterfly.textContent = '\\/';
          wingsUp = false;
        }, 200);
      }
      if (!flapInt) {
        flapInt = setInterval(() => {
          butterfly.textContent = wingsUp ? '\\/' : '/\\';
          wingsUp = !wingsUp;
        }, 200);
      }
      break;
    case 'p':
      paused = !paused;
      pauseBox.hidden = !paused;
      break;
    case 'q':
      running = false;
      gameOver = true;
      gameOverBox.hidden = false;
      pauseBox.hidden    = true;
      stopFlap();
      break;
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

// Main loop
function gameLoop() {
  if (!running) return;
  if (!paused) {
    bx += speed;
    if (bx > window.innerWidth) bx = -50;
    dy = spacePressed ? Math.max(MAX_RISE_SPEED, dy - 0.5) : Math.min(MAX_FALL_SPEED, dy + GRAVITY);
    by = Math.max(0, Math.min(window.innerHeight - 30, by + dy));
    butterfly.style.left = bx + 'px';
    butterfly.style.top  = by + 'px';

    checkFlowers();

    nets.forEach(n => {
      n.y += n.speedY * n.dir;
      if (n.y < 50 || n.y > window.innerHeight - 130) n.dir *= -1;
      n.el.style.top = `${n.y}px`;

      const b = butterfly.getBoundingClientRect();
const m = n.el.getBoundingClientRect();
const cx = b.left + b.width/2;
const cy = b.top  + b.height/2;
const nx = m.left + m.width/2;
const ny = m.top  + m.height/2;
const r  = m.width/2 * 0.9; // collision radius is slightly smaller than net
const dx = cx - nx;
const dy2 = cy - ny;
if (dx*dx + dy2*dy2 < r*r && !gameOver) {
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

spawnFlowers();
gameLoop();

function restartGame() {
  bx = 0;
  by = window.innerHeight / 2;
  dy = 0;
  speedIndex = 0;
  speed = SPEED_LEVELS[0];
  paused = false;
  running = true;
  gameOver = false;
  spacePressed = false;
  butterfly.style.left = bx + 'px';
  butterfly.style.top = by + 'px';

  stopFlap();
  butterfly.textContent = '\\/';
  wingsUp = false;

  score = 0;
  scoreBox.innerText = 'Score: 0';

  flowers.forEach(f => f && f.remove());
  flowers.length = 0;
  spawnFlowers();

  nets.forEach((n, i) => {
    const cx = (i + 1) * window.innerWidth / (NUM_NETS + 1);
    n.y = window.innerHeight * 0.25;
    n.dir = 1;
    n.el.style.left = `${cx - 40}px`;
    n.el.style.top = `${n.y}px`;
  });

  gameOverBox.hidden = true;
  pauseBox.hidden = true;

  requestAnimationFrame(gameLoop);
}
