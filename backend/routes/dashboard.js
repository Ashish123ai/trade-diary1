const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

function parseJsonSafe(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

router.get('/stats', auth, (req, res) => {
  const { range = 30 } = req.query;
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - parseInt(range));
  const sinceStr = sinceDate.toISOString().slice(0, 10);

  const trades = db.prepare(
    'SELECT * FROM trades WHERE user_id = ? AND trade_date >= ? ORDER BY trade_date ASC'
  ).all(req.userId, sinceStr);

  if (trades.length === 0) {
    return res.json({
      highestPnl: 0, winRate: 0, avgRiskReward: '1:0', tradesThisMonth: 0,
      confidenceIndex: 0, confidenceLabel: 'No Data', cumulativePnl: [], topTrades: [],
      winLossDistribution: { wins: 0, losses: 0 }, strategyVsPnl: [], commonMistakes: [], dailyPnl: []
    });
  }

  const highestPnl = Math.max(...trades.map(t => t.pnl_amount));
  const wins = trades.filter(t => t.pnl_amount > 0).length;
  const losses = trades.filter(t => t.pnl_amount < 0).length;
  const winRate = trades.length ? (wins / trades.length) * 100 : 0;

  const rrValues = trades.map(t => {
    const parts = (t.risk_reward || '1:0').split(':');
    return parseFloat(parts[1]) || 0;
  });
  const avgRR = rrValues.length ? rrValues.reduce((a, b) => a + b, 0) / rrValues.length : 0;

  const now = new Date();
  const tradesThisMonth = db.prepare(
    `SELECT COUNT(*) as c FROM trades WHERE user_id = ? AND strftime('%Y-%m', trade_date) = strftime('%Y-%m', 'now')`
  ).get(req.userId).c;

  const avgConfidence = trades.reduce((a, t) => a + (t.entry_confidence || 0), 0) / trades.length;
  const confidenceIndex = Math.round((avgConfidence / 10) * 100);
  let confidenceLabel = 'Low Confidence';
  if (avgConfidence >= 7) confidenceLabel = 'Very High Confidence - You are trading with excellent discipline and emotional stability.';
  else if (avgConfidence >= 4) confidenceLabel = 'Moderate Confidence - Room to improve consistency.';
  else confidenceLabel = 'Low Confidence - Review your process before your next trade.';

  let running = 0;
  const cumulativePnl = trades.map(t => {
    running += t.pnl_amount;
    return { date: t.trade_date, value: Math.round(running) };
  });

  const topTrades = [...trades].sort((a, b) => b.pnl_amount - a.pnl_amount).slice(0, 3).map(t => ({
    id: t.id, symbol: t.symbol, direction: t.direction, trade_date: t.trade_date,
    entry_price: t.entry_price, exit_price: t.exit_price,
    pnl_amount: t.pnl_amount, pnl_percent: t.pnl_percent
  }));

  const stratMap = {};
  trades.forEach(t => {
    const key = t.strategy || 'Other';
    stratMap[key] = (stratMap[key] || 0) + t.pnl_amount;
  });
  const strategyVsPnl = Object.entries(stratMap).map(([strategy, pnl]) => ({ strategy, pnl: Math.round(pnl) }))
    .sort((a, b) => b.pnl - a.pnl);

  const mistakeMap = {};
  trades.forEach(t => {
    parseJsonSafe(t.mistakes_made, []).forEach(m => {
      mistakeMap[m] = (mistakeMap[m] || 0) + 1;
    });
  });
  const commonMistakes = Object.entries(mistakeMap).map(([mistake, count]) => ({ mistake, count }))
    .sort((a, b) => b.count - a.count).slice(0, 5);

  const dayMap = {};
  trades.forEach(t => {
    dayMap[t.trade_date] = (dayMap[t.trade_date] || 0) + t.pnl_amount;
  });
  const dailyPnl = Object.entries(dayMap).map(([date, pnl]) => ({ date, pnl: Math.round(pnl) }));

  res.json({
    highestPnl: Math.round(highestPnl),
    winRate: Math.round(winRate * 10) / 10,
    avgRiskReward: `1:${avgRR.toFixed(2)}`,
    tradesThisMonth,
    confidenceIndex,
    confidenceLabel,
    cumulativePnl,
    topTrades,
    winLossDistribution: { wins, losses },
    strategyVsPnl,
    commonMistakes,
    dailyPnl
  });
});

module.exports = router;
