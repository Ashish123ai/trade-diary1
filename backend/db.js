const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'tradediary.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  symbol TEXT NOT NULL,
  trade_date TEXT NOT NULL,
  entry_price REAL NOT NULL,
  exit_price REAL NOT NULL,
  quantity REAL NOT NULL,
  total_amount REAL NOT NULL,
  pnl_amount REAL NOT NULL,
  pnl_percent REAL NOT NULL,
  direction TEXT NOT NULL DEFAULT 'Long',
  stop_loss REAL DEFAULT 0,
  target REAL DEFAULT 0,
  risk_reward TEXT,
  strategy TEXT,
  outcome_summary TEXT,
  trade_analysis TEXT,
  rules_followed TEXT DEFAULT '[]',
  screenshots TEXT DEFAULT '[]',
  entry_confidence INTEGER DEFAULT 5,
  satisfaction_rating INTEGER DEFAULT 5,
  emotional_state TEXT,
  mistakes_made TEXT DEFAULT '[]',
  lessons_learned TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_trades_user ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_date ON trades(trade_date);
`);

// --- Lightweight migrations for columns added after initial release ---
const existingCols = db.prepare(`PRAGMA table_info(trades)`).all().map((c) => c.name);
if (!existingCols.includes('strike_price')) {
  db.exec(`ALTER TABLE trades ADD COLUMN strike_price REAL DEFAULT NULL`);
}
if (!existingCols.includes('option_type')) {
  db.exec(`ALTER TABLE trades ADD COLUMN option_type TEXT DEFAULT NULL`);
}

module.exports = db;
