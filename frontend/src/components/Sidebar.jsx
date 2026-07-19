import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, Calendar, Wrench, BarChart2
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/trades', label: 'Trades', icon: ArrowLeftRight },
  { to: '/calendar', label: 'Calender', icon: Calendar },
  { to: '/tools', label: 'Tools', icon: Wrench },
  { to: '/reports', label: 'Reports', icon: BarChart2 }
];

export default function Sidebar() {
  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 bg-white border-r border-gray-200 flex flex-col">
      <div className="px-5 py-5 flex items-center gap-2 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-brand text-white flex items-center justify-center font-bold text-sm">
          TD
        </div>
        <span className="text-lg font-bold text-brand">Trade Diary</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand/10 text-brand'
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-5 py-4 text-xs text-gray-400 border-t border-gray-100">
        © 2026 Trade Diary. All rights reserved.
      </div>
    </aside>
  );
}
