'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Ticket,
  X,
  Compass,
  ArrowRight,
  Radio,
  Zap,
  CheckCircle2,
  Calendar,
  Filter,
  Check,
  Plus,
  Play,
  Square,
  Sparkles,
} from 'lucide-react';
import { Match, BetSlip } from '@/types';
import { AppPageHeader } from '@/components/ui/AppPageHeader';
import { MobileNav } from '@/components/ui/MobileNav';
import { LiveScoreCard } from '@/components/ui/LiveScoreCard';
import { getApiBaseUrl } from '@/lib/api';
import { getCachedData, setCachedData } from '@/lib/cache';
import { formatClock, formatScore } from '@/lib/sportFormat';
import { useNotification } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';
import {
  startNativeLiveActivity,
  stopNativeLiveActivity,
  getActiveNativeLiveMatch,
} from '@/lib/nativeLiveActivity';

const SPORTS_FILTER: { id: string; label: string }[] = [
  { id: 'all', label: 'All Sports' },
  { id: 'soccer', label: 'Soccer' },
  { id: 'basketball', label: 'Basketball' },
  { id: 'tennis', label: 'Tennis' },
  { id: 'nfl', label: 'NFL' },
  { id: 'baseball', label: 'Baseball' },
  { id: 'hockey', label: 'Hockey' },
  { id: 'cricket', label: 'Cricket' },
];

const STATUS_TABS: { id: string; label: string }[] = [
  { id: 'ALL', label: 'All Fixtures' },
  { id: 'LIVE', label: '🔴 Live Now' },
  { id: 'SCHEDULED', label: '📅 Scheduled' },
  { id: 'FINISHED', label: '🏆 Finished' },
];

export default function SearchPage() {
  const { user, token } = useAuth();
  const { isPushSubscribed, subscribePush } = useNotification();
  const [query, setQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState('all');
  const [statusTab, setStatusTab] = useState('ALL');
  const [matches, setMatches] = useState<Match[]>([]);
  const [betSlips, setBetSlips] = useState<BetSlip[]>([]);
  const [customTrackedIds, setCustomTrackedIds] = useState<string[]>([]);
  const [activeNativeId, setActiveNativeId] = useState<string | null>(null);

  const slipCacheKey = `slips_${user?.id || 'guest'}`;

  // Initial load
  useEffect(() => {
    const cachedM = getCachedData<Match[]>('matches');
    const cachedSlips = getCachedData<BetSlip[]>(slipCacheKey);
    if (cachedM) setMatches(cachedM);
    if (cachedSlips) setBetSlips(cachedSlips);

    const savedFollowed = localStorage.getItem('slipradar_followed_matches');
    if (savedFollowed) {
      try {
        setCustomTrackedIds(JSON.parse(savedFollowed));
      } catch {
        // ignore
      }
    }

    const activeNative = getActiveNativeLiveMatch();
    if (activeNative) setActiveNativeId(activeNative.id);

    async function load() {
      try {
        const apiBase = getApiBaseUrl();
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const [mRes, sRes] = await Promise.all([
          fetch(`${apiBase}/matches`),
          fetch(`${apiBase}/betslip`, { headers }),
        ]);

        if (mRes.ok) {
          const data = await mRes.json();
          if (data.matches) {
            setMatches(data.matches);
            setCachedData('matches', data.matches);
          }
        }
        if (sRes.ok) {
          const sData = await sRes.json();
          if (sData.slips) {
            setBetSlips(sData.slips);
            setCachedData(slipCacheKey, sData.slips);
          }
        }
      } catch (err) {
        console.warn('API fetch error', err);
      }
    }

    load();
  }, [user?.id, token]);

  // Set of match IDs from user tickets
  const ticketMatchIds = useMemo(() => {
    const ids = new Set<string>();
    betSlips.forEach((slip) => {
      slip.legs?.forEach((leg) => {
        if (leg.match_id) ids.add(leg.match_id);
        if (leg.match?.id) ids.add(leg.match_id || leg.match.id);
      });
    });
    return ids;
  }, [betSlips]);

  // Combined set of all matches added by the user
  const allUserTrackedIds = useMemo(() => {
    const set = new Set<string>(ticketMatchIds);
    customTrackedIds.forEach((id) => set.add(id));
    return set;
  }, [ticketMatchIds, customTrackedIds]);

  // Toggle Live Activity tracking for a match
  const handleToggleTrackMatch = (matchId: string) => {
    setCustomTrackedIds((prev) => {
      let next: string[];
      if (prev.includes(matchId)) {
        next = prev.filter((id) => id !== matchId);
      } else {
        next = [...prev, matchId];
      }
      localStorage.setItem('slipradar_followed_matches', JSON.stringify(next));

      if (isPushSubscribed) {
        const matchChannels = Array.from(new Set([...Array.from(ticketMatchIds), ...next])).map(
          (id) => `match_${id}`
        );
        subscribePush(['all', 'betslip_alerts', ...matchChannels]);
      }

      return next;
    });
  };

  // Filter Matches based on Query, Sport & Status
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      // 1. Sport filter
      if (selectedSport !== 'all' && m.sport !== selectedSport) {
        return false;
      }

      // 2. Status filter
      if (statusTab === 'LIVE') {
        if (m.status !== 'LIVE' && m.status !== 'HALF_TIME') return false;
      } else if (statusTab === 'SCHEDULED') {
        if (m.status !== 'SCHEDULED') return false;
      } else if (statusTab === 'FINISHED') {
        if (m.status !== 'FINISHED') return false;
      }

      // 3. Search query filter
      if (query.trim()) {
        const q = query.toLowerCase();
        const home = m.home_team?.name?.toLowerCase() || '';
        const away = m.away_team?.name?.toLowerCase() || '';
        const league = m.league?.name?.toLowerCase() || '';
        return home.includes(q) || away.includes(q) || league.includes(q);
      }
      return true;
    });
  }, [matches, selectedSport, statusTab, query]);

  const liveCount = matches.filter((m) => m.status === 'LIVE' || m.status === 'HALF_TIME').length;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans pb-24 md:pb-12">
      {/* Header */}
      <AppPageHeader
        icon={Search}
        title="Search & Explore Games"
        subtitle="Search all live fixtures, leagues, and add matches to your Lock Screen Live Activities"
        accentClassName="bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
      />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 md:pl-24 xl:px-6 py-6 space-y-6">
        {/* Quick Link to User's Tracked Live Activities */}
        <div className="bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900/60 border border-indigo-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>Lock Screen Live Activities</span>
                <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-bold">
                  {allUserTrackedIds.size} Tracked
                </span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage your pinned matches, Dynamic Island scoreboard, and goal push alerts.
              </p>
            </div>
          </div>

          <Link
            href="/activities"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20 transition-all shrink-0 cursor-pointer"
          >
            <span>Open Live Activities</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-surface border border-surface-border rounded-2xl p-4 shadow-sm space-y-3">
          {/* Text Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by team (e.g. Arsenal, Real Madrid, Lakers), tournament, or country..."
              className="w-full pl-10 pr-10 py-3 bg-surface-subtle border border-surface-border rounded-xl text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Tabs: All, Live Now, Scheduled, Finished */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-surface-border/60 pb-2.5">
            {STATUS_TABS.map((tab) => {
              const isSelected = statusTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusTab(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
                      : 'bg-surface-subtle hover:bg-surface-hover border border-surface-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Sport Categories Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {SPORTS_FILTER.map((sport) => {
              const isSelected = selectedSport === sport.id;
              return (
                <button
                  key={sport.id}
                  type="button"
                  onClick={() => setSelectedSport(sport.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/25'
                      : 'bg-surface-subtle hover:bg-surface-hover border border-surface-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {sport.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Results List */}
        {filteredMatches.length === 0 ? (
          <div className="bg-surface rounded-3xl border border-surface-border p-12 text-center space-y-3">
            <Compass className="w-12 h-12 text-muted-foreground mx-auto opacity-30" />
            <p className="text-base font-bold text-foreground">
              {query ? `No games found for "${query}"` : 'No Games Found for Selected Filter'}
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Try searching with another team or switch to All Fixtures.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1 text-xs text-muted-foreground font-mono">
              <span>
                Found {filteredMatches.length} {filteredMatches.length === 1 ? 'game' : 'games'}
              </span>
              <span className="text-[10px] uppercase font-bold text-muted-foreground">
                Click '+ Track' to add to Live Activities
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredMatches.map((m) => {
                const isTracked = allUserTrackedIds.has(m.id);
                const isFromTicket = ticketMatchIds.has(m.id);

                return (
                  <div
                    key={m.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isTracked
                        ? 'bg-indigo-950/20 border-indigo-500/50 shadow-md'
                        : 'bg-surface border-surface-border hover:border-surface-border/80'
                    }`}
                  >
                    {/* Top Row: League & Status */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2.5">
                      <span className="font-semibold text-foreground truncate max-w-[200px]">
                        {m.league?.name || 'League'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isFromTicket && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-500 font-mono text-[10px] font-bold">
                            Ticket Leg
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                            m.status === 'LIVE'
                              ? 'bg-emerald-500/15 text-emerald-500 animate-pulse'
                              : 'bg-surface-subtle text-muted-foreground'
                          }`}
                        >
                          {m.status === 'LIVE' ? formatClock(m) : m.status}
                        </span>
                      </div>
                    </div>

                    {/* Match Scoreline */}
                    <Link
                      href={`/match/${m.id}`}
                      className="flex items-center justify-between gap-3 py-1 group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        {m.home_team.logo ? (
                          <img
                            src={m.home_team.logo}
                            alt=""
                            className="w-6 h-6 object-contain rounded-full bg-surface-subtle p-0.5 shrink-0"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                            {m.home_team.name.slice(0, 1)}
                          </div>
                        )}
                        <span className="font-bold text-xs text-foreground group-hover:text-indigo-400 truncate">
                          {m.home_team.name}
                        </span>
                      </div>

                      <div className="font-mono text-base font-black text-foreground px-2.5 py-0.5 bg-surface-subtle rounded-lg border border-surface-border tabular-nums shrink-0">
                        {m.home_score} - {m.away_score}
                      </div>

                      <div className="flex items-center justify-end gap-2.5 flex-1 min-w-0">
                        <span className="font-bold text-xs text-foreground group-hover:text-indigo-400 truncate text-right">
                          {m.away_team.name}
                        </span>
                        {m.away_team.logo ? (
                          <img
                            src={m.away_team.logo}
                            alt=""
                            className="w-6 h-6 object-contain rounded-full bg-surface-subtle p-0.5 shrink-0"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                            {m.away_team.name.slice(0, 1)}
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Actions: Track in Live Activities + Match Center */}
                    <div className="mt-3 pt-2.5 border-t border-surface-border flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleTrackMatch(m.id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isTracked
                            ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-500'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/20'
                        }`}
                      >
                        {isTracked ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>In Live Activities ✓</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Track in Live Activity</span>
                          </>
                        )}
                      </button>

                      <Link
                        href={`/match/${m.id}`}
                        className="py-1.5 px-3 rounded-xl bg-surface-subtle hover:bg-surface-hover text-muted-foreground hover:text-foreground text-xs font-semibold border border-surface-border transition-colors cursor-pointer"
                      >
                        Match Center
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <MobileNav activeNav="search" liveCount={liveCount} />
    </div>
  );
}
