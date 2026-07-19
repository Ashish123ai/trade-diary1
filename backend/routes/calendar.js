const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/calendar/:year/:month  (month is 1-12)
router.get('/:year/:month', auth, (req, res) => {
  const { year, month } = req.params;
  const monthStr = String(month).padStart(2, '0');
  const prefix = `${year}-${monthStr}`;

  const trades = db.prepare(
    `SELECT * FROM trades WHERE user_id = ? AND trade_date LIKE ? ORDER BY trade_date ASC`
  ).all(req.userId, `${prefix}%`);

  const dayMap = {};
  trades.forEach(t => {
    if (!dayMap[t.trade_date]) dayMap[t.trade_date] = { totalPnl: 0, count: 0 };
    dayMap[t.trade_date].totalPnl += t.pnl_amount;
    dayMap[t.trade_date].count += 1;
  });

  const days = Object.entries(dayMap).map(([date, v]) => ({
    date, totalPnl: Math.round(v.totalPnl), tradeCount: v.count
  }));

  const totalPnl = trades.reduce((a, t) => a + t.pnl_amount, 0);
  const wins = trades.filter(t => t.pnl_amount > 0).length;
  const winRate = trades.length ? (wins / trades.length) * 100 : 0;
  const rrValues = trades.map(t => parseFloat((t.risk_reward || '1:0').split(':')[1]) || 0);
  const avgRR = rrValues.length ? rrValues.reduce((a, b) => a + b, 0) / rrValues.length : 0;

  res.json({
    days,
    summary: {
      totalPnl: Math.round(totalPnl),
      winRate: Math.round(winRate * 10) / 10,
      totalTrades: trades.length,
      avgRR: `1:${avgRR.toFixed(2)}`
    }
  });
});

// GET /api/calendar/day/:date  (date = YYYY-MM-DD)
router.get('/day/:date', auth, (req, res) => {
  const trades = db.prepare(
    'SELECT * FROM trades WHERE user_id = ? AND trade_date = ? ORDER BY id ASC'
  ).all(req.userId, req.params.date);

  const totalPnl = trades.reduce((a, t) => a + t.pnl_amount, 0);
  const wins = trades.filter(t => t.pnl_amount > 0).length;
  const winRate = trades.length ? (wins / trades.length) * 100 : 0;
  const rrValues = trades.map(t => parseFloat((t.risk_reward || '1:0').split(':')[1]) || 0);
  const avgRR = rrValues.length ? rrValues.reduce((a, b) => a + b, 0) / rrValues.length : 0;

  res.json({
    date: req.params.date,
    totalPnl: Math.round(totalPnl),
    winRate: Math.round(winRate * 10) / 10,
    totalTrades: trades.length,
    avgRR: `1:${avgRR.toFixed(2)}`,
    trades: trades.map(t => ({
      id: t.id, symbol: t.symbol, direction: t.direction, quantity: t.quantity,
      entry_price: t.entry_price, exit_price: t.exit_price, pnl_amount: t.pnl_amount, pnl_percent: t.pnl_percent
    }))
  });
});

module.exports = router;
