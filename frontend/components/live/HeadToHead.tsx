'use client';

import { Match } from '@/types';
import { Activity } from 'lucide-react';

interface HeadToHeadProps {
  match: Match;
}

export function HeadToHead({ match }: HeadToHeadProps) {
  const stats = match.stats;

  const statRows = [
    { label: 'Ball Possession', home: `${stats.possession_home || 50}%`, away: `${stats.possession_away || 50}%`, homeVal: stats.possession_home || 50, awayVal: stats.possession_away || 50 },
    { label: 'Expected Goals (xG)', home: stats.xg_home?.toFixed(2) || '1.20', away: stats.xg_away?.toFixed(2) || '0.90', homeVal: stats.xg_home || 1.2, awayVal: stats.xg_away || 0.9 },
    { label: 'Total Shots', home: stats.shots_home, away: stats.shots_away, homeVal: stats.shots_home, awayVal: stats.shots_away },
    { label: 'Shots On Target', home: stats.shots_on_target_home, away: stats.shots_on_target_away, homeVal: stats.shots_on_target_home, awayVal: stats.shots_on_target_away },
    { label: 'Corner Kicks', home: stats.corners_home, away: stats.corners_away, homeVal: stats.corners_home, awayVal: stats.corners_away },
    { label: 'Fouls Committed', home: stats.fouls_home, away: stats.fouls_away, homeVal: stats.fouls_home, awayVal: stats.fouls_away, reverse: true },
    { label: 'Yellow Cards', home: stats.yellow_cards_home, away: stats.yellow_cards_away, homeVal: stats.yellow_cards_home, awayVal: stats.yellow_cards_away, reverse: true },
  ];

  return (
    <div className="bg-surface rounded-xl border border-surface-border p-4 shadow-subtle">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2 font-mono">
          <Activity className="w-3.5 h-3.5 text-muted-foreground" /> Match Statistics & Performance
        </h4>
      </div>

      <div className="space-y-4">
        {statRows.map((row) => {
          const total = (Number(row.homeVal) + Number(row.awayVal)) || 1;
          const homePct = Math.round((Number(row.homeVal) / total) * 100);
          const awayPct = 100 - homePct;

          return (
            <div key={row.label} className="text-xs">
              <div className="flex items-center justify-between font-mono mb-1">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{row.home}</span>
                <span className="text-[11px] text-muted-foreground font-sans font-medium">{row.label}</span>
                <span className="font-bold text-orange-600 dark:text-orange-400">{row.away}</span>
              </div>
              <div className="w-full h-1.5 bg-surface-subtle rounded-full overflow-hidden flex">
                <div
                  className="bg-indigo-500 rounded-l-full transition-all duration-500"
                  style={{ width: `${homePct}%` }}
                />
                <div
                  className="bg-orange-400 rounded-r-full transition-all duration-500"
                  style={{ width: `${awayPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
