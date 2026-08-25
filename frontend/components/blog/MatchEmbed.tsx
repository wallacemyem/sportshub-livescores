'use client';

import { Match } from '@/types';
import Link from 'next/link';
import { ExternalLink, Zap } from 'lucide-react';

interface MatchEmbedProps {
  match: Match;
}

export function MatchEmbed({ match }: MatchEmbedProps) {
  const isLive = match.status === 'LIVE';

  return (
    <div className="my-6 p-4 rounded-xl bg-surface border border-surface-border shadow-subtle not-prose">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3 pb-2 border-b border-surface-border">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 px-2 py-0.5 rounded border border-red-200 dark:border-red-500/30 flex items-center gap-1">
            <Zap className="w-3 h-3 text-red-500" /> Live Match Widget
          </span>
          <span className="font-semibold text-foreground">{match.league.name}</span>
        </div>

        {isLive ? (
          <div className="flex items-center gap-1.5 text-white font-mono font-bold text-xs bg-red-500 px-2.5 py-0.5 rounded-full shadow-sm shadow-red-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span>{match.period} {match.minute}&apos;</span>
          </div>
        ) : (
          <span className="font-mono text-muted-foreground bg-surface-subtle px-2 py-0.5 rounded text-[11px] border border-surface-border">
            {match.status}
          </span>
        )}
      </div>

      <div className="grid grid-cols-12 items-center gap-2 py-1">
        {/* Home Team */}
        <div className="col-span-5 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center font-mono font-bold text-xs text-indigo-700 dark:text-indigo-300 shrink-0 uppercase">
            {match.home_team.short_name || match.home_team.name.slice(0, 3)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{match.home_team.name}</p>
            <p className="text-[10px] text-muted-foreground">Home</p>
          </div>
        </div>

        {/* Score Center */}
        <div className="col-span-2 flex flex-col items-center justify-center">
          <div className={`font-mono text-xl font-black px-3 py-0.5 rounded-lg border ${
            isLive
              ? 'text-indigo-700 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-500/15 border-indigo-200 dark:border-indigo-500/30'
              : 'text-foreground bg-surface-subtle border-surface-border'
          }`}>
            {match.home_score} : {match.away_score}
          </div>
        </div>

        {/* Away Team */}
        <div className="col-span-5 flex items-center justify-end gap-2.5 text-right">
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{match.away_team.name}</p>
            <p className="text-[10px] text-muted-foreground">Away</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 flex items-center justify-center font-mono font-bold text-xs text-orange-700 dark:text-orange-300 shrink-0 uppercase">
            {match.away_team.short_name || match.away_team.name.slice(0, 3)}
          </div>
        </div>
      </div>

      {/* Footer Info & Match Center Link */}
      <div className="mt-3 pt-2 border-t border-surface-border flex items-center justify-between text-xs">
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="text-muted-foreground">Poss: <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{match.stats.possession_home || 50}%</span> - <span className="text-orange-600 dark:text-orange-400 font-semibold">{match.stats.possession_away || 50}%</span></span>
          {match.stats.xg_home > 0 && (
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">xG: {match.stats.xg_home} - {match.stats.xg_away}</span>
          )}
        </div>

        <Link
          href={`/match/${match.id}`}
          className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold text-xs hover:underline"
        >
          <span>Open 2D Pitch</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
