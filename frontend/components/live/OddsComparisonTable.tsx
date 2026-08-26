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
        No betting odds currently available for this match.
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl border border-surface-border p-4 shadow-subtle">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="flex min-w-0 items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-foreground">
          <Layers className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">Sportsbook odds</span>
        </h4>
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">Live market</span>
      </div>

      {/* Consensus Highlight — wraps rather than letting the caption and the three
          prices squeeze into each other in the narrow detail column. */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50 to-blue-50 p-3 dark:border-sky-500/30 dark:from-sky-500/10 dark:to-blue-500/10">
        <div className="min-w-0">
          <span className="flex items-center gap-1 text-xs font-bold text-sky-800 dark:text-sky-300">
            <TrendingUp className="h-3.5 w-3.5 shrink-0" />
            <span>Market average</span>
          </span>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Aggregated across the sportsbooks below
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-4 font-mono text-sm font-bold">
          <div className="text-center">
            <span className="block text-[9px] text-muted-foreground">1 (Home)</span>
            <span className="text-emerald-600 dark:text-emerald-400">{odds.consensus.home_win}</span>
          </div>
          {odds.consensus.draw && (
            <div className="text-center">
              <span className="block text-[9px] text-muted-foreground">X (Draw)</span>
              <span className="text-amber-600 dark:text-amber-400">{odds.consensus.draw}</span>
            </div>
          )}
          <div className="text-center">
            <span className="block text-[9px] text-muted-foreground">2 (Away)</span>
            <span className="text-blue-600 dark:text-blue-400">{odds.consensus.away_win}</span>
          </div>
        </div>
      </div>

      {/* Bookmakers Table.
          min-w on the table is what makes the overflow container actually scroll;
          with `w-full` alone the six columns just crushed into each other. */}
      <div className="-mx-1 overflow-x-auto px-1">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead>
            <tr className="border-b border-surface-border text-muted-foreground text-[10px] uppercase font-mono">
              <th className="py-2 px-3">Sportsbook</th>
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
                <td className="whitespace-nowrap px-3 py-2.5 font-sans font-semibold text-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    {bk.bookmaker_title}
                  </span>
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
