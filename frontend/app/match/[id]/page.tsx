'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Match } from '@/types';
import { useLiveMatchSocket } from '@/hooks/useLiveMatchSocket';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { useMediaSession } from '@/hooks/useMediaSession';
import { PitchView } from '@/components/live/PitchView';
import { EventTimeline } from '@/components/live/EventTimeline';
import { HeadToHead } from '@/components/live/HeadToHead';
import { LineupsView } from '@/components/live/LineupsView';
import { OddsComparisonTable } from '@/components/live/OddsComparisonTable';
import { ArrowLeft } from 'lucide-react';
import { MobileNav } from '@/components/ui/MobileNav';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import Link from 'next/link';

export default function MatchDetailPage() {
  const params = useParams();
  const matchId = params.id as string;
  const [match, setMatch] = useState<Match | null>(null);
  const [activeTab, setActiveTab] = useState<'pitch' | 'timeline' | 'stats' | 'lineups' | 'odds'>('pitch');

  const { isConnected, subscribe } = useLiveMatchSocket(matchId);
  useMediaSession(match, true);

  useSupabaseRealtime({
    onMatchUpdate: (updatedMatch) => {
      if (updatedMatch.id === matchId) {
        setMatch((prev) => (prev ? { ...prev, ...updatedMatch } : null));
      }
    },
    onNewEvent: (event) => {
      if (event.match_id === matchId) {
        setMatch((prev) => (prev ? { ...prev, events: [event, ...(prev.events || [])] } : null));
      }
    },
  });

  useEffect(() => {
    async function fetchMatch() {
      try {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        const res = await fetch(`http://${host}:18443/api/v1/matches/${matchId}`);
        if (res.ok) {
          const data = await res.json();
          setMatch(data);
        }
      } catch (err) {
        console.error(err);
      }
    }

    if (matchId) {
      fetchMatch();
    }
  }, [matchId]);

  useEffect(() => {
    return subscribe((delta) => {
      if (delta.match_id === matchId) {
        setMatch((prev) => {
          if (!prev) return prev;
          const updated = { ...prev };
          if (delta.home_score !== undefined) updated.home_score = delta.home_score;
          if (delta.away_score !== undefined) updated.away_score = delta.away_score;
          if (delta.minute !== undefined) updated.minute = delta.minute;
          if (delta.period) updated.period = delta.period;
          if (delta.status) updated.status = delta.status;
          if (delta.stats) updated.stats = { ...prev.stats, ...delta.stats };
          if (delta.event) updated.events = [delta.event, ...(prev.events || [])];
          if (delta.odds) updated.odds = delta.odds;
          return updated;
        });
      }
    });
  }, [matchId, subscribe]);

  if (!match) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="animate-pulse text-sm text-muted-foreground font-mono">
          Loading Match Center & Live Feed...
        </div>
      </div>
    );
  }

  const isLive = match.status === 'LIVE';

  return (
    <div className="min-h-screen bg-background text-foreground p-3 sm:p-4 md:p-8 pb-24 md:pb-8">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Navigation & Status */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-semibold text-foreground hover:text-blue-600 transition-colors bg-surface border border-surface-border hover:border-blue-300 dark:hover:border-blue-600 px-3 py-1.5 rounded-lg shadow-subtle"
          >
            <ArrowLeft className="w-4 h-4" /> Scores
          </Link>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            {isLive ? (
              <span className="text-xs font-mono bg-red-500 text-white px-3 py-1 rounded-full flex items-center gap-1.5 font-bold uppercase tracking-wider shadow-sm shadow-red-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                {match.period} {match.minute}&apos;
              </span>
            ) : match.status === 'FINISHED' ? (
              <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-full font-bold uppercase">
                FT
              </span>
            ) : (
              <span className="text-xs font-mono bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 px-2.5 py-1 rounded-full font-bold">
                Upcoming
              </span>
            )}
          </div>
        </div>

        {/* Big Match Scoreboard Header */}
        <div className="bg-surface border border-surface-border rounded-2xl p-4 sm:p-6 shadow-subtle relative overflow-hidden">
          {isLive && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-400 to-indigo-500" />
          )}

          <div className="text-center text-xs text-muted-foreground mb-4 font-mono">
            {match.league.name} • {match.venue || 'Stadium'}
          </div>

          <div className="grid grid-cols-12 items-center gap-3 sm:gap-4">
            {/* Home Team */}
            <div className="col-span-5 text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center font-mono font-bold text-lg sm:text-xl text-indigo-700 dark:text-indigo-300 mb-2 uppercase shadow-sm">
                {match.home_team.short_name || match.home_team.name.slice(0, 3)}
              </div>
              <h2 className="text-sm sm:text-lg font-bold text-foreground truncate">{match.home_team.name}</h2>
            </div>

            {/* Score */}
            <div className="col-span-2 text-center font-mono">
              <div className={`text-2xl sm:text-4xl font-black px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl border inline-block ${
                isLive
                  ? 'text-indigo-700 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-500/15 border-indigo-200 dark:border-indigo-500/30'
                  : 'text-foreground bg-surface-subtle border-surface-border'
              }`}>
                {match.home_score} : {match.away_score}
              </div>
            </div>

            {/* Away Team */}
            <div className="col-span-5 text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 flex items-center justify-center font-mono font-bold text-lg sm:text-xl text-orange-700 dark:text-orange-300 mb-2 uppercase shadow-sm">
                {match.away_team.short_name || match.away_team.name.slice(0, 3)}
              </div>
              <h2 className="text-sm sm:text-lg font-bold text-foreground truncate">{match.away_team.name}</h2>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="grid grid-cols-5 gap-1 sm:gap-2 mt-6 pt-4 border-t border-surface-border text-center text-xs font-semibold">
            {[
              { id: 'pitch', label: '2D Pitch' },
              { id: 'timeline', label: 'Timeline' },
              { id: 'stats', label: 'Stats' },
              { id: 'lineups', label: 'Lineups' },
              { id: 'odds', label: 'Odds' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  activeTab === t.id
                    ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-subtle'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Modules */}
        {activeTab === 'pitch' && <PitchView match={match} />}
        {activeTab === 'timeline' && (
          <EventTimeline
            events={match.events}
            homeTeamName={match.home_team.name}
            awayTeamName={match.away_team.name}
          />
        )}
        {activeTab === 'stats' && <HeadToHead match={match} />}
        {activeTab === 'lineups' && <LineupsView match={match} />}
        {activeTab === 'odds' && <OddsComparisonTable odds={match.odds} />}
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
