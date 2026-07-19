// Shared NSE/BSE F&O reference data + helpers.
// Used by both the "Add Trade" form and the Tools (Precision Sizer / Returns Calculator)
// so lot sizes stay consistent everywhere in the app.

// NSE/BSE F&O index lot sizes (per exchange circulars, current as of the Jan 2026 revision).
export const FNO_INDICES = [
  { label: 'NIFTY 50', lotSize: 65 },
  { label: 'NIFTY BANK', lotSize: 30 },
  { label: 'NIFTY FIN SERVICE', lotSize: 60 },
  { label: 'NIFTY MIDCAP SELECT', lotSize: 120 },
  { label: 'NIFTY NEXT 50', lotSize: 25 },
  { label: 'SENSEX', lotSize: 20 },
  { label: 'BANKEX', lotSize: 30 },
  { label: 'SENSEX 50', lotSize: 75 }
];

// Ordered most-specific-first so e.g. "Bank Nifty" doesn't get wrongly matched as plain "Nifty".
// Used to detect the index (and pre-select segment/lot size) from free-text symbols saved earlier.
export const FNO_MATCH_ORDER = [
  { test: 'sensex 50', label: 'SENSEX 50' },
  { test: 'sensex50', label: 'SENSEX 50' },
  { test: 'bankex', label: 'BANKEX' },
  { test: 'sensex', label: 'SENSEX' },
  { test: 'bank nifty', label: 'NIFTY BANK' },
  { test: 'banknifty', label: 'NIFTY BANK' },
  { test: 'fin service', label: 'NIFTY FIN SERVICE' },
  { test: 'finnifty', label: 'NIFTY FIN SERVICE' },
  { test: 'midcap', label: 'NIFTY MIDCAP SELECT' },
  { test: 'midcpnifty', label: 'NIFTY MIDCAP SELECT' },
  { test: 'next 50', label: 'NIFTY NEXT 50' },
  { test: 'niftynxt50', label: 'NIFTY NEXT 50' },
  { test: 'nifty', label: 'NIFTY 50' }
];

export function findFnoIndex(symbol) {
  const s = (symbol || '').trim().toLowerCase();
  if (!s) return null;
  const hit = FNO_MATCH_ORDER.find((m) => s.includes(m.test));
  if (!hit) return null;
  return FNO_INDICES.find((i) => i.label === hit.label) || null;
}

export function detectLotSize(symbol) {
  const idx = findFnoIndex(symbol);
  return idx ? idx.lotSize : null;
}

// Option contract types for the "Strike Price" field on F&O trades.
export const OPTION_TYPES = [
  { value: '', label: 'None / Futures' },
  { value: 'CE', label: 'Call (CE)' },
  { value: 'PE', label: 'Put (PE)' }
];
