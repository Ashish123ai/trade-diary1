import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw } from 'lucide-react';
import api from '../api';
import { FNO_INDICES, findFnoIndex, detectLotSize, OPTION_TYPES } from '../lib/fno';

const STRATEGIES = ['Breakout', 'Reversal', 'Pullback', 'News-based', 'Trend', 'Other'];
const OUTCOMES = ['Mistake', 'Followed Plan', 'Partial Success', 'Full Success'];
const EMOTIONS = ['Calm', 'Frustrated', 'Overconfident', 'Anxious', 'Impatient'];
const RULE_SUGGESTIONS = [
  'Followed risk management (1-2% rule)',
  'Waited for entry confirmation',
  'Traded in direction of higher timeframe trend',
  'Had volume confirmation',
  'Avoided revenge trading',
  'Exercised patience before entry'
];
const MISTAKE_OPTIONS = [
  'Overtrading', 'Risked Too Much', 'Exited Too Late', 'Ignored Signals',
  'Ignored Stop Loss', 'Revenge Trading', 'Exited Too Early', 'FOMO Entry',
  'No Clear Plan', 'No Mistakes'
];

const emptyForm = {
  symbol: '', trade_date: '', entry_price: '', exit_price: '', quantity: '', lots: '',
  strike_price: '', option_type: '',
  direction: 'Long', stop_loss: '', target: '', strategy: '', outcome_summary: '',
  trade_analysis: '', rules_followed: [], entry_confidence: 5, satisfaction_rating: 5,
  emotional_state: '', mistakes_made: [], lessons_learned: ''
};

export default function AddTradeModal({ onClose, onSaved, editingTrade }) {
  const [tab, setTab] = useState('general');
  const [segment, setSegment] = useState('fno');
  const [form, setForm] = useState(emptyForm);
  const [ruleQuery, setRuleQuery] = useState('');
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);

  useEffect(() => {
    if (editingTrade) {
      const matchedIndex = findFnoIndex(editingTrade.symbol);
      const qty = editingTrade.quantity ?? '';
      setSegment(matchedIndex ? 'fno' : 'stock');
      setForm({
        symbol: matchedIndex ? matchedIndex.label : (editingTrade.symbol || ''),
        trade_date: editingTrade.trade_date || '',
        entry_price: editingTrade.entry_price ?? '',
        exit_price: editingTrade.exit_price ?? '',
        quantity: qty,
        lots: matchedIndex && qty ? String(Math.round((parseFloat(qty) / matchedIndex.lotSize) * 100) / 100) : '',
        strike_price: editingTrade.strike_price ?? '',
        option_type: editingTrade.option_type || '',
        direction: editingTrade.direction || 'Long',
        stop_loss: editingTrade.stop_loss ?? '',
        target: editingTrade.target ?? '',
        strategy: editingTrade.strategy || '',
        outcome_summary: editingTrade.outcome_summary || '',
        trade_analysis: editingTrade.trade_analysis || '',
        rules_followed: editingTrade.rules_followed || [],
        entry_confidence: editingTrade.entry_confidence ?? 5,
        satisfaction_rating: editingTrade.satisfaction_rating ?? 5,
        emotional_state: editingTrade.emotional_state || '',
        mistakes_made: editingTrade.mistakes_made || [],
        lessons_learned: editingTrade.lessons_learned || ''
      });
    }
  }, [editingTrade]);

  const lotSize = segment === 'fno' ? detectLotSize(form.symbol) : null;

  const totalAmount = (parseFloat(form.entry_price) || 0) * (parseFloat(form.quantity) || 0);
  const pnlAmount = form.direction === 'Long'
    ? ((parseFloat(form.exit_price) || 0) - (parseFloat(form.entry_price) || 0)) * (parseFloat(form.quantity) || 0)
    : ((parseFloat(form.entry_price) || 0) - (parseFloat(form.exit_price) || 0)) * (parseFloat(form.quantity) || 0);
  const pnlPercent = totalAmount ? (pnlAmount / totalAmount) * 100 : 0;

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // When symbol is a known index (Nifty/Sensex), quantity is derived from lots × lot size.
  useEffect(() => {
    if (lotSize) {
      const computedQty = (parseFloat(form.lots) || 0) * lotSize;
      setForm((f) => ({ ...f, quantity: String(computedQty) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.lots, lotSize]);

  function toggleMistake(m) {
    setForm((f) => {
      const has = f.mistakes_made.includes(m);
      return { ...f, mistakes_made: has ? f.mistakes_made.filter((x) => x !== m) : [...f.mistakes_made, m] };
    });
  }

  function addRule(rule) {
    if (!rule.trim()) return;
    if (!form.rules_followed.includes(rule)) {
      setForm((f) => ({ ...f, rules_followed: [...f.rules_followed, rule] }));
    }
    setRuleQuery('');
  }

  function removeRule(rule) {
    setForm((f) => ({ ...f, rules_followed: f.rules_followed.filter((r) => r !== rule) }));
  }

  function reset() {
    setForm(emptyForm);
    setFiles([]);
    setRuleQuery('');
    setError('');
  }

  async function handleSave() {
    setError('');
    if (!form.symbol || !form.trade_date || !form.entry_price || !form.exit_price || !form.quantity) {
      setError('Please fill all required fields (Symbol, Date, Entry, Exit, Quantity).');
      setTab('general');
      return;
    }
    if (!form.outcome_summary) {
      setError('Please select an Outcome Summary.');
      setTab('general');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([key, val]) => {
        if (key === 'lots') return; // helper field only, not persisted
        if (Array.isArray(val)) fd.append(key, JSON.stringify(val));
        else fd.append(key, val);
      });
      files.forEach((f) => fd.append('screenshots', f));

      let res;
      if (editingTrade) {
        res = await api.put(`/trades/${editingTrade.id}`, fd);
      } else {
        res = await api.post('/trades', fd);
      }

      if (!editingTrade) {
        setSuccessInfo({ today: res.data.trade.pnl_amount, prev: res.data.previous?.pnl_amount ?? null });
      } else {
        onSaved && onSaved();
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong while saving the trade.');
    } finally {
      setSaving(false);
    }
  }

  if (successInfo) {
    const diff = successInfo.prev !== null ? successInfo.today - successInfo.prev : null;
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-md p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4 text-2xl">
            ✓
          </div>
          <h3 className="text-lg font-bold text-gray-900">Trade Saved Successfully!</h3>
          <p className="text-sm text-gray-500 mt-1">The more you write, the more you grow. Stay focused!</p>
          <div className="mt-4 border-l-4 border-brand bg-gray-50 rounded-r-lg p-4">
            <div className="text-sm font-semibold text-gray-700 mb-2">Comparison with Previous Day's P&L</div>
            <div className="flex gap-3">
              <div className="flex-1 bg-blue-50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Today's P&L</div>
                <div className="text-green-600 font-bold">{successInfo.today >= 0 ? '+' : ''}{successInfo.today.toFixed(2)}</div>
              </div>
              <div className="flex-1 bg-gray-100 rounded-lg p-3">
                <div className="text-xs text-gray-500">Yesterday's P&L</div>
                <div className="text-green-600 font-bold">
                  {successInfo.prev !== null ? `${successInfo.prev >= 0 ? '+' : ''}${successInfo.prev.toFixed(2)}` : '—'}
                </div>
              </div>
            </div>
            {diff !== null && (
              <div className="text-xs text-blue-600 mt-2">
                {diff >= 0 ? '↑' : '↓'} You saw a {diff >= 0 ? 'increase' : 'decrease'} of {Math.abs(diff).toFixed(2)} in your pnl compared to the last session!
              </div>
            )}
          </div>
          <button
            onClick={() => { onSaved && onSaved(); onClose(); }}
            className="mt-5 w-full bg-brand hover:bg-brand-dark text-white font-medium py-2.5 rounded-lg"
          >
            Keep Journaling
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">{editingTrade ? 'Edit Trade' : 'Add New Trade'}</h3>
          <button onClick={onClose} data-tip="Close" className="text-gray-400 hover:text-gray-600 hover:scale-110 transition-transform">
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-6 px-6 pt-3 border-b border-gray-100 text-sm">
          <button
            onClick={() => setTab('general')}
            className={`pb-2 font-medium ${tab === 'general' ? 'text-brand border-b-2 border-brand' : 'text-gray-400'}`}
          >
            ⓘ General
          </button>
          <button
            onClick={() => setTab('psychology')}
            className={`pb-2 font-medium ${tab === 'psychology' ? 'text-brand border-b-2 border-brand' : 'text-gray-400'}`}
          >
            🧠 Psychology
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 bg-red-50 text-red-600 text-sm rounded-lg px-3 py-2">{error}</div>
          )}

          {tab === 'general' && (
            <div className="space-y-4">
              <Field label="Segment">
                <div className="flex gap-2">
                  <button type="button"
                    onClick={() => { setSegment('fno'); set('symbol', ''); set('lots', ''); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border ${segment === 'fno' ? 'bg-brand/10 border-brand text-brand' : 'border-gray-200 text-gray-500'}`}>
                    F&O (Index)
                  </button>
                  <button type="button"
                    onClick={() => { setSegment('stock'); set('symbol', ''); set('lots', ''); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border ${segment === 'stock' ? 'bg-brand/10 border-brand text-brand' : 'border-gray-200 text-gray-500'}`}>
                    Stocks
                  </button>
                </div>
              </Field>

              <div className="grid grid-cols-3 gap-4">
                <Field label="Symbol" required>
                  {segment === 'fno' ? (
                    <select value={form.symbol} onChange={(e) => set('symbol', e.target.value)} className="input">
                      <option value="">Select Index</option>
                      {FNO_INDICES.map((i) => (
                        <option key={i.label} value={i.label}>{i.label} (Lot: {i.lotSize})</option>
                      ))}
                    </select>
                  ) : (
                    <input value={form.symbol} onChange={(e) => set('symbol', e.target.value)}
                      placeholder="RELIANCE, TCS, etc." className="input" />
                  )}
                </Field>
                <Field label="Date" required>
                  <input type="date" value={form.trade_date} onChange={(e) => set('trade_date', e.target.value)} className="input" />
                </Field>
                <Field label="Entry Price (₹)" required>
                  <input type="number" value={form.entry_price} onChange={(e) => set('entry_price', e.target.value)} className="input" />
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Field label={lotSize ? `Lots (1 lot = ${lotSize})` : 'Quantity'} required>
                  {lotSize ? (
                    <input type="number" value={form.lots} onChange={(e) => set('lots', e.target.value)}
                      placeholder="No. of lots" className="input" />
                  ) : (
                    <input type="number" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} className="input" />
                  )}
                  {lotSize && (
                    <div className="text-xs text-gray-400 mt-1">
                      = {form.quantity || 0} quantity ({form.lots || 0} lot{form.lots == 1 ? '' : 's'} × {lotSize})
                    </div>
                  )}
                </Field>
                <Field label="Total amount">
                  <input disabled value={totalAmount.toFixed(2)} className="input bg-gray-50 text-gray-500" />
                </Field>
                <Field label="Exit Price (₹)" required>
                  <input type="number" value={form.exit_price} onChange={(e) => set('exit_price', e.target.value)} className="input" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="P&L Amount">
                  <input disabled value={pnlAmount.toFixed(2)} className={`input bg-gray-50 ${pnlAmount >= 0 ? 'text-green-600' : 'text-red-500'}`} />
                </Field>
                <Field label="P&L (%)">
                  <input disabled value={pnlPercent.toFixed(2)} className={`input bg-gray-50 ${pnlPercent >= 0 ? 'text-green-600' : 'text-red-500'}`} />
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Field label="Direction">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => set('direction', 'Long')}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border ${form.direction === 'Long' ? 'bg-green-50 border-green-400 text-green-700' : 'border-gray-200 text-gray-500'}`}>
                      ↑ Long
                    </button>
                    <button type="button" onClick={() => set('direction', 'Short')}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border ${form.direction === 'Short' ? 'bg-red-50 border-red-400 text-red-700' : 'border-gray-200 text-gray-500'}`}>
                      ↓ Short
                    </button>
                  </div>
                </Field>
                <Field label="Stop Loss (₹)">
                  <input type="number" value={form.stop_loss} onChange={(e) => set('stop_loss', e.target.value)} className="input" />
                </Field>
                <Field label="Target (₹)">
                  <input type="number" value={form.target} onChange={(e) => set('target', e.target.value)} className="input" />
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Field label="Strike Price (₹)">
                  <input type="number" value={form.strike_price} onChange={(e) => set('strike_price', e.target.value)}
                    placeholder="Optional, for options" className="input" />
                </Field>
                <Field label="Option Type">
                  <select value={form.option_type} onChange={(e) => set('option_type', e.target.value)} className="input">
                    {OPTION_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Strategy" required>
                <select value={form.strategy} onChange={(e) => set('strategy', e.target.value)} className="input">
                  <option value="">Select Strategy</option>
                  {STRATEGIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>

              <Field label="Outcome Summary" required>
                <select value={form.outcome_summary} onChange={(e) => set('outcome_summary', e.target.value)} className="input">
                  <option value="">Select Outcome Summary</option>
                  {OUTCOMES.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>

              <Field label="Trade Analysis" required>
                <textarea rows={3} value={form.trade_analysis} onChange={(e) => set('trade_analysis', e.target.value)}
                  placeholder="Why did you take this trade? What was your analysis?" className="input resize-none" />
              </Field>

              <Field label="Rules Followed" required>
                <div className="relative">
                  <input
                    value={ruleQuery}
                    onChange={(e) => setRuleQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRule(ruleQuery); } }}
                    placeholder="Search or add rules..."
                    className="input"
                  />
                  {ruleQuery && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {RULE_SUGGESTIONS.filter((r) => r.toLowerCase().includes(ruleQuery.toLowerCase()) && !form.rules_followed.includes(r))
                        .map((r) => (
                          <div key={r} onClick={() => addRule(r)} className="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                            {r}
                          </div>
                        ))}
                      <div onClick={() => addRule(ruleQuery)} className="px-3 py-2 text-sm text-brand hover:bg-gray-50 cursor-pointer border-t border-gray-100">
                        + Add "{ruleQuery}"
                      </div>
                    </div>
                  )}
                </div>
                {form.rules_followed.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.rules_followed.map((r) => (
                      <span key={r} className="flex items-center gap-1 bg-brand/10 text-brand text-xs px-2 py-1 rounded-full">
                        {r}
                        <X size={12} className="cursor-pointer" onClick={() => removeRule(r)} />
                      </span>
                    ))}
                  </div>
                )}
              </Field>

              <Field label="Trade Screenshots">
                <input type="file" multiple accept="image/*" onChange={(e) => setFiles(Array.from(e.target.files))}
                  className="text-sm text-gray-500" />
                {files.length > 0 && (
                  <div className="text-xs text-gray-400 mt-1">{files.map((f) => f.name).join(', ')}</div>
                )}
              </Field>
            </div>
          )}

          {tab === 'psychology' && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-5">
                <Field label={`Entry Confidence Level (1-10)`}>
                  <input type="range" min="1" max="10" value={form.entry_confidence}
                    onChange={(e) => set('entry_confidence', e.target.value)} className="w-full accent-brand" />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Low</span><span className="font-semibold text-gray-700">{form.entry_confidence}</span><span>High</span>
                  </div>
                </Field>
                <Field label={`Satisfaction Rating (1-10)`}>
                  <input type="range" min="1" max="10" value={form.satisfaction_rating}
                    onChange={(e) => set('satisfaction_rating', e.target.value)} className="w-full accent-brand" />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Not Satisfied</span><span className="font-semibold text-gray-700">{form.satisfaction_rating}</span><span>Satisfied</span>
                  </div>
                </Field>
                <Field label="Emotional State During Trade" required>
                  <select value={form.emotional_state} onChange={(e) => set('emotional_state', e.target.value)} className="input">
                    <option value="">Select Emotional State</option>
                    {EMOTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </Field>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Mistakes Made</label>
                  <div className="grid grid-cols-2 gap-2">
                    {MISTAKE_OPTIONS.map((m) => (
                      <label key={m} className="flex items-center gap-2 text-sm text-gray-600">
                        <input type="checkbox" checked={form.mistakes_made.includes(m)} onChange={() => toggleMistake(m)}
                          className="accent-brand" />
                        {m}
                      </label>
                    ))}
                  </div>
                </div>
                <Field label="Lessons Learned" required>
                  <textarea rows={4} value={form.lessons_learned} onChange={(e) => set('lessons_learned', e.target.value)}
                    placeholder="What did you learn from this trade?" className="input resize-none" />
                </Field>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={reset} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            <RotateCcw size={14} /> Reset
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-medium disabled:opacity-60">
            <Save size={14} /> {saving ? 'Saving...' : 'Save Trade'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1 block">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
