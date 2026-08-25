'use client';

import { BetSlip } from '@/types';
import { motion } from 'framer-motion';
import { DollarSign, CheckCircle2, Clock, XCircle, TrendingUp } from 'lucide-react';
import confetti from 'canvas-confetti';

interface AccumulatorCardProps {
  slip: BetSlip;
  onCashOut?: (slipId: string) => void;
}

export function AccumulatorCard({ slip, onCashOut }: AccumulatorCardProps) {
  const probPct = Math.round(slip.cashout_probability * 100);

  const handleCashoutClick = () => {
    confetti({
      particleCount: 35,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#FFFFFF', '#A1A1AA', '#71717A'],
    });
    if (onCashOut) {
      onCashOut(slip.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface border border-surface-border rounded-xl p-4 shadow-subtle select-none"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-surface-border pb-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="bg-surface-subtle border border-surface-border text-foreground text-[10px] font-bold uppercase px-2 py-0.5 rounded font-mono">
            {slip.bookmaker}
          </span>
          <span className="font-mono text-xs font-bold text-foreground tracking-wide">
            #{slip.booking_code}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-surface-subtle border border-surface-border text-foreground"
          >
            {slip.status}
          </span>
        </div>
      </div>

      {/* Stake and Potential Win Strip */}
      <div className="grid grid-cols-3 gap-2 bg-surface-subtle p-2.5 rounded-lg border border-surface-border mb-3 font-mono text-xs text-center">
        <div>
          <span className="text-[10px] text-muted-foreground block uppercase">Stake</span>
          <span className="text-foreground font-bold">${slip.stake.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground block uppercase">Total Odds</span>
          <span className="text-foreground font-bold">{slip.total_odds.toFixed(2)}x</span>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground block uppercase">Potential Win</span>
          <span className="text-foreground font-bold">${slip.potential_win.toFixed(2)}</span>
        </div>
      </div>

      {/* Legs List */}
      <div className="space-y-2 mb-4">
        {slip.legs.map((leg) => (
          <div
            key={leg.id}
            className="bg-surface-subtle/50 border border-surface-border rounded-lg p-2.5 text-xs"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-foreground truncate max-w-[200px]">
                {leg.match?.home_team?.name || 'Home'} vs {leg.match?.away_team?.name || 'Away'}
              </span>
              <span className="font-mono text-[11px] font-bold text-foreground">
                {leg.odds.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                Pick: <strong className="text-foreground">{leg.selection}</strong> ({leg.market})
              </span>
              <span className="font-mono text-foreground flex items-center gap-1">
                {leg.status === 'WON' && <CheckCircle2 className="w-3.5 h-3.5 text-foreground inline" />}
                {leg.status === 'RUNNING' && <Clock className="w-3.5 h-3.5 text-muted-foreground inline" />}
                {leg.status === 'LOST' && <XCircle className="w-3.5 h-3.5 text-muted-foreground inline" />}
                {leg.current_score}
              </span>
            </div>

            {/* Leg Fulfillment Mini Progress */}
            <div className="w-full h-1 bg-surface-border rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-foreground transition-all duration-500"
                style={{ width: `${leg.fulfillment_pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Dynamic Cashout Offer Section */}
      <div className="bg-surface-subtle border border-surface-border rounded-xl p-3">
        <div className="flex items-center justify-between mb-2 text-xs">
          <div>
            <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Cash-Out Probability:
            </span>
            <span className="font-mono font-bold text-muted-foreground text-xs">{probPct}% confidence</span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-muted-foreground uppercase block">Current Offer</span>
            <span className="font-mono text-base font-black text-foreground">
              ${slip.current_cashout.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Probability Bar */}
        <div className="w-full h-1.5 bg-surface-border rounded-full overflow-hidden mb-3">
          <div
            className="bg-foreground h-full transition-all duration-500"
            style={{ width: `${probPct}%` }}
          />
        </div>

        {/* Cash-Out Action Button */}
        {slip.status === 'RUNNING' && (
          <button
            onClick={handleCashoutClick}
            className="w-full py-2 bg-foreground text-background hover:opacity-90 font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <DollarSign className="w-4 h-4" />
            Cash Out Now (${slip.current_cashout.toFixed(2)})
          </button>
        )}
      </div>
    </motion.div>
  );
}
