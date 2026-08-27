'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Match, SportType, BetSlip, LiveDelta } from '@/types';
import { useLiveMatchSocket } from '@/hooks/useLiveMatchSocket';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { usePiPScoreboard } from '@/hooks/usePiPScoreboard';
import { useMediaSession } from '@/hooks/useMediaSession';
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
  Loader2,
} from 'lucide-react';
import { formatClock } from '@/lib/sportFormat';
import { useLiveClock, stampClocks } from '@/hooks/useLiveClock';
import {
  detectScoreChanges,
  orderLiveFeed,
  pruneFlashes,
  SCORE_HIGHLIGHT_MS,
  type ScoreFlashMap,
} from '@/lib/liveOrder';
import {
  registerServiceWorker,
  syncLiveActivities,
  clearAllLiveActivities,
} from '@/lib/liveActivity';
import { useNotification } from '@/context/NotificationContext';
import { formatTimeAMPM } from '@/lib/date';

const SPORTS: { id: SportType | 'all'; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'all', label: 'All Slip Games', icon: Layers },
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
  const { alertsEnabled } = useNotification();
  const [selectedSport, setSelectedSport] = useState<SportType | 'all'>('all');
  // First page default is strictly LIVE
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LIVE' | 'SCHEDULED' | 'FINISHED'>('LIVE');
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

  // Quick Inline Importer State for Empty Slips Board
  const [quickCode, setQuickCode] = useState('');
  const [quickBookmaker, setQuickBookmaker] = useState('auto');
  const [isQuickImporting, setIsQuickImporting] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);

  // Matches that scored recently: drives both the feed ordering and the
  // highlight on the card.
  const [scoreFlashes, setScoreFlashes] = useState<ScoreFlashMap>({});
  // Scores seen since the last activity sync, so a notification alerts once.
  const scoredSinceLastSync = useRef<Map<string, 'HOME' | 'AWAY'>>(new Map());

  const slipCacheKey = `slips_${user?.id || 'guest'}`;

  // Remove an individual match from the tracker
  const handleRemoveMatch = async (matchId: string) => {
    setMatches((prev) => {
      const next = prev.filter((m) => m.id !== matchId);
      setCachedData('matches', next);
      return next;
    });
    if (selectedMatchId === matchId) {
      setSelectedMatchId(null);
    }
  };

  // Clear all tracked bet slips and matches
  const handleClearAllSlips = async () => {
    if (!window.confirm('Are you sure you want to clear all tracked bet slips?')) {
      return;
    }
    setBetSlips([]);
    setMatches([]);
    setSelectedMatchId(null);
    setCachedData(slipCacheKey, []);
    setCachedData('matches', []);
    try {
      const apiBase = getApiBaseUrl();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      await fetch(`${apiBase}/betslip`, { method: 'DELETE', headers });
    } catch (err) {
      console.warn('Failed to clear slips', err);
    }
  };

  // Delete a specific bet slip
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

  // Quick Booking Code Importer Handler
  const handleQuickImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = quickCode.trim();
    if (!cleanCode) return;

    setIsQuickImporting(true);
    setQuickError(null);

    try {
      const apiBase = getApiBaseUrl();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${apiBase}/betslip/import`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          bookmaker: quickBookmaker,
          booking_code: cleanCode,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Could not find booking code "${cleanCode}"`);
      }

      const slip: BetSlip = await res.json();
      setBetSlips((prev) => {
        const next = [slip, ...prev.filter((s) => s.id !== slip.id)];
        setCachedData(slipCacheKey, next);
        return next;
      });

      if (slip.legs) {
        const newMatches = slip.legs.map((l) => l.match).filter(Boolean);
        setMatches((prev) => {
          const map = new Map(prev.map((m) => [m.id, m]));
          newMatches.forEach((m) => map.set(m.id, m));
          const updated = Array.from(map.values());
          setCachedData('matches', updated);
          return updated;
        });
      }

      setQuickCode('');
    } catch (err: any) {
      setQuickError(err.message || 'Failed to import booking code');
    } finally {
      setIsQuickImporting(false);
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

  // Initial Fast Cache Resolution & Silent Background Revalidation
  useEffect(() => {
    // 1. Instant Cache Load (0ms - saves tokens and preserves API rate limits)
    const cachedMatches = getCachedData<Match[]>('matches');
    const cachedSlips = getCachedData<BetSlip[]>(slipCacheKey);

    if (cachedMatches && cachedMatches.length > 0) {
      setMatches(stampClocks(cachedMatches));
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
            // Stamp arrival time so the clock can be ticked forward between
            // polls, and diff against the previous snapshot to catch scores.
            const fresh = stampClocks(data.matches as Match[]);
            setMatches((prev) => {
              const changes = detectScoreChanges(prev, fresh);
              if (changes.length > 0) {
                const now = Date.now();
                setScoreFlashes((current) => {
                  const next = pruneFlashes(current, now);
                  for (const change of changes) {
                    next[change.matchId] = { at: now, side: change.side };
                  }
                  return next;
                });
                scoredSinceLastSync.current = new Map(
                  changes.map((c) => [c.matchId, c.side])
                );
              }
              return fresh;
            });
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

  // Tick the clock forward between polls so it reads as live rather than
  // jumping in 12-second steps.
  const tickingMatches = useLiveClock(matches);

  // Register the service worker once. Without a registration there is no push
  // handler and no notification that can outlive the tab — it was never being
  // registered at all.
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Drop score highlights once they age out, so the feed settles back.
  useEffect(() => {
    if (Object.keys(scoreFlashes).length === 0) return;
    const id = setInterval(() => {
      setScoreFlashes((current) => {
        const pruned = pruneFlashes(current);
        return Object.keys(pruned).length === Object.keys(current).length ? current : pruned;
      });
    }, 5000);
    return () => clearInterval(id);
  }, [scoreFlashes]);

  // Extract all matches strictly belonging to active bet slips
  const slipMatches = useMemo(() => {
    const map = new Map<string, Match>();

    betSlips.forEach((slip) => {
      slip.legs?.forEach((leg) => {
        const matchId = leg.match_id || leg.match?.id;
        if (!matchId) return;

        const liveMatch = tickingMatches.find((m) => m.id === matchId);
        if (liveMatch) {
          map.set(matchId, liveMatch);
        } else if (leg.match) {
          map.set(matchId, leg.match);
        }
      });
    });

    return Array.from(map.values());
  }, [betSlips, tickingMatches]);

  // Media Session Metadata API & Selected Match (Only when explicitly clicked by user)
  const selectedMatch = useMemo(() => {
    if (!selectedMatchId) return null;
    return slipMatches.find((m) => m.id === selectedMatchId) || matches.find((m) => m.id === selectedMatchId) || null;
  }, [slipMatches, matches, selectedMatchId]);
  useMediaSession(selectedMatch);

  // Keep an ongoing notification per live match the user is tracking, updating
  // it in place as the score and clock move.
  const trackedLive = useMemo(
    () => slipMatches.filter((m) => m.status === 'LIVE'),
    [slipMatches]
  );

  useEffect(() => {
    if (!alertsEnabled) {
      clearAllLiveActivities();
      return;
    }
    const scored = scoredSinceLastSync.current;
    scoredSinceLastSync.current = new Map();
    syncLiveActivities(trackedLive, scored);
  }, [trackedLive, alertsEnabled]);

  // Filtered Matches (Strictly from the user's bet slips)
  const filteredMatches = useMemo(() => {
    const visible = slipMatches.filter((m) => {
      // 1. Sport filter
      if (selectedSport !== 'all' && m.sport !== selectedSport) {
        return false;
      }

      // 2. Status filter
      if (statusFilter !== 'ALL' && m.status !== statusFilter) {
        return false;
      }

      // 3. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const home = m.home_team?.name?.toLowerCase() || '';
        const away = m.away_team?.name?.toLowerCase() || '';
        const league = m.league?.name?.toLowerCase() || '';
        return home.includes(q) || away.includes(q) || league.includes(q);
      }
      return true;
    });

    // A match that just scored jumps to the top; otherwise live first, then
    // by how far through it is.
    return orderLiveFeed(visible, scoreFlashes);
  }, [
    slipMatches,
    selectedSport,
    statusFilter,
    searchQuery,
    scoreFlashes,
  ]);

  const liveCount = useMemo(() => slipMatches.filter((m) => m.status === 'LIVE').length, [slipMatches]);

  // Unique competitions present across the user's active bet slips
  const slipCompetitions = useMemo(() => {
    const map = new Map<string, { name: string; country: string; count: number; sport: string }>();
    slipMatches.forEach((m) => {
      const name = m.league?.name || 'Competition';
      const existing = map.get(name);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(name, {
          name,
          country: m.league?.country || '',
          count: 1,
          sport: m.sport,
        });
      }
    });
    return Array.from(map.values());
  }, [slipMatches]);

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
              const liveSportCount = slipMatches.filter(
                (m) => (sport.id === 'all' || m.sport === sport.id) && m.status === 'LIVE'
              ).length;
              const totalSportCount = slipMatches.filter(
                (m) => sport.id === 'all' || m.sport === sport.id
              ).length;
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
                  {liveSportCount > 0 ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold bg-red-500 text-white animate-pulse">
                      {liveSportCount}
                    </span>
                  ) : totalSportCount > 0 ? (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                        isSelected
                          ? 'bg-blue-200 dark:bg-blue-500/30 text-blue-800 dark:text-blue-200'
                          : 'bg-surface-subtle text-muted-foreground border border-surface-border'
                      }`}
                    >
                      {totalSportCount}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Three-Column Workspace Layout */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 md:pl-20 xl:px-4 py-4 grid grid-cols-12 gap-5">
        {/* LEFT COLUMN: Competitions & Bet Slips */}
        <div className="hidden xl:col-span-3 xl:flex flex-col gap-4">
          {/* Competitions in Slips Card */}
          <div className="bg-surface rounded-xl border border-surface-border p-4 shadow-subtle">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5 font-mono">
              <Layers className="w-3.5 h-3.5" /> Competitions in Slips
            </h3>
            {slipCompetitions.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 leading-relaxed">
                Competitions will appear here automatically when you track a bet slip.
              </p>
            ) : (
              <ul className="space-y-1 text-xs text-foreground">
                {slipCompetitions.map((l) => (
                  <li
                    key={l.name}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-subtle cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {l.country && <CountryFlag country={l.country} size="xs" />}
                      <span className="font-medium truncate">{l.name}</span>
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground bg-surface-subtle border border-surface-border px-1.5 py-0.5 rounded shrink-0">
                      {l.count} {l.count === 1 ? 'leg' : 'legs'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Tracked Bet Slips */}
          <div className="bg-surface rounded-xl border border-surface-border p-4 flex-1 shadow-subtle">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Ticket className="w-3.5 h-3.5" /> My slips ({betSlips.length})
              </h3>
              <button
                onClick={() => setIsImporterOpen(true)}
                className="text-[11px] text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
              >
                + Add slip
              </button>
            </div>

            {betSlips.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                <p>No slips tracked yet.</p>
                <button
                  onClick={() => setIsImporterOpen(true)}
                  className="mt-2 text-foreground font-bold hover:underline cursor-pointer block mx-auto"
                >
                  Track your first slip
                </button>
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
                { id: 'ALL', label: `All (${slipMatches.length})` },
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

              {betSlips.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllSlips}
                  title="Clear all tracked bet slips"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors border border-surface-border hover:border-red-500/30 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear slips</span>
                </button>
              )}
            </div>
          </div>

          {/* Matches List or Onboarding Card */}
          {betSlips.length === 0 ? (
            <div className="bg-surface rounded-2xl border border-surface-border p-6 sm:p-10 text-center shadow-subtle flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 shadow-sm">
                <Ticket className="w-7 h-7" />
              </div>

              <h3 className="text-base sm:text-lg font-bold text-foreground">
                No Bet Slips Tracked
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mt-1.5 leading-relaxed">
                Live Scores exclusively follows fixtures from your active bet slips. Enter a booking code from SportyBet, Bet9ja, 1xBet, BetKing, MSport or MozzartBet to start following your games live.
              </p>

              {/* Quick Booking Code Form */}
              <form onSubmit={handleQuickImport} className="mt-5 w-full max-w-md flex flex-col sm:flex-row gap-2">
                <select
                  value={quickBookmaker}
                  onChange={(e) => setQuickBookmaker(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-surface-subtle border border-surface-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shrink-0"
                >
                  <option value="auto">Auto-Detect</option>
                  <option value="sportybet">SportyBet</option>
                  <option value="bet9ja">Bet9ja</option>
                  <option value="1xbet">1xBet</option>
                  <option value="betking">BetKing</option>
                  <option value="msport">MSport</option>
                  <option value="mozzartbet">MozzartBet</option>
                </select>

                <input
                  type="text"
                  placeholder="Booking Code (e.g. SB-88492-X)"
                  value={quickCode}
                  onChange={(e) => setQuickCode(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-surface-subtle border border-surface-border text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                />

                <button
                  type="submit"
                  disabled={isQuickImporting || !quickCode.trim()}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/25 shrink-0 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isQuickImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ticket className="w-3.5 h-3.5" />}
                  <span>Track Slip</span>
                </button>
              </form>

              {quickError && (
                <p className="mt-2 text-xs text-red-500 font-medium">
                  {quickError}
                </p>
              )}

              {/* Slip Importer Option */}
              <div className="mt-4 pt-4 border-t border-surface-border w-full max-w-md flex items-center justify-between text-xs">
                <span className="text-muted-foreground text-[11px]">Supports SportyBet, Bet9ja, 1xBet, BetKing, MSport, MozzartBet</span>
                <button
                  type="button"
                  onClick={() => setIsImporterOpen(true)}
                  className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1 text-xs shrink-0 ml-2"
                >
                  <Ticket className="w-3.5 h-3.5" />
                  <span>Full Importer</span>
                </button>
              </div>
            </div>
          ) : filteredMatches.length === 0 ? (
            <div className="bg-surface rounded-xl border border-surface-border px-6 py-12 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-subtle border border-surface-border text-muted-foreground">
                <Radio className="h-5 w-5" />
              </span>
              <p className="mt-4 text-sm font-bold text-foreground">
                No {statusFilter === 'LIVE' ? 'live' : ''} matches in this view
              </p>
              <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">
                Your bet slip has {slipMatches.length} total fixtures. None match the currently selected filter.
              </p>
              <button
                onClick={() => { setStatusFilter('ALL'); setSelectedSport('all'); }}
                className="mt-4 cursor-pointer rounded-lg border border-surface-border bg-surface-subtle px-3.5 py-2 text-xs font-bold text-foreground transition-colors hover:bg-surface-hover"
              >
                Show all slip matches ({slipMatches.length})
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMatches.map((m) => (
                <LiveScoreCard
                  key={m.id}
                  match={m}
                  isSelected={selectedMatch?.id === m.id}
                  justScored={scoreFlashes[m.id]?.side}
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
