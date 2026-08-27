'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Radio,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  X,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Shield,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import type { Match } from '@/types';
import { formatClock, formatScore } from '@/lib/sportFormat';
import { useNotification } from '@/context/NotificationContext';

interface LiveActivityWidgetProps {
  matches?: Match[];
  selectedMatchId?: string | null;
  onSelectMatch?: (id: string) => void;
}

export function LiveActivityWidget({
  matches = [],
  selectedMatchId,
  onSelectMatch,
}: LiveActivityWidgetProps) {
  const { alertsEnabled, setAlertsEnabled } = useNotification();
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeMatchIndex, setActiveMatchIndex] = useState<number>(0);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [soundMuted, setSoundMuted] = useState<boolean>(false);

  // Filter for actual live matches currently in play
  const liveMatches = useMemo(() => {
    return matches.filter((m) => m.status === 'LIVE' || m.status === 'HALF_TIME');
  }, [matches]);

  // Current active match for the Live Activity
  const currentMatch = useMemo(() => {
    if (liveMatches.length === 0) return null;
    if (selectedMatchId) {
      const found = liveMatches.find((m) => m.id === selectedMatchId);
      if (found) return found;
    }
    return liveMatches[activeMatchIndex % liveMatches.length] || liveMatches[0];
  }, [liveMatches, selectedMatchId, activeMatchIndex]);

  // Reset dismissal when new live match becomes active
  useEffect(() => {
    if (liveMatches.length > 0 && isDismissed) {
      setIsDismissed(false);
    }
  }, [liveMatches.length]);

  if (!currentMatch || isDismissed) {
    return null;
  }

  const minuteNumber = typeof currentMatch.minute === 'number' ? currentMatch.minute : 45;
  const progressPercent = Math.min(100, Math.max(0, (minuteNumber / 90) * 100));

  return (
    <aside aria-label="Live Match Activity" className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-lg pointer-events-auto">
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          /* ========================================================================= */
          /* 1. iOS Dynamic Island Collapsed Pill (Top Floating Notch)                  */
          /* ========================================================================= */
          <motion.div
            key="dynamic-island-collapsed"
            initial={{ scale: 0.85, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            onClick={() => setIsExpanded(true)}
            className="mx-auto bg-black/95 backdrop-blur-2xl border border-white/20 hover:border-indigo-500/60 rounded-full px-4 py-2 shadow-2xl shadow-black/80 flex items-center justify-between gap-3.5 cursor-pointer select-none transition-all hover:scale-[1.02]"
          >
            {/* Left: Home Logo & Live Beacon */}
            <div className="flex items-center gap-2">
              <div className="relative">
                {currentMatch.home_team.logo ? (
                  <img
                    src={currentMatch.home_team.logo}
                    alt={currentMatch.home_team.name}
                    className="w-5 h-5 object-contain rounded-full bg-white/10 p-0.5"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-black">
                    {currentMatch.home_team.name.slice(0, 1)}
                  </div>
                )}
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <span className="text-xs font-bold text-slate-100 max-w-[70px] truncate">
                {currentMatch.home_team.short_name || currentMatch.home_team.name}
              </span>
            </div>

            {/* Center: Live Score & Match Clock */}
            <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/10">
              <span className="font-mono text-xs font-black text-white tabular-nums tracking-wider">
                {currentMatch.home_score} : {currentMatch.away_score}
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-400">
                {formatClock(currentMatch)}
              </span>
            </div>

            {/* Right: Away Logo & Expand Icon */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-100 max-w-[70px] truncate text-right">
                {currentMatch.away_team.short_name || currentMatch.away_team.name}
              </span>
              {currentMatch.away_team.logo ? (
                <img
                  src={currentMatch.away_team.logo}
                  alt={currentMatch.away_team.name}
                  className="w-5 h-5 object-contain rounded-full bg-white/10 p-0.5"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] font-black">
                  {currentMatch.away_team.name.slice(0, 1)}
                </div>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </motion.div>
        ) : (
          /* ========================================================================= */
          /* 2. iOS 17/18 Lock-Screen Live Activity Card (Expanded Real-Time HUD)       */
          /* ========================================================================= */
          <motion.div
            key="live-activity-expanded"
            initial={{ scale: 0.92, opacity: 0, y: -25 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: -25 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="bg-slate-950/95 backdrop-blur-3xl border-2 border-indigo-500/40 rounded-3xl p-4 sm:p-5 shadow-2xl shadow-black/90 text-white relative overflow-hidden"
          >
            {/* Ambient Background Radial Lights */}
            <div className="absolute -top-16 -left-16 w-44 h-44 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -right-16 w-44 h-44 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Header: App Name, Activity Indicator, League, Controls */}
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3 relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-600 to-emerald-400 p-0.5 shadow-md flex items-center justify-center">
                  <div className="w-full h-full bg-slate-950 rounded-[6px] flex items-center justify-center">
                    <Zap className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-black uppercase tracking-wider text-emerald-400">
                      LIVE ACTIVITY
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  </div>
                  <p className="text-[11px] font-semibold text-slate-300 truncate max-w-[190px]">
                    {currentMatch.league?.name || 'Live Match Center'}
                  </p>
                </div>
              </div>

              {/* Match Switcher & Action Controls */}
              <div className="flex items-center gap-1.5">
                {liveMatches.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setActiveMatchIndex((prev) => (prev + 1) % liveMatches.length)}
                    className="text-[10px] font-mono font-bold bg-white/10 hover:bg-white/15 px-2 py-1 rounded-lg border border-white/15 text-slate-200 transition-colors cursor-pointer"
                  >
                    Next ({activeMatchIndex + 1}/{liveMatches.length})
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSoundMuted(!soundMuted)}
                  title={soundMuted ? 'Unmute alerts' : 'Mute alerts'}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 transition-colors cursor-pointer"
                >
                  {soundMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  title="Collapse to Dynamic Island"
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 transition-colors cursor-pointer"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsDismissed(true)}
                  title="Dismiss Activity"
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Main Scoreboard HUD */}
            <div className="my-4 grid grid-cols-12 items-center gap-2 relative z-10">
              {/* Home Team */}
              <div className="col-span-5 flex flex-col items-center text-center">
                {currentMatch.home_team.logo ? (
                  <img
                    src={currentMatch.home_team.logo}
                    alt={currentMatch.home_team.name}
                    className="w-12 h-12 object-contain rounded-2xl bg-white/5 border border-white/10 p-1.5 shadow-lg"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-base font-black text-white">
                    {currentMatch.home_team.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <h4 className="font-bold text-xs text-white mt-1.5 leading-snug line-clamp-1">
                  {currentMatch.home_team.name}
                </h4>
                <span className="text-[10px] text-slate-400 font-mono">Home</span>
              </div>

              {/* Scoreline Center */}
              <div className="col-span-2 flex flex-col items-center justify-center">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-2xl sm:text-3xl font-black text-white tabular-nums drop-shadow-md">
                    {currentMatch.home_score}
                  </span>
                  <span className="font-mono text-lg font-bold text-slate-500">:</span>
                  <span className="font-mono text-2xl sm:text-3xl font-black text-white tabular-nums drop-shadow-md">
                    {currentMatch.away_score}
                  </span>
                </div>

                <div className="mt-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-mono font-bold text-emerald-400">
                    {formatClock(currentMatch)}
                  </span>
                </div>
              </div>

              {/* Away Team */}
              <div className="col-span-5 flex flex-col items-center text-center">
                {currentMatch.away_team.logo ? (
                  <img
                    src={currentMatch.away_team.logo}
                    alt={currentMatch.away_team.name}
                    className="w-12 h-12 object-contain rounded-2xl bg-white/5 border border-white/10 p-1.5 shadow-lg"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-base font-black text-white">
                    {currentMatch.away_team.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <h4 className="font-bold text-xs text-white mt-1.5 leading-snug line-clamp-1">
                  {currentMatch.away_team.name}
                </h4>
                <span className="text-[10px] text-slate-400 font-mono">Away</span>
              </div>
            </div>

            {/* Match Timeline Progress Bar */}
            <div className="space-y-1 relative z-10">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>0'</span>
                <span>45' (HT)</span>
                <span>90'+</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-indigo-500 via-teal-400 to-emerald-400 rounded-full"
                />
              </div>
            </div>

            {/* Recent Match Events Strip */}
            {currentMatch.events && currentMatch.events.length > 0 && (
              <div className="mt-3 p-2 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-2 overflow-x-auto relative z-10">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase shrink-0">
                  Latest:
                </span>
                {currentMatch.events.slice(0, 3).map((evt) => (
                  <span
                    key={evt.id}
                    className="text-[10px] bg-slate-900/80 border border-white/10 px-2 py-0.5 rounded-full text-slate-200 shrink-0 font-medium flex items-center gap-1"
                  >
                    <span>{evt.type === 'GOAL' ? '⚽' : evt.type.includes('CARD') ? '🟨' : '⚡'}</span>
                    <span>{evt.minute}' {evt.player_name || evt.team_side}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Bottom Actions Bar */}
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/10 pt-3 relative z-10">
              <Link
                href={`/match/${currentMatch.id}`}
                className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 py-2 px-3 rounded-2xl text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <span>Open Match Center</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
