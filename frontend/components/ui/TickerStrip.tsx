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
    <div className="bg-surface-subtle border-y border-surface-border py-1.5 px-4 overflow-x-auto scrollbar-none flex items-center gap-4 select-none">
      <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-foreground uppercase tracking-wider shrink-0 pr-3 border-r border-surface-border">
        <span className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" />
        <span>LIVE TICKER</span>
      </div>

      <div className="flex items-center gap-2.5">
        {liveMatches.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelectMatch(m)}
            className="flex items-center gap-2 bg-surface hover:bg-surface-hover border border-surface-border hover:border-foreground/30 px-2.5 py-1 rounded-lg text-xs transition-all shrink-0 cursor-pointer"
          >
            <span className="font-mono text-[10px] text-foreground bg-surface-subtle border border-surface-border px-1.5 py-0.5 rounded font-bold">
              {m.minute}&apos;
            </span>
            <div className="flex items-center gap-1.5 font-medium text-foreground text-xs font-mono">
              <span>{m.home_team.short_name}</span>
              <span className="font-bold bg-surface-subtle border border-surface-border px-1 rounded text-foreground">
                {m.home_score}-{m.away_score}
              </span>
              <span>{m.away_team.short_name}</span>
            </div>
            {m.stats.attacking_pressure && (
              <span className="text-[9px] font-mono uppercase bg-surface-subtle border border-surface-border px-1 py-0.5 rounded text-muted-foreground">
                {m.stats.attacking_pressure}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
