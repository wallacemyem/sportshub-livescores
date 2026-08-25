'use client';

import { MatchEvent } from '@/types';
import { motion } from 'framer-motion';
import { Award, AlertCircle, ArrowRightLeft, ShieldAlert, Sparkles } from 'lucide-react';

interface EventTimelineProps {
  events: MatchEvent[];
  homeTeamName: string;
  awayTeamName: string;
}

export function EventTimeline({ events, homeTeamName, awayTeamName }: EventTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="bg-surface rounded-xl border border-surface-border p-6 text-center text-slate-500 text-xs">
        No major match events logged yet. Match updates will stream in real-time.
      </div>
    );
  }

  // Sort events chronologically (latest first or earliest first)
  const sorted = [...events].sort((a, b) => b.minute - a.minute);

  return (
    <div className="bg-surface rounded-xl border border-surface-border p-4">
      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-emerald-neon" /> Match Timeline & Key Events
      </h4>

      <div className="space-y-3 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-border">
        {sorted.map((ev) => {
          const isHome = ev.team_side === 'HOME';
          const isGoal = ev.type === 'GOAL' || ev.type === 'TOUCHDOWN' || ev.type === 'HOMERUN';
          const isCard = ev.type === 'YELLOW_CARD' || ev.type === 'RED_CARD';

          return (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-3 pl-1.5 relative text-xs"
            >
              {/* Event Icon Pin */}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 font-mono font-bold text-[10px] shadow-sm ${
                  isGoal
                    ? 'bg-emerald-500 text-black shadow-neon-sm'
                    : ev.type === 'RED_CARD'
                    ? 'bg-rose-500 text-white'
                    : ev.type === 'YELLOW_CARD'
                    ? 'bg-amber-400 text-black'
                    : 'bg-surface-subtle text-slate-300 border border-surface-border'
                }`}
              >
                {isGoal ? '⚽' : ev.type === 'RED_CARD' ? '🟥' : ev.type === 'YELLOW_CARD' ? '🟨' : '📌'}
              </div>

              {/* Event Content Box */}
              <div className="flex-1 bg-surface-subtle border border-surface-border/60 rounded-lg p-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-400">{ev.minute}&apos;</span>
                    <span className="font-bold text-white">{ev.player_name}</span>
                    <span className="text-[10px] text-slate-400">
                      ({isHome ? homeTeamName : awayTeamName})
                    </span>
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      isGoal ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {ev.type.replace('_', ' ')}
                  </span>
                </div>

                {ev.assist_name && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Assist: <strong className="text-slate-300">{ev.assist_name}</strong>
                  </p>
                )}
                {ev.detail && (
                  <p className="text-[11px] text-slate-500 mt-0.5 italic">{ev.detail}</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
