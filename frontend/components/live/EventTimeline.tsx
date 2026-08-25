'use client';

import { MatchEvent } from '@/types';
import { motion } from 'framer-motion';
import { Award, AlertCircle, ArrowRightLeft, ShieldAlert, Sparkles, Activity } from 'lucide-react';

interface EventTimelineProps {
  events: MatchEvent[];
  homeTeamName: string;
  awayTeamName: string;
}

export function EventTimeline({ events, homeTeamName, awayTeamName }: EventTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="bg-surface rounded-xl border border-surface-border p-6 text-center text-muted-foreground text-xs">
        No major match events logged yet. Match updates will stream in real-time.
      </div>
    );
  }

  // Sort events chronologically (latest first)
  const sorted = [...events].sort((a, b) => b.minute - a.minute);

  return (
    <div className="bg-surface rounded-xl border border-surface-border p-4 shadow-subtle">
      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2 font-mono">
        <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Match Timeline & Key Events
      </h4>

      <div className="space-y-3 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-border">
        {sorted.map((ev) => {
          const isHome = ev.team_side === 'HOME';
          const isGoal = ev.type === 'GOAL' || ev.type === 'TOUCHDOWN' || ev.type === 'HOMERUN';
          const isRedCard = ev.type === 'RED_CARD';
          const isYellowCard = ev.type === 'YELLOW_CARD';

          return (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-3 pl-1.5 relative text-xs"
            >
              {/* Event Icon Pin (Vector, no emojis) */}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 font-mono font-bold text-[10px] shadow-sm ${
                  isGoal
                    ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                    : isRedCard
                    ? 'bg-red-500 text-white shadow-red-500/30'
                    : isYellowCard
                    ? 'bg-yellow-400 text-slate-900 shadow-yellow-400/30'
                    : 'bg-blue-500 text-white shadow-blue-500/30'
                }`}
              >
                {isGoal ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-white" />
                ) : isRedCard ? (
                  <span className="w-2 h-2.5 bg-white rounded-sm" />
                ) : isYellowCard ? (
                  <span className="w-2 h-2.5 bg-slate-900 rounded-sm" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>

              {/* Event Content Box */}
              <div className="flex-1 bg-surface-subtle border border-surface-border rounded-lg p-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-red-500">{ev.minute}&apos;</span>
                    <span className="font-bold text-foreground">{ev.player_name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      ({isHome ? homeTeamName : awayTeamName})
                    </span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                      isGoal
                        ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                        : isRedCard
                        ? 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30'
                        : isYellowCard
                        ? 'bg-yellow-100 dark:bg-yellow-500/15 text-yellow-800 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/30'
                        : 'bg-surface border border-surface-border text-muted-foreground'
                    }`}
                  >
                    {ev.type.replace('_', ' ')}
                  </span>
                </div>

                {ev.assist_name && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Assist: <strong className="text-foreground">{ev.assist_name}</strong>
                  </p>
                )}
                {ev.detail && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 italic">{ev.detail}</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
