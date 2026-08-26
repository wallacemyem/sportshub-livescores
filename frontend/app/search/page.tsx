'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Ticket,
  X,
  Compass,
  ArrowRight,
  TrendingUp,
  Radio,
} from 'lucide-react';
import { Match } from '@/types';
import { AppPageHeader } from '@/components/ui/AppPageHeader';
import { MobileNav } from '@/components/ui/MobileNav';
import { LiveScoreCard } from '@/components/ui/LiveScoreCard';
import { getApiBaseUrl } from '@/lib/api';
import { getCachedData, setCachedData } from '@/lib/cache';

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
  // Search State
  const [query, setQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState('all');
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load matches
  const fetchMatches = async () => {
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/matches`);
      if (res.ok) {
        const data = await res.json();
        if (data.matches) {
          setMatches(data.matches);
          setCachedData('matches', data.matches);
        }
      }
    } catch (err) {
      console.warn('API error fetching search matches', err);
    }
  };

  useEffect(() => {
    const cachedM = getCachedData<Match[]>('matches');
    if (cachedM) setMatches(cachedM);
    fetchMatches();
  }, []);

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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans pb-24 md:pb-12">
      {/* Header */}
      <AppPageHeader
        icon={Search}
        title="Search Matches & Leagues"
        subtitle="Search live fixtures, teams, tournaments and betting consensus across all sports"
        accentClassName="bg-violet-600/10 text-violet-600 dark:text-violet-400 border-violet-500/20"
      />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 md:pl-24 xl:px-6 py-6 space-y-6">
        
        {/* Quick Tickets Importer Banner */}
        <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Have a sportsbook booking code?</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Import and track your accumulator tickets with live cashout monitoring on the dedicated Tickets page.
              </p>
            </div>
          </div>

          <Link
            href="/tickets"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all shrink-0 cursor-pointer"
          >
            <span>Go to My Tickets</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-surface border border-surface-border rounded-2xl p-4 shadow-sm space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by team (e.g. Arsenal, Real Madrid, Lakers), tournament or country..."
              className="w-full pl-10 pr-10 py-3 bg-surface-subtle border border-surface-border rounded-xl text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
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

        {/* Search Results */}
        {filteredMatches.length === 0 ? (
          <div className="bg-surface rounded-3xl border border-surface-border p-12 text-center space-y-3">
            <Compass className="w-12 h-12 text-muted-foreground mx-auto opacity-30" />
            <p className="text-base font-bold text-foreground">
              {query ? `No matches found for "${query}"` : 'No Matches On Board'}
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Try searching with another team name or import games by booking code on the Tickets page.
            </p>
            <Link
              href="/tickets"
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>Import Booking Code</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1 text-xs text-muted-foreground font-mono">
              <span>Showing {filteredMatches.length} {filteredMatches.length === 1 ? 'match' : 'matches'}</span>
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Click match for live timeline & odds</span>
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
      </main>

      <MobileNav />
    </div>
  );
}
