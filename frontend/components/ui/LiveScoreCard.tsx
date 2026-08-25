'use client';

import { Match } from '@/types';
import { motion } from 'framer-motion';
import { Radio, ChevronRight, TrendingUp, Volume2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useEffect, useRef } from 'react';

interface LiveScoreCardProps {
  match: Match;
  isSelected: boolean;
  onSelect: () => void;
}

export function LiveScoreCard({ match, isSelected, onSelect }: LiveScoreCardProps) {
  const prevScoreRef = useRef(`${match.home_score}-${match.away_score}`);

  // Trigger subtle celebration confetti on score update
  useEffect(() => {
    const currentScore = `${match.home_score}-${match.away_score}`;
    if (prevScoreRef.current !== currentScore && match.status === 'LIVE') {
      confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.8 },
        colors: ['#FFFFFF', '#A1A1AA', '#71717A'],
      });
      prevScoreRef.current = currentScore;
    }
  }, [match.home_score, match.away_score, match.status]);

  const isLive = match.status === 'LIVE';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      whileHover={{ y: -1 }}
      onClick={onSelect}
      className={`relative overflow-hidden rounded-xl border transition-all cursor-pointer select-none p-4 ${
        isSelected
          ? 'bg-surface-hover border-foreground ring-1 ring-foreground/20 shadow-subtle'
          : 'bg-surface border-surface-border hover:border-foreground/30 hover:bg-surface-subtle'
      }`}
    >
      {/* Header Info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold uppercase tracking-wider text-foreground text-[11px] font-mono">
            {match.league.name}
          </span>
          {match.has_live_audio && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-foreground bg-surface-subtle px-1.5 py-0.5 rounded border border-surface-border">
              <Volume2 className="w-3 h-3" /> Audio
            </span>
          )}
        </div>

        {/* Status / Minute Badge */}
        {isLive ? (
          <div className="flex items-center gap-1.5 bg-foreground text-background px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-background animate-pulse" />
            <span>{match.period} {match.minute}&apos;</span>
          </div>
        ) : match.status === 'FINISHED' ? (
          <span className="bg-surface-subtle text-muted-foreground border border-surface-border px-2 py-0.5 rounded text-[10px] font-mono font-semibold">
            FT
          </span>
        ) : (
          <span className="bg-surface-subtle text-muted-foreground border border-surface-border px-2 py-0.5 rounded text-[10px] font-mono">
            {new Date(match.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Main Score Board */}
      <div className="grid grid-cols-12 items-center gap-2 my-2">
        {/* Home Team */}
        <div className="col-span-5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-surface-subtle border border-surface-border flex items-center justify-center font-mono font-bold text-xs text-foreground shrink-0 uppercase tracking-tighter">
            {match.home_team.short_name || match.home_team.name.slice(0, 3)}
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-foreground truncate">{match.home_team.name}</p>
            {match.stats.yellow_cards_home > 0 && (
              <span className="text-[9px] font-mono text-muted-foreground mr-1">
                YC:{match.stats.yellow_cards_home}
              </span>
            )}
            {match.stats.red_cards_home > 0 && (
              <span className="text-[9px] font-mono font-bold text-foreground">
                RC:{match.stats.red_cards_home}
              </span>
            )}
          </div>
        </div>

        {/* Score Display */}
        <div className="col-span-2 flex flex-col items-center justify-center">
          <div className="flex items-center gap-1.5 font-mono text-lg sm:text-xl font-black text-foreground bg-surface-subtle px-2.5 py-0.5 rounded-lg border border-surface-border">
            <motion.span
              key={`h-${match.home_score}`}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              {match.home_score}
            </motion.span>
            <span className="text-muted-foreground">:</span>
            <motion.span
              key={`a-${match.away_score}`}
              initial={{ scale: 1.2 }}
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
            <p className="text-xs sm:text-sm font-bold text-foreground truncate">{match.away_team.name}</p>
            {match.stats.yellow_cards_away > 0 && (
              <span className="text-[9px] font-mono text-muted-foreground mr-1">
                YC:{match.stats.yellow_cards_away}
              </span>
            )}
            {match.stats.red_cards_away > 0 && (
              <span className="text-[9px] font-mono font-bold text-foreground">
                RC:{match.stats.red_cards_away}
              </span>
            )}
          </div>
          <div className="w-8 h-8 rounded-lg bg-surface-subtle border border-surface-border flex items-center justify-center font-mono font-bold text-xs text-foreground shrink-0 uppercase tracking-tighter">
            {match.away_team.short_name || match.away_team.name.slice(0, 3)}
          </div>
        </div>
      </div>

      {/* Mini Possession / Stats Bar for Live Games */}
      {isLive && match.stats.possession_home > 0 && (
        <div className="mt-2.5 pt-2 border-t border-surface-border">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1 font-mono">
            <span>{match.stats.possession_home}%</span>
            <span>xG: {match.stats.xg_home} - {match.stats.xg_away}</span>
            <span>{match.stats.possession_away}%</span>
          </div>
          <div className="w-full h-1 bg-surface-subtle rounded-full overflow-hidden flex border border-surface-border">
            <div
              className="bg-foreground h-full transition-all duration-500"
              style={{ width: `${match.stats.possession_home}%` }}
            />
            <div
              className="bg-muted-foreground h-full transition-all duration-500"
              style={{ width: `${match.stats.possession_away}%` }}
            />
          </div>
        </div>
      )}

      {/* Live Odds Quick Strip */}
      {match.odds?.consensus && (
        <div className="mt-2.5 flex items-center justify-between text-xs bg-surface-subtle px-2.5 py-1 rounded-lg border border-surface-border font-mono">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase">
            <TrendingUp className="w-3 h-3 text-foreground" /> Odds:
          </span>
          <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
            <span>1: <strong className="text-foreground font-bold">{match.odds.consensus.home_win}</strong></span>
            {match.odds.consensus.draw && (
              <span>X: <strong className="text-foreground font-bold">{match.odds.consensus.draw}</strong></span>
            )}
            <span>2: <strong className="text-foreground font-bold">{match.odds.consensus.away_win}</strong></span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
