// Simple Express backend for leaderboard
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
// --- Supabase init (optional) ---
let supabase = null;
try {
  const { createClient } = require('@supabase/supabase-js');
  const SUPABASE_URL = process.env.SUPABASE_URL || '';
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  }
} catch (_) { /* supabase optional */ }
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
app.get('/api/leaderboard', async (req, res) => {
  // Prefer Supabase if configured
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('name, best_level')
        .order('best_level', { ascending: false })
        .order('name', { ascending: true });
      if (error) throw error;
      const entries = (data || []).map(r => ({ name: r.name, level: r.best_level }));
      return res.json({ entries });
    } catch (e) {
      // fall through to file
    }
  }
  const file = readBoard();
  const entries = Object.entries(file.players).map(([name, level]) => ({ name, level }));
  entries.sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));
  res.json({ entries });
});

// POST score: { name, level }
app.post('/api/leaderboard', async (req, res) => {
  const { name, level } = req.body || {};
  if (typeof name !== 'string' || !name.trim() || typeof level !== 'number' || level < 1) {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  const key = name.trim().slice(0, 40);
  // Try Supabase first
  if (supabase) {
    try {
      // Upsert: keep best_level max
      const { data: existing, error: selErr } = await supabase
        .from('leaderboard')
        .select('best_level')
        .eq('name', key)
        .maybeSingle();
      if (selErr && selErr.code !== 'PGRST116') throw selErr;
      const best = Math.max(existing?.best_level || 0, level);
      const { error: upErr } = await supabase
        .from('leaderboard')
        .upsert({ name: key, best_level: best })
        .eq('name', key);
      if (upErr) throw upErr;
      return res.json({ ok: true, level: best });
    } catch (e) {
      // fall back to file
    }
  }
  const data = readBoard();
  const prev = data.players[key] || 0;
  if (level > prev) data.players[key] = level;
  writeBoard(data);
  res.json({ ok: true, level: data.players[key] || prev });
});

app.listen(PORT, () => {
  console.log(`Leaderboard server running on http://localhost:${PORT}`);
});


