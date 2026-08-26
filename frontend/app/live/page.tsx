'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Match, SportType, BetSlip, LiveDelta } from '@/types';
import { useLiveMatchSocket } from '@/hooks/useLiveMatchSocket';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { usePiPScoreboard } from '@/hooks/usePiPScoreboard';
import { useMediaSession } from '@/hooks/useMediaSession';
import { TickerStrip } from '@/components/ui/TickerStrip';
import { LiveScoreCard } from '@/components/ui/LiveScoreCard';
import { FloatingPiP } from '@/components/ui/FloatingPiP';
import { ProUpgradeModal } from '@/components/ui/ProUpgradeModal';
import { EventTimeline } from '@/components/live/EventTimeline';
import { LineupsView } from '@/components/live/LineupsView';
import { HeadToHead } from '@/components/live/HeadToHead';
import { OddsComparisonTable } from '@/components/live/OddsComparisonTable';
import { TicketImporterModal } from '@/components/betting/TicketImporterModal';
import { AccumulatorCard } from '@/components/betting/AccumulatorCard';
import { SupportModal } from '@/components/support/SupportModal';
import { SearchModal } from '@/components/ui/SearchModal';
import { MobileNav } from '@/components/ui/MobileNav';
import { Logo } from '@/components/brand/Logo';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { getCachedData, setCachedData } from '@/lib/cache';
import { getApiBaseUrl } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  Radio,
  Search,
  Crown,
  Ticket,
  User,
  Layers,
  Activity,
  Maximize2,
  ExternalLink,
  Shield,
  Zap,
  CircleDot,
  Target,
  Circle,
  Flag,
  Trash2,
  X,
} from 'lucide-react';
import { formatClock } from '@/lib/sportFormat';
import { formatTimeAMPM } from '@/lib/date';

const SPORTS: { id: SportType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'soccer', label: 'Soccer', icon: Activity },
  { id: 'basketball', label: 'Basketball', icon: CircleDot },
  { id: 'tennis', label: 'Tennis', icon: Target },
  { id: 'nfl', label: 'NFL', icon: Shield },
  { id: 'cricket', label: 'Cricket', icon: Layers },
  { id: 'baseball', label: 'Baseball', icon: Circle },
  { id: 'golf', label: 'Golf', icon: Flag },
];

export default function HomePage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [selectedSport, setSelectedSport] = useState<SportType>('soccer');
  // First page default is strictly LIVE
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LIVE' | 'SCHEDULED' | 'FINISHED'>('LIVE');
  const [ticketFilterMode, setTicketFilterMode] = useState<'MY_TICKETS' | 'ALL_GLOBAL'>('MY_TICKETS');
  const [searchQuery, setSearchQuery] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [betSlips, setBetSlips] = useState<BetSlip[]>([]);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isProUser, setIsProUser] = useState(false);
  const [detailTab, setDetailTab] = useState<'stats' | 'timeline' | 'lineups' | 'odds'>('stats');

  const slipCacheKey = `slips_${user?.id || 'guest'}`;

  // Remove an individual match from the tracker and database
  const handleRemoveMatch = async (matchId: string) => {
    setMatches((prev) => {
      const next = prev.filter((m) => m.id !== matchId);
      setCachedData('matches', next);
      return next;
    });
    if (selectedMatchId === matchId) {
      setSelectedMatchId(null);
    }
    try {
      const apiBase = getApiBaseUrl();
      await fetch(`${apiBase}/matches/${matchId}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Failed to remove match', err);
    }
  };

  // Clear all matches from the tracker and database
  const handleClearAllMatches = async () => {
    if (!window.confirm('Are you sure you want to remove all games from the board?')) {
      return;
    }
    setMatches([]);
    setSelectedMatchId(null);
    setCachedData('matches', []);
    try {
      const apiBase = getApiBaseUrl();
      await fetch(`${apiBase}/matches`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Failed to clear matches', err);
    }
  };

  // Delete a specific bet slip (soft delete)
  const handleDeleteSlip = async (slipId: string) => {
    setBetSlips((prev) => {
      const next = prev.filter((s) => s.id !== slipId);
      setCachedData(slipCacheKey, next);
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

  // WebSocket Live Connection
  const { isConnected, subscribe } = useLiveMatchSocket(selectedMatchId || undefined);

  // Supabase Realtime Table Replication Hook
  const { isRealtimeActive } = useSupabaseRealtime({
    onMatchUpdate: (updatedMatch) => {
      if (!updatedMatch.id) return;
      setMatches((prev) => {
        const next = prev.map((m) => (m.id === updatedMatch.id ? { ...m, ...updatedMatch } : m));
        setCachedData('matches', next);
        return next;
      });
    },
    onBetSlipUpdate: (updatedSlip) => {
      if (!updatedSlip.id) return;
      setBetSlips((prev) => {
        const next = prev.map((s) => (s.id === updatedSlip.id ? { ...s, ...updatedSlip } : s));
        setCachedData(slipCacheKey, next);
        return next;
      });
    },
  });

  // Media Session Metadata API & Selected Match (Only when explicitly clicked by user)
  const selectedMatch = useMemo(() => {
    if (!selectedMatchId) return null;
    return matches.find((m) => m.id === selectedMatchId) || null;
  }, [matches, selectedMatchId]);
  useMediaSession(selectedMatch);

  // Picture-in-Picture & Scoreboard Hook
  const { isPiPActive, isSupported: isPiPSupported, openPiP, closePiP } = usePiPScoreboard();

  // Live WebSocket delta listener
  useEffect(() => {
    const unsubscribe = subscribe((delta) => {
      if (delta && delta.type) {
        // Live delta received
      }
    });
    return () => unsubscribe();
  }, [subscribe]);

  // Extract Match IDs loaded by user's tickets (multi-sport support)
  const ticketMatchIds = useMemo(() => {
    const ids = new Set<string>();
    betSlips.forEach((slip) => {
      slip.legs?.forEach((leg) => {
        if (leg.match_id) ids.add(leg.match_id);
        if (leg.match?.id) ids.add(leg.match.id);
      });
    });
    return ids;
  }, [betSlips]);

  // Initial Fast Cache Resolution & Silent Background Revalidation
  useEffect(() => {
    // 1. Instant Cache Load (0ms - saves tokens and preserves API rate limits)
    const cachedMatches = getCachedData<Match[]>('matches');
    const cachedSlips = getCachedData<BetSlip[]>(slipCacheKey);

    if (cachedMatches && cachedMatches.length > 0) {
      setMatches(cachedMatches);
    }
    if (cachedSlips && cachedSlips.length > 0) {
      setBetSlips(cachedSlips);
    }

    // 2. Fetch from API in background to update cache
    async function fetchData() {
      try {
        const apiBase = getApiBaseUrl();
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const [matchRes, slipRes] = await Promise.all([
          fetch(`${apiBase}/matches`),
          fetch(`${apiBase}/betslip`, { headers }),
        ]);

        if (matchRes.ok) {
          const data = await matchRes.json();
          if (data.matches && data.matches.length > 0) {
            setMatches(data.matches);
            setCachedData('matches', data.matches);
          }
        }

        if (slipRes.ok) {
          const data = await slipRes.json();
          if (data.slips) {
            setBetSlips(data.slips);
            setCachedData(slipCacheKey, data.slips);
          }
        }
      } catch (err) {
        console.warn('Backend API connecting...', err);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 12000);
    return () => clearInterval(interval);
  }, [selectedMatchId, user?.id, token]);



  // Handle Real-Time WebSocket Deltas
  useEffect(() => {
    return subscribe((delta: LiveDelta) => {
      setMatches((prev) =>
        prev.map((m) => {
          if (m.id !== delta.match_id) return m;

          const updated = { ...m };
          if (delta.home_score !== undefined && delta.home_score !== null) updated.home_score = delta.home_score;
          if (delta.away_score !== undefined && delta.away_score !== null) updated.away_score = delta.away_score;
          if (delta.minute !== undefined && delta.minute !== null) updated.minute = delta.minute;
          if (delta.display_clock !== undefined) updated.display_clock = delta.display_clock;
          if (delta.period_number !== undefined && delta.period_number !== null) updated.period_number = delta.period_number;
          if (delta.clock_seconds !== undefined && delta.clock_seconds !== null) updated.clock_seconds = delta.clock_seconds;
          if (delta.period) updated.period = delta.period;
          if (delta.status) updated.status = delta.status;
          if (delta.stats) updated.stats = { ...m.stats, ...delta.stats };
          if (delta.event) {
            updated.events = [delta.event, ...(updated.events || [])];
          }
          if (delta.odds) updated.odds = delta.odds;
          return updated;
        })
      );
    });
  }, [subscribe]);

  // Filtered Matches (Spotlights matches from loaded ticket on first/Live page)
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      // 1. When in ticket mode on LIVE tab with loaded tickets, show matches from the user's ticket across any sport
      if (statusFilter === 'LIVE' && ticketFilterMode === 'MY_TICKETS' && betSlips.length > 0) {
        if (!ticketMatchIds.has(m.id)) return false;
      } else {
        if (m.sport !== selectedSport) return false;
      }

      if (statusFilter !== 'ALL' && m.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const home = m.home_team.name.toLowerCase();
        const away = m.away_team.name.toLowerCase();
        const league = m.league.name.toLowerCase();
        return home.includes(q) || away.includes(q) || league.includes(q);
      }
      return true;
    });
  }, [matches, selectedSport, statusFilter, ticketFilterMode, betSlips, ticketMatchIds, searchQuery]);

  const liveCount = useMemo(() => matches.filter((m) => m.status === 'LIVE').length, [matches]);
  const ticketLiveCount = useMemo(
    () => matches.filter((m) => m.status === 'LIVE' && ticketMatchIds.has(m.id)).length,
    [matches, ticketMatchIds]
  );

  // Handle Match selection from Search Command Palette
  const handleSelectFromSearch = (m: Match) => {
    setSelectedSport(m.sport);
    setSelectedMatchId(m.id);
    router.push(`/match/${m.id}`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pb-28 md:pb-8">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-surface-border w-full max-w-full overflow-hidden">
        <div className="max-w-[1720px] mx-auto px-3 sm:px-4 md:pl-20 xl:px-4 py-2 flex items-center justify-between gap-2 sm:gap-3 w-full min-w-0">
          {/* Logo & Live Gateway Status */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Logo size="sm" href="/" />

            {/* Gateway Status Badge */}
            <div
              className={`hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-mono border ${
                isConnected
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30'
                  : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                  isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <span
                className={`font-semibold ${
                  isConnected
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-amber-700 dark:text-amber-500'
                }`}
              >
                {isConnected ? 'Live' : 'Connecting'}
              </span>
            </div>
          </div>

          {/* Global Search Bar */}
          <div className="flex items-center flex-1 max-w-md min-w-0 relative">
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="w-full bg-surface-subtle hover:bg-surface-hover border border-surface-border hover:border-blue-300 dark:hover:border-blue-600 rounded-xl pl-8 sm:pl-9 pr-2 sm:pr-3 py-1.5 text-xs text-left text-muted-foreground flex items-center justify-between transition-all cursor-pointer min-w-0"
            >
              <div className="flex items-center gap-2 min-w-0 truncate">
                <Search className="w-4 h-4 text-muted-foreground absolute left-2.5 sm:left-3 pointer-events-none shrink-0" />
                <span className="truncate text-[11px] sm:text-xs">Search games, teams, leagues...</span>
              </div>
              <kbd className="hidden sm:inline font-mono text-[10px] bg-surface border border-surface-border text-muted-foreground px-1.5 py-0.5 rounded shadow-sm shrink-0 ml-1">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Action Buttons — Blog, Support, Admin and theme live in the side dock,
              so the header carries only the two actions specific to this page. */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => setIsImporterOpen(true)}
              className="flex items-center gap-1.5 bg-surface-subtle hover:bg-surface-hover border border-surface-border px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold text-foreground transition-all cursor-pointer"
              title="Track a bet slip"
            >
              <Ticket className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden lg:inline">Track slip</span>
              {betSlips.length > 0 && (
                <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 rounded-full min-w-[18px] text-center leading-4">
                  {betSlips.length}
                </span>
              )}
            </button>

            <Link
              href="/pricing"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-opacity cursor-pointer bg-brand-gradient text-white hover:opacity-90 shadow-md shadow-violet-500/20"
            >
              <Crown className="w-3.5 h-3.5 shrink-0" />
              <span>Pro</span>
            </Link>

            {/* Auth / Account Profile */}
            {user ? (
              <Link
                href="/account"
                className="flex items-center gap-1.5 bg-surface-subtle hover:bg-surface-hover border border-surface-border p-1 sm:px-2 sm:py-1.5 rounded-lg text-xs font-semibold text-foreground transition-all"
                title={`Signed in as ${user.name}`}
              >
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="hidden xl:inline max-w-[80px] truncate text-[11px]">{user.name}</span>
              </Link>
            ) : (
              <Link
                href="/auth/login"
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm shadow-blue-500/20 cursor-pointer"
              >
                <User className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Sign in</span>
              </Link>
            )}
          </div>
        </div>

        {/* Multi-Sport Navigation Strip */}
        <div className="w-full overflow-x-auto scrollbar-none border-t border-surface-border">
          <div className="max-w-[1720px] mx-auto px-3 sm:px-4 md:pl-20 xl:px-4 flex items-center gap-1 py-1.5 w-max">
            {SPORTS.map((sport) => {
              const isSelected = selectedSport === sport.id;
              const count = matches.filter((m) => m.sport === sport.id && m.status === 'LIVE').length;
              const Icon = sport.icon;

              return (
                <button
                  key={sport.id}
                  onClick={() => setSelectedSport(sport.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30'
                      : 'text-muted-foreground hover:text-foreground hover:bg-surface-subtle'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{sport.label}</span>
                  {count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                      isSelected
                        ? 'bg-red-500 text-white'
                        : 'bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Breaking Live Ticker Strip */}
      <TickerStrip matches={matches} onSelectMatch={(m) => setSelectedMatchId(m.id)} />

      {/* Main Three-Column Workspace Layout */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 md:pl-20 xl:px-4 py-4 grid grid-cols-12 gap-5">
        {/* LEFT COLUMN: Leagues, Calendar & Accumulator Tracker */}
        <div className="hidden xl:col-span-3 xl:flex flex-col gap-4">
          {/* Top Leagues Card */}
          <div className="bg-surface rounded-xl border border-surface-border p-4 shadow-subtle">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5 font-mono">
              <Layers className="w-3.5 h-3.5" /> Top competitions
            </h3>
            <ul className="space-y-1 text-xs text-foreground">
              {[
                { name: 'Premier League', code: 'ENG', count: 4, color: 'bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/30' },
                { name: 'UEFA Champions League', code: 'EUR', count: 2, color: 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30' },
                { name: 'La Liga', code: 'ESP', count: 3, color: 'bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30' },
                { name: 'NBA Basketball', code: 'USA', count: 1, color: 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30' },
                { name: 'ATP Tour Masters', code: 'GLB', count: 1, color: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' },
                { name: 'NFL Football', code: 'USA', count: 1, color: 'bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30' },
                { name: 'IPL Cricket', code: 'IND', count: 1, color: 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30' },
              ].map((l) => (
                <li
                  key={l.name}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-subtle cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border font-bold ${l.color}`}>
                      {l.code}
                    </span>
                    <span className="font-medium">{l.name}</span>
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground bg-surface-subtle border border-surface-border px-1.5 py-0.5 rounded">
                    {l.count}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tracked Bet Slips & Bets */}
          <div className="bg-surface rounded-xl border border-surface-border p-4 flex-1 shadow-subtle">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Ticket className="w-3.5 h-3.5" /> My slips
              </h3>
              <Link
                href="/search"
                className="text-[11px] text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
              >
                + Add slip
              </Link>
            </div>

            {betSlips.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                <p>No slips tracked yet.</p>
                <Link
                  href="/search"
                  className="mt-2 text-foreground font-bold hover:underline cursor-pointer block mx-auto"
                >
                  Track your first slip
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
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
        </div>

        {/* CENTER COLUMN: Match Feed & Sub-Filters */}
        <div className={`col-span-12 ${selectedMatch ? 'xl:col-span-5' : 'xl:col-span-9'} flex flex-col gap-4`}>
          {/* Sub-Filters: Live, All, Scheduled, Finished */}
          <div className="flex items-center justify-between bg-surface p-2 rounded-xl border border-surface-border shadow-subtle">
            <div className="flex items-center gap-1 flex-wrap">
              {[
                { id: 'LIVE', label: `Live (${liveCount})`, color: 'bg-red-500 text-white shadow-sm shadow-red-500/30' },
                { id: 'ALL', label: 'All' },
                { id: 'SCHEDULED', label: 'Upcoming' },
                { id: 'FINISHED', label: 'Finished' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === tab.id
                      ? (tab.id === 'LIVE' ? (tab as any).color : 'bg-blue-600 text-white shadow-sm shadow-blue-500/30')
                      : 'text-muted-foreground hover:text-foreground hover:bg-surface-subtle'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-muted-foreground hidden sm:block">
                {filteredMatches.length} matches
              </span>

              {matches.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllMatches}
                  title="Remove all games from tracker"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors border border-surface-border hover:border-red-500/30 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear all</span>
                </button>
              )}
            </div>
          </div>

          {/* Ticket vs Global Switcher on Live Page */}
          {statusFilter === 'LIVE' && (
            betSlips.length > 0 ? (
              <div className="flex items-center gap-2 bg-surface p-1.5 rounded-xl border border-surface-border shadow-subtle">
                <button
                  onClick={() => setTicketFilterMode('MY_TICKETS')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    ticketFilterMode === 'MY_TICKETS'
                      ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/30'
                      : 'text-muted-foreground hover:text-foreground hover:bg-surface-subtle'
                  }`}
                >
                  <Ticket className="w-3.5 h-3.5" />
                  <span>My Bets ({ticketLiveCount})</span>
                </button>

                <button
                  onClick={() => setTicketFilterMode('ALL_GLOBAL')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    ticketFilterMode === 'ALL_GLOBAL'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                      : 'text-muted-foreground hover:text-foreground hover:bg-surface-subtle'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>All Live ({liveCount})</span>
                </button>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-violet-50 to-blue-50 dark:from-violet-500/5 dark:to-blue-500/5 border border-violet-200 dark:border-violet-500/20 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-500/15 border border-violet-200 dark:border-violet-500/30 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
                    <Ticket className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Track a live slip</p>
                    <p className="text-[10px] text-muted-foreground">Paste a booking code from SportyBet, Bet9ja, 1xBet or BetKing</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setIsImporterOpen(true)}
                    className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-violet-600 to-blue-500 text-white hover:opacity-90 font-bold text-xs rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 shadow-md shadow-violet-500/20"
                  >
                    <Ticket className="w-3.5 h-3.5" />
                    <span>Import Booking Code</span>
                  </button>
                </div>
              </div>
            )
          )}

          {/* Matches List */}
          {filteredMatches.length === 0 ? (
            <div className="bg-surface rounded-xl border border-surface-border px-6 py-12 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-subtle border border-surface-border text-muted-foreground">
                <Radio className="h-5 w-5" />
              </span>

              {matches.length === 0 ? (
                <>
                  <p className="mt-4 text-sm font-bold text-foreground">Waiting for the feed</p>
                  <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">
                    No matches on the board right now. Import a ticket with your booking code to track your custom slips.
                  </p>
                  <button
                    onClick={() => setIsImporterOpen(true)}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-gradient text-white text-xs font-bold rounded-xl shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    <Ticket className="w-3.5 h-3.5" />
                    <span>Import Booking Slip</span>
                  </button>
                </>
              ) : (
                <>
                  <p className="mt-4 text-sm font-bold text-foreground">
                    Nothing {statusFilter === 'LIVE' ? 'live' : 'here'} right now
                  </p>
                  <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">
                    {statusFilter === 'LIVE'
                      ? 'No matches are in play in this view. Try Upcoming, or switch sport above.'
                      : 'No matches match this filter. Try another status or sport.'}
                  </p>
                  {statusFilter !== 'ALL' && (
                    <button
                      onClick={() => setStatusFilter('ALL')}
                      className="mt-4 cursor-pointer rounded-lg border border-surface-border bg-surface-subtle px-3.5 py-2 text-xs font-bold text-foreground transition-colors hover:bg-surface-hover"
                    >
                      Show all matches
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMatches.map((m) => (
                <LiveScoreCard
                  key={m.id}
                  match={m}
                  isSelected={selectedMatch?.id === m.id}
                  onSelect={() => setSelectedMatchId((prev) => (prev === m.id ? null : m.id))}
                  onRemove={handleRemoveMatch}
                />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: In-Depth Live Match Center & Match Statistics (Only shown when a live match is clicked) */}
        {selectedMatch && (
          <div className="col-span-12 xl:col-span-4 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="space-y-4">
              {/* Match Header Bar & Pop-out PiP Button */}
              <div className="bg-surface rounded-xl border border-surface-border p-4 shadow-subtle">
                <div className="flex items-center justify-between mb-3 text-xs">
                  <div className="flex items-center gap-1.5 font-mono text-muted-foreground truncate">
                    <CountryFlag country={selectedMatch.league.country} size="xs" />
                    <span className="font-bold text-foreground truncate">{selectedMatch.league.name}</span>
                    {selectedMatch.venue && <span className="hidden sm:inline">• {selectedMatch.venue}</span>}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Link
                      href={`/match/${selectedMatch.id}`}
                      className="flex items-center gap-1 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 text-xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span className="hidden sm:inline">Full stats</span>
                    </Link>

                    <button
                      onClick={() => openPiP('floating-pip-widget')}
                      className="flex items-center gap-1.5 bg-surface-subtle hover:bg-surface-hover border border-surface-border text-foreground text-xs font-bold px-2 py-1 rounded-lg transition-all cursor-pointer"
                      title="Pop out Floating PiP"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setSelectedMatchId(null)}
                      className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-subtle transition-colors cursor-pointer"
                      title="Close Match Statistics"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Main Match Header Score Banner */}
                <div className="flex items-center justify-between gap-4 py-2">
                  <div className="text-center flex-1 flex flex-col items-center min-w-0">
                    <TeamCrest
                      name={selectedMatch.home_team.name}
                      shortName={selectedMatch.home_team.short_name}
                      logoUrl={selectedMatch.home_team.logo}
                      sport={selectedMatch.sport}
                      size="lg"
                      className="mb-1"
                    />
                    <p className="text-xs font-bold text-foreground truncate w-full px-1">
                      <span className="inline sm:hidden">{selectedMatch.home_team.short_name || selectedMatch.home_team.name.slice(0, 3)}</span>
                      <span className="hidden sm:inline">{selectedMatch.home_team.name}</span>
                    </p>
                  </div>

                  <div className="text-center font-mono shrink-0 px-2">
                    <div className={`text-2xl font-black tracking-wider px-4 py-1.5 rounded-xl border inline-block ${
                      selectedMatch.status === 'LIVE'
                        ? 'text-indigo-700 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-500/15 border-indigo-200 dark:border-indigo-500/30'
                        : 'text-foreground bg-surface-subtle border-surface-border'
                    }`}>
                      {selectedMatch.status === 'SCHEDULED' ? 'vs' : `${selectedMatch.home_score} : ${selectedMatch.away_score}`}
                    </div>
                    <p className={`text-xs mt-1.5 uppercase font-mono ${
                      selectedMatch.status === 'LIVE' ? 'text-red-500 font-bold flex items-center justify-center gap-1' : 'text-muted-foreground font-semibold'
                    }`}>
                      {selectedMatch.status === 'LIVE' ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                          <span>{formatClock(selectedMatch)}</span>
                        </>
                      ) : selectedMatch.status === 'SCHEDULED' ? (
                        formatTimeAMPM(selectedMatch.start_time)
                      ) : (
                        selectedMatch.status
                      )}
                    </p>
                  </div>

                  <div className="text-center flex-1 flex flex-col items-center min-w-0">
                    <TeamCrest
                      name={selectedMatch.away_team.name}
                      shortName={selectedMatch.away_team.short_name}
                      logoUrl={selectedMatch.away_team.logo}
                      sport={selectedMatch.sport}
                      size="lg"
                      className="mb-1"
                    />
                    <p className="text-xs font-bold text-foreground truncate w-full px-1">
                      <span className="inline sm:hidden">{selectedMatch.away_team.short_name || selectedMatch.away_team.name.slice(0, 3)}</span>
                      <span className="hidden sm:inline">{selectedMatch.away_team.name}</span>
                    </p>
                  </div>
                </div>

                {/* Detail Tabs Bar */}
                <div className="grid grid-cols-4 gap-1 pt-3 border-t border-surface-border text-center text-xs">
                  {[
                    { id: 'stats', label: 'Stats' },
                    { id: 'timeline', label: 'Timeline' },
                    { id: 'lineups', label: 'Lineups' },
                    { id: 'odds', label: 'Odds' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setDetailTab(tab.id as any)}
                      className={`py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                        detailTab === tab.id
                          ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/30'
                          : 'text-muted-foreground hover:text-foreground hover:bg-surface-subtle'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Tab Content */}
              {detailTab === 'stats' && <HeadToHead match={selectedMatch} />}
              {detailTab === 'timeline' && (
                <EventTimeline
                  events={selectedMatch.events}
                  homeTeamName={selectedMatch.home_team.name}
                  awayTeamName={selectedMatch.away_team.name}
                  sport={selectedMatch.sport}
                />
              )}
              {detailTab === 'lineups' && <LineupsView match={selectedMatch} />}
              {detailTab === 'odds' && <OddsComparisonTable odds={selectedMatch.odds} />}
            </div>
          </div>
        )}
      </main>

      {/* Picture-in-Picture Floating Overlay */}
      <FloatingPiP match={selectedMatch} isOpen={isPiPActive} onClose={closePiP} />

      {/* Ticket Importer Modal */}
      <TicketImporterModal
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        onImportSuccess={(slip) => {
          setBetSlips((prev) => [slip, ...prev]);
        }}
      />

      {/* Customer Support Modal */}
      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />

      {/* Global Game Search Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        matches={matches}
        onSelectMatch={handleSelectFromSearch}
      />

      {/* Pro Tier Upgrade Modal */}
      <ProUpgradeModal
        isOpen={isProModalOpen}
        onClose={() => setIsProModalOpen(false)}
        onSuccess={() => setIsProUser(true)}
      />

      {/* Mobile Sticky Bottom Navigation Bar & Desktop Side Nav Dock */}
      <MobileNav
        activeNav="scores"
        onSelectScores={() => setStatusFilter('ALL')}
        onOpenProModal={() => setIsProModalOpen(true)}
        onOpenSupportModal={() => setIsSupportOpen(true)}
        onOpenSearchModal={() => setIsSearchModalOpen(true)}
        liveCount={liveCount}
      />
    </div>
  );
}
