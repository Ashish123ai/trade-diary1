import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { Plus, Trophy, Scale, BarChart3, Wallet } from 'lucide-react';
import api from '../api';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import AddTradeModal from '../components/AddTradeModal';

const RANGE_OPTIONS = [
  { label: 'Last 7 Days', value: 7 },
  { label: 'Last 30 Days', value: 30 },
  { label: 'Last 90 Days', value: 90 }
];

export default function Dashboard() {
  const [range, setRange] = useState(30);
  const [stats, setStats] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/stats', { params: { range } });
      setStats(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [range]);

  const confidencePercent = stats?.confidenceIndex ?? 0;

  return (
    <Layout>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-3">
          <select value={range} onChange={(e) => setRange(Number(e.target.value))} className="input !w-auto">
            {RANGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white text-sm font-medium px-4 py-2 rounded-lg">
            <Plus size={16} /> New Trade
          </button>
        </div>
      </div>

      {loading || !stats ? (
        <div className="text-gray-400 text-sm">Loading dashboard...</div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-5">
            <StatCard label="Highest P&L" value={`₹${stats.highestPnl.toLocaleString()}`}
              valueClass="text-green-600" icon={<Wallet size={16} className="text-green-600" />} iconBg="bg-green-50" />
            <StatCard label="Win Rate" value={`${stats.winRate}%`}
              valueClass="text-brand" icon={<Trophy size={16} className="text-brand" />} iconBg="bg-blue-50" />
            <StatCard label="Avg Risk/Reward" value={stats.avgRiskReward}
              valueClass="text-purple-600" icon={<Scale size={16} className="text-purple-600" />} iconBg="bg-purple-50" />
            <StatCard label="Trades This Month" value={stats.tradesThisMonth}
              valueClass="text-orange-500" icon={<BarChart3 size={16} className="text-orange-500" />} iconBg="bg-orange-50" />
          </div>

          <div className="reveal bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-5 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Confidence Index</span>
              <span className="text-xs text-gray-400">Last {range} Days</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-red-500">Low</span>
              <div className="flex-1 h-2 rounded-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-500 relative">
                <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-gray-900 border-2 border-white shadow"
                  style={{ left: `calc(${confidencePercent}% - 6px)` }} />
              </div>
              <span className="text-xs text-green-600">High</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">{stats.confidenceLabel}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="reveal col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4 transition-colors">
              <div className="text-sm font-semibold text-gray-700 mb-3">Cumulative P&L</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={stats.cumulativePnl}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.25)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'rgba(128,128,128,0.9)' }} tickFormatter={(d) => d?.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: 'rgba(128,128,128,0.9)' }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="reveal bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700">Top Trades</span>
                <a href="/trades" data-tip="Go to Trades page" className="text-xs text-brand hover:underline">View All</a>
              </div>
              <div className="space-y-3">
                {stats.topTrades.map((t) => (
                  <div key={t.id} className="text-sm p-2 -mx-2 rounded-lg transition-colors hover:bg-gray-50 cursor-default">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-800 lowercase">{t.symbol}</span>
                      <span className={t.pnl_amount >= 0 ? 'text-green-600' : 'text-red-500'}>
                        {t.pnl_amount >= 0 ? '+' : ''}₹{Math.round(t.pnl_amount).toLocaleString()} ({t.pnl_percent.toFixed(2)}%)
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {t.direction} • {t.trade_date} • Entry: ₹{t.entry_price} → Exit: ₹{t.exit_price}
                    </div>
                  </div>
                ))}
                {stats.topTrades.length === 0 && <div className="text-xs text-gray-400">No trades yet.</div>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="reveal bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4 transition-colors">
              <div className="text-sm font-semibold text-gray-700 mb-3">Win/Loss Distribution</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Wins', value: stats.winLossDistribution.wins },
                      { name: 'Losses', value: stats.winLossDistribution.losses }
                    ]}
                    innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={2}
                  >
                    <Cell fill="#22c55e" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="reveal bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4 transition-colors">
              <div className="text-sm font-semibold text-gray-700 mb-3">Strategy vs P&L</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.strategyVsPnl}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.25)" />
                  <XAxis dataKey="strategy" tick={{ fontSize: 11, fill: 'rgba(128,128,128,0.9)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'rgba(128,128,128,0.9)' }} />
                  <Tooltip />
                  <Bar dataKey="pnl" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="reveal bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700">Most Common Mistakes</span>
                <span className="text-xs text-gray-400">Last {range} Days</span>
              </div>
              <div className="space-y-3">
                {stats.commonMistakes.map((m) => (
                  <div key={m.mistake}>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>{m.mistake}</span><span>{m.count} trades</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-400 rounded-full"
                        style={{ width: `${Math.min(100, (m.count / (stats.commonMistakes[0]?.count || 1)) * 100)}%` }} />
                    </div>
                  </div>
                ))}
                {stats.commonMistakes.length === 0 && <div className="text-xs text-gray-400">No mistakes logged. Great discipline!</div>}
              </div>
            </div>
            <div className="reveal bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4 transition-colors">
              <div className="text-sm font-semibold text-gray-700 mb-3">Daily P&L</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={stats.dailyPnl}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.25)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(128,128,128,0.9)' }} tickFormatter={(d) => d?.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: 'rgba(128,128,128,0.9)' }} />
                  <Tooltip />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {stats.dailyPnl.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? '#22c55e' : '#ef4444'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {showAdd && (
        <AddTradeModal onClose={() => setShowAdd(false)} onSaved={load} />
      )}
    </Layout>
  );
}
