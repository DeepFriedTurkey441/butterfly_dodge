// DOM refs
const butterfly = document.getElementById('butterfly');
const scoreBox = document.getElementById('score');
const livesBox = document.getElementById('lives');
const levelBox = document.getElementById('level');
const gameOverBox = document.getElementById('game-over');
const pauseBox = document.getElementById('pause-message');
const instructionsBox = document.getElementById('instructions');
const gameArea = document.getElementById('game-area');
const muteBtn = document.getElementById('mute-btn');
const muteSfxBtn = document.getElementById('mute-sfx');
const muteMusicBtn = document.getElementById('mute-music');
const musicVolumeSlider = document.getElementById('music-volume');

// Game control flags
let gameStarted = false;
let running = false;

// Net parameters
const NUM_NETS = 6;
const BASE_NET_SPEED = 1;
const MAX_NET_SPEED = 8;
const SPEED_INCREMENT = (MAX_NET_SPEED - BASE_NET_SPEED) / (NUM_NETS - 1);

// Net SVG
const svgMarkup = `
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 25 L50 75 M25 50 L75 50" stroke="red" stroke-width="4"/>
    <path d="M32.5 32.5 L67.5 67.5 M67.5 32.5 L32.5 67.5" stroke="red" stroke-width="4"/>
    <circle cx="50" cy="50" r="25" stroke="red" stroke-width="4" fill="none"/>
  </svg>
`;

// Nets array (will be populated later)
const nets = [];

// Flowers
const flowers = [];
let score = 0;
let lives = 3;
let level = 1;

// Progression rules
const MAX_LIVES_BEFORE_LEVEL = 5; // when lives reaches 5 → level up, lives reset to 3

// Butterfly state & physics
const SPEED_LEVELS = [1, 3, 6];
let speedIndex = 0;
let speed = SPEED_LEVELS[0];
let bx = 0;
let by = window.innerHeight / 2;
let dy = 0;
let paused = false;
let gameOver = false;
let spacePressed = false;
const GRAVITY = 0.2;
const MAX_FALL_SPEED = 5;
const MAX_RISE_SPEED = -5;

// Collision cooldown to prevent multiple life losses in one overlap
const HIT_COOLDOWN_MS = 800;
let lastHitAt = 0;

// Wing animation
let flapInt = null;
let singleFlap = null;
let wingsUp = false;

// Audio (WebAudio beeps)
let muted = false; // SFX
let musicMuted = false;
let audioCtx = null;
function ensureAudioContext() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
}
document.addEventListener('pointerdown', ensureAudioContext, { passive: true });
document.addEventListener('keydown', ensureAudioContext, { passive: true });

function playTone({ frequency = 880, duration = 0.12, type = 'sine', volume = 0.2 }) {
  if (muted || !audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function sfxFlower() { playTone({ frequency: 1000, duration: 0.09, type: 'triangle', volume: 0.18 }); }
function sfxHit()    { playTone({ frequency: 220,  duration: 0.18, type: 'sawtooth', volume: 0.22 }); }
function sfxLevel()  {
  playTone({ frequency: 600, duration: 0.1,  type: 'square', volume: 0.16 });
  setTimeout(() => playTone({ frequency: 800, duration: 0.1, type: 'square', volume: 0.16 }), 110);
  setTimeout(() => playTone({ frequency: 1000, duration: 0.14, type: 'square', volume: 0.16 }), 220);
}

if (muteBtn) {
  muteBtn.addEventListener('click', () => {
    muted = !muted;
    muteBtn.textContent = muted ? '🔇' : '🔊';
  });
}
if (muteSfxBtn) {
  muteSfxBtn.addEventListener('click', () => {
    muted = !muted;
    muteSfxBtn.textContent = muted ? '🔇' : '🔊';
  });
}
if (muteMusicBtn) {
  muteMusicBtn.addEventListener('click', () => {
    musicMuted = !musicMuted;
    muteMusicBtn.textContent = musicMuted ? '🔇' : '🎵';
    if (musicMuted) stopMusic(); else startMusic();
  });
}

function stopFlap() {
  clearInterval(flapInt);
  clearTimeout(singleFlap);
  flapInt = singleFlap = null;
}

// Input handlers
document.addEventListener('keydown', e => {
  // Instructions screen startup
  if (!gameStarted && e.key === 'Enter') {
    instructionsBox.hidden = true;
    instructionsBox.style.display = 'none'; // Safety net
    gameArea.hidden = false;
    gameStarted = true;
    startMusic();
    startGame();
    return;
  }

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
        // visual flap impulse
        butterfly.style.transform = 'scale(1.1) rotate(-6deg)';
        butterfly.textContent = '/\\';
        wingsUp = true;
        singleFlap = setTimeout(() => {
          butterfly.style.transform = 'scale(1) rotate(0deg)';
          butterfly.textContent = '\\/';
          wingsUp = false;
        }, 200);
      }
      if (!flapInt) {
        flapInt = setInterval(() => {
          butterfly.style.transform = wingsUp ? 'scale(1) rotate(0deg)' : 'scale(1.1) rotate(-6deg)';
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
      pauseBox.hidden = true;
      stopFlap();
      break;
  }
});

document.addEventListener('keyup', e => {
  if (e.key === ' ') {
    spacePressed = false;
    stopFlap();
    butterfly.style.transform = 'scale(1) rotate(0deg)';
    butterfly.textContent = '\\/';
    wingsUp = false;
  }
});

// Collision detection
function isColliding(a, b) {
  const r1 = a.getBoundingClientRect();
  const r2 = b.getBoundingClientRect();
  return !(r1.right < r2.left ||
           r1.left > r2.right ||
           r1.bottom < r2.top ||
           r1.top > r2.bottom);
}

// Flower behavior
function spawnFlowers() {
  const w = window.innerWidth * 0.75;
  const h = window.innerHeight * 0.75;
  const x0 = (window.innerWidth - w) / 2;
  const y0 = (window.innerHeight - h) / 2;
  for (let i = 0; i < 4; i++) {
    const f = document.createElement('div');
    f.className = 'flower';
    f.innerText = '🌸';
    f.style.left = `${x0 + Math.random() * w}px`;
    f.style.top = `${y0 + Math.random() * h}px`;
    document.body.appendChild(f);
    flowers.push(f);
  }
}

function checkFlowers() {
  flowers.forEach((f, i) => {
    if (f && isColliding(butterfly, f)) {
      // Flowers add to score
      score++;
      // pop animation
      f.classList.add('pop');
      if (!muted) sfxFlower();
      // When score hits 11 exactly: +1 life and reset score to 0
      if (score >= 11) {
        lives += 1;
        score = 0;
        if (lives >= MAX_LIVES_BEFORE_LEVEL) {
          level++;
          lives = 3;
          if (!muted) sfxLevel();
        }
      }
      updateHUD();
      // remove the old DOM node after the pop completes; do NOT touch flowers[i]
      const oldFlower = f;
      setTimeout(() => {
        oldFlower.remove();
      }, 260);

      const w = window.innerWidth * 0.75;
      const h = window.innerHeight * 0.75;
      const x0 = (window.innerWidth - w) / 2;
      const y0 = (window.innerHeight - h) / 2;
      const newFlower = document.createElement('div');
      newFlower.className = 'flower';
      newFlower.innerText = '🌸';
      newFlower.style.left = `${x0 + Math.random() * w}px`;
      newFlower.style.top = `${y0 + Math.random() * h}px`;
      document.body.appendChild(newFlower);
      flowers[i] = newFlower;
    }
  });
}

function updateHUD() {
  scoreBox.innerText = `Score: ${score}`;
  livesBox.innerText = `Lives: ${lives}`;
  levelBox.innerText = `Level: ${level}`;
}

// --- Background Music (simple looping melody) ---
let musicNodes = null;
function startMusic() {
  ensureAudioContext();
  if (musicMuted || !audioCtx || musicNodes) return;
  const master = audioCtx.createGain();
  master.gain.value = musicVolumeSlider ? (Number(musicVolumeSlider.value) / 100) * 0.4 : 0.08;
  master.connect(audioCtx.destination);

  const notes = [440, 494, 523, 587, 523, 494, 440, 392]; // A B C D C B A G
  const types = ['sine', 'triangle'];
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = types[1];
  gain.gain.value = 0.0001;
  osc.connect(gain).connect(master);
  osc.start();

  let idx = 0;
  const stepMs = 420; // tempo
  const interval = setInterval(() => {
    if (musicMuted) return;
    const now = audioCtx.currentTime;
    const f = notes[idx % notes.length];
    idx++;
    osc.frequency.setValueAtTime(f, now);
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + stepMs / 1000 * 0.9);
  }, stepMs);

  musicNodes = { osc, gain, master, interval };
}

function stopMusic() {
  if (!musicNodes) return;
  clearInterval(musicNodes.interval);
  try { musicNodes.osc.stop(); } catch (_) {}
  musicNodes = null;
}

// Hook music volume slider
if (musicVolumeSlider) {
  musicVolumeSlider.addEventListener('input', () => {
    if (musicNodes) {
      musicNodes.master.gain.value = (Number(musicVolumeSlider.value) / 100) * 0.4;
    }
  });
}

// Main loop
function gameLoop() {
  if (!running) return;
  if (!paused) {
    bx += speed;
    if (bx > window.innerWidth) bx = -50;

    dy = spacePressed
      ? Math.max(MAX_RISE_SPEED, dy - 0.5)
      : Math.min(MAX_FALL_SPEED, dy + GRAVITY);

    by = Math.max(0, Math.min(window.innerHeight - 30, by + dy));
    butterfly.style.left = bx + 'px';
    butterfly.style.top = by + 'px';

    checkFlowers();

    nets.forEach(n => {
      n.y += n.speedY * n.dir;
      if (n.y < 50 || n.y > window.innerHeight - 130) n.dir *= -1;
      n.el.style.top = `${n.y}px`;

      const b = butterfly.getBoundingClientRect();
      const m = n.el.getBoundingClientRect();
      const cx = b.left + b.width / 2;
      const cy = b.top + b.height / 2;
      const nx = m.left + m.width / 2;
      const ny = m.top + m.height / 2;
      const r = m.width / 2 * 0.9;
      const dx = cx - nx;
      const dy2 = cy - ny;
      if (dx * dx + dy2 * dy2 < r * r && !gameOver) {
        const now = Date.now();
        if (now - lastHitAt > HIT_COOLDOWN_MS) {
          lastHitAt = now;
          lives -= 1;
          if (lives >= MAX_LIVES_BEFORE_LEVEL) {
            // Future-proof: if lives were increased elsewhere and reached threshold
            level++;
            lives = 3;
          }
          if (!muted) sfxHit();
          if (lives <= 0) {
            running = false;
            gameOver = true;
            gameOverBox.hidden = false;
            pauseBox.hidden = true;
            stopFlap();
          } else {
            // Update HUD and give the player a fresh position to avoid immediate re-collision
            updateHUD();
            document.body.classList.add('shake');
            setTimeout(() => document.body.classList.remove('shake'), 160);
            bx = 0;
            by = window.innerHeight / 2;
            dy = 0;
            butterfly.style.left = bx + 'px';
            butterfly.style.top = by + 'px';
          }
        }
      }
    });
  }
  requestAnimationFrame(gameLoop);
}

// Game start logic (includes net creation now)
function startGame() {
  // Clear old nets
  nets.forEach(n => n.el.remove());
  nets.length = 0;

  // Create fresh nets
  for (let i = 0; i < NUM_NETS; i++) {
    const div = document.createElement('div');
    div.className = 'net';
    const cx = (i + 1) * window.innerWidth / (NUM_NETS + 1);
    div.style.left = `${cx - 40}px`;
    div.style.top = `${window.innerHeight * 0.25}px`;
    div.innerHTML = svgMarkup;
    document.body.appendChild(div);

    let speedY = BASE_NET_SPEED + i * SPEED_INCREMENT;
    if (i >= NUM_NETS - 3) speedY *= 0.7;
    nets.push({ el: div, y: window.innerHeight * 0.25, dir: 1, speedY });
  }

  // Reset butterfly physics
  bx = 0;
  by = window.innerHeight / 2;
  dy = 0;
  speedIndex = 0;
  speed = SPEED_LEVELS[0];
  paused = false;
  running = true;
  gameOver = false;
  spacePressed = false;
  gameStarted = true;

  // Reset butterfly state
  butterfly.style.left = bx + 'px';
  butterfly.style.top = by + 'px';
  butterfly.textContent = '\\/';
  wingsUp = false;

  // Reset score
  score = 0;
  lives = 3;
  level = 1;
  updateHUD();

  // Clear and respawn flowers
  flowers.forEach(f => f && f.remove());
  flowers.length = 0;
  spawnFlowers();

  // Hide messages
  gameOverBox.hidden = true;
  pauseBox.hidden = true;

  // Begin game loop
  requestAnimationFrame(gameLoop);
}

function restartGame() {
  startGame();
}