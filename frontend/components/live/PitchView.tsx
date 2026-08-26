'use client';

import React from 'react';
import { Match, SportType } from '@/types';
import { motion } from 'framer-motion';
import { Zap, WifiOff, AlertCircle, Shield, Activity, Target, Layers, Circle, Flag } from 'lucide-react';

interface PitchViewProps {
  match: Match;
  onSwitchTab?: (tab: string) => void;
}

export function PitchView({ match }: PitchViewProps) {
  const isLive = match.status === 'LIVE';
  const hasCoordinates =
    match.stats &&
    (match.stats.ball_position_x !== undefined || match.stats.attacking_pressure !== undefined);

  const isAvailable = isLive && hasCoordinates;

  const posX = match.stats?.ball_position_x ?? 50;
  const posY = match.stats?.ball_position_y ?? 50;
  const pressure = match.stats?.attacking_pressure ?? 'NEUTRAL';

  const sport = match.sport || 'soccer';

  // Sport Display Meta
  const SPORT_META: Record<
    SportType,
    { title: string; icon: React.ComponentType<{ className?: string }>; pitchName: string }
  > = {
    soccer: { title: '2D Soccer Pitch Tracker', icon: Activity, pitchName: 'Football Pitch' },
    basketball: { title: '2D Basketball Hardwood Tracker', icon: Zap, pitchName: 'Basketball Court' },
    tennis: { title: '2D Tennis Court Tracker', icon: Target, pitchName: 'Tennis Court' },
    nfl: { title: '2D NFL Gridiron Tracker', icon: Shield, pitchName: 'Football Field' },
    cricket: { title: '2D Cricket Oval Tracker', icon: Layers, pitchName: 'Cricket Ground' },
    baseball: { title: '2D Baseball Diamond Tracker', icon: Circle, pitchName: 'Baseball Diamond' },
    golf: { title: '2D Golf Hole Fairway Tracker', icon: Flag, pitchName: 'Golf Course' },
  };

  const meta = SPORT_META[sport] || SPORT_META.soccer;
  const Icon = meta.icon;

  return (
    <div className="bg-surface rounded-2xl border border-surface-border p-4 relative overflow-hidden shadow-subtle">
      {/* Top Meta Bar */}
      <div className="flex items-center justify-between mb-3 text-xs">
        <span className="font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider font-sans">
          <Icon className="w-3.5 h-3.5 text-amber-500" /> {meta.title}
        </span>

        <div className="flex items-center gap-2">
          {isAvailable ? (
            <span className="text-[11px] text-muted-foreground font-mono">
              Attacking:{' '}
              <strong
                className={
                  pressure === 'HOME'
                    ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                    : pressure === 'AWAY'
                    ? 'text-orange-600 dark:text-orange-400 font-bold'
                    : 'text-muted-foreground'
                }
              >
                {pressure}
              </strong>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-muted-foreground bg-surface-subtle px-2 py-0.5 rounded border border-surface-border uppercase">
              <WifiOff className="w-3 h-3 text-amber-500" /> Tracking Inactive
            </span>
          )}
        </div>
      </div>

      {/* Main 2D Court / Field Canvas Container */}
      <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden shadow-inner flex items-center justify-center select-none border border-surface-border bg-slate-950">
        {/* The Field Graphics (Greyed out when unavailable) */}
        <div
          className={`absolute inset-0 w-full h-full transition-all duration-300 ${
            !isAvailable ? 'grayscale contrast-75 opacity-30 filter' : ''
          }`}
        >
          {/* 1. SOCCER PITCH */}
          {sport === 'soccer' && (
            <div className="relative w-full h-full bg-gradient-to-b from-[#14532d] via-[#166534] to-[#14532d] border-2 border-emerald-700/60 overflow-hidden">
              {/* Cut grass pattern stripes */}
              <div className="absolute inset-0 grid grid-cols-8 pointer-events-none opacity-20">
                <div className="bg-emerald-400/20" />
                <div className="bg-emerald-500/5" />
                <div className="bg-emerald-400/20" />
                <div className="bg-emerald-500/5" />
                <div className="bg-emerald-400/20" />
                <div className="bg-emerald-500/5" />
                <div className="bg-emerald-400/20" />
                <div className="bg-emerald-500/5" />
              </div>

              {/* Markings */}
              <div className="absolute inset-2 border-2 border-white/50 rounded-sm pointer-events-none">
                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/50 transform -translate-x-1/2" />
                <div className="absolute top-1/2 left-1/2 w-20 h-20 border-2 border-white/50 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute left-0 top-1/4 bottom-1/4 w-16 border-r-2 border-y-2 border-white/50" />
                <div className="absolute left-0 top-1/3 bottom-1/3 w-7 border-r-2 border-y-2 border-white/50" />
                <div className="absolute right-0 top-1/4 bottom-1/4 w-16 border-l-2 border-y-2 border-white/50" />
                <div className="absolute right-0 top-1/3 bottom-1/3 w-7 border-l-2 border-y-2 border-white/50" />
              </div>
            </div>
          )}

          {/* 2. BASKETBALL HARDWOOD COURT */}
          {sport === 'basketball' && (
            <div className="relative w-full h-full bg-gradient-to-r from-[#b45309] via-[#d97706] to-[#b45309] border-2 border-amber-900 overflow-hidden">
              <div className="absolute inset-2 border-2 border-white/60 rounded-sm pointer-events-none">
                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/60 transform -translate-x-1/2" />
                <div className="absolute top-1/2 left-1/2 w-16 h-16 border-2 border-white/60 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
                {/* Left 3pt & Paint */}
                <div className="absolute left-0 top-1/6 bottom-1/6 w-28 border-r-2 border-white/60 rounded-r-full" />
                <div className="absolute left-0 top-1/3 bottom-1/3 w-16 border-r-2 border-y-2 border-white/60 bg-blue-900/30" />
                <div className="absolute left-16 top-1/2 w-8 h-8 border-2 border-white/60 rounded-full transform -translate-y-1/2 -translate-x-1/2" />
                {/* Right 3pt & Paint */}
                <div className="absolute right-0 top-1/6 bottom-1/6 w-28 border-l-2 border-white/60 rounded-l-full" />
                <div className="absolute right-0 top-1/3 bottom-1/3 w-16 border-l-2 border-y-2 border-white/60 bg-red-900/30" />
                <div className="absolute right-16 top-1/2 w-8 h-8 border-2 border-white/60 rounded-full transform -translate-y-1/2 translate-x-1/2" />
              </div>
            </div>
          )}

          {/* 3. TENNIS COURT */}
          {sport === 'tennis' && (
            <div className="relative w-full h-full bg-[#15803d] border-2 border-emerald-950 overflow-hidden flex items-center justify-center p-3">
              <div className="relative w-full h-full bg-[#1e40af] border-2 border-white rounded-xs">
                <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-white/90 shadow-md transform -translate-x-1/2 z-10" />
                <div className="absolute left-0 right-0 top-3 border-b-2 border-white/70" />
                <div className="absolute left-0 right-0 bottom-3 border-t-2 border-white/70" />
                <div className="absolute top-3 bottom-3 left-1/4 border-r-2 border-white/70" />
                <div className="absolute top-3 bottom-3 right-1/4 border-l-2 border-white/70" />
                <div className="absolute top-1/2 left-1/4 right-1/4 h-0.5 bg-white/70 transform -translate-y-1/2" />
              </div>
            </div>
          )}

          {/* 4. NFL FOOTBALL GRIDIRON */}
          {sport === 'nfl' && (
            <div className="relative w-full h-full bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-900 border-2 border-emerald-950 overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-[10%] bg-indigo-900/80 border-r-2 border-white flex items-center justify-center">
                <span className="text-[9px] font-black font-mono text-white/90 -rotate-90 uppercase">
                  {match.home_team.short_name}
                </span>
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-[10%] bg-orange-900/80 border-l-2 border-white flex items-center justify-center">
                <span className="text-[9px] font-black font-mono text-white/90 rotate-90 uppercase">
                  {match.away_team.short_name}
                </span>
              </div>
              <div className="absolute left-[10%] right-[10%] inset-y-0 grid grid-cols-10 border-y-2 border-white/60">
                {[10, 20, 30, 40, 50, 40, 30, 20, 10].map((yd, idx) => (
                  <div key={idx} className="border-r border-white/40 relative flex items-end justify-center pb-1">
                    <span className="text-[7px] font-mono font-bold text-white/60">{yd}</span>
                  </div>
                ))}
              </div>
              <div className="absolute top-0 bottom-0 left-[45%] w-0.5 bg-blue-400 shadow-sm z-10" />
              <div className="absolute top-0 bottom-0 left-[55%] w-0.5 bg-yellow-400 shadow-sm z-10" />
            </div>
          )}

          {/* 5. BASEBALL DIAMOND */}
          {sport === 'baseball' && (
            <div className="relative w-full h-full bg-gradient-to-b from-[#15803d] to-[#166534] border-2 border-emerald-950 overflow-hidden flex items-center justify-center">
              <div className="absolute bottom-[-15%] w-[75%] aspect-square bg-[#b45309]/60 rounded-full border border-amber-900/40" />
              <div className="absolute bottom-4 w-24 h-24 border-2 border-white/60 transform rotate-45 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-amber-400 border border-white" />
              </div>
              <div className="absolute bottom-4 left-1/2 w-3 h-3 bg-white border border-amber-900 transform -translate-x-1/2 rotate-45 shadow-sm" />
              <div className="absolute bottom-16 left-[39%] w-3 h-3 bg-white border border-amber-900 transform rotate-45 shadow-sm" />
              <div className="absolute bottom-16 right-[39%] w-3 h-3 bg-white border border-amber-900 transform rotate-45 shadow-sm" />
              <div className="absolute bottom-28 left-1/2 w-3 h-3 bg-white border border-amber-900 transform -translate-x-1/2 rotate-45 shadow-sm" />
            </div>
          )}

          {/* 6. CRICKET OVAL */}
          {sport === 'cricket' && (
            <div className="relative w-full h-full bg-gradient-to-b from-[#15803d] via-[#166534] to-[#15803d] border-2 border-emerald-950 overflow-hidden flex items-center justify-center">
              <div className="absolute inset-2 border-2 border-dashed border-white/50 rounded-full" />
              <div className="absolute inset-8 border border-white/30 rounded-full" />
              <div className="relative w-10 h-24 bg-[#d97706]/70 border border-amber-300/60 rounded-xs flex flex-col justify-between items-center py-1">
                <div className="w-6 border-b-2 border-white flex justify-center gap-0.5">
                  <span className="w-0.5 h-1 bg-white inline-block" />
                  <span className="w-0.5 h-1 bg-white inline-block" />
                  <span className="w-0.5 h-1 bg-white inline-block" />
                </div>
                <div className="w-6 border-t-2 border-white flex justify-center gap-0.5">
                  <span className="w-0.5 h-1 bg-white inline-block" />
                  <span className="w-0.5 h-1 bg-white inline-block" />
                  <span className="w-0.5 h-1 bg-white inline-block" />
                </div>
              </div>
            </div>
          )}

          {/* 7. GOLF FAIRWAY & GREEN */}
          {sport === 'golf' && (
            <div className="relative w-full h-full bg-gradient-to-r from-[#14532d] via-[#15803d] to-[#14532d] border-2 border-emerald-950 overflow-hidden p-4">
              <div className="absolute left-6 bottom-6 w-8 h-5 bg-emerald-400/40 border border-white/50 rounded-xs flex items-center justify-center text-[8px] font-mono font-bold text-white">
                TEE
              </div>
              <div className="absolute left-16 top-6 bottom-6 right-24 bg-emerald-600/40 rounded-full border border-emerald-400/30 transform -rotate-2" />
              <div className="absolute right-28 top-8 w-12 h-8 bg-amber-200/80 rounded-full border border-amber-400/50 shadow-inner" />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 w-16 h-16 bg-emerald-400/60 rounded-full border-2 border-emerald-300 shadow-md flex items-center justify-center">
                <div className="relative flex items-center">
                  <div className="w-0.5 h-6 bg-white shadow" />
                  <div className="w-3 h-2 bg-red-500 rounded-xs -ml-0.5 -mt-3 shadow-sm" />
                </div>
              </div>
            </div>
          )}

          {/* Active Live Pressure Glow (when live & available) */}
          {isAvailable && pressure === 'HOME' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-indigo-500/30 to-transparent pointer-events-none"
            />
          )}
          {isAvailable && pressure === 'AWAY' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute left-0 top-0 bottom-0 w-1/2 bg-gradient-to-r from-orange-500/30 to-transparent pointer-events-none"
            />
          )}

          {/* Live Animated Ball / Play Marker */}
          {isAvailable && (
            <motion.div
              animate={{
                left: `${posX}%`,
                top: `${posY}%`,
              }}
              transition={{ type: 'spring', damping: 15, stiffness: 80 }}
              className="absolute z-20 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none"
            >
              <div className="relative flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-amber-400 opacity-75" />
                <div className="w-4 h-4 bg-white rounded-full shadow-lg border-2 border-amber-400 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 bg-slate-900 rounded-full" />
                </div>
              </div>
            </motion.div>
          )}

          {/* Team Side Badges on Canvas */}
          <div className="absolute left-4 bottom-3 z-10 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[11px] font-bold text-indigo-300 border border-indigo-500/30 font-mono">
            {match.home_team.short_name}
          </div>
          <div className="absolute right-4 bottom-3 z-10 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[11px] font-bold text-orange-300 border border-orange-500/30 font-mono">
            {match.away_team.short_name}
          </div>
        </div>

        {/* Unavailable Overlay Screen */}
        {!isAvailable && (
          <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center select-none">
            <div className="bg-surface/95 border border-surface-border rounded-2xl p-4 sm:p-5 max-w-sm shadow-elevated animate-in fade-in zoom-in-95 duration-150">
              <div className="w-10 h-10 rounded-xl bg-surface-subtle border border-surface-border flex items-center justify-center mx-auto mb-2.5 text-muted-foreground">
                <WifiOff className="w-5 h-5" />
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-foreground font-sans">
                2D Live Visualizer Unavailable
              </h4>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                {match.status === 'SCHEDULED'
                  ? 'Live telemetry sensor feed activates automatically at kickoff when the match begins.'
                  : match.status === 'FINISHED'
                  ? 'This match has concluded. Live telemetry tracking has ended.'
                  : 'Live 2D coordinate stream is currently not broadcasting for this match.'}
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-subtle border border-surface-border text-[10px] font-mono font-bold text-muted-foreground uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Match Status: {match.status}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Live Action Status Footer Bar */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-surface-subtle p-2 rounded-lg border border-surface-border">
          <p className="text-[10px] text-muted-foreground uppercase font-mono">Pressure Zone</p>
          <p className="font-mono font-bold text-foreground capitalize">
            {isAvailable ? pressure.toLowerCase() : 'N/A'}
          </p>
        </div>
        <div className="bg-surface-subtle p-2 rounded-lg border border-surface-border">
          <p className="text-[10px] text-muted-foreground uppercase font-mono">Target Threat</p>
          <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {match.stats?.shots_on_target_home ?? 0} - {match.stats?.shots_on_target_away ?? 0}
          </p>
        </div>
        <div className="bg-surface-subtle p-2 rounded-lg border border-surface-border">
          <p className="text-[10px] text-muted-foreground uppercase font-mono">Ball Coordinates</p>
          <p className="font-mono font-bold text-foreground">
            {isAvailable ? `${posX.toFixed(0)}m, ${posY.toFixed(0)}m` : 'Offline'}
          </p>
        </div>
      </div>
    </div>
  );
}
