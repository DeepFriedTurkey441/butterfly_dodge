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
const levelupBox = document.getElementById('levelup');
const levelupNum = document.getElementById('levelup-num');
const levelupDetails = document.getElementById('levelup-details');

// Game control flags
let gameStarted = false;
let running = false;

// Net parameters
const NUM_NETS = 6;
const BASE_NET_SPEED = 1;
const MAX_NET_SPEED = 8;
const SPEED_INCREMENT = (MAX_NET_SPEED - BASE_NET_SPEED) / (NUM_NETS - 1);

// Net SVG (butterfly net: hoop + mesh + handle). Preserves size and red color
const svgMarkup = `
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <clipPath id="netHoop">
        <circle cx="62" cy="38" r="28" />
      </clipPath>
    </defs>
    <!-- Hoop -->
    <circle cx="62" cy="38" r="28" fill="none" stroke="red" stroke-width="4"/>
    <!-- Mesh (simple grid clipped to hoop) -->
    <g clip-path="url(#netHoop)" stroke="red" stroke-width="1.5" opacity="0.9">
      <path d="M34 22 H90 M34 30 H90 M34 38 H90 M34 46 H90 M34 54 H90 M34 62 H90"/>
      <path d="M38 10 V66 M46 10 V66 M54 10 V66 M62 10 V66 M70 10 V66 M78 10 V66"/>
    </g>
    <!-- Handle -->
    <path d="M20 85 L55 55" stroke="red" stroke-width="6" stroke-linecap="round"/>
    <circle cx="18" cy="87" r="3" fill="red"/>
  </svg>
`;

// Hooped area in the SVG viewBox (used for precise collision; ignore handle)
const NET_HOOP = { cx: 62, cy: 38, r: 28, view: 100 };

// Wind SVG (three curved strokes)
const WIND_SVG = `
  <svg viewBox="0 0 120 60" xmlns="http://www.w3.org/2000/svg">
    <!-- Leading-edge micro-curl (hook), no loop; thinner strokes -->
    <path d="M22 45 q -4 -3 -3 -6 q 3 -3 8 -2 C 42 41 80 38 118 35" stroke="#cfd3d6" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M22 30 q -4 -3 -3 -6 q 3 -3 8 -2 C 48 28 86 25 118 21" stroke="#d7dbde" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M22 15 q -4 -3 -3 -6 q 3 -3 8 -2 C 54 13 94 10 118 8" stroke="#e0e4e7" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
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
// Track which levels have shown the level-up announcement overlay
const announcedLevels = new Set();

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

  // Resume from level-up overlay with Enter
  if (levelupBox && !levelupBox.hidden && e.key === 'Enter') {
    levelupBox.hidden = true;
    paused = false;
    updateHUD();
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
      // Pause/resume clouds and music
      if (paused) {
        document.body.classList.add('paused');
        stopMusic();
        setCloudsPaused(true);
      } else {
        document.body.classList.remove('paused');
        startMusic();
        setCloudsPaused(false);
      }
      break;
    case 'q':
      running = false;
      gameOver = true;
      gameOverBox.hidden = false;
      pauseBox.hidden = true;
      lives = 0;
      updateHUD();
      stopMusic();
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
      // When score hits 10 exactly: +1 life and reset score to 0
      if (score >= 10) {
        lives += 1;
        score = 0;
        if (lives >= MAX_LIVES_BEFORE_LEVEL) {
          level++;
          lives = 3;
          if (!muted) sfxLevel();
          updateHUD();
          showLevelUp(level);
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

function showLevelUp(newLevel) {
  if (announcedLevels.has(newLevel)) return;
  announcedLevels.add(newLevel);
  paused = true;
  pauseBox.hidden = true;
  if (levelupNum) levelupNum.textContent = String(newLevel);
  if (levelupDetails) {
    if (newLevel === 2) {
      levelupDetails.textContent = 'Clouds now bump you to a random spot. Watch out!';
    } else if (newLevel === 3) {
      levelupDetails.textContent = 'Clouds still bump you. New: fast winds sweep right→left; colliding pushes you backward. Music speeds up!';
    } else {
      levelupDetails.textContent = 'Difficulty increased.';
    }
    // Announce net size growth
    levelupDetails.textContent += ' Nets grow slightly this level.';
  }
  if (levelupBox) levelupBox.hidden = false;
}

// --- Background Music (simple looping melody) ---
let musicNodes = null;
function startMusic() {
  ensureAudioContext();
  if (musicMuted || !audioCtx || musicNodes) return;
  const master = audioCtx.createGain();
  master.gain.value = musicVolumeSlider ? (Number(musicVolumeSlider.value) / 100) * 0.4 : 0.08;
  master.connect(audioCtx.destination);

  // Helper to convert MIDI to Hz
  const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // Cheerful progression (A section twice, then B, then A):
  // A: C  Am  F  G   |  C  Am  F  G
  // B: Dm G  C  C
  const PROG = [
    { root: 60, min: false }, { root: 57, min: true }, { root: 65, min: false }, { root: 67, min: false },
    { root: 60, min: false }, { root: 57, min: true }, { root: 65, min: false }, { root: 67, min: false },
    { root: 62, min: true },  { root: 67, min: false }, { root: 60, min: false }, { root: 60, min: false }
  ];
  const stepsPerBar = 8;          // 8th notes
  let stepMs = 300;               // ~100 BPM (600ms per beat)

  // Lead voice
  const leadOsc = audioCtx.createOscillator();
  leadOsc.type = 'triangle';
  const leadGain = audioCtx.createGain();
  leadGain.gain.value = 0.0001;
  leadOsc.connect(leadGain).connect(master);
  leadOsc.start();

  // Bass voice
  const bassOsc = audioCtx.createOscillator();
  bassOsc.type = 'sine';
  const bassGain = audioCtx.createGain();
  bassGain.gain.value = 0.0001;
  bassOsc.connect(bassGain).connect(master);
  bassOsc.start();

  // Scales
  const majorPent = [0, 2, 4, 7, 9];
  const minorPent = [0, 3, 5, 7, 10];

  let step = 0;
  const interval = setInterval(() => {
    if (musicMuted) return;
    // Speed up at level 3+
    if (level >= 3) stepMs = 240; // ~125 BPM
    const now = audioCtx.currentTime;
    const bar = Math.floor(step / stepsPerBar) % PROG.length;
    const beatInBar = step % stepsPerBar;
    const chord = PROG[bar];
    const scale = chord.min ? minorPent : majorPent;

    // Bass: root every beat, octave down
    if (beatInBar % 2 === 0) {
      const bassMidi = chord.root - 12;
      bassOsc.frequency.setValueAtTime(midiToFreq(bassMidi), now);
      bassGain.gain.cancelScheduledValues(now);
      bassGain.gain.setValueAtTime(0.0001, now);
      bassGain.gain.exponentialRampToValueAtTime(0.10, now + 0.01);
      bassGain.gain.exponentialRampToValueAtTime(0.0001, now + stepMs / 1000 * 0.9);
    }

    // Lead: phrase patterns with gentle variations
    let degreeIdx;
    const phrasePos = bar % 4; // repeat motifs across sections
    if (phrasePos === 0) degreeIdx = [0,1,2,1,3,2,1,0][beatInBar];
    else if (phrasePos === 1) degreeIdx = [2,3,4,3,2,1,0,1][beatInBar];
    else if (phrasePos === 2) degreeIdx = [1,2,3,4,3,2,1,0][beatInBar];
    else degreeIdx = [4,3,2,1,0,1,2,3][beatInBar];

    // Occasional passing note for variety
    if (Math.random() < 0.12) degreeIdx = Math.max(0, Math.min(scale.length - 1, degreeIdx + (Math.random() < 0.5 ? -1 : 1)));

    const deg = scale[degreeIdx % scale.length];
    const leadMidi = chord.root + deg + 12; // one octave up
    leadOsc.frequency.setValueAtTime(midiToFreq(leadMidi), now);
    leadGain.gain.cancelScheduledValues(now);
    leadGain.gain.setValueAtTime(0.0001, now);
    leadGain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
    leadGain.gain.exponentialRampToValueAtTime(0.0001, now + stepMs / 1000 * 0.8);

    step++;
  }, stepMs);

  musicNodes = { master, interval, leadOsc, leadGain, bassOsc, bassGain };
}

function stopMusic() {
  if (!musicNodes) return;
  clearInterval(musicNodes.interval);
  try { musicNodes.leadOsc.stop(); } catch (_) {}
  try { musicNodes.bassOsc.stop(); } catch (_) {}
  musicNodes = null;
}

function setCloudsPaused(isPaused) {
  const clouds = document.querySelectorAll('.cloud');
  clouds.forEach(c => { c.style.animationPlayState = isPaused ? 'paused' : 'running'; });
}

// --- Level 3 winds helpers ---
let windSpawnAt = 0;
function spawnAndMoveWinds() {
  const now = performance.now();
  if (now > windSpawnAt) {
    // Spawn a wind puff on the right edge ~25% of the time (about half as many)
    if (Math.random() < 0.25) {
      const el = document.createElement('div');
      el.className = 'wind';
      el.style.top = `${Math.random() * (window.innerHeight - 80) + 20}px`;
      el.style.left = `${window.innerWidth + 50}px`;
      el.innerHTML = WIND_SVG;
      document.body.appendChild(el);
      // Animate leftward using dataset speed
      // Reduce speed by ~15% (from 4–8 to ~3.4–6.8)
      el.dataset.vx = String(3.4 + Math.random() * 3.4);
      setTimeout(() => el.remove(), 10000);
    }
    windSpawnAt = now + 500; // try spawn every ~0.5s
  }
  document.querySelectorAll('.wind').forEach(w => {
    const vx = Number(w.dataset.vx || '4');
    const left = parseFloat(w.style.left || w.getBoundingClientRect().left);
    const nx = left - vx;
    w.style.left = nx + 'px';
    if (nx < -200) w.remove();
  });
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
      // Compute collision only against the hoop (ignore the handle)
      const scaleX = m.width / NET_HOOP.view;
      const scaleY = m.height / NET_HOOP.view;
      const hoopX = m.left + NET_HOOP.cx * scaleX;
      const hoopY = m.top + NET_HOOP.cy * scaleY;
      const hoopR = NET_HOOP.r * ((scaleX + scaleY) / 2) * 0.95;

      const cx = b.left + b.width / 2;
      const cy = b.top + b.height / 2;
      const dx = cx - hoopX;
      const dy2 = cy - hoopY;
      if ((dx * dx + dy2 * dy2) < (hoopR * hoopR) && !gameOver) {
        const now = Date.now();
        if (now - lastHitAt > HIT_COOLDOWN_MS) {
          lastHitAt = now;
          lives -= 1;
          if (lives >= MAX_LIVES_BEFORE_LEVEL) {
            // Future-proof: if lives were increased elsewhere and reached threshold
            level++;
            lives = 3;
            showLevelUp(level);
          }
          if (!muted) sfxHit();
          if (lives <= 0) {
            running = false;
            gameOver = true;
            gameOverBox.hidden = false;
            pauseBox.hidden = true;
            lives = 0;
            updateHUD();
            stopMusic();
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

    // Level 2 special rule: clouds bump to random position if collided
    if (level >= 2 && (!levelupBox || levelupBox.hidden)) {
      const b = butterfly.getBoundingClientRect();
      const clouds = document.querySelectorAll('.cloud');
      for (const c of clouds) {
        const r2 = c.getBoundingClientRect();
        const overlap = !(b.right < r2.left || b.left > r2.right || b.bottom < r2.top || b.top > r2.bottom);
        if (overlap) {
          // Random respawn anywhere on screen
          bx = Math.random() * (window.innerWidth - 40);
          by = Math.random() * (window.innerHeight - 40);
          dy = 0;
          butterfly.style.left = bx + 'px';
          butterfly.style.top = by + 'px';
          break;
        }
      }
    }

    // Level 3: sweeping winds push butterfly left on contact
    if (level >= 3 && (!levelupBox || levelupBox.hidden)) {
      spawnAndMoveWinds();
      const b = butterfly.getBoundingClientRect();
      const winds = document.querySelectorAll('.wind');
      for (const w of winds) {
        const r2 = w.getBoundingClientRect();
        const overlap = !(b.right < r2.left || b.left > r2.right || b.bottom < r2.top || b.top > r2.bottom);
        if (overlap) {
          bx = Math.max(0, bx - 15); // push left
          butterfly.style.left = bx + 'px';
          break;
        }
      }
    }
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
    // Scale nets by level: base 1.0, +3% per level beyond 1
    const scale = 1 + Math.max(0, level - 1) * 0.03;
    div.style.transform = `scale(${scale})`;
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
  if (levelupBox) levelupBox.hidden = true;

  // Begin game loop
  requestAnimationFrame(gameLoop);
}

function restartGame() {
  startGame();
}