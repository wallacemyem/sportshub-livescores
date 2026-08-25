'use client';

import { MatchOdds } from '@/types';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';

interface OddsComparisonTableProps {
  odds?: MatchOdds;
}

export function OddsComparisonTable({ odds }: OddsComparisonTableProps) {
  if (!odds || !odds.bookmakers || odds.bookmakers.length === 0) {
    return (
      <div className="bg-surface rounded-xl border border-surface-border p-4 text-center text-muted-foreground text-xs">
        No bookmaker odds currently open for this match.
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl border border-surface-border p-4 shadow-subtle">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2 font-mono">
          <Layers className="w-3.5 h-3.5 text-muted-foreground" /> Odds Comparison & Line Moves
        </h4>
        <span className="text-[10px] text-muted-foreground font-mono">
          The Odds API
        </span>
      </div>

      {/* Consensus Highlight */}
      <div className="bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-500/10 dark:to-blue-500/10 border border-sky-200 dark:border-sky-500/30 rounded-xl p-3 mb-3 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-sky-800 dark:text-sky-300 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Market Consensus (Fair Odds)
          </span>
          <p className="text-[10px] text-muted-foreground mt-0.5">Aggregated tier-1 bookmaker average</p>
        </div>
        <div className="flex items-center gap-4 font-mono text-sm font-bold">
          <div className="text-center">
            <span className="text-[9px] text-muted-foreground block">1 (Home)</span>
            <span className="text-emerald-600 dark:text-emerald-400">{odds.consensus.home_win}</span>
          </div>
          {odds.consensus.draw && (
            <div className="text-center">
              <span className="text-[9px] text-muted-foreground block">X (Draw)</span>
              <span className="text-amber-600 dark:text-amber-400">{odds.consensus.draw}</span>
            </div>
          )}
          <div className="text-center">
            <span className="text-[9px] text-muted-foreground block">2 (Away)</span>
            <span className="text-blue-600 dark:text-blue-400">{odds.consensus.away_win}</span>
          </div>
        </div>
      </div>

      {/* Bookmakers Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-surface-border text-muted-foreground text-[10px] uppercase font-mono">
              <th className="py-2 px-3">Bookmaker</th>
              <th className="py-2 px-3 text-center">1 (Home)</th>
              <th className="py-2 px-3 text-center">X (Draw)</th>
              <th className="py-2 px-3 text-center">2 (Away)</th>
              <th className="py-2 px-3 text-center">O 2.5</th>
              <th className="py-2 px-3 text-center">U 2.5</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border font-mono">
            {odds.bookmakers.map((bk) => (
              <tr key={bk.bookmaker_key} className="hover:bg-surface-subtle transition-colors">
                <td className="py-2.5 px-3 font-sans font-semibold text-foreground flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  {bk.bookmaker_title}
                </td>
                <td className="py-2.5 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="flex items-center justify-center gap-0.5">
                    {bk.home_win}
                    <ArrowUpRight className="w-3 h-3 text-emerald-500 inline" />
                  </span>
                </td>
                <td className="py-2.5 px-3 text-center font-bold text-muted-foreground">
                  {bk.draw || '-'}
                </td>
                <td className="py-2.5 px-3 text-center font-bold text-blue-600 dark:text-blue-400">
                  <span className="flex items-center justify-center gap-0.5">
                    {bk.away_win}
                    <ArrowDownRight className="w-3 h-3 text-red-500 inline" />
                  </span>
                </td>
                <td className="py-2.5 px-3 text-center text-muted-foreground">
                  {bk.over_25 || '-'}
                </td>
                <td className="py-2.5 px-3 text-center text-muted-foreground">
                  {bk.under_25 || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
