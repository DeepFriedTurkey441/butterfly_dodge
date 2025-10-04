// Simple Express backend for leaderboard
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const DATA_PATH = path.join(__dirname, 'leaderboard.json');
function readBoard() {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (_) {
    return { players: {} };
  }
}
function writeBoard(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

// CORS for local testing with file server
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// GET leaderboard
app.get('/api/leaderboard', (req, res) => {
  const data = readBoard();
  const entries = Object.entries(data.players).map(([name, level]) => ({ name, level }));
  entries.sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));
  res.json({ entries });
});

// POST score: { name, level }
app.post('/api/leaderboard', (req, res) => {
  const { name, level } = req.body || {};
  if (typeof name !== 'string' || !name.trim() || typeof level !== 'number' || level < 1) {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  const key = name.trim().slice(0, 40);
  const data = readBoard();
  const prev = data.players[key] || 0;
  if (level > prev) data.players[key] = level;
  writeBoard(data);
  res.json({ ok: true, level: data.players[key] || prev });
});

app.listen(PORT, () => {
  console.log(`Leaderboard server running on http://localhost:${PORT}`);
});


