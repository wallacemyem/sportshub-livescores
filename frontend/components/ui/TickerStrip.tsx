'use client';

import { Match } from '@/types';
import { Activity } from 'lucide-react';

interface TickerStripProps {
  matches: Match[];
  onSelectMatch: (match: Match) => void;
}

export function TickerStrip({ matches, onSelectMatch }: TickerStripProps) {
  const liveMatches = matches.filter((m) => m.status === 'LIVE');

  if (liveMatches.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-full overflow-hidden bg-emerald-50/50 dark:bg-emerald-500/5 border-y border-emerald-200/70 dark:border-emerald-500/15 py-1.5 select-none">
      <div className="max-w-[1720px] mx-auto px-3 sm:px-4 flex items-center gap-3 sm:gap-4 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider shrink-0 pr-3 border-r border-emerald-300 dark:border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-red-600 dark:text-red-400">LIVE</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {liveMatches.map((m) => (
            <button
              key={m.id}
              onClick={() => onSelectMatch(m)}
              className="flex items-center gap-2 bg-surface hover:bg-surface-hover border border-surface-border hover:border-blue-300 dark:hover:border-blue-600 px-2.5 py-1 rounded-lg text-xs transition-all shrink-0 cursor-pointer"
            >
              <span className="font-mono text-[10px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 px-1.5 py-0.5 rounded font-bold">
                {m.minute}&apos;
              </span>
              <div className="flex items-center gap-1.5 font-medium text-foreground text-xs font-mono">
                <span>{m.home_team.short_name}</span>
                <span className="font-bold bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 px-1.5 rounded">
                  {m.home_score}-{m.away_score}
                </span>
                <span>{m.away_team.short_name}</span>
              </div>
              {m.stats.attacking_pressure && (
                <span className="text-[9px] font-mono uppercase bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-1 py-0.5 rounded text-amber-600 dark:text-amber-400">
                  {m.stats.attacking_pressure}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
