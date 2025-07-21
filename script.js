// Get references to DOM elements
const butterfly = document.getElementById('butterfly');
const nets = document.getElementsByClassName('net');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const levelDisplay = document.getElementById('level');
const gameOverDisplay = document.getElementById('game-over');

// Initial game state
let points = 0;
let lives = 3;
let level = 1;
let butterflyY = window.innerHeight / 2;
let butterflySpeed = 5;
let gameInterval;
let gameRunning = false;

// Update initial displays
scoreDisplay.textContent = `Score: ${points}`;
livesDisplay.textContent = `Lives: ${lives}`;
levelDisplay.textContent = `Level: ${level}`;

// Start the game
function startGame() {
  if (!gameRunning) {
    gameRunning = true;
    gameInterval = setInterval(gameLoop, 20);
  }
}

// Main game loop
function gameLoop() {
  moveButterfly();
  moveNets();
  checkCollision();
}

// Move butterfly vertically based on user input
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    butterflyY -= butterflySpeed;
    if (butterflyY < 0) butterflyY = 0;
    butterfly.style.top = `${butterflyY}px`;
  } else if (e.code === 'ArrowLeft') {
    let left = parseInt(butterfly.style.left || 0, 10);
    if (left > 0) butterfly.style.left = `${left - butterflySpeed}px`;
  } else if (e.code === 'ArrowRight') {
    let left = parseInt(butterfly.style.left || 0, 10);
    if (left < window.innerWidth - 50) butterfly.style.left = `${left + butterflySpeed}px`;
  }
});

// Apply gravity to butterfly
setInterval(() => {
  butterflyY += 2;
  if (butterflyY > window.innerHeight - 40) butterflyY = window.innerHeight - 40;
  butterfly.style.top = `${butterflyY}px`;
}, 30);

// Move nets horizontally across the screen
function moveNets() {
  for (let net of nets) {
    let netLeft = parseInt(net.style.left || window.innerWidth, 10);
    netLeft -= 3; // Net movement speed; adjust for difficulty later
    if (netLeft < -80) {
      netLeft = window.innerWidth + Math.random() * 300;
      net.style.top = `${Math.random() * (window.innerHeight - 100)}px`;
      incrementPoints();
    }
    net.style.left = `${netLeft}px`;
  }
}

// Check collisions between butterfly and nets
function checkCollision() {
  const butterflyRect = butterfly.getBoundingClientRect();
  for (let net of nets) {
    const netRect = net.getBoundingClientRect();
    if (
      butterflyRect.left < netRect.right &&
      butterflyRect.right > netRect.left &&
      butterflyRect.top < netRect.bottom &&
      butterflyRect.bottom > netRect.top
    ) {
      handleCollision();
      break;
    }
  }
}

// Handle collision logic
function handleCollision() {
  lives -= 1;
  updateLivesDisplay();

  if (lives > 0) {
    resetButterflyPosition();
  } else {
    endGame();
  }
}

// Reset butterfly position after collision
function resetButterflyPosition() {
  butterflyY = window.innerHeight / 2;
  butterfly.style.top = `${butterflyY}px`;
  butterfly.style.left = '0px';
}

// Increment points each time net passes butterfly
function incrementPoints() {
  points += 1;
  updatePointsDisplay();
}

// Update points display and handle extra life
function updatePointsDisplay() {
  scoreDisplay.textContent = `Score: ${points}`;

  if (points >= 10) {
    points = 0;
    lives += 1;
    updateLivesDisplay();

    if (lives >= 5 && level === 1) {
      level = 2;
      updateLevelDisplay();
    }
  }
}

// Update lives display
function updateLivesDisplay() {
  livesDisplay.textContent = `Lives: ${lives}`;
}

// Update level display
function updateLevelDisplay() {
  levelDisplay.textContent = `Level: ${level}`;
}

// End the game
function endGame() {
  clearInterval(gameInterval);
  gameRunning = false;
  gameOverDisplay.hidden = false;
  butterfly.hidden = true;
}

// Restart the game after game over
document.addEventListener('keydown', (e) => {
  if (!gameRunning && e.key.toLowerCase() === 'y') {
    restartGame();
  }
});

function restartGame() {
  points = 0;
  lives = 3;
  level = 1;
  butterfly.hidden = false;
  gameOverDisplay.hidden = true;
  resetButterflyPosition();
  updateLivesDisplay();
  updateLevelDisplay();
  updatePointsDisplay();
  startGame();
}

// Initialize positions at game start
resetButterflyPosition();
for (let net of nets) {
  net.style.left = `${window.innerWidth + Math.random() * 500}px`;
  net.style.top = `${Math.random() * (window.innerHeight - 100)}px`;
}

// Begin game loop automatically
startGame();

// Initially pause game until Enter is pressed
gameRunning = false;
clearInterval(gameInterval);

// Listen specifically for Enter key to begin the game
document.addEventListener('keydown', function startOnEnter(e) {
  if (e.key === 'Enter' && !gameRunning) {
    gameOverDisplay.hidden = true; // hide game over message just in case
    butterfly.hidden = false;      // ensure butterfly is visible
    resetButterflyPosition();      // reset initial position
    startGame();                   // start the main game loop
  }
});