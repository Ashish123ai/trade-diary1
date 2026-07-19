import React, { useState } from 'react';
import { Calculator, LineChart, Rocket, X } from 'lucide-react';
import Layout from '../components/Layout';
import { FNO_INDICES, detectLotSize } from '../lib/fno';

const TOOLS = [
  {
    key: 'sizer',
    title: 'Precision Sizer',
    desc: 'Calculate optimal position sizes with dynamic risk parameters and real-time volatility adjustments.',
    icon: Calculator,
    color: 'text-indigo-600 bg-indigo-50'
  },
  {
    key: 'returns',
    title: 'Returns Calculator',
    desc: 'Analyze trade returns over time and visualize growth with compounding and reinvestment metrics.',
    icon: LineChart,
    color: 'text-green-600 bg-green-50'
  }
];

export default function Tools() {
  const [open, setOpen] = useState(null); // 'sizer' | 'returns' | null

  return (
    <Layout>
      <div className="grid grid-cols-2 gap-4 mb-5">
        {TOOLS.map((t) => (
          <div key={t.key} className="reveal bg-white rounded-xl border border-gray-200 p-5 transition-colors hover:shadow-md hover:-translate-y-0.5">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${t.color}`}>
              <t.icon size={20} />
            </div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-gray-900">{t.title}</h3>
              <span className="text-[10px] bg-brand/10 text-brand font-semibold px-1.5 py-0.5 rounded">NEW</span>
            </div>
            <p className="text-sm text-gray-500 mb-4">{t.desc}</p>
            <button onClick={() => setOpen(t.key)} className="text-sm font-medium text-brand">Explore →</button>
          </div>
        ))}
      </div>

      <div className="reveal bg-gradient-to-r from-brand to-purple-600 rounded-xl p-5 flex items-center gap-4 text-white">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <Rocket size={20} />
        </div>
        <div>
          <div className="font-bold">More Exciting Tools Coming Soon!</div>
          <div className="text-sm text-white/80">We're working hard to bring you new features to enhance your workflow.</div>
        </div>
      </div>

      {open === 'sizer' && <PrecisionSizerModal onClose={() => setOpen(null)} />}
      {open === 'returns' && <ReturnsCalculatorModal onClose={() => setOpen(null)} />}
    </Layout>
  );
}

function ModalShell({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} data-tip="Close" className="text-gray-400 hover:text-gray-600 hover:scale-110 transition-transform"><X size={20} /></button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1 block">{label}</label>
      {children}
    </div>
  );
}

function SegmentToggle({ segment, setSegment }) {
  return (
    <Field label="Segment">
      <div className="flex gap-2">
        <button type="button" onClick={() => setSegment('fno')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium border ${segment === 'fno' ? 'bg-brand/10 border-brand text-brand' : 'border-gray-200 text-gray-500'}`}>
          F&O (Index)
        </button>
        <button type="button" onClick={() => setSegment('stock')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium border ${segment === 'stock' ? 'bg-brand/10 border-brand text-brand' : 'border-gray-200 text-gray-500'}`}>
          Stocks
        </button>
      </div>
    </Field>
  );
}

// ---------- Precision Sizer ----------
// F&O: risk-based quantity is rounded DOWN to the nearest whole lot (you can only trade in lots).
// Stock: risk-based quantity is a plain share count (1 share = 1 unit).
function PrecisionSizerModal({ onClose }) {
  const [segment, setSegment] = useState('fno');
  const [indexSymbol, setIndexSymbol] = useState(FNO_INDICES[0].label);
  const [stockLotSize, setStockLotSize] = useState('1'); // for stock F&O contracts; 1 = cash equity
  const [accountSize, setAccountSize] = useState('100000');
  const [riskPercent, setRiskPercent] = useState('1');
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [volatility, setVolatility] = useState('1'); // multiplier: 1 = normal, >1 = wider real stop due to volatility

  const lotSize = segment === 'fno'
    ? (detectLotSize(indexSymbol) || 1)
    : (parseInt(stockLotSize) || 1);

  const account = parseFloat(accountSize) || 0;
  const risk = parseFloat(riskPercent) || 0;
  const entry = parseFloat(entryPrice) || 0;
  const sl = parseFloat(stopLoss) || 0;
  const vol = parseFloat(volatility) || 1;

  const riskAmount = account * (risk / 100);
  const perUnitRisk = Math.abs(entry - sl) * vol;
  const maxUnits = perUnitRisk > 0 ? Math.floor(riskAmount / perUnitRisk) : 0;
  const suggestedLots = lotSize > 0 ? Math.floor(maxUnits / lotSize) : 0;
  const quantity = suggestedLots * lotSize;
  const positionValue = quantity * entry;
  const positionPercentOfAccount = account > 0 ? (positionValue / account) * 100 : 0;
  const riskUsed = quantity * perUnitRisk;

  return (
    <ModalShell title="Precision Sizer" onClose={onClose}>
      <div className="space-y-4">
        <SegmentToggle segment={segment} setSegment={setSegment} />

        {segment === 'fno' ? (
          <Field label="Index">
            <select value={indexSymbol} onChange={(e) => setIndexSymbol(e.target.value)} className="input">
              {FNO_INDICES.map((i) => (
                <option key={i.label} value={i.label}>{i.label} (Lot: {i.lotSize})</option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="Lot Size (1 = cash equity, higher = stock F&O)">
            <input type="number" min="1" value={stockLotSize} onChange={(e) => setStockLotSize(e.target.value)} className="input" />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Account Size (₹)">
            <input type="number" value={accountSize} onChange={(e) => setAccountSize(e.target.value)} className="input" />
          </Field>
          <Field label="Risk per Trade (%)">
            <input type="number" step="0.1" value={riskPercent} onChange={(e) => setRiskPercent(e.target.value)} className="input" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Entry Price (₹)">
            <input type="number" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} className="input" />
          </Field>
          <Field label="Stop Loss (₹)">
            <input type="number" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} className="input" />
          </Field>
        </div>
        <Field label="Volatility Adjustment">
          <select value={volatility} onChange={(e) => setVolatility(e.target.value)} className="input">
            <option value="1">Normal (1x)</option>
            <option value="1.25">Elevated (1.25x)</option>
            <option value="1.5">High (1.5x)</option>
            <option value="2">Extreme (2x)</option>
          </select>
        </Field>

        <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-3 mt-2">
          <div>
            <div className="text-xs text-gray-400">Amount at Risk (budget)</div>
            <div className="font-bold text-gray-800">₹{riskAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Risk per Unit (adj.)</div>
            <div className="font-bold text-gray-800">₹{perUnitRisk.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          </div>
          {segment === 'fno' && (
            <div>
              <div className="text-xs text-gray-400">Suggested Lots</div>
              <div className="font-bold text-brand text-lg">{perUnitRisk > 0 ? suggestedLots.toLocaleString() : '—'}</div>
            </div>
          )}
          <div>
            <div className="text-xs text-gray-400">{segment === 'fno' ? 'Suggested Quantity' : 'Suggested Shares'}</div>
            <div className={`font-bold text-lg ${segment === 'fno' ? 'text-gray-800' : 'text-brand'}`}>
              {perUnitRisk > 0 ? quantity.toLocaleString() : '—'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Position Value</div>
            <div className="font-bold text-gray-800">₹{positionValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Actual Risk Used</div>
            <div className="font-bold text-gray-800">₹{riskUsed.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          </div>
          <div className="col-span-2">
            <div className="text-xs text-gray-400">% of Account Deployed</div>
            <div className={`font-bold ${positionPercentOfAccount > 25 ? 'text-red-500' : 'text-green-600'}`}>
              {positionPercentOfAccount.toFixed(2)}%
            </div>
          </div>
        </div>

        {entry > 0 && sl > 0 && entry === sl && (
          <div className="text-xs text-red-500">Entry price and stop loss can't be equal — set a real stop distance.</div>
        )}
        {segment === 'fno' && perUnitRisk > 0 && suggestedLots === 0 && (
          <div className="text-xs text-amber-600">Risk budget is smaller than 1 lot's risk for {indexSymbol} — increase account size, risk %, or tighten the stop.</div>
        )}
        <p className="text-xs text-gray-400">
          {segment === 'fno'
            ? `Quantity is calculated in whole lots: lots = floor((Account × Risk %) ÷ (|Entry − Stop Loss| × Volatility × Lot Size)).`
            : `Quantity is calculated as: (Account × Risk %) ÷ (|Entry − Stop Loss| × Volatility), rounded down to whole shares.`}
        </p>
      </div>
    </ModalShell>
  );
}

// ---------- Returns Calculator ----------
// Compounding growth with periodic contribution and reinvestment of profits.
// For F&O, also shows the lot/contract economics at a reference price so growth can be read in "lots deployable".
function ReturnsCalculatorModal({ onClose }) {
  const [segment, setSegment] = useState('fno');
  const [indexSymbol, setIndexSymbol] = useState(FNO_INDICES[0].label);
  const [referencePrice, setReferencePrice] = useState('');
  const [principal, setPrincipal] = useState('100000');
  const [monthlyReturn, setMonthlyReturn] = useState('3');
  const [months, setMonths] = useState('12');
  const [monthlyAddition, setMonthlyAddition] = useState('0');
  const [reinvest, setReinvest] = useState(true);

  const lotSize = segment === 'fno' ? (detectLotSize(indexSymbol) || 1) : 1;
  const refPrice = parseFloat(referencePrice) || 0;
  const contractValue = lotSize * refPrice;

  const p = parseFloat(principal) || 0;
  const r = (parseFloat(monthlyReturn) || 0) / 100;
  const n = parseInt(months) || 0;
  const add = parseFloat(monthlyAddition) || 0;

  const rows = [];
  let balance = p;
  let totalContributed = p;
  let totalProfit = 0;
  for (let m = 1; m <= n; m++) {
    const profit = reinvest ? balance * r : p * r;
    balance += profit + add;
    totalContributed += add;
    totalProfit += profit;
    rows.push({ month: m, balance, profit });
  }
  const finalBalance = n > 0 ? rows[rows.length - 1].balance : p;
  const totalGrowthPercent = totalContributed > 0 ? ((finalBalance - totalContributed) / totalContributed) * 100 : 0;
  const lotsDeployable = segment === 'fno' && contractValue > 0 ? Math.floor(finalBalance / contractValue) : null;

  return (
    <ModalShell title="Returns Calculator" onClose={onClose}>
      <div className="space-y-4">
        <SegmentToggle segment={segment} setSegment={setSegment} />

        {segment === 'fno' && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Index">
              <select value={indexSymbol} onChange={(e) => setIndexSymbol(e.target.value)} className="input">
                {FNO_INDICES.map((i) => (
                  <option key={i.label} value={i.label}>{i.label} (Lot: {i.lotSize})</option>
                ))}
              </select>
            </Field>
            <Field label="Reference Price (₹, optional)">
              <input type="number" value={referencePrice} onChange={(e) => setReferencePrice(e.target.value)} placeholder="e.g. current index level" className="input" />
            </Field>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Starting Capital (₹)">
            <input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} className="input" />
          </Field>
          <Field label="Avg Monthly Return (%)">
            <input type="number" step="0.1" value={monthlyReturn} onChange={(e) => setMonthlyReturn(e.target.value)} className="input" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Duration (Months)">
            <input type="number" value={months} onChange={(e) => setMonths(e.target.value)} className="input" />
          </Field>
          <Field label="Monthly Addition (₹)">
            <input type="number" value={monthlyAddition} onChange={(e) => setMonthlyAddition(e.target.value)} className="input" />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={reinvest} onChange={(e) => setReinvest(e.target.checked)} className="accent-brand" />
          Reinvest profits (compounding)
        </label>

        <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-gray-400">Total Contributed</div>
            <div className="font-bold text-gray-800">₹{totalContributed.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Total Profit</div>
            <div className="font-bold text-green-600">₹{totalProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Final Balance</div>
            <div className="font-bold text-brand text-lg">₹{finalBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Growth</div>
            <div className={`font-bold ${totalGrowthPercent >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {totalGrowthPercent >= 0 ? '+' : ''}{totalGrowthPercent.toFixed(2)}%
            </div>
          </div>
          {segment === 'fno' && contractValue > 0 && (
            <>
              <div>
                <div className="text-xs text-gray-400">Contract Value / Lot</div>
                <div className="font-bold text-gray-800">₹{contractValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Lots Deployable (Final Balance)</div>
                <div className="font-bold text-gray-800">{lotsDeployable?.toLocaleString()}</div>
              </div>
            </>
          )}
        </div>

        {rows.length > 0 && (
          <div className="max-h-40 overflow-y-auto border border-gray-100 rounded-lg">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-gray-400 border-b border-gray-100">
                  <th className="px-3 py-2">Month</th>
                  <th className="px-3 py-2">Profit</th>
                  <th className="px-3 py-2">Balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.month} className="border-b border-gray-50">
                    <td className="px-3 py-1.5">{row.month}</td>
                    <td className="px-3 py-1.5 text-green-600">+₹{row.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td className="px-3 py-1.5 font-medium">₹{row.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
