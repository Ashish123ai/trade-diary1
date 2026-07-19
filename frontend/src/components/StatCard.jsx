import React from 'react';

export default function StatCard({ label, value, valueClass = 'text-gray-900', sub, icon, iconBg = 'bg-gray-100' }) {
  return (
    <div className="reveal bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4 flex-1 min-w-[180px] transition-colors hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs text-gray-500">{label}</span>
        {icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
            {icon}
          </div>
        )}
      </div>
      <div className={`text-2xl font-bold ${valueClass}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}
