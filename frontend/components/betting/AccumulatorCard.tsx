'use client';

import { BetSlip } from '@/types';
import { motion } from 'framer-motion';
import { DollarSign, CheckCircle2, Clock, XCircle, TrendingUp } from 'lucide-react';
import confetti from 'canvas-confetti';
import Link from 'next/link';

interface AccumulatorCardProps {
  slip: BetSlip;
  onCashOut?: (slipId: string) => void;
}

export function AccumulatorCard({ slip, onCashOut }: AccumulatorCardProps) {
  const probPct = Math.round(slip.cashout_probability * 100);

  const handleCashoutClick = () => {
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#10B981', '#34D399', '#6EE7B7', '#3B82F6', '#8B5CF6'],
    });
    if (onCashOut) {
      onCashOut(slip.id);
    }
  };

  const statusColor = slip.status === 'WON'
    ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
    : slip.status === 'LOST'
    ? 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30'
    : 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface border border-surface-border rounded-xl p-4 shadow-subtle select-none"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-surface-border pb-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="bg-violet-100 dark:bg-violet-500/15 border border-violet-200 dark:border-violet-500/30 text-violet-700 dark:text-violet-400 text-[10px] font-bold uppercase px-2 py-0.5 rounded font-mono">
            {slip.bookmaker}
          </span>
          <span className="font-mono text-xs font-bold text-foreground tracking-wide">
            #{slip.booking_code}
          </span>
        </div>

        <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${statusColor}`}>
          {slip.status}
        </span>
      </div>

      {/* Stake and Potential Win Strip */}
      <div className="grid grid-cols-3 gap-2 bg-surface-subtle p-2.5 rounded-lg border border-surface-border mb-3 font-mono text-xs text-center">
        <div>
          <span className="text-[10px] text-muted-foreground block uppercase">Stake</span>
          <span className="text-foreground font-bold">${slip.stake.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground block uppercase">Total Odds</span>
          <span className="text-amber-600 dark:text-amber-400 font-bold">{slip.total_odds.toFixed(2)}x</span>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground block uppercase">Potential Win</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">${slip.potential_win.toFixed(2)}</span>
        </div>
      </div>

      {/* Legs List */}
      <div className="space-y-2 mb-4">
        {slip.legs.map((leg) => {
          const matchId = leg.match_id || leg.match?.id;
          return (
            <Link
              key={leg.id}
              href={matchId ? `/match/${matchId}` : '#'}
              className="block bg-surface-subtle/50 hover:bg-surface-subtle border border-surface-border hover:border-blue-300 dark:hover:border-blue-600 rounded-lg p-2.5 text-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-foreground truncate max-w-[200px] group-hover:text-blue-600 transition-colors">
                  <span className="inline sm:hidden">{leg.match?.home_team?.short_name || 'Home'} vs {leg.match?.away_team?.short_name || 'Away'}</span>
                  <span className="hidden sm:inline">{leg.match?.home_team?.name || 'Home'} vs {leg.match?.away_team?.name || 'Away'}</span>
                </span>
                <span className="font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  {leg.odds.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  Pick: <strong className="text-foreground">{leg.selection}</strong> ({leg.market})
                </span>
                <span className="font-mono flex items-center gap-1">
                  {leg.status === 'WON' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline" />}
                  {leg.status === 'RUNNING' && <Clock className="w-3.5 h-3.5 text-blue-500 inline" />}
                  {leg.status === 'LOST' && <XCircle className="w-3.5 h-3.5 text-red-500 inline" />}
                  <span className="text-foreground font-bold">{leg.current_score}</span>
                </span>
              </div>

              {/* Leg Fulfillment Mini Progress */}
              <div className="w-full h-1 bg-surface-border rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    leg.status === 'WON' ? 'bg-emerald-500' : leg.status === 'LOST' ? 'bg-red-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${leg.fulfillment_pct || 50}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Dynamic Cashout Offer Section */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/5 dark:to-teal-500/5 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2 text-xs">
          <div>
            <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Cash-Out:
            </span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">{probPct}% confidence</span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-muted-foreground uppercase block">Current Offer</span>
            <span className="font-mono text-base font-black text-emerald-700 dark:text-emerald-400">
              ${slip.current_cashout.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Probability Bar */}
        <div className="w-full h-1.5 bg-emerald-200/50 dark:bg-emerald-500/10 rounded-full overflow-hidden mb-3">
          <div
            className="bg-emerald-500 h-full transition-all duration-500 rounded-full"
            style={{ width: `${probPct}%` }}
          />
        </div>

        {/* Cash-Out Action Button */}
        {slip.status === 'RUNNING' && (
          <button
            onClick={handleCashoutClick}
            className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:opacity-90 font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-500/20"
          >
            <DollarSign className="w-4 h-4" />
            Cash Out Now (${slip.current_cashout.toFixed(2)})
          </button>
        )}
      </div>
    </motion.div>
  );
}
