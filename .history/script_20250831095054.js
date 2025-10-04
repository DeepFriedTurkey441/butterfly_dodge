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
const superMsg = document.getElementById('supermsg');
const superMsgText = document.getElementById('supermsg-text');
const skillBox = document.getElementById('skill');
const superTimer = document.getElementById('super-timer');
const leaderboardBox = document.getElementById('leaderboard');
const netMsg = document.getElementById('netmsg');
const flowerMsg = document.getElementById('flowermsg');
const skillMsg = document.getElementById('skillmsg');
function positionSuperTimer() {
  if (!superTimer) return;
  // Place just to the left of the butterfly
  superTimer.style.left = (bx - 28) + 'px';
  superTimer.style.top = (by - 8) + 'px';
}


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
    <circle id="hoop" cx="62" cy="38" r="28" fill="none" stroke="red" stroke-width="4"/>
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
let highestLevelAchieved = 1;
let playerName = null;

// Skill score: running average of flowers collected per left→right pass
let skillPassCount = 0;
let skillFlowersThisPass = 0;
let skillAvgFlowersPerPass = 0; // displayed as 0.000

// Super Butterfly state
let isSuper = false;
let superUntil = 0; // timestamp ms
let superShownFirst = false; // whether the first-time message has been shown
let superActivatedThisLevel = false; // prevent multiple super activations per level
let netMsgShown = false; // whether net tutorial has been shown
let flowerMsgShown = false; // whether flower tutorial has been shown
let skillMsgShown = false; // whether skill score tutorial has been shown
// Super slide state: move butterfly and collided flower together to the left edge
const superSlide = {
  active: false,
  flower: null,
  flowerIndex: -1,
  startX: 0,
  targetX: 0,
  relOffset: 0,
  startAt: 0,
  duration: 420
};

// Developer easter egg: allow starting at any level from instructions screen
let devStartLevel = null; // when set, startGame will use this level instead of 1
let devStartSkill = null; // when set, preserve this skill score instead of resetting to 0

// Developer Mode System
let developerMode = false;
let devModePanel = null;
let debugOverlay = null;
let showCollisionBounds = false;
let invincibilityMode = false;
let infiniteLives = false;

// Simple developer mode activation: Shift + M
let devModeActivationPressed = false;

// Progression rules
const MAX_LIVES_BEFORE_LEVEL = 5; // when lives reaches 5 → level up, lives reset to 3
const NET_SCALE_PER_LEVEL = 0.15; // nets grow 15% per level beyond 1

// Butterfly state & physics
const BASE_SPEED_LEVELS = [1, 3, 6]; // Base speeds before screen scaling
let speedIndex = 0;
let speed = BASE_SPEED_LEVELS[0];
let bx = 0;
let by = window.innerHeight / 2;
let dy = 0;
let paused = false;
let gameOver = false;
let spacePressed = false;

// Dynamic physics scaling based on screen size
function getScreenScaleFactor() {
  // Reference screen width: 1200px (typical laptop)
  // Scale factor increases with screen width to make larger screens more challenging
  const referenceWidth = 1200;
  const currentWidth = window.innerWidth;
  
  // Scale factor: 1.0 at reference size, increases for larger screens
  // Clamp between 0.8 and 2.5 to prevent extreme values
  return Math.max(0.8, Math.min(2.5, currentWidth / referenceWidth));
}

function getScaledGravity() {
  const scaleFactor = getScreenScaleFactor();
  return 0.2 * scaleFactor;
}

function getScaledMaxFallSpeed() {
  const scaleFactor = getScreenScaleFactor();
  return 5 * scaleFactor;
}

function getScaledMaxRiseSpeed() {
  const scaleFactor = getScreenScaleFactor();
  return -5 * scaleFactor;
}

function getScaledSpeed() {
  const scaleFactor = getScreenScaleFactor();
  return BASE_SPEED_LEVELS[speedIndex] * scaleFactor;
}

// Initialize with scaled values
const GRAVITY = getScaledGravity();
const MAX_FALL_SPEED = getScaledMaxFallSpeed();
const MAX_RISE_SPEED = getScaledMaxRiseSpeed();

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
  // Prevent space/enter from toggling the button when it accidentally has focus
  muteSfxBtn.addEventListener('mousedown', (e) => { e.preventDefault(); });
  muteSfxBtn.addEventListener('keydown', (e) => { e.preventDefault(); });
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

// Developer Mode Functions
function checkDeveloperModeToggle(event) {
  // Debug logging
  console.log('Key pressed:', event.key, 'Code:', event.code, 'Shift:', event.shiftKey);
  
  // Shift + M toggles developer mode on/off
  if (event.shiftKey && (event.code === 'KeyM' || (event.key && event.key.toLowerCase() === 'm'))) {
    console.log('Developer mode toggle detected!');
    toggleDeveloperMode();
    return true;
  }
  return false;
}

function toggleDeveloperMode() {
  if (developerMode) {
    deactivateDeveloperMode();
  } else {
    activateDeveloperMode();
  }
}

function activateDeveloperMode() {
  if (developerMode) return; // Already active
  
  developerMode = true;
  console.log('🐛 Developer Mode Activated! Welcome to the backstage.');
  
  // Create developer panel
  createDeveloperPanel();
  
  // Show activation message
  showDeveloperModeMessage('🐛 DEVELOPER MODE ACTIVATED', '#0f0');
}

function deactivateDeveloperMode() {
  if (!developerMode) return; // Already inactive
  
  developerMode = false;
  console.log('🐛 Developer Mode Deactivated. Goodbye!');
  
  // Remove developer panel
  if (devModePanel) {
    devModePanel.remove();
    devModePanel = null;
  }
  
  // Remove debug overlay
  removeDebugOverlay();
  
  // Remove collision bounds
  document.querySelectorAll('.collision-bound').forEach(el => el.remove());
  showCollisionBounds = false;
  
  // Reset cheat modes
  invincibilityMode = false;
  infiniteLives = false;
  
  // Show deactivation message
  showDeveloperModeMessage('🐛 DEVELOPER MODE DEACTIVATED', '#f44');
}

function showDeveloperModeMessage(text, color) {
  const msg = document.createElement('div');
  msg.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 20000;
    background: #000; color: ${color}; padding: 12px 16px;
    border-radius: 8px; font-family: monospace; font-size: 14px;
    box-shadow: 0 4px 12px rgba(0,255,0,0.3);
    animation: devModeFlash 3s ease-out forwards;
  `;
  msg.textContent = text;
  document.body.appendChild(msg);
  
  // Add flash animation if not already present
  if (!document.getElementById('dev-mode-animation')) {
    const style = document.createElement('style');
    style.id = 'dev-mode-animation';
    style.textContent = `
      @keyframes devModeFlash {
        0% { opacity: 0; transform: translateX(100px); }
        20% { opacity: 1; transform: translateX(0); }
        80% { opacity: 1; transform: translateX(0); }
        100% { opacity: 0; transform: translateX(-100px); }
      }
    `;
    document.head.appendChild(style);
  }
  
  setTimeout(() => msg.remove(), 3000);
}

function createDeveloperPanel() {
  devModePanel = document.createElement('div');
  devModePanel.id = 'dev-panel';
  devModePanel.style.cssText = `
    position: fixed; top: 60px; right: 20px; width: 320px; max-height: 80vh;
    background: rgba(0,0,0,0.9); color: #0f0; border: 2px solid #0f0;
    border-radius: 8px; font-family: monospace; font-size: 12px;
    z-index: 15000; overflow-y: auto; transition: all 0.3s ease;
  `;
  
  devModePanel.innerHTML = `
    <div style="background: #0f0; color: #000; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center;">
      <strong>🐛 DEVELOPER MODE</strong>
      <button id="dev-panel-toggle" style="background: none; border: none; color: #000; font-size: 16px; cursor: pointer;">−</button>
    </div>
    <div id="dev-panel-content" style="padding: 12px;">
      <div id="dev-tabs" style="display: flex; margin-bottom: 12px; border-bottom: 1px solid #0f0;">
        <button class="dev-tab active" data-tab="debug">Debug</button>
        <button class="dev-tab" data-tab="cheats">Cheats</button>
        <button class="dev-tab" data-tab="visual">Visual</button>
      </div>
      
      <div id="dev-tab-debug" class="dev-tab-content active">
        <div id="debug-info" style="font-size: 11px; line-height: 1.4;">
          <div>Butterfly: <span id="debug-butterfly">0, 0</span></div>
          <div>Physics: <span id="debug-physics">dy: 0, speed: 1</span></div>
          <div>Level: <span id="debug-level">1</span></div>
          <div>Super: <span id="debug-super">false</span></div>
          <div>Skill: <span id="debug-skill">0.000</span></div>
        </div>
        <label style="display: block; margin: 8px 0;">
          <input type="checkbox" id="debug-overlay-toggle"> Show Debug Overlay
        </label>
      </div>
      
      <div id="dev-tab-cheats" class="dev-tab-content" style="display: none;">
        <label style="display: block; margin: 8px 0;">
          <input type="checkbox" id="invincibility-toggle"> Invincibility
        </label>
        <label style="display: block; margin: 8px 0;">
          <input type="checkbox" id="infinite-lives-toggle"> Infinite Lives
        </label>
        <div style="margin: 8px 0;">
          <label>Jump to Level:</label>
          <input type="number" id="level-jump" min="1" max="99" value="1" style="width: 60px; margin-left: 8px;">
          <button id="level-jump-btn" style="margin-left: 4px;">Go</button>
        </div>
        <button id="super-mode-btn" style="margin: 4px 0;">Activate Super Mode</button>
      </div>
      
      <div id="dev-tab-visual" class="dev-tab-content" style="display: none;">
        <label style="display: block; margin: 8px 0;">
          <input type="checkbox" id="collision-bounds-toggle"> Show Collision Bounds
        </label>
        <label style="display: block; margin: 8px 0;">
          <input type="checkbox" id="grid-overlay-toggle"> Show Grid Overlay
        </label>
      </div>
    </div>
  `;
  
  document.body.appendChild(devModePanel);
  setupDeveloperPanelEvents();
}

function setupDeveloperPanelEvents() {
  // Panel toggle
  document.getElementById('dev-panel-toggle').addEventListener('click', () => {
    const content = document.getElementById('dev-panel-content');
    const toggle = document.getElementById('dev-panel-toggle');
    const isCollapsed = content.style.display === 'none';
    content.style.display = isCollapsed ? 'block' : 'none';
    toggle.textContent = isCollapsed ? '−' : '+';
  });
  
  // Tab switching
  document.querySelectorAll('.dev-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      
      // Update tab buttons
      document.querySelectorAll('.dev-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Update tab content
      document.querySelectorAll('.dev-tab-content').forEach(content => {
        content.style.display = content.id === `dev-tab-${tabName}` ? 'block' : 'none';
      });
    });
  });
  
  // Debug overlay toggle
  document.getElementById('debug-overlay-toggle').addEventListener('change', (e) => {
    if (e.target.checked) {
      createDebugOverlay();
    } else {
      removeDebugOverlay();
    }
  });
  
  // Invincibility toggle
  document.getElementById('invincibility-toggle').addEventListener('change', (e) => {
    invincibilityMode = e.target.checked;
    console.log('Invincibility:', invincibilityMode ? 'ON' : 'OFF');
  });
  
  // Infinite lives toggle
  document.getElementById('infinite-lives-toggle').addEventListener('change', (e) => {
    infiniteLives = e.target.checked;
    console.log('Infinite Lives:', infiniteLives ? 'ON' : 'OFF');
  });
  
  // Level jump
  document.getElementById('level-jump-btn').addEventListener('click', () => {
    const targetLevel = parseInt(document.getElementById('level-jump').value);
    if (targetLevel >= 1 && targetLevel <= 99) {
      level = targetLevel;
      updateHUD();
      updateNetScales();
      console.log(`Jumped to level ${targetLevel}`);
    }
  });
  
  // Super mode activation
  document.getElementById('super-mode-btn').addEventListener('click', () => {
    if (!isSuper) {
      activateSuper(15000);
      console.log('Super mode activated for 15 seconds');
    }
  });
  
  // Collision bounds toggle
  document.getElementById('collision-bounds-toggle').addEventListener('change', (e) => {
    showCollisionBounds = e.target.checked;
    updateCollisionBounds();
  });
}

function createDebugOverlay() {
  if (debugOverlay) return;
  
  debugOverlay = document.createElement('div');
  debugOverlay.id = 'debug-overlay';
  debugOverlay.style.cssText = `
    position: fixed; top: 60px; left: 20px; width: 250px;
    background: rgba(0,0,0,0.8); color: #0ff; border: 1px solid #0ff;
    border-radius: 4px; padding: 8px; font-family: monospace; font-size: 11px;
    z-index: 14000; line-height: 1.3;
  `;
  
  document.body.appendChild(debugOverlay);
}

function removeDebugOverlay() {
  if (debugOverlay) {
    debugOverlay.remove();
    debugOverlay = null;
  }
}

function updateDeveloperMode() {
  if (!developerMode) return;
  
  // Update debug panel info
  if (devModePanel) {
    const debugButterfly = document.getElementById('debug-butterfly');
    const debugPhysics = document.getElementById('debug-physics');
    const debugLevel = document.getElementById('debug-level');
    const debugSuper = document.getElementById('debug-super');
    const debugSkill = document.getElementById('debug-skill');
    
    if (debugButterfly) debugButterfly.textContent = `${Math.round(bx)}, ${Math.round(by)}`;
    if (debugPhysics) debugPhysics.textContent = `dy: ${dy.toFixed(1)}, speed: ${speed}`;
    if (debugLevel) debugLevel.textContent = level;
    if (debugSuper) debugSuper.textContent = isSuper ? 'true' : 'false';
    if (debugSkill) debugSkill.textContent = skillAvgFlowersPerPass.toFixed(3);
  }
  
  // Update debug overlay
  if (debugOverlay) {
    debugOverlay.innerHTML = `
      <strong>🐛 DEBUG INFO</strong><br>
      Position: (${Math.round(bx)}, ${Math.round(by)})<br>
      Velocity: dy=${dy.toFixed(1)}, speed=${speed}<br>
      Level: ${level} | Lives: ${lives} | Points: ${score}<br>
      Super: ${isSuper ? 'YES' : 'NO'} | Skill: ${skillAvgFlowersPerPass.toFixed(3)}<br>
      Nets: ${nets.length} | Flowers: ${flowers.length}<br>
      Screen: ${window.innerWidth}x${window.innerHeight}<br>
      Scale Factor: ${getScreenScaleFactor().toFixed(2)}x<br>
      Scaled Speed: ${getScaledSpeed().toFixed(1)}<br>
      FPS: ${Math.round(1000 / 16)} (approx)<br>
      Invincible: ${invincibilityMode ? 'YES' : 'NO'}<br>
      Infinite Lives: ${infiniteLives ? 'YES' : 'NO'}
    `;
  }
}

function updateCollisionBounds() {
  // Remove existing bounds
  document.querySelectorAll('.collision-bound').forEach(el => el.remove());
  
  if (!showCollisionBounds) return;
  
  // Show butterfly bounds
  const butterflyBounds = butterfly.getBoundingClientRect();
  createBoundingBox(butterflyBounds, '#0f0', 'butterfly');
  
  // Show net bounds
  nets.forEach((net, i) => {
    if (net.el) {
      const netBounds = net.el.getBoundingClientRect();
      createBoundingBox(netBounds, '#f00', `net-${i}`);
    }
  });
  
  // Show flower bounds
  flowers.forEach((flower, i) => {
    if (flower) {
      const flowerBounds = flower.getBoundingClientRect();
      createBoundingBox(flowerBounds, '#ff0', `flower-${i}`);
    }
  });
}

function createBoundingBox(rect, color, id) {
  const box = document.createElement('div');
  box.className = 'collision-bound';
  box.id = `bound-${id}`;
  box.style.cssText = `
    position: fixed; pointer-events: none; z-index: 13000;
    border: 2px solid ${color}; background: transparent;
    left: ${rect.left}px; top: ${rect.top}px;
    width: ${rect.width}px; height: ${rect.height}px;
  `;
  document.body.appendChild(box);
}

// Input handlers
document.addEventListener('keydown', e => {
  // Check for developer mode toggle first (works everywhere)
  if (checkDeveloperModeToggle(e)) {
    return; // Don't process other keys if dev mode was just toggled
  }
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
  // Resume from super message overlay with Enter
  if (superMsg && !superMsg.hidden && e.key === 'Enter') {
    superMsg.hidden = true;
    paused = false;
    updateHUD();
    return;
  }
  // Resume from flower message overlay with Enter
  if (flowerMsg && !flowerMsg.hidden && e.key === 'Enter') {
    flowerMsg.hidden = true;
    paused = false;
    setCloudsPaused(false);
    updateHUD();
    return;
  }
  // Resume from net message overlay with Enter
  if (netMsg && !netMsg.hidden && e.key === 'Enter') {
    netMsg.hidden = true;
    paused = false;
    setCloudsPaused(false);
    updateHUD();
    return;
  }
  // Resume from skill message overlay with Enter
  if (skillMsg && !skillMsg.hidden && e.key === 'Enter') {
    skillMsg.hidden = true;
    paused = false;
    setCloudsPaused(false);
    updateHUD();
    return;
  }

  switch (e.key) {
    case 'ArrowRight':
      speedIndex = Math.min(BASE_SPEED_LEVELS.length - 1, speedIndex + 1);
      speed = getScaledSpeed();
      break;
    case 'ArrowLeft':
      speedIndex = Math.max(0, speedIndex - 1);
      speed = getScaledSpeed();
      break;
    case ' ':
      if (!spacePressed) {
        spacePressed = true;
        const scaleFactor = getScreenScaleFactor();
        dy = Math.max(getScaledMaxRiseSpeed(), dy - 2.5 * scaleFactor);
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
  // If we are mid super slide, skip new flower handling this frame
  if (superSlide.active) return;
  flowers.forEach((f, i) => {
    if (f && isColliding(butterfly, f)) {
      // Flowers add to score (2 points if super; 1 otherwise)
      score += isSuper ? 2 : 1;
      // Track for skill metric (flowers per pass)
      skillFlowersThisPass += 1;
      // First-flower tutorial popup (one-time, skip if developer debug mode)
      if (!flowerMsgShown && flowerMsg && devStartSkill === null) {
        paused = true;
        flowerMsg.hidden = false;
        setCloudsPaused(true);
        flowerMsgShown = true;
      }

      // Show skill score tutorial once (level 4+ only, skip if developer debug mode)
      if (!skillMsgShown && level >= 4 && skillMsg && devStartSkill === null) {
        paused = true;
        skillMsg.hidden = false;
        setCloudsPaused(true);
        skillMsgShown = true;
      }

      // Trigger Super Butterfly on L4+ when Skill average reaches exactly 8.000 (once per level)
      if (!isSuper && !superActivatedThisLevel && level >= 4 && skillAvgFlowersPerPass >= 8.000) {
        activateSuper(15000); // 15 seconds
        superActivatedThisLevel = true; // prevent multiple activations this level
      }

      // While super: handle this collision specially and exit early
      if (isSuper) {
        if (!muted) sfxFlower();
        // Apply score→life rollover while in super mode as well
        if (score >= 10) {
          lives += 1;
          score = 0;
          if (lives >= MAX_LIVES_BEFORE_LEVEL) {
            level++;
            lives = 3;
            if (!muted) sfxLevel();
            updateHUD();
            showLevelUp(level);
            updateNetScales();
          }
        }
        // Begin a slide of butterfly + this flower to the left edge
        const rect = f.getBoundingClientRect();
        const flowerLeft = rect.left;
        superSlide.active = true;
        superSlide.flower = f;
        superSlide.flowerIndex = i;
        superSlide.startX = bx;
        superSlide.targetX = 0;
        superSlide.relOffset = flowerLeft - bx; // keep current spacing
        superSlide.startAt = performance.now();
        f.style.position = 'absolute';
        f.style.zIndex = '2';
        updateHUD();
        return; // prevent normal pop/remove logic
      }
      // pop animation
      f.classList.add('pop');
      if (!muted) sfxFlower();
      // When score reaches 10 or more: +1 life and reset score to 0
      if (score >= 10) {
        lives += 1;
        score = 0;
        if (lives >= MAX_LIVES_BEFORE_LEVEL) {
          level++;
          lives = 3;
          if (!muted) sfxLevel();
          updateHUD();
          showLevelUp(level);
          updateNetScales();
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
  scoreBox.innerText = `Points: ${score}`;
  livesBox.innerText = `Lives: ${lives}`;
  levelBox.innerText = `Level: ${level}`;
  if (skillBox) skillBox.innerText = `Skill: ${skillAvgFlowersPerPass.toFixed(3)}`;
}

function updateNetScales() {
  // From level 11 up, keep nets at level-10 size (no further growth)
  const effectiveLevel = Math.min(level, 10);
  const scale = 1.15 + Math.max(0, effectiveLevel - 1) * NET_SCALE_PER_LEVEL;
  nets.forEach(n => n && n.el && (n.el.style.transform = `scale(${scale})`));
}

function showLevelUp(newLevel) {
  if (announcedLevels.has(newLevel)) return;
  announcedLevels.add(newLevel);
  paused = true;
  pauseBox.hidden = true;
  highestLevelAchieved = Math.max(highestLevelAchieved, newLevel);
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
  const tick = () => {
    if (musicMuted) return;
    // Speed up at level 3+
    const effectiveStepMs = level >= 3 ? 240 : 300; // recompute each tick so tempo responds to level changes
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
    // Schedule next tick using setTimeout so tempo can vary at runtime
    musicNodes.interval = setTimeout(tick, effectiveStepMs);
  };
  musicNodes = { master, leadOsc, leadGain, bassOsc, bassGain, interval: null };
  tick();
}

function stopMusic() {
  if (!musicNodes) return;
  clearTimeout(musicNodes.interval);
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
    // Spawn a wind puff on the right edge ~12.5% of the time (half as many)
    if (Math.random() < 0.125) {
      const el = document.createElement('div');
      el.className = 'wind';
      el.style.top = `${Math.random() * (window.innerHeight - 80) + 20}px`;
      el.style.left = `${window.innerWidth + 50}px`;
      el.innerHTML = WIND_SVG;
      document.body.appendChild(el);
      // Animate leftward using dataset speed
      // Reduce speed by ~25% (from 4–8 to ~3.0–6.0)
      el.dataset.vx = String(3.0 + Math.random() * 3.0);
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
    // Expire Super state
    if (isSuper && performance.now() > superUntil) {
      isSuper = false;
      document.body.classList.remove('super');
      if (superTimer) superTimer.hidden = true;
    }
    // Handle super slide tween
    if (superSlide.active) {
      const now = performance.now();
      const t = Math.min(1, (now - superSlide.startAt) / superSlide.duration);
      bx = superSlide.startX + (superSlide.targetX - superSlide.startX) * t;
      butterfly.style.left = bx + 'px';
      if (superSlide.flower) {
        const fX = bx + superSlide.relOffset;
        superSlide.flower.style.left = fX + 'px';
      }
      if (t >= 1) {
        // Slide finished: remove slid flower and spawn a replacement
        const idx = superSlide.flowerIndex;
        try { superSlide.flower && superSlide.flower.remove(); } catch(_) {}
        if (idx >= 0) {
          const w = window.innerWidth * 0.75;
          const h = window.innerHeight * 0.75;
          const x0 = (window.innerWidth - w) / 2;
          const y0 = (window.innerHeight - h) / 2;
          const nf = document.createElement('div');
          nf.className = 'flower';
          nf.innerText = '🌸';
          nf.style.left = `${x0 + Math.random() * w}px`;
          nf.style.top = `${y0 + Math.random() * h}px`;
          document.body.appendChild(nf);
          flowers[idx] = nf;
        }
        superSlide.active = false;
        superSlide.flower = null;
        superSlide.flowerIndex = -1;
      }
    } else {
      bx += speed;
      if (bx > window.innerWidth) {
        // Completed a left→right pass; update running average and reset counter
        skillPassCount += 1;
        const totalPrev = skillAvgFlowersPerPass * (skillPassCount - 1);
        skillAvgFlowersPerPass = (totalPrev + skillFlowersThisPass) / skillPassCount;
        skillFlowersThisPass = 0;
        if (skillBox) skillBox.innerText = `Skill: ${skillAvgFlowersPerPass.toFixed(3)}`;
        bx = -50;
      }
    }

    const currentGravity = getScaledGravity();
    const currentMaxFall = getScaledMaxFallSpeed();
    const currentMaxRise = getScaledMaxRiseSpeed();
    
    dy = spacePressed
      ? Math.max(currentMaxRise, dy - 0.5 * getScreenScaleFactor())
      : Math.min(currentMaxFall, dy + currentGravity);

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
      // Use the actual rendered <circle> position if available
      let hoopX, hoopY, hoopR;
      if (n.svg) {
        const circle = n.svg.querySelector('#hoop') || n.svg.querySelector('circle');
        const cb = circle.getBoundingClientRect();
        hoopX = cb.left + cb.width / 2;
        hoopY = cb.top + cb.height / 2;
        hoopR = (cb.width / 2) * 0.95;
      } else {
        const scaleX = m.width / NET_HOOP.view;
        const scaleY = m.height / NET_HOOP.view;
        hoopX = m.left + NET_HOOP.cx * scaleX;
        hoopY = m.top + NET_HOOP.cy * scaleY;
        hoopR = NET_HOOP.r * ((scaleX + scaleY) / 2) * 0.95;
      }

      const cx = b.left + b.width / 2;
      const cy = b.top + b.height / 2;
      const dx = cx - hoopX;
      const dy2 = cy - hoopY;
      // Ignore net collisions while super slide is actively pushing left or in invincibility mode
      if ((dx * dx + dy2 * dy2) < (hoopR * hoopR) && !gameOver && !superSlide.active && !invincibilityMode) {
        const now = Date.now();
        if (now - lastHitAt > HIT_COOLDOWN_MS) {
          lastHitAt = now;
          if (!infiniteLives) {
            lives -= 1;
          }
          // Show net tutorial once
          if (!netMsgShown && netMsg) {
            paused = true;
            netMsg.hidden = false;
            setCloudsPaused(true);
            netMsgShown = true;
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
            // Submit best level to leaderboard
            ensurePlayerName();
            if (leaderboardBox) {
              leaderboardBox.textContent = 'Loading Top 10 scores…';
            }
            if (playerName) {
              // Wait for score submission to complete, then fetch updated leaderboard
              postLeaderboard(playerName, highestLevelAchieved).then(() => {
                if (leaderboardBox) {
                  fetchLeaderboard().then(data => {
                    const entries = (data && data.entries) ? data.entries.slice(0, 10) : [];
                    const lines = entries.map((e, i) => `${i+1}. ${e.name} — Level ${e.level}`);
                    leaderboardBox.innerHTML = `<p><strong>Top 10 Scores of all time</strong></p><pre style="text-align:left; display:inline-block;">${lines.join('\n') || 'No scores yet.'}</pre>`;
                  }).catch(() => {
                    leaderboardBox.textContent = 'Unable to load leaderboard.';
                  });
                }
              });
            } else {
              // No player name, just fetch current leaderboard
              if (leaderboardBox) {
                fetchLeaderboard().then(data => {
                  const entries = (data && data.entries) ? data.entries.slice(0, 10) : [];
                  const lines = entries.map((e, i) => `${i+1}. ${e.name} — Level ${e.level}`);
                  leaderboardBox.innerHTML = `<p><strong>Top 10 Scores of all time</strong></p><pre style="text-align:left; display:inline-block;">${lines.join('\n') || 'No scores yet.'}</pre>`;
                }).catch(() => {
                  leaderboardBox.textContent = 'Unable to load leaderboard.';
                });
              }
            }
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
  // Always update/show super timer every frame (even when paused)
  if (superTimer) {
    if (isSuper) {
      const msLeft = Math.max(0, superUntil - performance.now());
      const secsLeft = Math.ceil(msLeft / 1000);
      superTimer.textContent = String(secsLeft);
      superTimer.hidden = false;
      positionSuperTimer();
    } else {
      superTimer.hidden = true;
    }
  }
  
  // Update developer mode (if active)
  updateDeveloperMode();
  if (showCollisionBounds) {
    updateCollisionBounds();
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
    // Scale nets by current level (capped at level 10 size)
    const effectiveLevel = Math.min(level, 10);
    const scale = 1.15 + Math.max(0, effectiveLevel - 1) * NET_SCALE_PER_LEVEL;
    div.style.transform = `scale(${scale})`;
    document.body.appendChild(div);

    const svgEl = div.querySelector('svg');

    let speedY = BASE_NET_SPEED + i * SPEED_INCREMENT;
    if (i >= NUM_NETS - 3) speedY *= 0.7;
    
    // Level 5+ oscillating pendulum properties
    const pendulumProps = level >= 5 ? {
      baseX: cx - 40,                           // Center point for pendulum swing
      pendulumAngle: Math.random() * Math.PI * 2, // Random starting angle
      pendulumSpeed: 0.03 + Math.random() * 0.02, // Angular velocity (0.03-0.05)
      pendulumRadius: 60 + Math.random() * 40      // Swing radius (60-100px)
    } : {};
    
    nets.push({ 
      el: div, 
      svg: svgEl, 
      y: window.innerHeight * 0.25, 
      dir: 1, 
      speedY,
      ...pendulumProps
    });
  }

  // Reset butterfly physics
  bx = 0;
  by = window.innerHeight / 2;
  dy = 0;
  speedIndex = 0;
  speed = getScaledSpeed();
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
  level = devStartLevel != null ? devStartLevel : 1;
  highestLevelAchieved = Math.max(highestLevelAchieved, level);
  // Reset skill metric (preserve developer-set skill for testing)
  skillPassCount = 0;
  skillFlowersThisPass = 0;
  skillAvgFlowersPerPass = devStartSkill !== null ? devStartSkill : 0;
  // Reset super butterfly state for new level
  isSuper = false;
  superUntil = 0;
  superActivatedThisLevel = false; // allow super activation on new level
  if (superTimer) superTimer.hidden = true;
  document.body.classList.remove('super'); // ensure super styling is removed
  // Note: keep superShownFirst false so first time can occur at L4
  updateHUD();
  // Update skill display if developer set a custom skill
  if (devStartSkill !== null && skillBox) {
    skillBox.innerText = `Skill: ${skillAvgFlowersPerPass.toFixed(3)}`;
  }
  updateNetScales();

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
  // Ensure music starts when a new round begins (including restart)
  startMusic();
}

function restartGame() {
  // Reset player name so it gets prompted again for the new game
  playerName = null;
  startGame();
}

// --- Leaderboard client helpers ---
async function postLeaderboard(name, level) {
  try {
    const res = await fetch('https://web-production-0b27.up.railway.app/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, level })
    });
    return await res.json();
  } catch (_) { return null; }
}
async function fetchLeaderboard() {
  try {
    const res = await fetch('https://web-production-0b27.up.railway.app/api/leaderboard');
    return await res.json();
  } catch (_) { return { entries: [] }; }
}

// Prompt name once
function ensurePlayerName() {
  if (!playerName) {
    const n = prompt('Enter a player name (to save your best level):', playerName || '');
    if (n && n.trim()) playerName = n.trim().slice(0, 40);
  }
}

function activateSuper(durationMs) {
  isSuper = true;
  superUntil = performance.now() + durationMs;
  document.body.classList.add('super');
  if (superTimer) {
    superTimer.hidden = false;
    positionSuperTimer();
  }
  if (!superShownFirst) {
    superShownFirst = true;
    if (superMsg && superMsgText) {
      superMsgText.textContent = "Congrats! You achieved a skill score of 8+ and unlocked Super Butterfly! For the next 15 seconds, you get double points and can slide flowers to safety. This can only happen once per level.";
      paused = true;
      superMsg.hidden = false;
    }
  }
}