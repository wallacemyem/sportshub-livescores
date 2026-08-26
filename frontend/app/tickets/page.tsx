'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Ticket,
  Trash2,
  Plus,
  ArrowRight,
  CheckCircle2,
  X,
  Layers,
  Radio,
  Clock,
  Sparkles,
} from 'lucide-react';
import { BetSlip } from '@/types';
import { AppPageHeader } from '@/components/ui/AppPageHeader';
import { MobileNav } from '@/components/ui/MobileNav';
import { AccumulatorCard } from '@/components/betting/AccumulatorCard';
import { BookmakerLogo } from '@/components/brand/BookmakerLogo';
import { getApiBaseUrl } from '@/lib/api';
import { getCachedData, setCachedData } from '@/lib/cache';
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
  const { user } = useAuth();
  const [betSlips, setBetSlips] = useState<BetSlip[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Importer Form State
  const [selectedBookmaker, setSelectedBookmaker] = useState('auto');
  const [bookingCode, setBookingCode] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // Load Slips
  const fetchSlips = async () => {
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/betslip`);
      if (res.ok) {
        const data = await res.json();
        if (data.slips) {
          setBetSlips(data.slips);
          setCachedData('slips', data.slips);
        }
      }
    } catch (err) {
      console.warn('API error fetching bet slips', err);
    }
  };

  useEffect(() => {
    const cached = getCachedData<BetSlip[]>('slips');
    if (cached) setBetSlips(cached);
    fetchSlips();
  }, []);

  // Handle Ticket Import from Real Bookmaker
  const handleImportSlip = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = bookingCode.trim().toUpperCase();
    if (!cleanCode) {
      setImportError('Please enter a booking code.');
      return;
    }

    setIsImporting(true);
    setImportError(null);
    setImportSuccess(null);

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/betslip/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookmaker: selectedBookmaker,
          booking_code: cleanCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to resolve booking code.');
      }

      setImportSuccess(`Successfully tracked ticket #${data.booking_code} (${data.bookmaker.toUpperCase()}) with ${data.legs?.length || 0} real fixtures!`);
      setBookingCode('');

      // Update slips list
      setBetSlips((prev) => {
        const next = [data, ...prev.filter((s) => s.id !== data.id)];
        setCachedData('slips', next);
        return next;
      });
    } catch (err: any) {
      setImportError(err.message || 'Error resolving booking code.');
    } finally {
      setIsImporting(false);
    }
  };

  // Soft Delete a Single Bet Slip
  const handleDeleteSlip = async (slipId: string) => {
    setBetSlips((prev) => {
      const next = prev.filter((s) => s.id !== slipId);
      setCachedData('slips', next);
      return next;
    });

    try {
      const apiBase = getApiBaseUrl();
      await fetch(`${apiBase}/betslip/${slipId}`, { method: 'DELETE' });
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
    setCachedData('slips', []);

    try {
      const apiBase = getApiBaseUrl();
      await fetch(`${apiBase}/betslip`, { method: 'DELETE' });
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
        
        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-surface border border-surface-border rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Tracked Tickets
            </span>
            <span className="font-mono text-2xl font-black text-foreground mt-1 block">
              {betSlips.length}
            </span>
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
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? `${bm.color} ring-2 ring-emerald-500/40 shadow-sm font-bold`
                          : 'border-surface-border bg-surface-subtle hover:bg-surface-hover text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <BookmakerLogo bookmaker={bm.id} size="sm" className="mb-1.5" />
                      <span className="text-[11px] font-bold truncate max-w-full">{bm.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Code Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                2. Enter Booking Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={bookingCode}
                  onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                  placeholder="e.g. KDSA0G, BC99214, 557877Y, DPK3Q, BK-10294..."
                  className="w-full pl-4 pr-10 py-3.5 bg-surface-subtle border border-surface-border rounded-xl text-sm font-mono font-bold text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all uppercase"
                />
                {bookingCode && (
                  <button
                    type="button"
                    onClick={() => setBookingCode('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Notification messages */}
            {importError && (
              <div className="p-3.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-xs font-medium text-red-700 dark:text-red-300 flex items-center gap-2">
                <X className="w-4 h-4 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {importSuccess && (
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-xs font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{importSuccess}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isImporting || !bookingCode.trim()}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Connecting to Bookmaker Live Network...</span>
                </>
              ) : (
                <>
                  <Ticket className="w-4 h-4" />
                  <span>Import & Track Bet Slip</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Tracked Tickets List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Ticket className="w-4 h-4 text-emerald-500" />
              <span>Tracked Tickets ({betSlips.length})</span>
            </h2>

            {betSlips.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllSlips}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-red-500 hover:bg-red-500/10 border border-surface-border hover:border-red-500/30 rounded-xl transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Tickets</span>
              </button>
            )}
          </div>

          {betSlips.length === 0 ? (
            <div className="bg-surface rounded-3xl border border-surface-border p-12 text-center space-y-3">
              <Ticket className="w-12 h-12 text-muted-foreground mx-auto opacity-30" />
              <p className="text-base font-bold text-foreground">No Tickets Added Yet</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Paste any booking code from SportyBet, Bet9ja, 1xBet, or BetKing above to pull real fixtures and live scores directly from the bookmaker.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {betSlips.map((slip) => (
                <AccumulatorCard
                  key={slip.id}
                  slip={slip}
                  onDelete={handleDeleteSlip}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
