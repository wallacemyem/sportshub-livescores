'use client';

import { Match } from '@/types';
import { motion } from 'framer-motion';
import { Target, Zap, Shield, AlertTriangle } from 'lucide-react';

interface PitchViewProps {
  match: Match;
}

export function PitchView({ match }: PitchViewProps) {
  const isSoccer = match.sport === 'soccer';
  const posX = match.stats.ball_position_x ?? 50;
  const posY = match.stats.ball_position_y ?? 50;
  const pressure = match.stats.attacking_pressure ?? 'NEUTRAL';

  return (
    <div className="bg-surface rounded-xl border border-surface-border p-4 relative overflow-hidden">
      <div className="flex items-center justify-between mb-3 text-xs">
        <span className="font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
          <Zap className="w-3.5 h-3.5 text-emerald-neon" /> Live Pitch Visualization
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-mono">
            Attacking: <strong className={pressure === 'HOME' ? 'text-emerald-400' : pressure === 'AWAY' ? 'text-cyan-400' : 'text-slate-400'}>{pressure}</strong>
          </span>
        </div>
      </div>

      {/* 2D Pitch Container */}
      <div className="relative w-full aspect-[16/9] bg-[#0d2a1d] rounded-lg border-2 border-emerald-800/60 overflow-hidden shadow-inner flex items-center justify-center select-none">
        {/* Grass Texture Lines */}
        <div className="absolute inset-0 grid grid-cols-8 pointer-events-none opacity-20">
          <div className="bg-emerald-600/30"></div>
          <div className="bg-emerald-500/10"></div>
          <div className="bg-emerald-600/30"></div>
          <div className="bg-emerald-500/10"></div>
          <div className="bg-emerald-600/30"></div>
          <div className="bg-emerald-500/10"></div>
          <div className="bg-emerald-600/30"></div>
          <div className="bg-emerald-500/10"></div>
        </div>

        {/* Pitch Markings (Soccer Field) */}
        <div className="absolute inset-2 border border-white/30 rounded-sm pointer-events-none">
          {/* Halfway line */}
          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/30 transform -translate-x-1/2" />
          {/* Center circle */}
          <div className="absolute top-1/2 left-1/2 w-20 h-20 border border-white/30 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-white/60 rounded-full transform -translate-x-1/2 -translate-y-1/2" />

          {/* Left Penalty Box (Home) */}
          <div className="absolute left-0 top-1/4 bottom-1/4 w-16 border-r border-y border-white/30" />
          <div className="absolute left-0 top-1/3 bottom-1/3 w-7 border-r border-y border-white/30" />

          {/* Right Penalty Box (Away) */}
          <div className="absolute right-0 top-1/4 bottom-1/4 w-16 border-l border-y border-white/30" />
          <div className="absolute right-0 top-1/3 bottom-1/3 w-7 border-l border-y border-white/30" />
        </div>

        {/* Dynamic Attacking Pressure Zone Glow */}
        {pressure === 'HOME' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-emerald-500/25 to-transparent pointer-events-none"
          />
        )}
        {pressure === 'AWAY' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute left-0 top-0 bottom-0 w-1/2 bg-gradient-to-r from-cyan-500/25 to-transparent pointer-events-none"
          />
        )}

        {/* Live Animated Ball */}
        <motion.div
          animate={{
            left: `${posX}%`,
            top: `${posY}%`,
          }}
          transition={{ type: 'spring', damping: 15, stiffness: 80 }}
          className="absolute z-20 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none"
        >
          <div className="relative flex items-center justify-center">
            {/* Pulsing ball radar wave */}
            <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-emerald-neon opacity-75"></span>
            <div className="w-4 h-4 bg-white rounded-full shadow-neon border-2 border-emerald-neon flex items-center justify-center text-[8px] font-black text-black">
              ⚽
            </div>
          </div>
        </motion.div>

        {/* Team Labels on Pitch */}
        <div className="absolute left-4 bottom-3 z-10 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[11px] font-bold text-emerald-400 border border-emerald-800/40">
          {match.home_team.short_name}
        </div>
        <div className="absolute right-4 bottom-3 z-10 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[11px] font-bold text-cyan-400 border border-cyan-800/40">
          {match.away_team.short_name}
        </div>
      </div>

      {/* Live Action Status Sub-bar */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-surface-subtle p-2 rounded-lg border border-surface-border">
          <p className="text-[10px] text-slate-500 uppercase">Dangerous Attacks</p>
          <p className="font-mono font-bold text-slate-200">
            {Math.floor(match.stats.shots_home * 1.8)} - {Math.floor(match.stats.shots_away * 1.6)}
          </p>
        </div>
        <div className="bg-surface-subtle p-2 rounded-lg border border-surface-border">
          <p className="text-[10px] text-slate-500 uppercase">Shots On Target</p>
          <p className="font-mono font-bold text-emerald-400">
            {match.stats.shots_on_target_home} - {match.stats.shots_on_target_away}
          </p>
        </div>
        <div className="bg-surface-subtle p-2 rounded-lg border border-surface-border">
          <p className="text-[10px] text-slate-500 uppercase">Corners</p>
          <p className="font-mono font-bold text-slate-200">
            {match.stats.corners_home} - {match.stats.corners_away}
          </p>
        </div>
      </div>
    </div>
  );
}
