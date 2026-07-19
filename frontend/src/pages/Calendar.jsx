import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X, TrendingUp, Trophy, Tag, Scale } from 'lucide-react';
import api from '../api';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12
  const [data, setData] = useState({ days: [], summary: { totalPnl: 0, winRate: 0, totalTrades: 0, avgRR: '1:0' } });
  const [dayDetail, setDayDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get(`/calendar/${year}/${month}`);
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [year, month]);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); } else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); } else setMonth((m) => m + 1);
  }

  async function openDay(dateStr) {
    const res = await api.get(`/calendar/day/${dateStr}`);
    setDayDetail(res.data);
  }

  const dayMap = {};
  data.days.forEach((d) => { dayMap[d.date] = d; });

  const firstOfMonth = new Date(year, month - 1, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function pad(n) { return String(n).padStart(2, '0'); }

  return (
    <Layout>
      <div className="grid grid-cols-4 gap-4 mb-5">
        <StatCard label="Total P&L" value={`₹${data.summary.totalPnl.toLocaleString()}`}
          valueClass={data.summary.totalPnl >= 0 ? 'text-green-600' : 'text-red-500'}
          icon={<TrendingUp size={16} className="text-green-600" />} iconBg="bg-green-50" />
        <StatCard label="Win Rate" value={`${data.summary.winRate}%`} valueClass="text-green-600"
          icon={<Trophy size={16} className="text-green-600" />} iconBg="bg-green-50" />
        <StatCard label="Total Trades" value={data.summary.totalTrades}
          icon={<Tag size={16} className="text-gray-500" />} />
        <StatCard label="Avg. R:R" value={data.summary.avgRR} valueClass="text-brand"
          icon={<Scale size={16} className="text-brand" />} iconBg="bg-blue-50" />
      </div>

      <div className="reveal bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} data-tip="Previous month" className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-brand hover:text-brand transition-colors"><ChevronLeft size={16} /></button>
          <h2 className="text-base font-bold text-gray-800">{MONTH_NAMES[month - 1]} {year}</h2>
          <button onClick={nextMonth} data-tip="Next month" className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-brand hover:text-brand transition-colors"><ChevronRight size={16} /></button>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {WEEKDAYS.map((w) => (
            <div key={w} className="text-center text-xs font-medium text-gray-400 pb-1">{w}</div>
          ))}
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const dateStr = `${year}-${pad(month)}-${pad(d)}`;
            const info = dayMap[dateStr];
            const isToday = dateStr === `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
            return (
              <div
                key={i}
                onClick={() => info && openDay(dateStr)}
                className={`h-20 rounded-lg border p-1.5 text-xs flex flex-col justify-between transition-all ${
                  info
                    ? info.totalPnl >= 0
                      ? 'bg-green-50 border-green-100 cursor-pointer hover:border-green-400 hover:shadow-md hover:-translate-y-0.5'
                      : 'bg-red-50 border-red-100 cursor-pointer hover:border-red-400 hover:shadow-md hover:-translate-y-0.5'
                    : 'border-gray-100'
                } ${isToday ? 'ring-2 ring-brand' : ''}`}
              >
                <span className="text-gray-500">{d}</span>
                {info && (
                  <div>
                    <div className={`font-semibold ${info.totalPnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {info.totalPnl >= 0 ? '+' : ''}₹{info.totalPnl.toLocaleString()}
                    </div>
                    <div className="text-gray-400">{info.tradeCount} trade{info.tradeCount > 1 ? 's' : ''}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {dayDetail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Trading Details</h3>
                <p className="text-xs text-gray-400">{dayDetail.date}</p>
              </div>
              <button onClick={() => setDayDetail(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-400">Total P&L</div>
                  <div className={`font-bold ${dayDetail.totalPnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {dayDetail.totalPnl >= 0 ? '+' : ''}₹{dayDetail.totalPnl.toLocaleString()}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-400">Average R:R</div>
                  <div className="font-bold text-brand">{dayDetail.avgRR}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-400">Total Trades</div>
                  <div className="font-bold text-gray-800">{dayDetail.totalTrades}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-400">Win Rate</div>
                  <div className="font-bold text-green-600">{dayDetail.winRate}%</div>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                    <th className="py-2">Symbol</th><th>Side</th><th>Size</th><th>Entry</th><th>Exit</th><th>P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {dayDetail.trades.map((t) => (
                    <tr key={t.id} className="border-b border-gray-50">
                      <td className="py-2 lowercase font-medium text-gray-700">{t.symbol}</td>
                      <td><span className={t.direction === 'Long' ? 'text-green-600' : 'text-red-500'}>{t.direction}</span></td>
                      <td>{t.quantity}</td>
                      <td>₹{t.entry_price}</td>
                      <td>₹{t.exit_price}</td>
                      <td className={t.pnl_amount >= 0 ? 'text-green-600' : 'text-red-500'}>
                        {t.pnl_amount >= 0 ? '+' : ''}₹{Math.round(t.pnl_amount).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
