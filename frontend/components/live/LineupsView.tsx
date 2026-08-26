'use client';

import { Match } from '@/types';
import { Users } from 'lucide-react';

interface LineupsViewProps {
  match: Match;
}

export function LineupsView({ match }: LineupsViewProps) {
  const homeFormation = '4-3-3';
  const awayFormation = '4-2-3-1';

  const homeStarters = [
    { num: 1, name: 'D. Raya', pos: 'GK' },
    { num: 4, name: 'B. White', pos: 'DF' },
    { num: 2, name: 'W. Saliba', pos: 'DF' },
    { num: 6, name: 'Gabriel', pos: 'DF' },
    { num: 12, name: 'J. Timber', pos: 'DF' },
    { num: 41, name: 'D. Rice', pos: 'MF' },
    { num: 8, name: 'M. Ødegaard (C)', pos: 'MF' },
    { num: 29, name: 'K. Havertz', pos: 'MF' },
    { num: 7, name: 'B. Saka', pos: 'FW' },
    { num: 11, name: 'G. Martinelli', pos: 'FW' },
    { num: 9, name: 'G. Jesus', pos: 'FW' },
  ];

  const awayStarters = [
    { num: 31, name: 'Ederson', pos: 'GK' },
    { num: 2, name: 'K. Walker (C)', pos: 'DF' },
    { num: 3, name: 'R. Dias', pos: 'DF' },
    { num: 25, name: 'M. Akanji', pos: 'DF' },
    { num: 24, name: 'J. Gvardiol', pos: 'DF' },
    { num: 16, name: 'Rodri', pos: 'MF' },
    { num: 8, name: 'M. Kovačić', pos: 'MF' },
    { num: 17, name: 'K. De Bruyne', pos: 'MF' },
    { num: 20, name: 'B. Silva', pos: 'FW' },
    { num: 47, name: 'P. Foden', pos: 'FW' },
    { num: 9, name: 'E. Haaland', pos: 'FW' },
  ];

  return (
    <div className="bg-surface rounded-xl border border-surface-border p-4 shadow-subtle">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h4 className="flex min-w-0 items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-foreground">
          <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">Lineups</span>
        </h4>
        <div className="flex shrink-0 items-center gap-2 font-mono text-xs">
          <span className="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/30">
            {homeFormation}
          </span>
          <span className="text-muted-foreground">vs</span>
          <span className="text-orange-600 dark:text-orange-400 font-bold bg-orange-50 dark:bg-orange-500/10 px-2 py-0.5 rounded border border-orange-200 dark:border-orange-500/30">
            {awayFormation}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs">
        {/* Home Lineup */}
        <div className="bg-surface-subtle rounded-xl p-3 border border-surface-border">
          <p className="mb-2 flex items-center justify-between gap-2 border-b border-surface-border pb-1.5 font-bold text-foreground">
            <span className="min-w-0 truncate">{match.home_team.name}</span>
            <span className="shrink-0 font-mono text-[10px] font-normal text-muted-foreground">M. Arteta</span>
          </p>
          <ul className="space-y-1.5">
            {homeStarters.map((p) => (
              <li key={p.num} className="flex items-center justify-between gap-2 text-muted-foreground transition-colors hover:text-foreground">
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="w-4 shrink-0 text-right font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400">{p.num}</span>
                  <span className="text-foreground truncate font-medium">{p.name}</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-mono px-1 bg-surface rounded border border-surface-border shrink-0">{p.pos}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Away Lineup */}
        <div className="bg-surface-subtle rounded-xl p-3 border border-surface-border">
          <p className="mb-2 flex items-center justify-between gap-2 border-b border-surface-border pb-1.5 font-bold text-foreground">
            <span className="min-w-0 truncate">{match.away_team.name}</span>
            <span className="shrink-0 font-mono text-[10px] font-normal text-muted-foreground">P. Guardiola</span>
          </p>
          <ul className="space-y-1.5">
            {awayStarters.map((p) => (
              <li key={p.num} className="flex items-center justify-between gap-2 text-muted-foreground transition-colors hover:text-foreground">
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="w-4 shrink-0 text-right font-mono text-[10px] font-bold text-orange-600 dark:text-orange-400">{p.num}</span>
                  <span className="text-foreground truncate font-medium">{p.name}</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-mono px-1 bg-surface rounded border border-surface-border shrink-0">{p.pos}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
