'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Ticket,
  ArrowLeft,
  Trash2,
  Bell,
  BellOff,
  CheckCircle2,
  Clock,
  XCircle,
  Radio,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { BetSlip, Match } from '@/types';
import { AppPageHeader } from '@/components/ui/AppPageHeader';
import { MobileNav } from '@/components/ui/MobileNav';
import { BookmakerLogo } from '@/components/brand/BookmakerLogo';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { getApiBaseUrl } from '@/lib/api';
import { getCachedData, setCachedData } from '@/lib/cache';
import { formatTimeAMPM, formatProperDate, formatMatchDateTime } from '@/lib/date';
import { useNotification } from '@/context/NotificationContext';

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;
  const { alertsEnabled, setAlertsEnabled, triggerAlert, requestPermission } = useNotification();

  const [slip, setSlip] = useState<BetSlip | null>(() => {
    if (typeof window !== 'undefined') {
      const cached = getCachedData<BetSlip[]>('slips');
      return cached?.find((s) => s.id === ticketId || s.booking_code === ticketId) || null;
    }
    return null;
  });

  // Fetch Slip Details
  useEffect(() => {
    async function fetchSlip() {
      try {
        const apiBase = getApiBaseUrl();
        const res = await fetch(`${apiBase}/betslip/${ticketId}`);
        if (res.ok) {
          const data = await res.json();
          setSlip(data);
        }
      } catch (err) {
        console.warn('Failed to fetch ticket details', err);
      }
    }

    if (ticketId) {
      fetchSlip();
    }
  }, [ticketId]);

  // Handle Delete Slip
  const handleDeleteSlip = async () => {
    if (!slip) return;
    if (!window.confirm(`Are you sure you want to remove ticket #${slip.booking_code}?`)) {
      return;
    }

    try {
      const apiBase = getApiBaseUrl();
      await fetch(`${apiBase}/betslip/${slip.id}`, { method: 'DELETE' });

      // Update cached slips
      const cached = getCachedData<BetSlip[]>('slips') || [];
      setCachedData('slips', cached.filter((s) => s.id !== slip.id));

      router.push('/tickets');
    } catch (err) {
      console.warn('Failed to delete slip', err);
    }
  };

  const wonCount = slip?.legs?.filter((l) => l.status === 'WON').length || 0;
  const runningCount = slip?.legs?.filter((l) => l.status === 'RUNNING').length || 0;
  const lostCount = slip?.legs?.filter((l) => l.status === 'LOST').length || 0;
  const pendingCount = slip?.legs?.filter((l) => l.status === 'PENDING').length || 0;
  const totalLegs = slip?.legs?.length || 0;

  if (!slip) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            <p className="text-sm font-mono text-muted-foreground">Loading Ticket Details...</p>
          </div>
        </div>
        <MobileNav />
      </div>
    );
  }

  const statusColor = slip.status === 'WON'
    ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
    : slip.status === 'LOST'
    ? 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30'
    : 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans pb-24 md:pb-12">
      {/* Header */}
      <AppPageHeader
        icon={Ticket}
        title={`Ticket #${slip.booking_code}`}
        subtitle={`${slip.bookmaker.toUpperCase()} • ${totalLegs} Fixtures • ${slip.total_odds?.toFixed(2)}x Total Odds`}
        accentClassName="bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
      />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 md:pl-24 xl:px-6 py-6 space-y-6">
        
        {/* Navigation & Action Bar */}
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/tickets"
            className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground bg-surface border border-surface-border hover:border-surface-hover px-3.5 py-2 rounded-xl transition-colors cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Tickets</span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Live Alerts Subscription Toggle */}
            <button
              type="button"
              onClick={() => {
                const nextState = !alertsEnabled;
                setAlertsEnabled(nextState);
                if (nextState) {
                  triggerAlert('Alerts Enabled', `You will receive live notifications when games on #${slip.booking_code} score or kick off!`, 'kickoff');
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                alertsEnabled
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-surface border-surface-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {alertsEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{alertsEnabled ? 'Live Alerts ON' : 'Enable Alerts'}</span>
            </button>

            {/* Delete Slip */}
            <button
              type="button"
              onClick={handleDeleteSlip}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-surface hover:bg-red-500/10 border border-surface-border hover:border-red-500/30 text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete Ticket</span>
            </button>
          </div>
        </div>

        {/* Big Ticket Master Card */}
        <div className="bg-surface border border-surface-border rounded-3xl p-5 sm:p-7 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border pb-5">
            <div className="flex items-center gap-3.5">
              <BookmakerLogo bookmaker={slip.bookmaker} size="md" className="shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xl sm:text-2xl font-black text-foreground tracking-wide">
                    #{slip.booking_code}
                  </span>
                  <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full border ${statusColor}`}>
                    {slip.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                  {slip.bookmaker.toUpperCase()} Multi-Bet • Added {formatMatchDateTime(slip.created_at)}
                </p>
              </div>
            </div>

            {/* Total Combined Odds */}
            <div className="sm:text-right bg-surface-subtle sm:bg-transparent p-3 sm:p-0 rounded-2xl border sm:border-0 border-surface-border">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Total Combined Odds
              </span>
              <span className="font-mono text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
                {slip.total_odds?.toFixed(2) || '1.00'}x
              </span>
            </div>
          </div>

          {/* Stats Breakdown Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-center">
            <div className="bg-surface-subtle p-3 rounded-2xl border border-surface-border">
              <span className="text-[10px] text-muted-foreground block uppercase font-bold">Total Legs</span>
              <span className="font-bold text-foreground text-base mt-0.5 block">{totalLegs}</span>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-500/10 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-500/30">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block uppercase font-bold">Won</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base mt-0.5 block">{wonCount}</span>
            </div>
            <div className="bg-blue-50 dark:bg-blue-500/10 p-3 rounded-2xl border border-blue-200 dark:border-blue-500/30">
              <span className="text-[10px] text-blue-700 dark:text-blue-400 block uppercase font-bold">In-Play</span>
              <span className="font-bold text-blue-600 dark:text-blue-400 text-base mt-0.5 block">{runningCount}</span>
            </div>
            <div className="bg-surface-subtle p-3 rounded-2xl border border-surface-border">
              <span className="text-[10px] text-muted-foreground block uppercase font-bold">Upcoming</span>
              <span className="font-bold text-foreground text-base mt-0.5 block">{pendingCount}</span>
            </div>
          </div>
        </div>

        {/* Real Match Legs List */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-foreground">
              Accumulator Match Fixtures ({totalLegs})
            </h3>
            <span className="text-xs text-muted-foreground font-mono">Click any game to open match center</span>
          </div>

          <div className="space-y-3">
            {slip.legs?.map((leg, idx) => {
              const matchId = leg.match_id || leg.match?.id;
              const isMatchLive = leg.match?.status === 'LIVE';
              const isMatchFinished = leg.match?.status === 'FINISHED';

              return (
                <Link
                  key={leg.id || idx}
                  href={matchId ? `/match/${matchId}?fromTicket=${slip.id}&ticketCode=${slip.booking_code}` : '#'}
                  className="block bg-surface border border-surface-border hover:border-emerald-500/50 hover:bg-surface-subtle/80 rounded-2xl p-4 sm:p-5 shadow-sm transition-all group cursor-pointer"
                >
                  {/* Top Bar: League, Sport & Kickoff Time */}
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground border-b border-surface-border pb-2.5 mb-3 font-mono">
                    <div className="flex items-center gap-2 min-w-0">
                      {leg.match?.league?.country && (
                        <CountryFlag country={leg.match.league.country} size="xs" />
                      )}
                      <span className="font-bold text-foreground truncate text-[11px]">
                        {leg.match?.league?.name || 'League'}
                      </span>
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-surface-subtle text-muted-foreground font-bold">
                        {leg.match?.sport || 'Soccer'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isMatchLive ? (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                          <Radio className="w-3 h-3" />
                          <span>{leg.match?.period || 'LIVE'} {leg.match?.minute || 0}&apos;</span>
                        </span>
                      ) : isMatchFinished ? (
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          Final (FT)
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {formatTimeAMPM(leg.match?.start_time)} ({formatProperDate(leg.match?.start_time)})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Match Teams & Score */}
                  <div className="flex items-center justify-between gap-3 sm:gap-6 my-2">
                    <div className="flex-1 flex items-center gap-2.5 min-w-0">
                      <TeamCrest
                        name={leg.match?.home_team?.name || 'Home'}
                        shortName={leg.match?.home_team?.short_name}
                        logoUrl={leg.match?.home_team?.logo}
                        sport={leg.match?.sport}
                        size="sm"
                      />
                      <span className="font-bold text-sm sm:text-base text-foreground truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {leg.match?.home_team?.name || 'Home'}
                      </span>
                    </div>

                    {/* Live Score Display */}
                    <div className="shrink-0 px-3 py-1 bg-surface-subtle border border-surface-border rounded-xl font-mono text-sm sm:text-base font-black text-foreground">
                      {isMatchLive || isMatchFinished ? (
                        `${leg.match?.home_score ?? 0} - ${leg.match?.away_score ?? 0}`
                      ) : (
                        formatTimeAMPM(leg.match?.start_time)
                      )}
                    </div>

                    <div className="flex-1 flex items-center justify-end gap-2.5 min-w-0 text-right">
                      <span className="font-bold text-sm sm:text-base text-foreground truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {leg.match?.away_team?.name || 'Away'}
                      </span>
                      <TeamCrest
                        name={leg.match?.away_team?.name || 'Away'}
                        shortName={leg.match?.away_team?.short_name}
                        logoUrl={leg.match?.away_team?.logo}
                        sport={leg.match?.sport}
                        size="sm"
                      />
                    </div>
                  </div>

                  {/* Pick & Market Strip */}
                  <div className="mt-3 pt-3 border-t border-surface-border flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-muted-foreground text-[11px]">Pick:</span>
                      <span className="font-bold text-foreground truncate bg-surface-subtle px-2 py-0.5 rounded border border-surface-border text-[11px]">
                        {leg.selection}
                      </span>
                      <span className="text-muted-foreground text-[11px] truncate hidden sm:inline">
                        ({leg.market})
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-xs font-black text-amber-600 dark:text-amber-400">
                        {leg.odds?.toFixed(2)}
                      </span>

                      <div className="flex items-center gap-1">
                        {leg.status === 'WON' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        {leg.status === 'RUNNING' && <Clock className="w-4 h-4 text-blue-500 animate-spin" />}
                        {leg.status === 'LOST' && <XCircle className="w-4 h-4 text-red-500" />}
                        {leg.status === 'PENDING' && <Clock className="w-4 h-4 text-muted-foreground" />}
                      </div>

                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
