'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Ticket,
  Trash2,
  Activity,
  Layers,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  X,
  Plus,
  Compass,
} from 'lucide-react';
import { Match, BetSlip, SportType } from '@/types';
import { AppPageHeader } from '@/components/ui/AppPageHeader';
import { MobileNav } from '@/components/ui/MobileNav';
import { LiveScoreCard } from '@/components/ui/LiveScoreCard';
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

const SPORTS_FILTER: { id: string; label: string }[] = [
  { id: 'all', label: 'All Sports' },
  { id: 'soccer', label: 'Soccer' },
  { id: 'basketball', label: 'Basketball' },
  { id: 'tennis', label: 'Tennis' },
  { id: 'nfl', label: 'NFL' },
  { id: 'baseball', label: 'Baseball' },
  { id: 'cricket', label: 'Cricket' },
];

export default function SearchPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Search State
  const [query, setQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState('all');
  const [matches, setMatches] = useState<Match[]>([]);
  const [betSlips, setBetSlips] = useState<BetSlip[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Importer Form State
  const [selectedBookmaker, setSelectedBookmaker] = useState('auto');
  const [bookingCode, setBookingCode] = useState('');
  const [stake, setStake] = useState('20.00');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // Active Tab View: "all", "tickets", "matches"
  const [activeTab, setActiveTab] = useState<'search' | 'tickets' | 'importer'>('search');

  // Load initial matches and tickets
  const fetchData = async () => {
    try {
      const apiBase = getApiBaseUrl();
      const [matchRes, slipRes] = await Promise.all([
        fetch(`${apiBase}/matches`),
        fetch(`${apiBase}/betslip`),
      ]);

      if (matchRes.ok) {
        const data = await matchRes.json();
        if (data.matches) {
          setMatches(data.matches);
          setCachedData('matches', data.matches);
        }
      }

      if (slipRes.ok) {
        const data = await slipRes.json();
        if (data.slips) {
          setBetSlips(data.slips);
          setCachedData('slips', data.slips);
        }
      }
    } catch (err) {
      console.warn('API error fetching search data', err);
    }
  };

  useEffect(() => {
    const cachedM = getCachedData<Match[]>('matches');
    const cachedS = getCachedData<BetSlip[]>('slips');
    if (cachedM) setMatches(cachedM);
    if (cachedS) setBetSlips(cachedS);

    fetchData();
  }, []);

  // Handle Ticket Import
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
          stake: parseFloat(stake) || 20.0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to resolve booking code.');
      }

      setImportSuccess(`Successfully tracked slip #${data.booking_code} (${data.bookmaker.toUpperCase()})!`);
      setBookingCode('');
      
      // Update slips list
      setBetSlips((prev) => {
        const next = [data, ...prev.filter((s) => s.id !== data.id)];
        setCachedData('slips', next);
        return next;
      });

      // Also refresh matches
      fetchData();
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

  // Soft Delete a Single Match
  const handleDeleteMatch = async (matchId: string) => {
    setMatches((prev) => {
      const next = prev.filter((m) => m.id !== matchId);
      setCachedData('matches', next);
      return next;
    });

    try {
      const apiBase = getApiBaseUrl();
      await fetch(`${apiBase}/matches/${matchId}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Failed to delete match', err);
    }
  };

  // Filter Matches based on Query & Sport
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (selectedSport !== 'all' && m.sport !== selectedSport) {
        return false;
      }
      if (query.trim()) {
        const q = query.toLowerCase();
        const home = m.home_team?.name?.toLowerCase() || '';
        const away = m.away_team?.name?.toLowerCase() || '';
        const league = m.league?.name?.toLowerCase() || '';
        return home.includes(q) || away.includes(q) || league.includes(q);
      }
      return true;
    });
  }, [matches, selectedSport, query]);

  // Calculations for summary stats
  const totalPotentialReturn = useMemo(() => {
    return betSlips.reduce((sum, s) => sum + (s.potential_win || 0), 0);
  }, [betSlips]);

  const totalCurrentCashout = useMemo(() => {
    return betSlips.reduce((sum, s) => sum + (s.current_cashout || 0), 0);
  }, [betSlips]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans pb-24 md:pb-12">
      {/* Shared Header with Plan Icon */}
      <AppPageHeader
        icon={Search}
        title="Search & Tickets"
        subtitle="Search games, import booking codes and manage tracked tickets"
        accentClassName="bg-violet-600/10 text-violet-600 dark:text-violet-400 border-violet-500/20"
      />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 md:pl-24 xl:px-6 py-6 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 bg-surface p-1.5 rounded-2xl border border-surface-border shadow-sm max-w-md">
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'search'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface-subtle'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search Matches</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('importer')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'importer'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm shadow-violet-500/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface-subtle'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Import Ticket</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tickets')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'tickets'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface-subtle'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>My Tickets ({betSlips.length})</span>
          </button>
        </div>

        {/* ================================================================= */}
        {/* SECTION 1: EMBEDDED TICKET IMPORTER                              */}
        {/* ================================================================= */}
        {(activeTab === 'importer' || activeTab === 'tickets') && (
          <div className="bg-surface border border-surface-border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-border pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-violet-500" />
                  <span>Import Sportsbook Booking Code</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Convert any booking code into a live tracking accumulator with real-time score updates.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold bg-surface-subtle border border-surface-border px-2.5 py-1 rounded-full text-muted-foreground">
                  Read-Only Parser
                </span>
              </div>
            </div>

            <form onSubmit={handleImportSlip} className="space-y-5">
              {/* Sportsbook Grid Selector */}
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
                            ? `${bm.color} ring-2 ring-violet-500/40 shadow-sm font-bold`
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

              {/* Code & Stake Input Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    2. Enter Booking Code
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={bookingCode}
                      onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                      placeholder="e.g. KDSA0G, BC99214, 557877Y, DPK3Q..."
                      className="w-full pl-4 pr-10 py-3 bg-surface-subtle border border-surface-border rounded-xl text-sm font-mono font-bold text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all uppercase"
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

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    3. Stake Amount ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">
                      $
                    </span>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={stake}
                      onChange={(e) => setStake(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 bg-surface-subtle border border-surface-border rounded-xl text-sm font-mono font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Status Notifications */}
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
                className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-md shadow-violet-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {isImporting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Resolving Sportsbook Slip...</span>
                  </>
                ) : (
                  <>
                    <Ticket className="w-4 h-4" />
                    <span>Import & Track Accumulator</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ================================================================= */}
        {/* SECTION 2: TRACKED TICKETS MANAGEMENT LIST                        */}
        {/* ================================================================= */}
        {(activeTab === 'tickets' || (activeTab === 'importer' && betSlips.length > 0)) && (
          <div className="space-y-4">
            {/* Header & Counters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-2xl border border-surface-border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Tracked Betting Tickets</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {betSlips.length} {betSlips.length === 1 ? 'ticket' : 'tickets'} monitored in real-time
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground block uppercase">Est. Cashout</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    ${totalCurrentCashout.toFixed(2)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground block uppercase">Potential Win</span>
                  <span className="font-bold text-foreground">
                    ${totalPotentialReturn.toFixed(2)}
                  </span>
                </div>

                {betSlips.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllSlips}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-red-500 hover:bg-red-500/10 border border-surface-border hover:border-red-500/30 rounded-xl transition-colors cursor-pointer"
                    title="Remove all tickets"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All</span>
                  </button>
                )}
              </div>
            </div>

            {/* Bet Slips Grid */}
            {betSlips.length === 0 ? (
              <div className="bg-surface rounded-2xl border border-surface-border p-10 text-center space-y-3">
                <Ticket className="w-10 h-10 text-muted-foreground mx-auto opacity-30" />
                <p className="text-sm font-bold text-foreground">No Tickets Added Yet</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Import booking codes from SportyBet, Bet9ja, 1xBet, or BetKing above to start tracking odds and cashouts.
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
        )}

        {/* ================================================================= */}
        {/* SECTION 3: MATCHES SEARCH & FILTER                                */}
        {/* ================================================================= */}
        {activeTab === 'search' && (
          <div className="space-y-4">
            {/* Search Input Bar */}
            <div className="bg-surface border border-surface-border rounded-2xl p-3 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by team (e.g. Arsenal, Real Madrid, Lakers), tournament or country..."
                  className="w-full pl-10 pr-10 py-2.5 bg-surface-subtle border border-surface-border rounded-xl text-xs font-semibold text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sport Filter Dropdown / Pill */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {SPORTS_FILTER.map((sport) => {
                  const isSelected = selectedSport === sport.id;
                  return (
                    <button
                      key={sport.id}
                      type="button"
                      onClick={() => setSelectedSport(sport.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                          : 'bg-surface-subtle hover:bg-surface-hover border border-surface-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {sport.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Matches List */}
            {filteredMatches.length === 0 ? (
              <div className="bg-surface rounded-2xl border border-surface-border p-12 text-center space-y-3">
                <Compass className="w-10 h-10 text-muted-foreground mx-auto opacity-30" />
                <p className="text-sm font-bold text-foreground">
                  {query ? `No games matching "${query}"` : 'No Games on the Board'}
                </p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Try adjusting your search query, selecting another sport, or importing a custom booking ticket.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('importer')}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <Ticket className="w-3.5 h-3.5" />
                  <span>Import Booking Code Instead</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1 text-xs text-muted-foreground font-mono">
                  <span>Showing {filteredMatches.length} {filteredMatches.length === 1 ? 'match' : 'matches'}</span>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Click card for deep head-to-head stats</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {filteredMatches.map((m) => (
                    <LiveScoreCard
                      key={m.id}
                      match={m}
                      onRemove={handleDeleteMatch}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <MobileNav />
    </div>
  );
}
