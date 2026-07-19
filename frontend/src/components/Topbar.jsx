import React, { useEffect, useState } from 'react';
import { Sun, Moon, ChevronDown, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api';

const REFRESH_MS = 30000;

export default function Topbar() {
  const { user, logout } = useAuth();
  const { dark, toggleDark } = useTheme();
  const [open, setOpen] = useState(false);
  const [indices, setIndices] = useState([]);

  useEffect(() => {
    let cancelled = false;
    function load() {
      api.get('/market/indices')
        .then((res) => { if (!cancelled) setIndices(res.data.indices || []); })
        .catch(() => {}); // keep showing the last known values on a transient failure
    }
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return (
    <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
      <div className="overflow-hidden whitespace-nowrap px-4 py-1.5 text-xs text-gray-500 bg-gray-50 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">
        {indices.length === 0 && <span className="text-gray-400">Loading live market data...</span>}
        {indices.map((i) => (
          <span key={i.name} className="mr-6">
            {i.name}:{' '}
            <span className="font-medium text-gray-700 dark:text-gray-300">{i.price?.toLocaleString('en-IN')}</span>{' '}
            <span className={i.changePercent < 0 ? 'text-red-500' : 'text-green-600'}>
              ({i.changePercent >= 0 ? '+' : ''}{i.changePercent}%)
            </span>
          </span>
        ))}
      </div>
      <div className="flex items-center justify-end gap-3 px-4 py-2.5">
        <button
          onClick={toggleDark}
          data-tip={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="w-8 h-8 rounded-full border border-gray-200 dark:border-slate-600 flex items-center justify-center text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-brand hover:text-brand"
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-gray-50 border border-gray-200"
          >
            <div className="w-7 h-7 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs font-semibold">
              {(user?.full_name || 'U').charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-gray-700">{user?.full_name}</span>
            <ChevronDown size={14} className="text-gray-400" />
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
