import React, { useState } from 'react';
import { X } from 'lucide-react';
import { fileUrl } from '../api';

export default function TradeSummaryModal({ trade, onClose }) {
  const [tab, setTab] = useState('general');
  if (!trade) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Trade Summary</h3>
          <button onClick={onClose} data-tip="Close" className="text-gray-400 hover:text-gray-600 hover:scale-110 transition-transform"><X size={20} /></button>
        </div>

        <div className="flex gap-6 px-6 pt-3 border-b border-gray-100 text-sm">
          {['general', 'journal', 'media'].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`pb-2 font-medium capitalize ${tab === t ? 'text-brand border-b-2 border-brand' : 'text-gray-400'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {tab === 'general' && (
            <div className="grid grid-cols-2 gap-4">
              <Panel title="Trade Overview">
                <Row label="Symbol" value={trade.symbol} />
                <Row label="Direction" value={trade.direction} valueClass={trade.direction === 'Long' ? 'text-green-600' : 'text-red-500'} />
                <Row label="Entry Price" value={trade.entry_price} />
                <Row label="Exit Price" value={trade.exit_price} />
                {trade.strike_price ? <Row label="Strike Price" value={trade.strike_price} /> : null}
                {trade.option_type ? <Row label="Option Type" value={trade.option_type} /> : null}
                <Row label="Trade Date" value={trade.trade_date} />
              </Panel>
              <Panel title="Risk Management">
                <Row label="Position Size" value={`${trade.quantity} Qty`} />
                <Row label="Stop Loss" value={trade.stop_loss} valueClass="text-red-500" />
                <Row label="Target" value={trade.target} valueClass="text-green-600" />
                <Row label="Risk/Reward" value={trade.risk_reward} />
              </Panel>
              <Panel title="Performance">
                <Row label="P&L" value={trade.pnl_amount} valueClass={trade.pnl_amount >= 0 ? 'text-green-600' : 'text-red-500'} />
                <Row label="P&L %" value={`${trade.pnl_percent?.toFixed(2)}%`} valueClass={trade.pnl_amount >= 0 ? 'text-green-600' : 'text-red-500'} />
                <Row label="Trade Outcome" value={trade.outcome_summary} />
              </Panel>
              <Panel title="Trade Evaluation">
                <Row label="Entry Confidence" value={`${trade.entry_confidence}/10`} />
                <Row label="Satisfaction" value={`${trade.satisfaction_rating}/10`} />
                <Row label="Emotional State" value={trade.emotional_state} />
                <Row label="Strategy" value={trade.strategy} />
              </Panel>
            </div>
          )}

          {tab === 'journal' && (
            <div className="space-y-4 text-sm">
              <div>
                <div className="font-semibold text-gray-700 mb-1">Trade Analysis</div>
                <p className="text-gray-600">{trade.trade_analysis || '—'}</p>
              </div>
              <div>
                <div className="font-semibold text-gray-700 mb-1">Rules Followed</div>
                <div className="flex flex-wrap gap-2">
                  {(trade.rules_followed || []).length
                    ? trade.rules_followed.map((r) => (
                        <span key={r} className="bg-brand/10 text-brand text-xs px-2 py-1 rounded-full">{r}</span>
                      ))
                    : <span className="text-gray-400">None recorded</span>}
                </div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 mb-1">Mistakes Made</div>
                <div className="flex flex-wrap gap-2">
                  {(trade.mistakes_made || []).length
                    ? trade.mistakes_made.map((m) => (
                        <span key={m} className="bg-red-50 text-red-600 text-xs px-2 py-1 rounded-full">{m}</span>
                      ))
                    : <span className="text-gray-400">None recorded</span>}
                </div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 mb-1">Lessons Learned</div>
                <p className="text-gray-600">{trade.lessons_learned || '—'}</p>
              </div>
            </div>
          )}

          {tab === 'media' && (
            <div className="grid grid-cols-3 gap-3">
              {(trade.screenshots || []).length
                ? trade.screenshots.map((src) => (
                    <img key={src} src={fileUrl(src)} alt="screenshot" className="rounded-lg border border-gray-200 object-cover h-32 w-full" />
                  ))
                : <div className="text-gray-400 text-sm col-span-3">No screenshots uploaded for this trade.</div>}
            </div>
          )}
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-medium">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <div className="text-sm font-semibold text-gray-700 mb-2">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, value, valueClass = 'text-gray-900' }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium ${valueClass}`}>{value ?? '—'}</span>
    </div>
  );
}
