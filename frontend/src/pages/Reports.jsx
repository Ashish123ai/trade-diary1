import React, { useEffect, useState } from 'react';
import api from '../api';
import Layout from '../components/Layout';

const TABS = [
  { key: 'performance', label: 'Performance' },
  { key: 'psychology', label: 'Psychology' },
  { key: 'risk', label: 'Risk' },
  { key: 'journal', label: 'Journal' }
];

const RANGE_OPTIONS = [
  { label: 'Last 7 Days', value: 7 },
  { label: 'Last 30 Days', value: 30 },
  { label: 'Last 90 Days', value: 90 },
  { label: 'Last Year', value: 365 }
];

export default function Reports() {
  const [tab, setTab] = useState('performance');
  const [range, setRange] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setData(null); // clear previous tab's data so a mismatched shape never gets rendered
    const endpoint = tab === 'journal' ? '/reports/journal' : `/reports/${tab}`;
    api.get(endpoint, { params: { range: tab === 'journal' ? 3650 : range } })
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch(() => { if (!cancelled) setError('Could not load this report. Please try again.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tab, range]);

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-6 text-sm border-b border-gray-200 -mb-px">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`pb-2 font-medium ${tab === t.key ? 'text-brand border-b-2 border-brand' : 'text-gray-400'}`}>
              {t.label}
            </button>
          ))}
        </div>
        {tab !== 'journal' && (
          <select value={range} onChange={(e) => setRange(Number(e.target.value))} className="input !w-auto">
            {RANGE_OPTIONS.slice(0, 3).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
      </div>

      {loading && <div className="text-gray-400 text-sm">Loading report...</div>}

      {!loading && error && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-red-500">
          {error}
        </div>
      )}

      {!loading && !error && data?.empty && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
          No trades logged in this period yet.
        </div>
      )}

      {!loading && !error && !data?.empty && tab === 'performance' && <PerformanceTab d={data} />}
      {!loading && !error && !data?.empty && tab === 'psychology' && <PsychologyTab d={data} />}
      {!loading && !error && !data?.empty && tab === 'risk' && <RiskTab d={data} />}
      {!loading && !error && tab === 'journal' && <JournalTab d={data} />}
    </Layout>
  );
}

function Card({ title, children, icon }) {
  return (
    <div className="reveal bg-white rounded-xl border border-gray-200 p-4 transition-colors hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-700">{title}</span>
        {icon}
      </div>
      {children}
    </div>
  );
}

function Metric({ label, value, valueClass = 'text-gray-900' }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="text-xs text-gray-400">{label}</div>
      <div className={`font-bold ${valueClass}`}>{value}</div>
    </div>
  );
}

function Row({ label, value, valueClass = 'text-gray-700' }) {
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium ${valueClass}`}>{value}</span>
    </div>
  );
}

function PerformanceTab({ d }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <Card title="Trade Performance">
        <div className="text-lg font-bold mb-2">
          <span className="text-green-600">{d.tradePerformance.wins}</span> / <span className="text-red-500">{d.tradePerformance.losses}</span> / {d.tradePerformance.breakeven}
        </div>
        <div className="text-xs text-gray-400 mb-3">Win / Loss / Break Even</div>
        <div className="grid grid-cols-2 gap-2">
          <Metric label="Avg Win" value={`₹${d.tradePerformance.avgWin.toLocaleString()}`} valueClass="text-green-600" />
          <Metric label="Avg Loss" value={`-₹${Math.abs(d.tradePerformance.avgLoss).toLocaleString()}`} valueClass="text-red-500" />
          <Metric label="Win Rate" value={`${d.tradePerformance.winRate}%`} />
          <Metric label="Expectancy" value={`₹${d.tradePerformance.expectancy.toLocaleString()}`} />
        </div>
      </Card>

      <Card title="Daily Performance">
        <div className="text-lg font-bold mb-2">
          <span className="text-green-600">{d.dailyPerformance.winDays}</span> / <span className="text-red-500">{d.dailyPerformance.lossDays}</span> / {d.dailyPerformance.breakEvenDays}
        </div>
        <div className="text-xs text-gray-400 mb-3">Win / Loss / Break Even Days</div>
        <div className="grid grid-cols-2 gap-2">
          <Metric label="Best Day" value={`₹${d.dailyPerformance.bestDay.toLocaleString()}`} valueClass="text-green-600" />
          <Metric label="Worst Day" value={`₹${d.dailyPerformance.worstDay.toLocaleString()}`} valueClass="text-red-500" />
          <Metric label="Avg Win Day" value={`₹${d.dailyPerformance.avgWinDay.toLocaleString()}`} />
          <Metric label="Avg Loss Day" value={`₹${d.dailyPerformance.avgLossDay.toLocaleString()}`} />
        </div>
      </Card>

      <Card title="Trade Execution">
        <Row label="Total Trades" value={d.tradeExecution.totalTrades} />
        <Row label="Avg Capital Used" value={`₹${d.tradeExecution.avgCapitalUsed.toLocaleString()}`} />
        <Row label="Most Profitable Strategy" value={d.tradeExecution.mostProfitableStrategy} valueClass="text-brand" />
        <Row label="Consecutive Wins" value={d.tradeExecution.consecutiveWins} valueClass="text-green-600" />
        <Row label="Consecutive Losses" value={d.tradeExecution.consecutiveLosses} valueClass="text-red-500" />
      </Card>

      <Card title="Time Metrics">
        <Row label="Trading Days" value={d.timeMetrics.tradingDays} />
        <Row label="Consecutive Win Days" value={d.timeMetrics.consecutiveWinDays} valueClass="text-green-600" />
        <Row label="Consecutive Loss Days" value={d.timeMetrics.consecutiveLossDays} valueClass="text-red-500" />
        <Row label="Most Profitable Day" value={d.timeMetrics.mostProfitableDay} valueClass="text-green-600" />
        <Row label="Least Profitable Day" value={d.timeMetrics.leastProfitableDay} valueClass="text-red-500" />
      </Card>

      <Card title="Setup Effectiveness">
        {d.setupEffectiveness.map((s) => (
          <Row key={s.strategy} label={s.strategy} value={`${s.winRate}% win rate`} />
        ))}
      </Card>

      <Card title="Symbol Frequency">
        <Row label="Most Traded Symbol" value={d.symbolFrequency.mostTradedSymbol ? `${d.symbolFrequency.mostTradedSymbol.symbol} (${d.symbolFrequency.mostTradedSymbol.count})` : '—'} />
        <Row label="Most Profitable Symbol" value={d.symbolFrequency.mostProfitableSymbol ? `${d.symbolFrequency.mostProfitableSymbol.symbol} (+₹${d.symbolFrequency.mostProfitableSymbol.pnl.toLocaleString()})` : '—'} valueClass="text-green-600" />
        <Row label="Least Profitable Symbol" value={d.symbolFrequency.leastProfitableSymbol ? `${d.symbolFrequency.leastProfitableSymbol.symbol} (₹${d.symbolFrequency.leastProfitableSymbol.pnl.toLocaleString()})` : '—'} valueClass="text-red-500" />
        <Row label="Highest Win Rate" value={d.symbolFrequency.highestWinRateSymbol ? `${d.symbolFrequency.highestWinRateSymbol.symbol} (${d.symbolFrequency.highestWinRateSymbol.winRate}%)` : '—'} valueClass="text-green-600" />
        <Row label="Lowest Win Rate" value={d.symbolFrequency.lowestWinRateSymbol ? `${d.symbolFrequency.lowestWinRateSymbol.symbol} (${d.symbolFrequency.lowestWinRateSymbol.winRate}%)` : '—'} valueClass="text-red-500" />
      </Card>

      <Card title="Capital Usage">
        <Row label="Maximum" value={`₹${d.capitalUsage.max.toLocaleString()}`} />
        <Row label="Minimum" value={`₹${d.capitalUsage.min.toLocaleString()}`} />
        <Row label="Average" value={`₹${d.capitalUsage.average.toLocaleString()}`} />
        <Row label="P&L at Max Capital" value={`₹${d.capitalUsage.pnlAtMaxCapital.toLocaleString()}`} valueClass={d.capitalUsage.pnlAtMaxCapital >= 0 ? 'text-green-600' : 'text-red-500'} />
        <Row label="P&L at Min Capital" value={`₹${d.capitalUsage.pnlAtMinCapital.toLocaleString()}`} valueClass={d.capitalUsage.pnlAtMinCapital >= 0 ? 'text-green-600' : 'text-red-500'} />
      </Card>

      <Card title="Quantity Analysis">
        <Row label="Maximum" value={d.quantityAnalysis.max} />
        <Row label="Minimum" value={d.quantityAnalysis.min} />
        <Row label="Average" value={d.quantityAnalysis.average} />
        <Row label="P&L at Max Qty" value={`₹${d.quantityAnalysis.pnlAtMaxQty.toLocaleString()}`} valueClass={d.quantityAnalysis.pnlAtMaxQty >= 0 ? 'text-green-600' : 'text-red-500'} />
        <Row label="P&L at Min Qty" value={`₹${d.quantityAnalysis.pnlAtMinQty.toLocaleString()}`} valueClass={d.quantityAnalysis.pnlAtMinQty >= 0 ? 'text-green-600' : 'text-red-500'} />
      </Card>

      <Card title="Weekday Avg R:R">
        {Object.entries(d.weekdayAvgRR).map(([day, rr]) => (
          <Row key={day} label={day} value={`${rr}R`} valueClass={rr >= 0 ? 'text-green-600' : 'text-red-500'} />
        ))}
      </Card>

      <Card title="Weekday Win Rate">
        {Object.entries(d.weekdayWinRate).map(([day, wr]) => (
          <Row key={day} label={day} value={`${wr}%`} valueClass={wr >= 50 ? 'text-green-600' : 'text-red-500'} />
        ))}
      </Card>

      <Card title="Daily Trade Activity">
        <Row label="Avg Trades Per Day" value={d.dailyTradeActivity.avgTradesPerDay} />
        <Row label="Max Trades in a Day" value={d.dailyTradeActivity.maxTradesInADay} />
        <Row label="Days With Only 1 Trade" value={d.dailyTradeActivity.daysWithOnlyOneTrade} />
        <Row label="Overtrading Days (>7 trades)" value={d.dailyTradeActivity.overtradingDays} valueClass={d.dailyTradeActivity.overtradingDays > 0 ? 'text-red-500' : 'text-gray-700'} />
      </Card>
    </div>
  );
}

function PsychologyTab({ d }) {
  const emotionalState = d?.emotionalState || [];
  const avgRRByEmotion = d?.avgRRByEmotion || [];
  return (
    <div className="grid grid-cols-2 gap-4">
      <Card title="Emotional State">
        {emotionalState.length === 0 && <div className="text-sm text-gray-400">No emotional state data recorded yet.</div>}
        {emotionalState.map((e) => (
          <div key={e.state} className="mb-2">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">{e.state}</span><span className="font-medium">{e.percent}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-pink-400 rounded-full" style={{ width: `${e.percent}%` }} />
            </div>
          </div>
        ))}
      </Card>
      <Card title="Avg R:R by Emotional State">
        {avgRRByEmotion.length === 0 && <div className="text-sm text-gray-400">No data yet.</div>}
        {avgRRByEmotion.map((e) => (
          <Row key={e.state} label={`When ${e.state}`} value={e.avgRR} valueClass={e.avgRR?.includes('-') ? 'text-red-500' : 'text-green-600'} />
        ))}
      </Card>
    </div>
  );
}

function RiskTab({ d }) {
  if (!d) return null;
  return (
    <div className="grid grid-cols-3 gap-4">
      <Card title="Max Drawdown"><div className="text-2xl font-bold text-red-500">₹{(d.maxDrawdown ?? 0).toLocaleString()}</div></Card>
      <Card title="Avg Risk/Reward"><div className="text-2xl font-bold text-brand">{d.avgRiskReward ?? '—'}</div></Card>
      <Card title="Total Capital Risked"><div className="text-2xl font-bold text-gray-800">₹{(d.totalCapitalRisked ?? 0).toLocaleString()}</div></Card>
      <Card title="Largest Win"><div className="text-2xl font-bold text-green-600">₹{(d.largestWin ?? 0).toLocaleString()}</div></Card>
      <Card title="Largest Loss"><div className="text-2xl font-bold text-red-500">₹{(d.largestLoss ?? 0).toLocaleString()}</div></Card>
    </div>
  );
}

function JournalTab({ d }) {
  const entries = d?.journal || [];
  if (entries.length === 0) {
    return <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">No journal entries yet. Add analysis and lessons learned to your trades.</div>;
  }
  return (
    <div className="space-y-3">
      {entries.map((e) => (
        <div key={e.id} className="reveal bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-gray-800 lowercase">{e.symbol}</span>
            <span className="text-xs text-gray-400">{e.date}</span>
          </div>
          {e.trade_analysis && <p className="text-sm text-gray-600 mb-1"><span className="font-medium text-gray-700">Analysis: </span>{e.trade_analysis}</p>}
          {e.lessons_learned && <p className="text-sm text-gray-600"><span className="font-medium text-gray-700">Lesson: </span>{e.lessons_learned}</p>}
          <div className={`text-xs mt-2 font-medium ${e.pnl_amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            P&L: {e.pnl_amount >= 0 ? '+' : ''}₹{Math.round(e.pnl_amount).toLocaleString()} • {e.outcome_summary}
          </div>
        </div>
      ))}
    </div>
  );
}
