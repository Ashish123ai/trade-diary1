const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

function computeDerived(body) {
  const entry_price = parseFloat(body.entry_price) || 0;
  const exit_price = parseFloat(body.exit_price) || 0;
  const quantity = parseFloat(body.quantity) || 0;
  const stop_loss = parseFloat(body.stop_loss) || 0;
  const target = parseFloat(body.target) || 0;
  const direction = body.direction === 'Short' ? 'Short' : 'Long';

  const total_amount = entry_price * quantity;
  const pnl_amount = direction === 'Long'
    ? (exit_price - entry_price) * quantity
    : (entry_price - exit_price) * quantity;
  const pnl_percent = total_amount !== 0 ? (pnl_amount / total_amount) * 100 : 0;

  const risk = Math.abs(entry_price - stop_loss);
  const reward = Math.abs(target - entry_price);
  const risk_reward = risk > 0 ? `1:${(reward / risk).toFixed(2)}` : '1:0';

  return {
    entry_price, exit_price, quantity, stop_loss, target, direction,
    total_amount, pnl_amount, pnl_percent, risk_reward
  };
}

function parseJsonSafe(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

function rowToTrade(row) {
  return {
    ...row,
    rules_followed: parseJsonSafe(row.rules_followed, []),
    mistakes_made: parseJsonSafe(row.mistakes_made, []),
    screenshots: parseJsonSafe(row.screenshots, []).map(f => `/uploads/${f}`)
  };
}

// GET /api/trades  - list with filters + pagination
router.get('/', auth, (req, res) => {
  const {
    page = 1, limit = 10, symbol, strategy, outcome_summary,
    direction, from, to, sort = 'trade_date', order = 'desc'
  } = req.query;

  const filters = ['user_id = ?'];
  const params = [req.userId];

  if (symbol) { filters.push('symbol LIKE ?'); params.push(`%${symbol}%`); }
  if (strategy) { filters.push('strategy = ?'); params.push(strategy); }
  if (outcome_summary) { filters.push('outcome_summary = ?'); params.push(outcome_summary); }
  if (direction) { filters.push('direction = ?'); params.push(direction); }
  if (from) { filters.push('trade_date >= ?'); params.push(from); }
  if (to) { filters.push('trade_date <= ?'); params.push(to); }

  const whereClause = filters.join(' AND ');
  const allowedSort = ['trade_date', 'pnl_amount', 'pnl_percent', 'symbol', 'created_at'];
  const sortCol = allowedSort.includes(sort) ? sort : 'trade_date';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

  const total = db.prepare(`SELECT COUNT(*) as c FROM trades WHERE ${whereClause}`).get(...params).c;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const rows = db.prepare(
    `SELECT * FROM trades WHERE ${whereClause} ORDER BY ${sortCol} ${sortOrder}, id DESC LIMIT ? OFFSET ?`
  ).all(...params, parseInt(limit), offset);

  res.json({
    trades: rows.map(rowToTrade),
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.max(1, Math.ceil(total / parseInt(limit)))
  });
});

// GET /api/trades/:id
router.get('/:id', auth, (req, res) => {
  const row = db.prepare('SELECT * FROM trades WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Trade not found' });
  res.json({ trade: rowToTrade(row) });
});

// POST /api/trades
router.post('/', auth, upload.array('screenshots', 5), (req, res) => {
  const body = req.body;
  if (!body.symbol || !body.trade_date) {
    return res.status(400).json({ error: 'Symbol and date are required' });
  }

  const derived = computeDerived(body);
  const files = (req.files || []).map(f => f.filename);

  const stmt = db.prepare(`
    INSERT INTO trades (
      user_id, symbol, trade_date, entry_price, exit_price, quantity, total_amount,
      pnl_amount, pnl_percent, direction, stop_loss, target, risk_reward, strategy,
      outcome_summary, trade_analysis, rules_followed, screenshots,
      entry_confidence, satisfaction_rating, emotional_state, mistakes_made, lessons_learned,
      strike_price, option_type
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);

  const result = stmt.run(
    req.userId, body.symbol, body.trade_date, derived.entry_price, derived.exit_price,
    derived.quantity, derived.total_amount, derived.pnl_amount, derived.pnl_percent,
    derived.direction, derived.stop_loss, derived.target, derived.risk_reward,
    body.strategy || null, body.outcome_summary || null, body.trade_analysis || null,
    body.rules_followed || '[]', JSON.stringify(files),
    parseInt(body.entry_confidence) || 5, parseInt(body.satisfaction_rating) || 5,
    body.emotional_state || null, body.mistakes_made || '[]', body.lessons_learned || null,
    body.strike_price ? parseFloat(body.strike_price) : null, body.option_type || null
  );

  const row = db.prepare('SELECT * FROM trades WHERE id = ?').get(result.lastInsertRowid);

  // previous trade for "compare with previous day" info
  const prev = db.prepare(
    'SELECT * FROM trades WHERE user_id = ? AND id != ? ORDER BY trade_date DESC, id DESC LIMIT 1'
  ).get(req.userId, result.lastInsertRowid);

  res.status(201).json({ trade: rowToTrade(row), previous: prev ? rowToTrade(prev) : null });
});

// PUT /api/trades/:id
router.put('/:id', auth, upload.array('screenshots', 5), (req, res) => {
  const existing = db.prepare('SELECT * FROM trades WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Trade not found' });

  const body = req.body;
  const derived = computeDerived({ ...existing, ...body });

  let screenshots = parseJsonSafe(existing.screenshots, []);
  if (body.keep_screenshots) {
    screenshots = parseJsonSafe(body.keep_screenshots, screenshots);
  }
  const newFiles = (req.files || []).map(f => f.filename);
  screenshots = [...screenshots, ...newFiles];

  const stmt = db.prepare(`
    UPDATE trades SET
      symbol = ?, trade_date = ?, entry_price = ?, exit_price = ?, quantity = ?, total_amount = ?,
      pnl_amount = ?, pnl_percent = ?, direction = ?, stop_loss = ?, target = ?, risk_reward = ?,
      strategy = ?, outcome_summary = ?, trade_analysis = ?, rules_followed = ?, screenshots = ?,
      entry_confidence = ?, satisfaction_rating = ?, emotional_state = ?, mistakes_made = ?, lessons_learned = ?,
      strike_price = ?, option_type = ?
    WHERE id = ? AND user_id = ?
  `);

  stmt.run(
    body.symbol || existing.symbol, body.trade_date || existing.trade_date,
    derived.entry_price, derived.exit_price, derived.quantity, derived.total_amount,
    derived.pnl_amount, derived.pnl_percent, derived.direction, derived.stop_loss, derived.target,
    derived.risk_reward, body.strategy ?? existing.strategy, body.outcome_summary ?? existing.outcome_summary,
    body.trade_analysis ?? existing.trade_analysis, body.rules_followed ?? existing.rules_followed,
    JSON.stringify(screenshots), parseInt(body.entry_confidence) || existing.entry_confidence,
    parseInt(body.satisfaction_rating) || existing.satisfaction_rating,
    body.emotional_state ?? existing.emotional_state, body.mistakes_made ?? existing.mistakes_made,
    body.lessons_learned ?? existing.lessons_learned,
    body.strike_price !== undefined && body.strike_price !== '' ? parseFloat(body.strike_price) : existing.strike_price,
    body.option_type !== undefined ? (body.option_type || null) : existing.option_type,
    req.params.id, req.userId
  );

  const row = db.prepare('SELECT * FROM trades WHERE id = ?').get(req.params.id);
  res.json({ trade: rowToTrade(row) });
});

// DELETE /api/trades/:id
router.delete('/:id', auth, (req, res) => {
  const existing = db.prepare('SELECT * FROM trades WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Trade not found' });

  parseJsonSafe(existing.screenshots, []).forEach(f => {
    const p = path.join(uploadDir, f);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  });

  db.prepare('DELETE FROM trades WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

module.exports = router;
