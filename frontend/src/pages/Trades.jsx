import React, { useEffect, useState } from 'react';
import { Plus, Filter, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../api';
import Layout from '../components/Layout';
import AddTradeModal from '../components/AddTradeModal';
import TradeSummaryModal from '../components/TradeSummaryModal';

const OUTCOME_STYLES = {
  'Full Success': 'bg-green-100 text-green-700',
  'Partial Success': 'bg-blue-100 text-blue-700',
  'Followed Plan': 'bg-blue-100 text-blue-700',
  Mistake: 'bg-red-100 text-red-700'
};

export default function Trades() {
  const [trades, setTrades] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ symbol: '', strategy: '', outcome_summary: '', direction: '' });
  const [showAdd, setShowAdd] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  const [viewingTrade, setViewingTrade] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const params = { page, limit: 10, ...filters };
      Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
      const res = await api.get('/trades', { params });
      setTrades(res.data.trades);
      setTotalPages(res.data.totalPages);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page, filters]);

  async function handleDelete(id) {
    if (!window.confirm('Delete this trade? This cannot be undone.')) return;
    await api.delete(`/trades/${id}`);
    load();
  }

  async function openView(id) {
    const res = await api.get(`/trades/${id}`);
    setViewingTrade(res.data.trade);
  }

  return (
    <Layout>
      <div className="reveal bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Trade History</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowFilters((s) => !s)} data-tip="Filter your trades"
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 hover:border-brand hover:text-brand">
              <Filter size={14} /> Filter Trades
            </button>
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white text-sm font-medium px-4 py-2 rounded-lg">
              <Plus size={16} /> New Trade
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-4 gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50">
            <input placeholder="Symbol" value={filters.symbol}
              onChange={(e) => setFilters((f) => ({ ...f, symbol: e.target.value }))} className="input" />
            <select value={filters.strategy} onChange={(e) => setFilters((f) => ({ ...f, strategy: e.target.value }))} className="input">
              <option value="">All Strategies</option>
              {['Breakout', 'Reversal', 'Pullback', 'News-based', 'Trend', 'Other'].map((s) => <option key={s}>{s}</option>)}
            </select>
            <select value={filters.outcome_summary} onChange={(e) => setFilters((f) => ({ ...f, outcome_summary: e.target.value }))} className="input">
              <option value="">All Outcomes</option>
              {['Mistake', 'Followed Plan', 'Partial Success', 'Full Success'].map((s) => <option key={s}>{s}</option>)}
            </select>
            <select value={filters.direction} onChange={(e) => setFilters((f) => ({ ...f, direction: e.target.value }))} className="input">
              <option value="">All Directions</option>
              <option>Long</option>
              <option>Short</option>
            </select>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Symbol</th>
                <th className="px-5 py-3 font-medium">Direction</th>
                <th className="px-5 py-3 font-medium">Entry/Exit</th>
                <th className="px-5 py-3 font-medium">P/L (₹ / %)</th>
                <th className="px-5 py-3 font-medium">Risk/Reward</th>
                <th className="px-5 py-3 font-medium">Strategy</th>
                <th className="px-5 py-3 font-medium">Outcome</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => (
                <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50 hover:shadow-[inset_3px_0_0_0_rgb(var(--brand-rgb))] cursor-pointer transition-shadow" onClick={() => openView(t.id)}>
                  <td className="px-5 py-3 whitespace-nowrap">{t.trade_date}</td>
                  <td className="px-5 py-3 font-medium text-gray-800 lowercase">{t.symbol}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.direction === 'Long' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {t.direction}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{t.entry_price} / {t.exit_price}</td>
                  <td className="px-5 py-3">
                    <div className={t.pnl_amount >= 0 ? 'text-green-600' : 'text-red-500'}>
                      {t.pnl_amount >= 0 ? '+' : ''}{Math.round(t.pnl_amount).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400">{t.pnl_percent >= 0 ? '+' : ''}{t.pnl_percent.toFixed(2)}%</div>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{t.risk_reward}</td>
                  <td className="px-5 py-3 text-gray-500">{t.strategy}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${OUTCOME_STYLES[t.outcome_summary] || 'bg-gray-100 text-gray-600'}`}>
                      {t.outcome_summary}
                    </span>
                  </td>
                  <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingTrade(t)} data-tip="Edit trade" className="text-brand hover:text-brand-dark hover:scale-110 transition-transform"><Pencil size={15} /></button>
                      <button onClick={() => handleDelete(t.id)} data-tip="Delete trade" className="text-red-500 hover:text-red-400 hover:scale-110 transition-transform"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && trades.length === 0 && (
                <tr><td colSpan={9} className="px-5 py-10 text-center text-gray-400">No trades found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-4 text-sm text-gray-500">
          <span>Page {page} of {totalPages}</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
              className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40"><ChevronLeft size={16} /></button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      {showAdd && <AddTradeModal onClose={() => setShowAdd(false)} onSaved={load} />}
      {editingTrade && (
        <AddTradeModal editingTrade={editingTrade} onClose={() => setEditingTrade(null)} onSaved={load} />
      )}
      {viewingTrade && <TradeSummaryModal trade={viewingTrade} onClose={() => setViewingTrade(null)} />}
    </Layout>
  );
}
