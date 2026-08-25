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

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 pb-20 md:pb-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation & Status */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors bg-surface border border-surface-border px-3 py-1.5 rounded-lg shadow-subtle"
          >
            <ArrowLeft className="w-4 h-4" /> Scores
          </Link>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <span className="text-xs font-mono bg-foreground text-background px-2.5 py-1 rounded-full flex items-center gap-1.5 font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-background animate-pulse" />
              {match.period} {match.minute}&apos;
            </span>
          </div>
        </div>

        {/* Big Match Scoreboard Header */}
        <div className="bg-surface border border-surface-border rounded-2xl p-6 shadow-subtle">
          <div className="text-center text-xs text-muted-foreground mb-4 font-mono">
            {match.league.name} • {match.venue || 'Stadium'}
          </div>

          <div className="grid grid-cols-12 items-center gap-4">
            <div className="col-span-5 text-center">
              <div className="w-14 h-14 mx-auto rounded-lg bg-surface-subtle border border-surface-border flex items-center justify-center font-mono font-bold text-lg text-foreground mb-2 uppercase">
                {match.home_team.short_name || match.home_team.name.slice(0, 3)}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">{match.home_team.name}</h2>
            </div>

            <div className="col-span-2 text-center font-mono">
              <div className="text-3xl sm:text-4xl font-black text-foreground bg-surface-subtle border border-surface-border px-4 py-2 rounded-xl inline-block">
                {match.home_score} : {match.away_score}
              </div>
            </div>

            <div className="col-span-5 text-center">
              <div className="w-14 h-14 mx-auto rounded-lg bg-surface-subtle border border-surface-border flex items-center justify-center font-mono font-bold text-lg text-foreground mb-2 uppercase">
                {match.away_team.short_name || match.away_team.name.slice(0, 3)}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">{match.away_team.name}</h2>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="grid grid-cols-5 gap-2 mt-6 pt-4 border-t border-surface-border text-center text-xs font-semibold">
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
                    ? 'bg-foreground text-background font-bold shadow-subtle'
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
