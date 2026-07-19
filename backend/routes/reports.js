const express = require('express');
const { Trade } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

async function getTrades(userId, range) {
  const since = new Date();
  since.setDate(since.getDate() - parseInt(range || 30));
  const sinceStr = since.toISOString().slice(0, 10);
  return Trade.find({ user_id: userId, trade_date: { $gte: sinceStr } }).sort({ trade_date: 1 });
}

function weekdayName(dateStr) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date(dateStr).getDay()];
}

function rr(t) {
  return parseFloat((t.risk_reward || '1:0').split(':')[1]) || 0;
}

// GET /api/reports/performance
router.get('/performance', auth, async (req, res) => {
  const trades = await getTrades(req.userId, req.query.range);
  if (trades.length === 0) return res.json({ empty: true });

  const wins = trades.filter(t => t.pnl_amount > 0);
  const losses = trades.filter(t => t.pnl_amount < 0);
  const breakeven = trades.filter(t => t.pnl_amount === 0);

  const avgWin = wins.length ? wins.reduce((a, t) => a + t.pnl_amount, 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((a, t) => a + t.pnl_amount, 0) / losses.length : 0;
  const winRate = trades.length ? (wins.length / trades.length) * 100 : 0;
  const expectancy = (winRate / 100) * avgWin + (1 - winRate / 100) * avgLoss;

  const dayMap = {};
  trades.forEach(t => { dayMap[t.trade_date] = (dayMap[t.trade_date] || 0) + t.pnl_amount; });
  const dayEntries = Object.entries(dayMap);
  const winDays = dayEntries.filter(([, v]) => v > 0);
  const lossDays = dayEntries.filter(([, v]) => v < 0);
  const beDays = dayEntries.filter(([, v]) => v === 0);
  const bestDay = dayEntries.length ? Math.max(...dayEntries.map(([, v]) => v)) : 0;
  const worstDay = dayEntries.length ? Math.min(...dayEntries.map(([, v]) => v)) : 0;
  const avgWinDay = winDays.length ? winDays.reduce((a, [, v]) => a + v, 0) / winDays.length : 0;
  const avgLossDay = lossDays.length ? lossDays.reduce((a, [, v]) => a + v, 0) / lossDays.length : 0;

  const totalCapital = trades.reduce((a, t) => a + t.total_amount, 0);
  const stratPnl = {};
  trades.forEach(t => {
    const k = t.strategy || 'Other';
    stratPnl[k] = (stratPnl[k] || 0) + t.pnl_amount;
  });
  const mostProfitableStrategy = Object.entries(stratPnl).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

  let consecWins = 0, maxConsecWins = 0, consecLosses = 0, maxConsecLosses = 0;
  trades.forEach(t => {
    if (t.pnl_amount > 0) { consecWins++; consecLosses = 0; }
    else if (t.pnl_amount < 0) { consecLosses++; consecWins = 0; }
    else { consecWins = 0; consecLosses = 0; }
    maxConsecWins = Math.max(maxConsecWins, consecWins);
    maxConsecLosses = Math.max(maxConsecLosses, consecLosses);
  });

  const tradingDays = new Set(trades.map(t => t.trade_date)).size;
  const weekdayPnl = {};
  const weekdayWins = {};
  const weekdayTotals = {};
  const weekdayRR = {};
  trades.forEach(t => {
    const wd = weekdayName(t.trade_date);
    weekdayPnl[wd] = (weekdayPnl[wd] || 0) + t.pnl_amount;
    weekdayTotals[wd] = (weekdayTotals[wd] || 0) + 1;
    if (t.pnl_amount > 0) weekdayWins[wd] = (weekdayWins[wd] || 0) + 1;
    weekdayRR[wd] = (weekdayRR[wd] || []);
    weekdayRR[wd].push(rr(t));
  });
  const mostProfitableDay = Object.entries(weekdayPnl).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
  const leastProfitableDay = Object.entries(weekdayPnl).sort((a, b) => a[1] - b[1])[0]?.[0] || '-';

  const weekdayWinRate = {};
  const weekdayAvgRR = {};
  ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].forEach(d => {
    const total = weekdayTotals[d] || 0;
    weekdayWinRate[d] = total ? Math.round(((weekdayWins[d] || 0) / total) * 1000) / 10 : 0;
    const rrList = weekdayRR[d] || [];
    weekdayAvgRR[d] = rrList.length ? Math.round((rrList.reduce((a, b) => a + b, 0) / rrList.length) * 100) / 100 : 0;
  });

  const setupMap = {};
  trades.forEach(t => {
    const k = t.strategy || 'Other';
    if (!setupMap[k]) setupMap[k] = { wins: 0, total: 0 };
    setupMap[k].total++;
    if (t.pnl_amount > 0) setupMap[k].wins++;
  });
  const setupEffectiveness = Object.entries(setupMap).map(([strategy, v]) => ({
    strategy, winRate: Math.round((v.wins / v.total) * 1000) / 10
  }));

  const symbolMap = {};
  trades.forEach(t => {
    if (!symbolMap[t.symbol]) symbolMap[t.symbol] = { count: 0, pnl: 0, wins: 0 };
    symbolMap[t.symbol].count++;
    symbolMap[t.symbol].pnl += t.pnl_amount;
    if (t.pnl_amount > 0) symbolMap[t.symbol].wins++;
  });
  const symbolEntries = Object.entries(symbolMap);
  const mostTradedSymbol = symbolEntries.sort((a, b) => b[1].count - a[1].count)[0];
  const mostProfitableSymbol = symbolEntries.sort((a, b) => b[1].pnl - a[1].pnl)[0];
  const leastProfitableSymbol = symbolEntries.sort((a, b) => a[1].pnl - b[1].pnl)[0];
  const bySymbolWinRate = symbolEntries.map(([s, v]) => ([s, (v.wins / v.count) * 100]));
  const highestWinRateSymbol = bySymbolWinRate.sort((a, b) => b[1] - a[1])[0];
  const lowestWinRateSymbol = bySymbolWinRate.sort((a, b) => a[1] - b[1])[0];

  const capitals = trades.map(t => t.total_amount);
  const maxCapitalTrade = trades.reduce((a, t) => (t.total_amount > a.total_amount ? t : a));
  const minCapitalTrade = trades.reduce((a, t) => (t.total_amount < a.total_amount ? t : a));

  const quantities = trades.map(t => t.quantity);
  const maxQtyTrade = trades.reduce((a, t) => (t.quantity > a.quantity ? t : a));
  const minQtyTrade = trades.reduce((a, t) => (t.quantity < a.quantity ? t : a));

  const tradesPerDay = Object.values(
    trades.reduce((acc, t) => { acc[t.trade_date] = (acc[t.trade_date] || 0) + 1; return acc; }, {})
  );
  const avgTradesPerDay = tradesPerDay.length ? tradesPerDay.reduce((a, b) => a + b, 0) / tradesPerDay.length : 0;
  const maxTradesInADay = tradesPerDay.length ? Math.max(...tradesPerDay) : 0;
  const daysWithOnlyOneTrade = tradesPerDay.filter(c => c === 1).length;
  const overtradingDays = tradesPerDay.filter(c => c > 7).length;

  res.json({
    tradePerformance: {
      wins: wins.length, losses: losses.length, breakeven: breakeven.length,
      avgWin: Math.round(avgWin), avgLoss: Math.round(avgLoss),
      winRate: Math.round(winRate * 100) / 100, expectancy: Math.round(expectancy * 100) / 100
    },
    dailyPerformance: {
      winDays: winDays.length, lossDays: lossDays.length, breakEvenDays: beDays.length,
      bestDay: Math.round(bestDay), worstDay: Math.round(worstDay),
      avgWinDay: Math.round(avgWinDay), avgLossDay: Math.round(avgLossDay)
    },
    tradeExecution: {
      totalTrades: trades.length,
      avgCapitalUsed: Math.round(totalCapital / trades.length),
      mostProfitableStrategy,
      consecutiveWins: maxConsecWins,
      consecutiveLosses: maxConsecLosses
    },
    timeMetrics: {
      tradingDays,
      consecutiveWinDays: maxConsecWins,
      consecutiveLossDays: maxConsecLosses,
      mostProfitableDay,
      leastProfitableDay
    },
    setupEffectiveness,
    symbolFrequency: {
      mostTradedSymbol: mostTradedSymbol ? { symbol: mostTradedSymbol[0], count: mostTradedSymbol[1].count } : null,
      mostProfitableSymbol: mostProfitableSymbol ? { symbol: mostProfitableSymbol[0], pnl: Math.round(mostProfitableSymbol[1].pnl) } : null,
      leastProfitableSymbol: leastProfitableSymbol ? { symbol: leastProfitableSymbol[0], pnl: Math.round(leastProfitableSymbol[1].pnl) } : null,
      highestWinRateSymbol: highestWinRateSymbol ? { symbol: highestWinRateSymbol[0], winRate: Math.round(highestWinRateSymbol[1] * 10) / 10 } : null,
      lowestWinRateSymbol: lowestWinRateSymbol ? { symbol: lowestWinRateSymbol[0], winRate: Math.round(lowestWinRateSymbol[1] * 10) / 10 } : null
    },
    capitalUsage: {
      max: Math.round(Math.max(...capitals)), min: Math.round(Math.min(...capitals)),
      average: Math.round(capitals.reduce((a, b) => a + b, 0) / capitals.length),
      pnlAtMaxCapital: Math.round(maxCapitalTrade.pnl_amount), pnlAtMinCapital: Math.round(minCapitalTrade.pnl_amount)
    },
    quantityAnalysis: {
      max: Math.max(...quantities), min: Math.min(...quantities),
      average: Math.round(quantities.reduce((a, b) => a + b, 0) / quantities.length),
      pnlAtMaxQty: Math.round(maxQtyTrade.pnl_amount), pnlAtMinQty: Math.round(minQtyTrade.pnl_amount)
    },
    weekdayAvgRR,
    weekdayWinRate,
    dailyTradeActivity: {
      avgTradesPerDay: Math.round(avgTradesPerDay * 10) / 10,
      maxTradesInADay,
      daysWithOnlyOneTrade,
      overtradingDays
    }
  });
});

// GET /api/reports/psychology
router.get('/psychology', auth, async (req, res) => {
  const trades = await getTrades(req.userId, req.query.range);
  if (trades.length === 0) return res.json({ empty: true });

  const emoMap = {};
  trades.forEach(t => {
    const e = t.emotional_state || 'Unknown';
    emoMap[e] = (emoMap[e] || 0) + 1;
  });
  const emotionalState = Object.entries(emoMap).map(([state, count]) => ({
    state, percent: Math.round((count / trades.length) * 1000) / 10
  })).sort((a, b) => b.percent - a.percent);

  const emoRR = {};
  trades.forEach(t => {
    const e = t.emotional_state || 'Unknown';
    if (!emoRR[e]) emoRR[e] = [];
    emoRR[e].push(rr(t));
  });
  const avgRRByEmotion = Object.entries(emoRR).map(([state, list]) => ({
    state, avgRR: `1:${(list.reduce((a, b) => a + b, 0) / list.length).toFixed(2)}`
  }));

  res.json({ emotionalState, avgRRByEmotion });
});

// GET /api/reports/risk
router.get('/risk', auth, async (req, res) => {
  const trades = await getTrades(req.userId, req.query.range);
  if (trades.length === 0) return res.json({ empty: true });

  let running = 0, peak = 0, maxDrawdown = 0;
  trades.forEach(t => {
    running += t.pnl_amount;
    peak = Math.max(peak, running);
    maxDrawdown = Math.min(maxDrawdown, running - peak);
  });

  const rrList = trades.map(rr);
  const avgRR = rrList.reduce((a, b) => a + b, 0) / rrList.length;
  const totalRisked = trades.reduce((a, t) => a + Math.abs(t.entry_price - t.stop_loss) * t.quantity, 0);

  res.json({
    maxDrawdown: Math.round(maxDrawdown),
    avgRiskReward: `1:${avgRR.toFixed(2)}`,
    totalCapitalRisked: Math.round(totalRisked),
    largestLoss: Math.round(Math.min(...trades.map(t => t.pnl_amount))),
    largestWin: Math.round(Math.max(...trades.map(t => t.pnl_amount)))
  });
});

// GET /api/reports/journal
router.get('/journal', auth, async (req, res) => {
  const trades = await getTrades(req.userId, req.query.range || 3650);
  const journal = trades
    .filter(t => t.trade_analysis || t.lessons_learned)
    .map(t => ({
      id: t.id, date: t.trade_date, symbol: t.symbol, outcome_summary: t.outcome_summary,
      trade_analysis: t.trade_analysis, lessons_learned: t.lessons_learned, pnl_amount: t.pnl_amount
    })).reverse();
  res.json({ journal });
});

module.exports = router;
