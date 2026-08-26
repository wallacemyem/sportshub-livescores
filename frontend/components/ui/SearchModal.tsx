'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Match, SportType } from '@/types';
import {
  Search,
  X,
  Radio,
  Clock,
  ChevronRight,
  Activity,
  CircleDot,
  Target,
  Shield,
  Layers,
  Circle,
  Calendar,
  Sparkles,
  Flag,
} from 'lucide-react';
import { formatTimeAMPM } from '@/lib/date';
import { TeamCrest } from './TeamCrest';
import { CountryFlag } from './CountryFlag';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatClock } from '@/lib/sportFormat';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  matches: Match[];
  onSelectMatch: (match: Match) => void;
}

const SPORT_ICONS: Record<SportType, React.ComponentType<{ className?: string }>> = {
  soccer: Activity,
  basketball: CircleDot,
  tennis: Target,
  nfl: Shield,
  cricket: Layers,
  baseball: Circle,
  golf: Flag,
};

export function SearchModal({ isOpen, onClose, matches, onSelectMatch }: SearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [sportFilter, setSportFilter] = useState<'ALL' | SportType>('ALL');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelect = (m: Match) => {
    onSelectMatch(m);
    onClose();
    router.push(`/match/${m.id}`);
  };

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Global hotkey handler (Cmd+K / Ctrl+K & Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filtered matches calculation
  const filteredMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return matches.filter((m) => {
      if (sportFilter !== 'ALL' && m.sport !== sportFilter) return false;

      if (!q) return true;

      const homeName = m.home_team.name.toLowerCase();
      const homeShort = (m.home_team.short_name || '').toLowerCase();
      const awayName = m.away_team.name.toLowerCase();
      const awayShort = (m.away_team.short_name || '').toLowerCase();
      const leagueName = m.league.name.toLowerCase();
      const venue = (m.venue || '').toLowerCase();
      const referee = (m.referee || '').toLowerCase();
      const sport = m.sport.toLowerCase();

      // Check events / players
      const playerMatch = m.events?.some((ev) =>
        (ev.player_name || '').toLowerCase().includes(q) ||
        (ev.detail || '').toLowerCase().includes(q)
      );

      return (
        homeName.includes(q) ||
        homeShort.includes(q) ||
        awayName.includes(q) ||
        awayShort.includes(q) ||
        leagueName.includes(q) ||
        venue.includes(q) ||
        referee.includes(q) ||
        sport.includes(q) ||
        Boolean(playerMatch)
      );
    });
  }, [matches, query, sportFilter]);

  // Keyboard navigation (Arrow Up, Arrow Down, Enter)
  useEffect(() => {
    const handleNavigation = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredMatches.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredMatches.length) % (filteredMatches.length || 1));
      } else if (e.key === 'Enter' && filteredMatches[selectedIndex]) {
        e.preventDefault();
        handleSelect(filteredMatches[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleNavigation);
    return () => window.removeEventListener('keydown', handleNavigation);
  }, [isOpen, filteredMatches, selectedIndex, onSelectMatch, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-3 sm:p-6 pt-16 sm:pt-24 animate-in fade-in duration-150 cursor-pointer"
    >
      <div
        className="bg-surface border border-surface-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-elevated flex flex-col max-h-[80vh] cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-3.5 sm:p-4 border-b border-surface-border flex items-center gap-3 bg-surface-subtle">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search games, teams, leagues, stadiums, or players... (e.g. Arsenal, Lakers, Madrid, Saka)"
            className="flex-1 bg-transparent text-sm sm:text-base font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
          />

          {/* Clear query button (if query present) */}
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Clear search query"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* ESC key badge */}
          <span className="hidden sm:inline font-mono text-[10px] text-muted-foreground bg-surface border border-surface-border px-1.5 py-0.5 rounded">
            ESC
          </span>

          {/* Always Visible Close Button */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer ml-1"
            title="Close modal (Esc)"
            aria-label="Close search modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Sport Filter Chips */}
        <div className="px-4 py-2 border-b border-surface-border flex items-center gap-1.5 overflow-x-auto scrollbar-none bg-surface text-xs">
          <button
            onClick={() => setSportFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg font-bold font-mono transition-colors cursor-pointer ${
              sportFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'bg-surface-subtle text-muted-foreground hover:text-foreground'
            }`}
          >
            All Sports ({matches.length})
          </button>
          {(['soccer', 'basketball', 'tennis', 'nfl', 'cricket', 'baseball', 'golf'] as SportType[]).map((s) => {
            const count = matches.filter((m) => m.sport === s).length;
            const Icon = SPORT_ICONS[s];
            const isSelected = sportFilter === s;
            return (
              <button
                key={s}
                onClick={() => setSportFilter(s)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold uppercase text-[11px] transition-colors cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'bg-surface-subtle text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{s}</span>
                <span className="text-[10px] opacity-75 font-mono">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Search Results List */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1.5">
          {filteredMatches.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground font-mono text-xs">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="font-bold text-foreground">No matches found for &quot;{query}&quot;</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Try searching by team name (Arsenal, Lakers), tournament (Premier League, NBA), or sport.
              </p>
            </div>
          ) : (
            filteredMatches.map((m, idx) => {
              const isSelected = selectedIndex === idx;
              const isLive = m.status === 'LIVE';
              const SportIcon = SPORT_ICONS[m.sport] || Activity;

              return (
                <div
                  key={m.id}
                  onClick={() => handleSelect(m)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-blue-50/50 dark:bg-blue-500/10 border-blue-400 dark:border-blue-600 shadow-sm'
                      : 'bg-surface border-surface-border hover:bg-surface-subtle'
                  }`}
                >
                  {/* Left: Team Crests & Match Title */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="flex items-center -space-x-1.5 shrink-0">
                      <TeamCrest
                        name={m.home_team.name}
                        shortName={m.home_team.short_name}
                        logoUrl={m.home_team.logo}
                        size="sm"
                      />
                      <TeamCrest
                        name={m.away_team.name}
                        shortName={m.away_team.short_name}
                        logoUrl={m.away_team.logo}
                        size="sm"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono mb-0.5">
                        <CountryFlag country={m.league.country} size="xs" />
                        <span className="uppercase font-bold text-blue-600 dark:text-blue-400">{m.sport}</span>
                        <span>•</span>
                        <span className="truncate">{m.league.name}</span>
                        {m.venue && (
                          <>
                            <span>•</span>
                            <span className="truncate hidden sm:inline">{m.venue}</span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-foreground truncate">
                        <span className="truncate inline sm:hidden">{m.home_team.short_name || m.home_team.name.slice(0, 3)}</span>
                        <span className="truncate hidden sm:inline">{m.home_team.name}</span>
                        <span className="text-muted-foreground font-mono font-normal">vs</span>
                        <span className="truncate inline sm:hidden">{m.away_team.short_name || m.away_team.name.slice(0, 3)}</span>
                        <span className="truncate hidden sm:inline">{m.away_team.name}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Score / Status Badge & Jump Link */}
                  <div className="flex items-center gap-3 shrink-0 text-right">
                    {isLive ? (
                      <div className="flex flex-col items-end font-mono">
                        <span className="text-sm sm:text-base font-black text-indigo-700 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-500/15 px-2.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/30">
                          {m.home_score} : {m.away_score}
                        </span>
                        <span className="text-[10px] font-bold text-red-500 flex items-center gap-1 mt-0.5 uppercase">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          {formatClock(m)}
                        </span>
                      </div>
                    ) : m.status === 'FINISHED' ? (
                      <div className="flex flex-col items-end font-mono">
                        <span className="text-sm font-bold text-foreground">
                          {m.home_score} - {m.away_score}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{formatClock(m)}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-end font-mono">
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                          {formatTimeAMPM(m.start_time)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">Upcoming</span>
                      </div>
                    )}

                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Helper */}
        <div className="px-4 py-2 border-t border-surface-border bg-surface-subtle flex items-center justify-between text-[11px] font-mono text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>Use <strong className="text-foreground">↑↓</strong> to navigate</span>
            <span><strong className="text-foreground">ENTER</strong> to select</span>
            <span><strong className="text-foreground">ESC</strong> to close</span>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-bold"
          >
            Close Dialog ✕
          </button>
        </div>
      </div>
    </div>
  );
}
