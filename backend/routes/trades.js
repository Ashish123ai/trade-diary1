const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Trade } = require('../db');
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

// Accepts either a real array (JSON body) or a JSON-encoded string (multipart form field)
function parseArrayField(val, fallback) {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function tradeToJson(trade) {
  const obj = trade.toJSON();
  obj.screenshots = (obj.screenshots || []).map(f => `/uploads/${f}`);
  return obj;
}

// GET /api/trades  - list with filters + pagination
router.get('/', auth, async (req, res) => {
  const {
    page = 1, limit = 10, symbol, strategy, outcome_summary,
    direction, from, to, sort = 'trade_date', order = 'desc'
  } = req.query;

  const query = { user_id: req.userId };
  if (symbol) query.symbol = { $regex: symbol, $options: 'i' };
  if (strategy) query.strategy = strategy;
  if (outcome_summary) query.outcome_summary = outcome_summary;
  if (direction) query.direction = direction;
  if (from || to) {
    query.trade_date = {};
    if (from) query.trade_date.$gte = from;
    if (to) query.trade_date.$lte = to;
  }

  const allowedSort = ['trade_date', 'pnl_amount', 'pnl_percent', 'symbol', 'created_at'];
  const sortCol = allowedSort.includes(sort) ? sort : 'trade_date';
  const sortOrder = order === 'asc' ? 1 : -1;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const [total, rows] = await Promise.all([
    Trade.countDocuments(query),
    Trade.find(query).sort({ [sortCol]: sortOrder, _id: -1 }).skip(skip).limit(limitNum)
  ]);

  res.json({
    trades: rows.map(tradeToJson),
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.max(1, Math.ceil(total / limitNum))
  });
});

// GET /api/trades/:id
router.get('/:id', auth, async (req, res) => {
  const row = await Trade.findOne({ _id: req.params.id, user_id: req.userId }).catch(() => null);
  if (!row) return res.status(404).json({ error: 'Trade not found' });
  res.json({ trade: tradeToJson(row) });
});

// POST /api/trades
router.post('/', auth, upload.array('screenshots', 5), async (req, res) => {
  const body = req.body;
  if (!body.symbol || !body.trade_date) {
    return res.status(400).json({ error: 'Symbol and date are required' });
  }

  const derived = computeDerived(body);
  const files = (req.files || []).map(f => f.filename);

  const trade = await Trade.create({
    user_id: req.userId,
    symbol: body.symbol,
    trade_date: body.trade_date,
    ...derived,
    strategy: body.strategy || null,
    outcome_summary: body.outcome_summary || null,
    trade_analysis: body.trade_analysis || null,
    rules_followed: parseArrayField(body.rules_followed, []),
    screenshots: files,
    entry_confidence: parseInt(body.entry_confidence) || 5,
    satisfaction_rating: parseInt(body.satisfaction_rating) || 5,
    emotional_state: body.emotional_state || null,
    mistakes_made: parseArrayField(body.mistakes_made, []),
    lessons_learned: body.lessons_learned || null,
    strike_price: body.strike_price ? parseFloat(body.strike_price) : null,
    option_type: body.option_type || null
  });

  const prev = await Trade.findOne({ user_id: req.userId, _id: { $ne: trade._id } })
    .sort({ trade_date: -1, _id: -1 });

  res.status(201).json({ trade: tradeToJson(trade), previous: prev ? tradeToJson(prev) : null });
});

// PUT /api/trades/:id
router.put('/:id', auth, upload.array('screenshots', 5), async (req, res) => {
  const existing = await Trade.findOne({ _id: req.params.id, user_id: req.userId }).catch(() => null);
  if (!existing) return res.status(404).json({ error: 'Trade not found' });

  const body = req.body;
  const derived = computeDerived({ ...existing.toObject(), ...body });

  let screenshots = existing.screenshots || [];
  if (body.keep_screenshots !== undefined) {
    screenshots = parseArrayField(body.keep_screenshots, screenshots);
  }
  const newFiles = (req.files || []).map(f => f.filename);
  screenshots = [...screenshots, ...newFiles];

  existing.symbol = body.symbol || existing.symbol;
  existing.trade_date = body.trade_date || existing.trade_date;
  existing.entry_price = derived.entry_price;
  existing.exit_price = derived.exit_price;
  existing.quantity = derived.quantity;
  existing.total_amount = derived.total_amount;
  existing.pnl_amount = derived.pnl_amount;
  existing.pnl_percent = derived.pnl_percent;
  existing.direction = derived.direction;
  existing.stop_loss = derived.stop_loss;
  existing.target = derived.target;
  existing.risk_reward = derived.risk_reward;
  existing.strategy = body.strategy ?? existing.strategy;
  existing.outcome_summary = body.outcome_summary ?? existing.outcome_summary;
  existing.trade_analysis = body.trade_analysis ?? existing.trade_analysis;
  existing.rules_followed = body.rules_followed !== undefined
    ? parseArrayField(body.rules_followed, existing.rules_followed)
    : existing.rules_followed;
  existing.screenshots = screenshots;
  existing.entry_confidence = parseInt(body.entry_confidence) || existing.entry_confidence;
  existing.satisfaction_rating = parseInt(body.satisfaction_rating) || existing.satisfaction_rating;
  existing.emotional_state = body.emotional_state ?? existing.emotional_state;
  existing.mistakes_made = body.mistakes_made !== undefined
    ? parseArrayField(body.mistakes_made, existing.mistakes_made)
    : existing.mistakes_made;
  existing.lessons_learned = body.lessons_learned ?? existing.lessons_learned;
  existing.strike_price = body.strike_price !== undefined && body.strike_price !== ''
    ? parseFloat(body.strike_price) : existing.strike_price;
  existing.option_type = body.option_type !== undefined ? (body.option_type || null) : existing.option_type;

  await existing.save();
  res.json({ trade: tradeToJson(existing) });
});

// DELETE /api/trades/:id
router.delete('/:id', auth, async (req, res) => {
  const existing = await Trade.findOne({ _id: req.params.id, user_id: req.userId }).catch(() => null);
  if (!existing) return res.status(404).json({ error: 'Trade not found' });

  (existing.screenshots || []).forEach(f => {
    const p = path.join(uploadDir, f);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  });

  await Trade.deleteOne({ _id: req.params.id, user_id: req.userId });
  res.json({ success: true });
});

module.exports = router;
