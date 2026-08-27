'use client';

import { BetSlip } from '@/types';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, XCircle, Trash2, Layers } from 'lucide-react';
import Link from 'next/link';
import { BookmakerLogo } from '@/components/brand/BookmakerLogo';

interface AccumulatorCardProps {
  slip: BetSlip;
  onDelete?: (slipId: string) => void;
}

export function AccumulatorCard({ slip, onDelete }: AccumulatorCardProps) {
  const wonCount = slip.legs?.filter((l) => l.status === 'WON').length || 0;
  const lostCount = slip.legs?.filter((l) => l.status === 'LOST').length || 0;
  const totalLegs = slip.legs?.length || 0;

  const statusColor = slip.status === 'WON'
    ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
    : slip.status === 'LOST'
    ? 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30'
    : 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface border border-surface-border rounded-2xl p-4 sm:p-5 shadow-subtle select-none space-y-3.5"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 border-b border-surface-border pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <BookmakerLogo bookmaker={slip.bookmaker} size="sm" className="shrink-0" />
          <span className="shrink-0 bg-surface-subtle border border-surface-border text-foreground text-[10px] font-bold uppercase px-2 py-0.5 rounded font-mono">
            {slip.bookmaker}
          </span>
          <span className="truncate font-mono text-xs font-black text-foreground tracking-wide">
            #{slip.booking_code}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${statusColor}`}>
            {slip.status}
          </span>
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(slip.id)}
              title="Delete bet slip"
              className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Slip Overview Bar: Total Odds & Legs Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-surface-subtle p-3 rounded-xl border border-surface-border font-mono text-xs text-center">
        <div>
          <span className="text-[10px] text-muted-foreground block uppercase font-bold">Total Odds</span>
          <span className="text-amber-600 dark:text-amber-400 font-black text-sm">{slip.total_odds?.toFixed(2) || '1.00'}x</span>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground block uppercase font-bold">Accumulator Legs</span>
          <span className="text-foreground font-black text-sm">
            {totalLegs} {totalLegs === 1 ? 'Leg' : 'Legs'} ({wonCount} Won{lostCount > 0 ? `, ${lostCount} Lost` : ''})
          </span>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <span className="text-[10px] text-muted-foreground block uppercase font-bold">Live Cashout</span>
          <span className={`font-black text-sm ${slip.current_cashout && slip.current_cashout > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
            {slip.current_cashout && slip.current_cashout > 0 ? `$${slip.current_cashout.toFixed(2)}` : '-'}
          </span>
        </div>
      </div>

      {/* Real Fixture Legs List */}
      <div className="space-y-2">
        {slip.legs?.map((leg) => {
          const matchId = leg.match_id || leg.match?.id;
          return (
            <Link
              key={leg.id}
              href={matchId ? `/match/${matchId}` : '#'}
              className="block bg-surface-subtle/40 hover:bg-surface-subtle border border-surface-border hover:border-blue-300 dark:hover:border-blue-600 rounded-xl p-3 text-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="min-w-0 flex-1 truncate font-bold text-foreground group-hover:text-blue-600 transition-colors">
                  <span className="inline sm:hidden">{leg.match?.home_team?.short_name || 'Home'} vs {leg.match?.away_team?.short_name || 'Away'}</span>
                  <span className="hidden sm:inline">{leg.match?.home_team?.name || 'Home'} vs {leg.match?.away_team?.name || 'Away'}</span>
                </span>
                <span className="shrink-0 font-mono text-xs font-black text-amber-600 dark:text-amber-400">
                  {leg.odds?.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span className="min-w-0 flex-1 truncate">
                  Pick: <strong className="text-foreground font-semibold">{leg.selection}</strong> ({leg.market})
                </span>
                <span className="shrink-0 font-mono flex items-center gap-1.5">
                  {leg.status === 'WON' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                  {leg.status === 'RUNNING' && <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0 animate-spin" />}
                  {leg.status === 'LOST' && <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                  {leg.status === 'PENDING' && <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                  <span className="text-foreground font-bold">{leg.current_score || 'Upcoming'}</span>
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
}
