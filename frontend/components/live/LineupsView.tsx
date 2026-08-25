'use client';

import { Match } from '@/types';
import { Users } from 'lucide-react';

interface LineupsViewProps {
  match: Match;
}

export function LineupsView({ match }: LineupsViewProps) {
  // Sample tactical lineups for home and away
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
    <div className="bg-surface rounded-xl border border-surface-border p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-emerald-neon" /> Starting Lineups & Formations
        </h4>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-emerald-400 font-bold">{homeFormation}</span>
          <span className="text-slate-500">vs</span>
          <span className="text-cyan-400 font-bold">{awayFormation}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs">
        {/* Home Lineup */}
        <div className="bg-surface-subtle/50 rounded-lg p-3 border border-surface-border/60">
          <p className="font-bold text-white mb-2 flex items-center justify-between border-b border-surface-border/40 pb-1">
            <span>{match.home_team.name}</span>
            <span className="text-[10px] text-slate-400 font-normal">Manager: M. Arteta</span>
          </p>
          <ul className="space-y-1.5">
            {homeStarters.map((p) => (
              <li key={p.num} className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-2">
                  <span className="w-4 font-mono text-[10px] text-slate-500 text-right">{p.num}</span>
                  <span className="text-white">{p.name}</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">{p.pos}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Away Lineup */}
        <div className="bg-surface-subtle/50 rounded-lg p-3 border border-surface-border/60">
          <p className="font-bold text-white mb-2 flex items-center justify-between border-b border-surface-border/40 pb-1">
            <span>{match.away_team.name}</span>
            <span className="text-[10px] text-slate-400 font-normal">Manager: P. Guardiola</span>
          </p>
          <ul className="space-y-1.5">
            {awayStarters.map((p) => (
              <li key={p.num} className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-2">
                  <span className="w-4 font-mono text-[10px] text-slate-500 text-right">{p.num}</span>
                  <span className="text-white">{p.name}</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">{p.pos}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
