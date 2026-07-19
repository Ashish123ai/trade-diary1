const express = require('express');
const router = express.Router();

// Indices shown in the dashboard ticker, mapped to their Yahoo Finance chart symbols.
const SYMBOLS = [
  { name: 'NIFTY 50', yahoo: '%5ENSEI' },
  { name: 'SENSEX', yahoo: '%5EBSESN' },
  { name: 'BANK NIFTY', yahoo: '%5ENSEBANK' }
];

// Simple in-memory cache so the ticker (polled every ~30s by the frontend)
// doesn't hammer the upstream data source with a fresh request every time.
let cache = { data: null, time: 0 };
const CACHE_MS = 25 * 1000;

async function fetchIndex(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol.yahoo}?interval=1d&range=1d`;
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'application/json'
    }
  });
  if (!resp.ok) throw new Error(`Upstream error ${resp.status} for ${symbol.name}`);
  const json = await resp.json();
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta || typeof meta.regularMarketPrice !== 'number') throw new Error(`No data for ${symbol.name}`);

  const price = meta.regularMarketPrice;
  const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? price;
  const change = price - prevClose;
  const changePercent = prevClose ? (change / prevClose) * 100 : 0;

  return {
    name: symbol.name,
    price: Math.round(price * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100
  };
}

// GET /api/market/indices
router.get('/indices', async (req, res) => {
  const isFresh = cache.data && Date.now() - cache.time < CACHE_MS;
  if (isFresh) {
    return res.json({ indices: cache.data, cached: true });
  }

  try {
    const results = await Promise.all(SYMBOLS.map(fetchIndex));
    cache = { data: results, time: Date.now() };
    res.json({ indices: results, cached: false });
  } catch (err) {
    // If the upstream call fails, serve the last known good data (if any) rather than an error,
    // so the ticker doesn't disappear from the UI on a transient network hiccup.
    if (cache.data) {
      return res.json({ indices: cache.data, cached: true, stale: true });
    }
    res.status(502).json({ error: 'Could not fetch live market data right now.' });
  }
});

module.exports = router;
