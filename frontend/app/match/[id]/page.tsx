'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Match } from '@/types';
import { useLiveMatchSocket } from '@/hooks/useLiveMatchSocket';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { useMediaSession } from '@/hooks/useMediaSession';
import { PitchView } from '@/components/live/PitchView';
import { EventTimeline } from '@/components/live/EventTimeline';
import { HeadToHead } from '@/components/live/HeadToHead';
import { LineupsView } from '@/components/live/LineupsView';
import { OddsComparisonTable } from '@/components/live/OddsComparisonTable';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { ArrowLeft, Volume2, MapPin, User, Bell, BellOff, Ticket, Radio } from 'lucide-react';
import { MobileNav } from '@/components/ui/MobileNav';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { getCachedData } from '@/lib/cache';
import { getApiBaseUrl } from '@/lib/api';
import { formatTimeAMPM, formatProperDate } from '@/lib/date';
import { useNotification } from '@/context/NotificationContext';
import Link from 'next/link';
import { formatClock, scoreNoun } from '@/lib/sportFormat';

export default function MatchDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const matchId = params.id as string;

  const fromTicket = searchParams.get('fromTicket');
  const ticketCode = searchParams.get('ticketCode');

  const { alertsEnabled, setAlertsEnabled, triggerAlert } = useNotification();

  const [match, setMatch] = useState<Match | null>(() => {
    if (typeof window !== 'undefined') {
      const cached = getCachedData<Match[]>('matches');
      return cached?.find((m) => m.id === matchId) || null;
    }
    return null;
  });
  const [activeTab, setActiveTab] = useState<'pitch' | 'timeline' | 'stats' | 'lineups' | 'odds'>('stats');

  const { isConnected, subscribe } = useLiveMatchSocket(matchId);
  useMediaSession(match, true);

  const prevScoreRef = useRef<{ home: number; away: number; status: string }>({
    home: match?.home_score ?? 0,
    away: match?.away_score ?? 0,
    status: match?.status ?? 'SCHEDULED',
  });

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

  // Fetch Match Data from Backend API
  useEffect(() => {
    async function fetchMatch() {
      try {
        const apiBase = getApiBaseUrl();
        const res = await fetch(`${apiBase}/matches/${matchId}`);
        if (res.ok) {
          const data = await res.json();
          setMatch(data);
          prevScoreRef.current = {
            home: data.home_score,
            away: data.away_score,
            status: data.status,
          };
        }
      } catch (err) {
        console.warn('API fetch background sync:', err);
      }
    }

    if (matchId) {
      fetchMatch();
    }
  }, [matchId]);

  // Real-time WebSocket Deltas & Notifications
  useEffect(() => {
    return subscribe((delta) => {
      if (delta.match_id === matchId) {
        setMatch((prev) => {
          if (!prev) return prev;
          const updated = { ...prev };

          // 1. Kick-off alert
          if (delta.status === 'LIVE' && prevScoreRef.current.status !== 'LIVE') {
            triggerAlert(
              `🔔 KICK-OFF: ${prev.home_team.name} vs ${prev.away_team.name}`,
              `Match is now LIVE! (${prev.league.name})`,
              'kickoff',
              matchId
            );
          }

          // 2. Goal / Point score alert
          const newHome = delta.home_score !== undefined ? delta.home_score : prev.home_score;
          const newAway = delta.away_score !== undefined ? delta.away_score : prev.away_score;

          if (
            (newHome > prevScoreRef.current.home || newAway > prevScoreRef.current.away) &&
            prev.status === 'LIVE'
          ) {
            const isGoal = prev.sport === 'soccer';
            const scoringTeam = newHome > prevScoreRef.current.home ? prev.home_team.name : prev.away_team.name;
            // Name the unit the way the sport does: goal, point, run or stroke.
            const term = isGoal ? 'GOAL!' : `${scoreNoun(prev.sport, 1).toUpperCase()}!`;

            triggerAlert(
              `${isGoal ? '⚽' : '🏅'} ${term} ${scoringTeam}`,
              `${prev.home_team.name} ${newHome} - ${newAway} ${prev.away_team.name} (${formatClock({ ...prev, home_score: newHome, away_score: newAway })})`,
              isGoal ? 'goal' : 'point',
              matchId
            );
          }

          if (delta.home_score !== undefined) updated.home_score = delta.home_score;
          if (delta.away_score !== undefined) updated.away_score = delta.away_score;
          if (delta.minute !== undefined) updated.minute = delta.minute;
          if (delta.display_clock !== undefined) updated.display_clock = delta.display_clock;
          if (delta.period_number !== undefined) updated.period_number = delta.period_number;
          if (delta.clock_seconds !== undefined) updated.clock_seconds = delta.clock_seconds;
          if (delta.period) updated.period = delta.period;
          if (delta.status) updated.status = delta.status;
          if (delta.stats) updated.stats = { ...prev.stats, ...delta.stats };
          if (delta.event) updated.events = [delta.event, ...(prev.events || [])];
          if (delta.odds) updated.odds = delta.odds;

          prevScoreRef.current = {
            home: updated.home_score,
            away: updated.away_score,
            status: updated.status,
          };

          return updated;
        });
      }
    });
  }, [matchId, subscribe, triggerAlert]);

  if (!match) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <p className="text-sm font-mono text-muted-foreground animate-pulse">
            Connecting to Live Match Center API...
          </p>
        </div>
      </div>
    );
  }

  const isLive = match.status === 'LIVE';

  return (
    <div className="min-h-screen bg-background text-foreground p-3 sm:p-4 md:p-8 md:pl-24 pb-24 md:pb-8">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Navigation & Status Header */}
        <div className="flex items-center justify-between gap-3">
          {fromTicket ? (
            <Link
              href={`/tickets/${fromTicket}`}
              className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 px-3.5 py-2 rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Ticket #{ticketCode || fromTicket}</span>
            </Link>
          ) : (
            <Link
              href="/live"
              className="flex items-center gap-2 text-xs font-bold text-foreground hover:text-blue-600 transition-colors bg-surface border border-surface-border hover:border-blue-300 dark:hover:border-blue-600 px-3 py-1.5 rounded-xl shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Scores
            </Link>
          )}

          <div className="flex items-center gap-2.5">
            {/* Live Alerts Bell Button */}
            <button
              type="button"
              onClick={() => {
                const next = !alertsEnabled;
                setAlertsEnabled(next);
                if (next) {
                  triggerAlert('Alerts Enabled', `You will receive instant goal and kickoff alerts for ${match.home_team.name} vs ${match.away_team.name}`, 'kickoff', matchId);
                }
              }}
              title={alertsEnabled ? 'Disable match notifications' : 'Enable match notifications'}
              className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                alertsEnabled
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-surface border-surface-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {alertsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              <span className="hidden sm:inline">{alertsEnabled ? 'Alerts ON' : 'Alerts OFF'}</span>
            </button>

            <ThemeToggle />

            {isLive ? (
              <span className="text-xs font-mono bg-red-500 text-white px-3 py-1 rounded-full flex items-center gap-1.5 font-bold uppercase tracking-wider shadow-sm shadow-red-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                {formatClock(match)}
              </span>
            ) : match.status === 'FINISHED' ? (
              <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-full font-bold uppercase">
                {formatClock(match)}
              </span>
            ) : (
              <span className="text-xs font-mono bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 px-2.5 py-1 rounded-full font-bold">
                Upcoming ({formatTimeAMPM(match.start_time)})
              </span>
            )}
          </div>
        </div>

        {/* Big Match Scoreboard Header with Official Crests & Flags */}
        <div className="bg-surface border border-surface-border rounded-2xl p-4 sm:p-6 shadow-subtle relative overflow-hidden">
          {isLive && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-400 to-indigo-500" />
          )}

          {/* League, Flag, Kickoff Date/Time Info */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground mb-6 pb-3 border-b border-surface-border font-mono">
            <div className="flex items-center gap-2">
              <CountryFlag country={match.league.country} size="sm" />
              <span className="font-bold text-foreground">{match.league.name}</span>
              <span className="uppercase text-[10px] bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-500/30">
                {match.sport}
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px]">
              <span className="font-bold text-foreground">
                {formatProperDate(match.start_time, true)} at {formatTimeAMPM(match.start_time)}
              </span>
              {match.venue && (
                <span className="hidden md:flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-muted-foreground" />
                  <span>{match.venue}</span>
                </span>
              )}
              {match.referee && (
                <span className="hidden lg:flex items-center gap-1">
                  <User className="w-3 h-3 text-muted-foreground" />
                  <span>Ref: {match.referee}</span>
                </span>
              )}
              {match.has_live_audio && (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                  <Volume2 className="w-3.5 h-3.5" /> Audio Live
                </span>
              )}
            </div>
          </div>

          {/* Main Teams Matchup Scoreboard */}
          <div className="flex items-center justify-between gap-2 sm:gap-6 my-3 px-1 sm:px-4">
            {/* Home Team */}
            <div className="flex-1 text-center flex flex-col items-center min-w-0">
              <TeamCrest
                name={match.home_team.name}
                shortName={match.home_team.short_name}
                logoUrl={match.home_team.logo}
                sport={match.sport}
                size="xl"
                className="mb-2"
              />
              <h2 className="text-sm sm:text-lg font-bold text-foreground truncate w-full px-1">
                <span className="inline sm:hidden">{match.home_team.short_name || match.home_team.name.slice(0, 3)}</span>
                <span className="hidden sm:inline">{match.home_team.name}</span>
              </h2>
              {match.home_team.country && (
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  <CountryFlag country={match.home_team.country} size="xs" />
                  <span className="text-[10px] text-muted-foreground font-mono">{match.home_team.country}</span>
                </div>
              )}
            </div>

            {/* Score Center */}
            <div className="shrink-0 text-center font-mono px-2 sm:px-4">
              <div className={`text-2xl sm:text-4xl md:text-5xl font-black px-4 sm:px-6 py-2 rounded-2xl border inline-block shadow-sm ${
                isLive
                  ? 'text-indigo-700 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-500/15 border-indigo-200 dark:border-indigo-500/30'
                  : 'text-foreground bg-surface-subtle border-surface-border'
              }`}>
                {match.home_score} : {match.away_score}
              </div>
              {match.period_scores && match.period_scores.length > 0 && (
                <div className="text-[10px] text-muted-foreground mt-2 font-mono">
                  {match.period_scores.join(' | ')}
                </div>
              )}
            </div>

            {/* Away Team */}
            <div className="flex-1 text-center flex flex-col items-center min-w-0">
              <TeamCrest
                name={match.away_team.name}
                shortName={match.away_team.short_name}
                logoUrl={match.away_team.logo}
                sport={match.sport}
                size="xl"
                className="mb-2"
              />
              <h2 className="text-sm sm:text-lg font-bold text-foreground truncate w-full px-1">
                <span className="inline sm:hidden">{match.away_team.short_name || match.away_team.name.slice(0, 3)}</span>
                <span className="hidden sm:inline">{match.away_team.name}</span>
              </h2>
              {match.away_team.country && (
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  <CountryFlag country={match.away_team.country} size="xs" />
                  <span className="text-[10px] text-muted-foreground font-mono">{match.away_team.country}</span>
                </div>
              )}
            </div>
          </div>

          {/* Match Navigation Tabs */}
          <div className="grid grid-cols-5 gap-1 sm:gap-2 mt-6 pt-4 border-t border-surface-border text-center text-xs font-semibold">
            {[
              { id: 'stats', label: 'Full Stats' },
              {
                id: 'pitch',
                label:
                  match.sport === 'soccer'
                    ? '2D Pitch'
                    : match.sport === 'basketball'
                    ? '2D Court'
                    : match.sport === 'tennis'
                    ? '2D Court'
                    : match.sport === 'nfl'
                    ? '2D Gridiron'
                    : match.sport === 'baseball'
                    ? '2D Diamond'
                    : match.sport === 'cricket'
                    ? '2D Oval'
                    : match.sport === 'golf'
                    ? '2D Course'
                    : '2D Tracker',
              },
              { id: 'timeline', label: 'Timeline' },
              { id: 'lineups', label: 'Lineups' },
              { id: 'odds', label: 'Odds Hub' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`py-2 rounded-xl transition-all cursor-pointer font-bold ${
                  activeTab === t.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-subtle'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Modules */}
        {activeTab === 'stats' && <HeadToHead match={match} />}
        {activeTab === 'pitch' && <PitchView match={match} />}
        {activeTab === 'timeline' && (
          <EventTimeline
            events={match.events}
            homeTeamName={match.home_team.name}
            awayTeamName={match.away_team.name}
            sport={match.sport}
          />
        )}
        {activeTab === 'lineups' && <LineupsView match={match} />}
        {activeTab === 'odds' && <OddsComparisonTable odds={match.odds} />}
      </div>

      {/* Mobile Bottom Navigation & Desktop Side Nav */}
      <MobileNav activeNav="scores" />
    </div>
  );
}
