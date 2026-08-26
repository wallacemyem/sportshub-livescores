'use client';

import { Match } from '@/types';
import { motion } from 'framer-motion';
import { X, Minimize2, Radio, ExternalLink } from 'lucide-react';
import { formatClock } from '@/lib/sportFormat';

interface FloatingPiPProps {
  match: Match | null;
  isOpen: boolean;
  onClose: () => void;
}

export function FloatingPiP({ match, isOpen, onClose }: FloatingPiPProps) {
  if (!isOpen || !match) return null;

  return (
    <motion.div
      drag
      dragConstraints={{ left: -300, right: 300, top: -200, bottom: 200 }}
      initial={{ scale: 0.8, opacity: 0, y: 50 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.8, opacity: 0 }}
      id="floating-pip-widget"
      className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-[60] w-72 sm:w-80 bg-slate-900 border border-indigo-500/40 rounded-2xl shadow-2xl shadow-indigo-500/10 p-4 cursor-grab active:cursor-grabbing backdrop-blur-md"
    >
      {/* Header */}
      <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-700 mb-3">
        <div className="flex items-center gap-1.5 font-bold text-red-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span className="font-mono text-[11px]">LIVE • {formatClock(match)}</span>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Score Grid */}
      <div className="flex items-center justify-between gap-3 text-sm">
        {/* Home */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center font-mono font-bold text-xs text-indigo-300 uppercase">
            {match.home_team.short_name?.slice(0, 3) || match.home_team.name.slice(0, 3)}
          </div>
          <div className="truncate">
            <p className="font-bold text-white text-xs truncate">{match.home_team.short_name}</p>
          </div>
        </div>

        {/* Score */}
        <div className="font-mono text-xl font-black text-white bg-indigo-600/20 px-3 py-1 rounded-lg border border-indigo-500/40">
          {match.home_score} : {match.away_score}
        </div>

        {/* Away */}
        <div className="flex items-center gap-2 justify-end min-w-0">
          <div className="text-right truncate">
            <p className="font-bold text-white text-xs truncate">{match.away_team.short_name}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center font-mono font-bold text-xs text-orange-300 uppercase">
            {match.away_team.short_name?.slice(0, 3) || match.away_team.name.slice(0, 3)}
          </div>
        </div>
      </div>

      {/* Mini Stats Footer */}
      <div className="mt-3 pt-2 border-t border-slate-700 flex items-center justify-between text-[10px] font-mono">
        <span className="text-slate-400">Poss: <span className="text-indigo-300">{match.stats.possession_home || 50}%</span> - <span className="text-orange-300">{match.stats.possession_away || 50}%</span></span>
        <span className="text-emerald-400 font-bold">xG: {match.stats.xg_home} - {match.stats.xg_away}</span>
      </div>
    </motion.div>
  );
}
