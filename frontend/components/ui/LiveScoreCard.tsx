import { Match } from '@/types';
import { motion } from 'framer-motion';
import { Radio, ChevronRight, TrendingUp, Volume2, Activity, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TeamCrest } from './TeamCrest';
import { CountryFlag } from './CountryFlag';
import { formatTimeAMPM } from '@/lib/date';

interface LiveScoreCardProps {
  match: Match;
  isSelected?: boolean;
  onSelect?: () => void;
  onRemove?: (id: string) => void;
}

export function LiveScoreCard({ match, isSelected = false, onSelect, onRemove }: LiveScoreCardProps) {
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
    } else {
      router.push(`/match/${match.id}`);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      whileHover={{ y: -1.5 }}
      onClick={handleCardClick}
      className={`relative overflow-hidden rounded-xl border transition-all cursor-pointer select-none p-3.5 sm:p-4 group ${
        isSelected
          ? 'bg-surface border-blue-500 ring-1 ring-blue-400/30 shadow-lg shadow-blue-500/10'
          : 'bg-surface border-surface-border hover:border-blue-400 dark:hover:border-blue-600 hover:bg-surface-subtle shadow-sm'
      }`}
    >
      {/* 1. Header Info Row (League, Country, Sport, Live Clock, Action) */}
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3 pb-2 border-b border-surface-border">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <CountryFlag country={match.league.country} size="xs" />
          <span className="font-semibold uppercase tracking-wider text-foreground text-[11px] font-mono truncate max-w-[140px] sm:max-w-[240px]">
            {match.league.name}
          </span>
          <span className="hidden sm:inline text-[9px] uppercase px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 font-mono font-bold border border-blue-200 dark:border-blue-500/30 shrink-0">
            {match.sport}
          </span>
          {match.has_live_audio && (
            <span className="hidden sm:flex items-center gap-1 text-[9px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/30 shrink-0 font-bold">
              <Volume2 className="w-3 h-3" /> Audio
            </span>
          )}
        </div>

        {/* Live Status / Time Badge */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isLive ? (
            <div className="flex items-center gap-1 bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider shadow-sm shadow-red-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>{match.period} {match.minute}&apos;</span>
            </div>
          ) : match.status === 'FINISHED' ? (
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
              FT
            </span>
          ) : (
            <span className="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
              {formatTimeAMPM(match.start_time)}
            </span>
          )}

          {onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(match.id);
              }}
              title="Remove game from tracker"
              aria-label="Remove game"
              className="p-1 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>

      {/* 2. Structured Team Rows (Flashscore / SofaScore Standard) */}
      <div className="space-y-2 my-1">
        {/* Home Team Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <TeamCrest
              name={match.home_team.name}
              shortName={match.home_team.short_name}
              logoUrl={match.home_team.logo}
              sport={match.sport}
              size="sm"
            />
            <div className="min-w-0 flex-1 flex items-center gap-2">
              <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                <span className="inline sm:hidden">{match.home_team.short_name || match.home_team.name.slice(0, 3)}</span>
                <span className="hidden sm:inline">{match.home_team.name}</span>
              </p>

              {/* Home Cards */}
              <div className="flex items-center gap-1 shrink-0">
                {(match.stats?.yellow_cards_home ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-mono text-yellow-600 dark:text-yellow-400">
                    <span className="w-2 h-2.5 bg-yellow-400 rounded-sm inline-block" />
                    {match.stats.yellow_cards_home}
                  </span>
                )}
                {(match.stats?.red_cards_home ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold text-red-500">
                    <span className="w-2 h-2.5 bg-red-500 rounded-sm inline-block" />
                    {match.stats.red_cards_home}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Home Score */}
          <div className="shrink-0 font-mono">
            <div className={`w-8 h-7 sm:w-9 sm:h-8 rounded-lg flex items-center justify-center font-black text-sm sm:text-base border transition-all ${
              isLive
                ? 'bg-indigo-50 dark:bg-indigo-500/15 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-200'
                : 'bg-surface-subtle border-surface-border text-foreground'
            }`}>
              {isLive || match.status === 'FINISHED' ? (
                <motion.span
                  key={`h-${match.home_score}`}
                  initial={{ scale: 1.25 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {match.home_score}
                </motion.span>
              ) : (
                <span className="text-muted-foreground font-normal text-xs">-</span>
              )}
            </div>
          </div>
        </div>

        {/* Away Team Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <TeamCrest
              name={match.away_team.name}
              shortName={match.away_team.short_name}
              logoUrl={match.away_team.logo}
              sport={match.sport}
              size="sm"
            />
            <div className="min-w-0 flex-1 flex items-center gap-2">
              <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                <span className="inline sm:hidden">{match.away_team.short_name || match.away_team.name.slice(0, 3)}</span>
                <span className="hidden sm:inline">{match.away_team.name}</span>
              </p>

              {/* Away Cards */}
              <div className="flex items-center gap-1 shrink-0">
                {(match.stats?.yellow_cards_away ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-mono text-yellow-600 dark:text-yellow-400">
                    <span className="w-2 h-2.5 bg-yellow-400 rounded-sm inline-block" />
                    {match.stats.yellow_cards_away}
                  </span>
                )}
                {(match.stats?.red_cards_away ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold text-red-500">
                    <span className="w-2 h-2.5 bg-red-500 rounded-sm inline-block" />
                    {match.stats.red_cards_away}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Away Score */}
          <div className="shrink-0 font-mono">
            <div className={`w-8 h-7 sm:w-9 sm:h-8 rounded-lg flex items-center justify-center font-black text-sm sm:text-base border transition-all ${
              isLive
                ? 'bg-indigo-50 dark:bg-indigo-500/15 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-200'
                : 'bg-surface-subtle border-surface-border text-foreground'
            }`}>
              {isLive || match.status === 'FINISHED' ? (
                <motion.span
                  key={`a-${match.away_score}`}
                  initial={{ scale: 1.25 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {match.away_score}
                </motion.span>
              ) : (
                <span className="text-muted-foreground font-normal text-xs">-</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Period Breakdown or Possession Bar (for Live/Finished matches) */}
      {isLive && (match.stats?.possession_home ?? 0) > 0 && (
        <div className="mt-3 pt-2.5 border-t border-surface-border">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1 font-mono">
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{match.stats.possession_home}%</span>
            <span>xG: {match.stats.xg_home || 0} - {match.stats.xg_away || 0}</span>
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

      {/* 4. Consensus Odds Strip */}
      {match.odds?.consensus && (
        <div className="mt-2.5 pt-2 border-t border-surface-border flex items-center justify-between text-[11px] font-mono">
          <span className="text-sky-600 dark:text-sky-400 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-muted-foreground" /> Odds
          </span>
          <div className="flex items-center gap-1.5">
            <span className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold text-[10px]">
              1: {match.odds.consensus.home_win.toFixed(2)}
            </span>
            {match.odds.consensus.draw && (
              <span className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold text-[10px]">
                X: {match.odds.consensus.draw.toFixed(2)}
              </span>
            )}
            <span className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold text-[10px]">
              2: {match.odds.consensus.away_win.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
