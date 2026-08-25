'use client';

import { Match } from '@/types';
import { motion } from 'framer-motion';
import { Radio, ChevronRight, TrendingUp, Volume2, ExternalLink } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TeamCrest } from './TeamCrest';
import { CountryFlag } from './CountryFlag';

interface LiveScoreCardProps {
  match: Match;
  isSelected?: boolean;
  onSelect?: () => void;
}

export function LiveScoreCard({ match, isSelected = false, onSelect }: LiveScoreCardProps) {
  const router = useRouter();
  const prevScoreRef = useRef(`${match.home_score}-${match.away_score}`);

  // Trigger celebration confetti on score update
  useEffect(() => {
    const currentScore = `${match.home_score}-${match.away_score}`;
    if (prevScoreRef.current !== currentScore && match.status === 'LIVE') {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#EF4444', '#F59E0B', '#3B82F6', '#10B981', '#8B5CF6'],
      });
      prevScoreRef.current = currentScore;
    }
  }, [match.home_score, match.away_score, match.status]);

  const isLive = match.status === 'LIVE';

  const handleCardClick = () => {
    if (onSelect) {
      onSelect();
    }
    // Navigate directly to dedicated match details page
    router.push(`/match/${match.id}`);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      whileHover={{ y: -1.5 }}
      onClick={handleCardClick}
      className={`relative overflow-hidden rounded-xl border transition-all cursor-pointer select-none p-4 group ${
        isSelected
          ? 'bg-surface border-blue-500 ring-1 ring-blue-400/30 shadow-lg shadow-blue-500/10'
          : 'bg-surface border-surface-border hover:border-blue-400 dark:hover:border-blue-600 hover:bg-surface-subtle shadow-xs'
      }`}
    >
      {/* Header Info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
        <div className="flex items-center gap-2">
          <CountryFlag country={match.league.country} size="xs" />
          <span className="font-semibold uppercase tracking-wider text-foreground text-[11px] font-mono">
            {match.league.name}
          </span>
          {match.has_live_audio && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-500/30">
              <Volume2 className="w-3 h-3" /> Audio
            </span>
          )}
        </div>

        {/* Status / Minute Badge */}
        <div className="flex items-center gap-2">
          {isLive ? (
            <div className="flex items-center gap-1.5 bg-red-500 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider shadow-sm shadow-red-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>{match.period} {match.minute}&apos;</span>
            </div>
          ) : match.status === 'FINISHED' ? (
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded text-[10px] font-mono font-semibold">
              FT
            </span>
          ) : (
            <span className="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-mono">
              {new Date(match.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}

          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>

      {/* Main Score Board */}
      <div className="grid grid-cols-12 items-center gap-2 my-2">
        {/* Home Team */}
        <div className="col-span-5 flex items-center gap-2.5">
          <TeamCrest
            name={match.home_team.name}
            shortName={match.home_team.short_name}
            logoUrl={match.home_team.logo}
            size="md"
          />
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-foreground truncate">
              <span className="inline sm:hidden">{match.home_team.short_name || match.home_team.name.slice(0, 3)}</span>
              <span className="hidden sm:inline">{match.home_team.name}</span>
            </p>
            <div className="flex items-center gap-1.5">
              {match.stats.yellow_cards_home > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-mono text-yellow-600 dark:text-yellow-400">
                  <span className="w-2 h-2.5 bg-yellow-400 rounded-sm inline-block" />
                  {match.stats.yellow_cards_home}
                </span>
              )}
              {match.stats.red_cards_home > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold text-red-500">
                  <span className="w-2 h-2.5 bg-red-500 rounded-sm inline-block" />
                  {match.stats.red_cards_home}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Score Display */}
        <div className="col-span-2 flex flex-col items-center justify-center">
          <div className={`flex items-center gap-1.5 font-mono text-lg sm:text-xl font-black px-3 py-0.5 rounded-lg border ${
            isLive
              ? 'text-indigo-700 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-500/15 border-indigo-200 dark:border-indigo-500/30'
              : 'text-foreground bg-surface-subtle border-surface-border'
          }`}>
            <motion.span
              key={`h-${match.home_score}`}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              {match.home_score}
            </motion.span>
            <span className="text-muted-foreground text-sm">:</span>
            <motion.span
              key={`a-${match.away_score}`}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              {match.away_score}
            </motion.span>
          </div>
          {match.period_scores && match.period_scores.length > 0 && (
            <p className="text-[9px] font-mono text-muted-foreground mt-1 truncate">
              {match.period_scores[match.period_scores.length - 1]}
            </p>
          )}
        </div>

        {/* Away Team */}
        <div className="col-span-5 flex items-center justify-end gap-2.5 text-right">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-foreground truncate">
              <span className="inline sm:hidden">{match.away_team.short_name || match.away_team.name.slice(0, 3)}</span>
              <span className="hidden sm:inline">{match.away_team.name}</span>
            </p>
            <div className="flex items-center justify-end gap-1.5">
              {match.stats.yellow_cards_away > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-mono text-yellow-600 dark:text-yellow-400">
                  <span className="w-2 h-2.5 bg-yellow-400 rounded-sm inline-block" />
                  {match.stats.yellow_cards_away}
                </span>
              )}
              {match.stats.red_cards_away > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold text-red-500">
                  <span className="w-2 h-2.5 bg-red-500 rounded-sm inline-block" />
                  {match.stats.red_cards_away}
                </span>
              )}
            </div>
          </div>
          <TeamCrest
            name={match.away_team.name}
            shortName={match.away_team.short_name}
            logoUrl={match.away_team.logo}
            size="md"
          />
        </div>
      </div>

      {/* Mini Possession / Stats Bar for Live Games */}
      {isLive && match.stats.possession_home > 0 && (
        <div className="mt-2.5 pt-2 border-t border-surface-border">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1 font-mono">
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{match.stats.possession_home}%</span>
            <span>xG: {match.stats.xg_home} - {match.stats.xg_away}</span>
            <span className="text-orange-600 dark:text-orange-400 font-semibold">{match.stats.possession_away}%</span>
          </div>
          <div className="w-full h-1.5 bg-surface-subtle rounded-full overflow-hidden flex">
            <div
              className="bg-indigo-500 h-full rounded-l-full transition-all duration-500"
              style={{ width: `${match.stats.possession_home}%` }}
            />
            <div
              className="bg-orange-400 h-full rounded-r-full transition-all duration-500"
              style={{ width: `${match.stats.possession_away}%` }}
            />
          </div>
        </div>
      )}

      {/* Consensus Odds Strip */}
      {match.odds?.consensus && (
        <div className="mt-2 pt-2 border-t border-surface-border flex items-center justify-between text-[11px] font-mono">
          <span className="text-sky-600 dark:text-sky-400 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-muted-foreground" /> Odds
          </span>
          <div className="flex items-center gap-1.5">
            <span className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold">
              1: {match.odds.consensus.home_win.toFixed(2)}
            </span>
            {match.odds.consensus.draw && (
              <span className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold">
                X: {match.odds.consensus.draw.toFixed(2)}
              </span>
            )}
            <span className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold">
              2: {match.odds.consensus.away_win.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
