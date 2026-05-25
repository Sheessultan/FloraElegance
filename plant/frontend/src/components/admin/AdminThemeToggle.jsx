import React from 'react';
import { Moon, Sun } from 'lucide-react';

const AdminThemeToggle = ({ darkMode, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    className={`flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-full border transition-all shrink-0 ${
      darkMode
        ? 'bg-slate-800 text-amber-300 border-slate-600 hover:bg-slate-700'
        : 'bg-slate-900 text-white border-slate-800 hover:bg-slate-800'
    }`}
  >
    {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    <span>{darkMode ? 'Light mode' : 'Dark mode'}</span>
  </button>
);

export default AdminThemeToggle;
