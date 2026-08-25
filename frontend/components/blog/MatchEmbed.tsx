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
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-surface-subtle text-foreground px-2 py-0.5 rounded border border-surface-border flex items-center gap-1">
            <Zap className="w-3 h-3" /> Live Match Widget
          </span>
          <span className="font-semibold text-foreground">{match.league.name}</span>
        </div>

        {isLive ? (
          <div className="flex items-center gap-1.5 text-foreground font-mono font-bold text-xs bg-surface-subtle px-2 py-0.5 rounded-full border border-surface-border">
            <span className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" />
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
          <div className="w-8 h-8 rounded-lg bg-surface-subtle border border-surface-border flex items-center justify-center font-mono font-bold text-xs text-foreground shrink-0 uppercase">
            {match.home_team.short_name || match.home_team.name.slice(0, 3)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{match.home_team.name}</p>
            <p className="text-[10px] text-muted-foreground">Home</p>
          </div>
        </div>

        {/* Score Center */}
        <div className="col-span-2 flex flex-col items-center justify-center">
          <div className="font-mono text-xl font-black text-foreground bg-surface-subtle px-2.5 py-0.5 rounded-lg border border-surface-border">
            {match.home_score} : {match.away_score}
          </div>
        </div>

        {/* Away Team */}
        <div className="col-span-5 flex items-center justify-end gap-2.5 text-right">
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{match.away_team.name}</p>
            <p className="text-[10px] text-muted-foreground">Away</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-surface-subtle border border-surface-border flex items-center justify-center font-mono font-bold text-xs text-foreground shrink-0 uppercase">
            {match.away_team.short_name || match.away_team.name.slice(0, 3)}
          </div>
        </div>
      </div>

      {/* Footer Info & Match Center Link */}
      <div className="mt-3 pt-2 border-t border-surface-border flex items-center justify-between text-xs">
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
          <span>Poss: {match.stats.possession_home || 50}% - {match.stats.possession_away || 50}%</span>
          {match.stats.xg_home > 0 && (
            <span className="text-foreground font-bold">xG: {match.stats.xg_home} - {match.stats.xg_away}</span>
          )}
        </div>

        <Link
          href={`/match/${match.id}`}
          className="flex items-center gap-1 text-foreground font-bold text-xs hover:underline"
        >
          <span>Open 2D Pitch</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
