'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Ticket,
  Trash2,
  Plus,
  ArrowRight,
  CheckCircle2,
  X,
  Layers,
  ChevronRight,
  Clock,
  Sparkles,
  Crown,
  Lock,
  Zap,
} from 'lucide-react';
import { BetSlip } from '@/types';
import { AppPageHeader } from '@/components/ui/AppPageHeader';
import { MobileNav } from '@/components/ui/MobileNav';
import { BookmakerLogo } from '@/components/brand/BookmakerLogo';
import { getApiBaseUrl } from '@/lib/api';
import { getCachedData, setCachedData } from '@/lib/cache';
import { formatProperDate, formatMatchDateTime } from '@/lib/date';
import { useNotification } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';

const BOOKMAKERS = [
  { id: 'auto', name: 'Auto-Detect', color: 'border-violet-500 bg-violet-50 dark:bg-violet-500/10 text-violet-600' },
  { id: 'sportybet', name: 'SportyBet', color: 'border-red-500 bg-red-50 dark:bg-red-500/10 text-red-600' },
  { id: 'bet9ja', name: 'Bet9ja', color: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' },
  { id: '1xbet', name: '1xBet', color: 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600' },
  { id: 'betking', name: 'BetKing', color: 'border-amber-500 bg-amber-50 dark:bg-amber-500/10 text-amber-600' },
  { id: 'msport', name: 'MSport', color: 'border-orange-500 bg-orange-50 dark:bg-orange-500/10 text-orange-600' },
  { id: 'mozzartbet', name: 'MozzartBet', color: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600' },
];

export default function TicketsPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { triggerAlert } = useNotification();
  const [betSlips, setBetSlips] = useState<BetSlip[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Importer Form State
  const [selectedBookmaker, setSelectedBookmaker] = useState('auto');
  const [bookingCode, setBookingCode] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const cacheKey = `slips_${user?.id || 'guest'}`;

  // Plan limits
  const userPlan = user?.plan || 'free';
  const maxAllowedTickets = userPlan === 'elite' ? 1000 : userPlan === 'pro' ? 25 : 3;

  // Load Slips for current user
  const fetchSlips = async () => {
    try {
      const apiBase = getApiBaseUrl();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`${apiBase}/betslip`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.slips) {
          setBetSlips(data.slips);
          setCachedData(cacheKey, data.slips);
        }
      }
    } catch (err) {
      console.warn('API error fetching bet slips', err);
    }
  };

  useEffect(() => {
    const cached = getCachedData<BetSlip[]>(cacheKey);
    if (cached) setBetSlips(cached);
    fetchSlips();
  }, [user?.id, token]);

  // Handle Ticket Import from Real Bookmaker
  const handleImportSlip = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = bookingCode.trim().toUpperCase();
    if (!cleanCode) {
      setImportError('Please enter a booking code.');
      return;
    }

    if (betSlips.length >= maxAllowedTickets && userPlan === 'free') {
      setShowUpgradeModal(true);
      setImportError(`Free plan limit reached (${betSlips.length}/${maxAllowedTickets} tickets). Upgrade to Pro to track more tickets.`);
      return;
    }

    setIsImporting(true);
    setImportError(null);
    setImportSuccess(null);

    try {
      const apiBase = getApiBaseUrl();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`${apiBase}/betslip/import`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          bookmaker: selectedBookmaker,
          booking_code: cleanCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'PLAN_LIMIT_EXCEEDED') {
          setShowUpgradeModal(true);
        }
        throw new Error(data.error || 'Failed to resolve booking code.');
      }

      setImportSuccess(`Successfully tracked ticket #${data.booking_code} (${data.bookmaker.toUpperCase()}) with ${data.legs?.length || 0} real fixtures!`);
      setBookingCode('');

      // Update slips list
      setBetSlips((prev) => {
        const next = [data, ...prev.filter((s) => s.id !== data.id)];
        setCachedData(cacheKey, next);
        return next;
      });

      triggerAlert(
        `Ticket #${data.booking_code} Imported`,
        `Loaded ${data.legs?.length || 0} fixtures from ${data.bookmaker.toUpperCase()} with ${data.total_odds?.toFixed(2)}x odds!`,
        'event'
      );

      // Navigate to ticket detail after brief moment
      setTimeout(() => {
        router.push(`/tickets/${data.id || data.booking_code}`);
      }, 1000);
    } catch (err: any) {
      setImportError(err.message || 'Error resolving booking code.');
    } finally {
      setIsImporting(false);
    }
  };

  // Soft Delete a Single Bet Slip
  const handleDeleteSlip = async (e: React.MouseEvent, slipId: string) => {
    e.preventDefault();
    e.stopPropagation();

    setBetSlips((prev) => {
      const next = prev.filter((s) => s.id !== slipId);
      setCachedData(cacheKey, next);
      return next;
    });

    try {
      const apiBase = getApiBaseUrl();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      await fetch(`${apiBase}/betslip/${slipId}`, { method: 'DELETE', headers });
    } catch (err) {
      console.warn('Failed to delete bet slip', err);
    }
  };

  // Soft Delete ALL Bet Slips
  const handleClearAllSlips = async () => {
    if (!window.confirm('Are you sure you want to remove all tracked tickets?')) {
      return;
    }

    setBetSlips([]);
    setCachedData(cacheKey, []);

    try {
      const apiBase = getApiBaseUrl();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      await fetch(`${apiBase}/betslip`, { method: 'DELETE', headers });
    } catch (err) {
      console.warn('Failed to clear all bet slips', err);
    }
  };

  // Calculations for summary stats
  const totalLegsCount = useMemo(() => {
    return betSlips.reduce((acc, s) => acc + (s.legs?.length || 0), 0);
  }, [betSlips]);

  const activeRunningCount = useMemo(() => {
    return betSlips.reduce((acc, s) => {
      const runningInSlip = s.legs?.filter((l) => l.status === 'RUNNING').length || 0;
      return acc + runningInSlip;
    }, 0);
  }, [betSlips]);

  const wonLegsCount = useMemo(() => {
    return betSlips.reduce((acc, s) => {
      const wonInSlip = s.legs?.filter((l) => l.status === 'WON').length || 0;
      return acc + wonInSlip;
    }, 0);
  }, [betSlips]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans pb-24 md:pb-12">
      {/* Header */}
      <AppPageHeader
        icon={Ticket}
        title="My Bet Tickets"
        subtitle="Import sportsbook booking codes and monitor accumulator fixtures and live odds in real-time"
        accentClassName="bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
      />

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 md:pl-24 xl:px-6 py-6 space-y-8">
        
        {/* Plan Quota Alert if near or at limit */}
        {userPlan === 'free' && betSlips.length >= 2 && (
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Crown className="w-6 h-6 text-amber-500 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-foreground">
                  Free Plan: {betSlips.length} of {maxAllowedTickets} Tickets Used
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Upgrade to Pro to track up to 25 tickets simultaneously with real-time goal alerts and odds comparisons.
                </p>
              </div>
            </div>
            <Link
              href="/account/plan"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-xl shadow-md transition-all flex-shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Upgrade Plan</span>
            </Link>
          </div>
        )}

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-surface border border-surface-border rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Tracked Tickets
              </span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-surface-subtle text-muted-foreground">
                {userPlan.toUpperCase()}
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="font-mono text-2xl font-black text-foreground">
                {betSlips.length}
              </span>
              <span className="text-xs text-muted-foreground">/ {userPlan === 'elite' ? '∞' : maxAllowedTickets}</span>
            </div>
          </div>

          <div className="bg-surface border border-surface-border rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Total Fixtures
            </span>
            <span className="font-mono text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 block">
              {totalLegsCount}
            </span>
          </div>

          <div className="bg-surface border border-surface-border rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Active In-Play Legs
            </span>
            <span className="font-mono text-2xl font-black text-red-500 mt-1 block">
              {activeRunningCount}
            </span>
          </div>

          <div className="bg-surface border border-surface-border rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Won / Settled Legs
            </span>
            <span className="font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
              {wonLegsCount}
            </span>
          </div>
        </div>

        {/* Embedded Ticket Importer Box */}
        <div className="bg-surface border border-surface-border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-surface-border pb-4">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-500" />
              <span>Import Sportsbook Booking Code</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enter any booking code to pull real live match fixtures directly from the bookmaker network.
            </p>
          </div>

          <form onSubmit={handleImportSlip} className="space-y-5">
            {/* Sportsbook Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                1. Select Sportsbook
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {BOOKMAKERS.map((bm) => {
                  const isSelected = selectedBookmaker === bm.id;
                  return (
                    <button
                      key={bm.id}
                      type="button"
                      onClick={() => setSelectedBookmaker(bm.id)}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition-all ${
                        isSelected
                          ? `${bm.color} border-current shadow-sm scale-105`
                          : 'border-surface-border bg-surface-subtle text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <BookmakerLogo bookmaker={bm.id} size="sm" />
                      <span className="mt-1.5">{bm.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Booking Code Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                2. Enter Booking Code
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={bookingCode}
                    onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                    placeholder="e.g. KDSA0G, B9-4921, 5K9A2..."
                    className="w-full bg-surface-subtle border border-surface-border rounded-2xl px-5 py-3.5 text-base font-mono font-bold tracking-widest uppercase text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                  {bookingCode && (
                    <button
                      type="button"
                      onClick={() => setBookingCode('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isImporting || !bookingCode.trim()}
                  className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 flex-shrink-0"
                >
                  {isImporting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Track Ticket</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Notifications */}
            {importError && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium flex items-center justify-between gap-3">
                <span>{importError}</span>
                {showUpgradeModal && (
                  <Link
                    href="/account/plan"
                    className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-lg whitespace-nowrap hover:bg-red-600"
                  >
                    Upgrade Now
                  </Link>
                )}
              </div>
            )}
            {importSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{importSuccess}</span>
              </div>
            )}
          </form>
        </div>

        {/* List of Tracked Tickets */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Layers className="w-4 h-4" />
              <span>Tracked Tickets ({betSlips.length})</span>
            </h3>
            {betSlips.length > 0 && (
              <button
                onClick={handleClearAllSlips}
                className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1.5 py-1 px-3 rounded-xl hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Tickets</span>
              </button>
            )}
          </div>

          {betSlips.length === 0 ? (
            <div className="bg-surface border border-surface-border rounded-3xl p-12 text-center space-y-4">
              <div className="w-14 h-14 bg-surface-subtle border border-surface-border rounded-2xl flex items-center justify-center mx-auto text-muted-foreground">
                <Ticket className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto">
                <h4 className="text-base font-bold text-foreground">No Tickets Tracked Yet</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Paste any booking code into the importer above to start tracking your accumulator fixtures in real-time.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {betSlips.map((slip) => {
                const wonLegs = slip.legs?.filter((l) => l.status === 'WON').length || 0;
                const runningLegs = slip.legs?.filter((l) => l.status === 'RUNNING').length || 0;
                const lostLegs = slip.legs?.filter((l) => l.status === 'LOST').length || 0;
                const total = slip.legs?.length || 0;

                return (
                  <div
                    key={slip.id}
                    className="bg-surface border border-surface-border rounded-3xl p-5 hover:border-emerald-500/40 transition-all shadow-sm hover:shadow-md flex flex-col justify-between space-y-4 group"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-surface-subtle border border-surface-border rounded-2xl">
                          <BookmakerLogo bookmaker={slip.bookmaker} size="sm" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-base font-black tracking-wider text-foreground">
                              #{slip.booking_code}
                            </span>
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                slip.status === 'WON'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : slip.status === 'LOST'
                                  ? 'bg-red-500/10 text-red-500'
                                  : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              }`}
                            >
                              {slip.status}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground capitalize">
                            {slip.bookmaker} Sportsbook
                          </span>
                        </div>
                      </div>

                      {/* Delete Ticket Button */}
                      <button
                        onClick={(e) => handleDeleteSlip(e, slip.id)}
                        className="p-2 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors opacity-80 group-hover:opacity-100"
                        title="Remove Ticket"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Odds and Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Total Accumulator Odds</span>
                        <span className="font-mono font-black text-foreground">
                          {slip.total_odds?.toFixed(2)}x
                        </span>
                      </div>

                      <div className="h-2 w-full bg-surface-subtle rounded-full overflow-hidden flex">
                        {wonLegs > 0 && (
                          <div
                            style={{ width: `${(wonLegs / total) * 100}%` }}
                            className="bg-emerald-500 h-full"
                          />
                        )}
                        {runningLegs > 0 && (
                          <div
                            style={{ width: `${(runningLegs / total) * 100}%` }}
                            className="bg-red-500 animate-pulse h-full"
                          />
                        )}
                        {lostLegs > 0 && (
                          <div
                            style={{ width: `${(lostLegs / total) * 100}%` }}
                            className="bg-zinc-600 h-full"
                          />
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                        <span>{wonLegs} / {total} Won</span>
                        {runningLegs > 0 && <span className="text-red-500 font-bold">{runningLegs} In-Play</span>}
                        <span>{total} Fixtures</span>
                      </div>
                    </div>

                    {/* View Details CTA Button */}
                    <Link
                      href={`/tickets/${slip.id || slip.booking_code}`}
                      className="w-full py-2.5 px-4 bg-surface-subtle hover:bg-emerald-500/10 hover:text-emerald-600 border border-surface-border rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      <span>View Fixtures Breakdown</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Plan Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-surface-border rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Crown className="w-6 h-6" />
              </div>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-foreground">
                Upgrade to Track More Tickets
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your Free plan allows tracking up to 3 accumulator tickets at once. Upgrade to Pro for up to 25 tickets or Elite for unlimited tracking with real-time push alerts.
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl border border-violet-500/30 bg-violet-500/5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-violet-500 block">Pro Plan ($9/mo)</span>
                  <span className="text-[11px] text-muted-foreground">Up to 25 tickets & real-time goal alerts</span>
                </div>
                <Link
                  href="/account/plan"
                  className="px-3.5 py-2 bg-violet-600 text-white font-bold text-xs rounded-xl hover:bg-violet-700 shadow-sm"
                >
                  Choose Pro
                </Link>
              </div>

              <div className="p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-500 block">Elite Plan ($29/mo)</span>
                  <span className="text-[11px] text-muted-foreground">Unlimited tickets & raw WebSocket feeds</span>
                </div>
                <Link
                  href="/account/plan"
                  className="px-3.5 py-2 bg-amber-500 text-black font-bold text-xs rounded-xl hover:bg-amber-600 shadow-sm"
                >
                  Choose Elite
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Mobile Navigation */}
      <MobileNav />
    </div>
  );
}
