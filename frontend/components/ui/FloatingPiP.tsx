'use client';

import { Match } from '@/types';
import { motion } from 'framer-motion';
import { X, Minimize2, Radio, ExternalLink } from 'lucide-react';

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
      className="fixed bottom-6 right-6 z-50 w-80 bg-[#0B0E14] border-2 border-emerald-neon/80 rounded-2xl shadow-2xl p-4 cursor-grab active:cursor-grabbing backdrop-blur-md"
    >
      {/* Header */}
      <div className="flex items-center justify-between text-xs pb-2 border-b border-surface-border mb-3">
        <div className="flex items-center gap-1.5 font-bold text-emerald-neon">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-neon opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-neon"></span>
          </span>
          <span className="font-mono text-[11px]">PIP WIDGET • {match.period} {match.minute}&apos;</span>
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
          <span className="text-xl">{match.home_team.logo || '⚽'}</span>
          <div className="truncate">
            <p className="font-bold text-white text-xs truncate">{match.home_team.short_name}</p>
          </div>
        </div>

        {/* Score */}
        <div className="font-mono text-xl font-black text-white bg-slate-900 px-3 py-1 rounded-lg border border-emerald-500/40">
          {match.home_score} : {match.away_score}
        </div>

        {/* Away */}
        <div className="flex items-center gap-2 justify-end min-w-0">
          <div className="text-right truncate">
            <p className="font-bold text-white text-xs truncate">{match.away_team.short_name}</p>
          </div>
          <span className="text-xl">{match.away_team.logo || '⚽'}</span>
        </div>
      </div>

      {/* Mini Stats Footer */}
      <div className="mt-3 pt-2 border-t border-surface-border flex items-center justify-between text-[10px] text-slate-400 font-mono">
        <span>Poss: {match.stats.possession_home || 50}% - {match.stats.possession_away || 50}%</span>
        <span className="text-emerald-400 font-bold">xG: {match.stats.xg_home} - {match.stats.xg_away}</span>
      </div>
    </motion.div>
  );
}
