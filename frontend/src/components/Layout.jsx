import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import CursorGlow from './CursorGlow';
import { useScrollReveal } from '../hooks/useScrollReveal';

export default function Layout({ children }) {
  // Re-scan for newly rendered .reveal elements whenever this page's
  // content changes (e.g. async data finishes loading).
  useScrollReveal([children]);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950 relative">
      <CursorGlow />
      <Sidebar />
      <div className="flex-1 min-w-0 relative z-[1]">
        <Topbar />
        <main className="p-5">{children}</main>
      </div>
    </div>
  );
}
