'use client';

import { useTheme } from './ThemeProvider';
import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`w-8 h-8 rounded-lg bg-surface-subtle border border-surface-border ${className}`} />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle Light and Dark Theme"
      className={`p-2 rounded-lg bg-surface-subtle hover:bg-surface-hover border border-surface-border text-foreground transition-colors cursor-pointer flex items-center justify-center ${className}`}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="w-4 h-4 text-slate-200 hover:text-white transition-transform hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-slate-800 hover:text-black transition-transform hover:-rotate-12" />
      )}
    </button>
  );
}
