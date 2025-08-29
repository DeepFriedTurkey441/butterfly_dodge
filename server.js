// Secure Express backend for Butterfly Dodge leaderboard
const express = require('express');
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const app = express();

// Security Configuration
const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:8080'; // Change this to your domain
const MAX_LEVEL = 1000; // Maximum allowed level to prevent abuse
const MAX_NAME_LENGTH = 40;

// Email Configuration
const ENABLE_EMAIL_NOTIFICATIONS = process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true' || true;
const EMAIL_TO = process.env.EMAIL_TO || 'eric.gates247@gmail.com';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@butterflydodge.com';
const EMAIL_SERVICE = process.env.EMAIL_SERVICE || 'gmail';
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

// Security Headers - Use helmet for basic security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false // Allow embedding for game hosting
}));

// Rate Limiting - Prevent spam and DoS attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const leaderboardLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Limit leaderboard submissions to 10 per minute per IP
  message: {
    error: 'Too many leaderboard submissions, please try again later.'
  }
});

// Apply rate limiting
app.use(limiter);

// Request size limiting and JSON parsing
app.use(express.json({ 
  limit: '10mb', // Prevent large request attacks
  strict: true   // Only parse arrays and objects
}));

// Email transporter configuration
let emailTransporter = null;
if (ENABLE_EMAIL_NOTIFICATIONS && EMAIL_USER && EMAIL_PASS) {
  emailTransporter = nodemailer.createTransporter({
    service: EMAIL_SERVICE,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS
    }
  });
  console.log('📧 Email notifications enabled');
} else {
  console.log('📧 Email notifications disabled (missing credentials)');
}

// Email notification function
async function sendGameplayNotification(playerName, level, isNewRecord = false) {
  if (!emailTransporter || !ENABLE_EMAIL_NOTIFICATIONS) {
    return;
  }

  const subject = isNewRecord ? 
    `🦋 New High Score in Butterfly Dodge! Level ${level}` :
    `🦋 Someone played Butterfly Dodge!`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4CAF50;">🦋 Butterfly Dodge Game Activity</h2>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
        <h3>${isNewRecord ? '🏆 New High Score!' : '🎮 Game Played'}</h3>
        <p><strong>Player:</strong> ${playerName}</p>
        <p><strong>Level Reached:</strong> ${level}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        ${isNewRecord ? '<p style="color: #4CAF50; font-weight: bold;">🎉 This is a new record!</p>' : ''}
      </div>
      <p style="color: #666; font-size: 12px;">
        This notification was sent because someone played your Butterfly Dodge game.
      </p>
    </div>
  `;

  const mailOptions = {
    from: EMAIL_FROM,
    to: EMAIL_TO,
    subject: subject,
    html: htmlContent
  };

  try {
    await emailTransporter.sendMail(mailOptions);
    console.log(`📧 Email notification sent for ${playerName} (Level ${level})`);
  } catch (error) {
    console.error('📧 Email notification failed:', error.message);
  }
}

// Rate limiting for email notifications to prevent spam
let lastEmailTime = 0;
const EMAIL_COOLDOWN = 30000; // 30 seconds between emails

function shouldSendEmail() {
  const now = Date.now();
  if (now - lastEmailTime >= EMAIL_COOLDOWN) {
    lastEmailTime = now;
    return true;
  }
  return false;
}

// File system utilities with basic locking mechanism
const DATA_PATH = path.join(__dirname, 'leaderboard.json');
let fileLock = false;

async function readBoard() {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Could not read leaderboard file:', error.message);
    return { players: {} };
  }
}

async function writeBoard(data) {
  // Simple file locking to prevent concurrent writes
  while (fileLock) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  fileLock = true;
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing leaderboard file:', error.message);
    throw error;
  } finally {
    fileLock = false;
  }
}

// CORS Configuration - Allow local development
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Allow requests from configured origin, localhost variants, or GitHub Pages
  const allowedOrigins = [
    ALLOWED_ORIGIN,
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://deepfriedturkey441.github.io'
  ];
  
  if (!origin || origin === 'null' || allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Input validation middleware
function validateLeaderboardInput(req, res, next) {
  const { name, level } = req.body || {};
  
  // Validate name
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ 
      error: 'Name is required and must be a non-empty string' 
    });
  }
  
  if (name.trim().length > MAX_NAME_LENGTH) {
    return res.status(400).json({ 
      error: `Name must be ${MAX_NAME_LENGTH} characters or less` 
    });
  }
  
  // Validate level
  if (typeof level !== 'number' || !Number.isInteger(level)) {
    return res.status(400).json({ 
      error: 'Level must be a valid integer' 
    });
  }
  
  if (level < 1 || level > MAX_LEVEL) {
    return res.status(400).json({ 
      error: `Level must be between 1 and ${MAX_LEVEL}` 
    });
  }
  
  // Sanitize name - remove potentially harmful characters
  req.body.name = name.trim().replace(/[<>\"']/g, '');
  
  next();
}

// Routes

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GET leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    const data = await readBoard();
    const entries = Object.entries(data.players)
      .map(([name, level]) => ({ name, level }))
      .sort((a, b) => b.level - a.level || a.name.localeCompare(b.name))
      .slice(0, 100); // Limit to top 100 to prevent large responses
    
    res.json({ 
      entries,
      count: entries.length,
      lastUpdated: data.lastUpdated || null
    });
  } catch (error) {
    console.error('Error reading leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST score with enhanced validation and rate limiting
app.post('/api/leaderboard', leaderboardLimiter, validateLeaderboardInput, async (req, res) => {
  try {
    const { name, level } = req.body;
    const key = name.trim();
    
    const data = await readBoard();
    const previousLevel = data.players[key] || 0;
    const isNewRecord = level > previousLevel;
    
    // Only update if new level is higher
    if (isNewRecord) {
      data.players[key] = level;
      data.lastUpdated = new Date().toISOString();
      await writeBoard(data);
      
      console.log(`New high score: ${key} reached level ${level}`);
    }
    
    // Send email notification for gameplay (with rate limiting)
    if (shouldSendEmail()) {
      // Don't await to avoid blocking the response
      sendGameplayNotification(key, level, isNewRecord).catch(error => {
        console.error('Email notification error:', error.message);
      });
    }
    
    res.json({ 
      success: true, 
      level: data.players[key] || previousLevel,
      improved: isNewRecord
    });
    
  } catch (error) {
    console.error('Error updating leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🦋 Butterfly Dodge Leaderboard Server`);
  console.log(`🔒 Running securely on http://localhost:${PORT}`);
  console.log(`🌐 Allowed origin: ${ALLOWED_ORIGIN}`);
  console.log(`📊 Max level: ${MAX_LEVEL}`);
  console.log(`⚡ Rate limiting enabled`);
  console.log(`📧 Email notifications: ${ENABLE_EMAIL_NOTIFICATIONS ? 'enabled' : 'disabled'}`);
  if (ENABLE_EMAIL_NOTIFICATIONS) {
    console.log(`📬 Notification email: ${EMAIL_TO}`);
  }
});