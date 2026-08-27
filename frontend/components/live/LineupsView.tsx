'use client';

import { useState } from 'react';
import { Match, Player } from '@/types';
import { Users, User, Shield, Sparkles, ChevronRight } from 'lucide-react';
import { TeamCrest } from '@/components/ui/TeamCrest';

interface LineupsViewProps {
  match: Match;
}

export function LineupsView({ match }: LineupsViewProps) {
  const [viewTab, setViewTab] = useState<'starters' | 'subs'>('starters');

  const homeLineup = match.lineups?.home;
  const awayLineup = match.lineups?.away;

  const hasLineups = Boolean(
    (homeLineup?.starting_xi && homeLineup.starting_xi.length > 0) ||
    (awayLineup?.starting_xi && awayLineup.starting_xi.length > 0)
  );

  const homeFormation = homeLineup?.formation || 'Pending';
  const awayFormation = awayLineup?.formation || 'Pending';

  const homeCoach = homeLineup?.coach?.name || '';
  const awayCoach = awayLineup?.coach?.name || '';

  const homeStarters = homeLineup?.starting_xi || [];
  const awayStarters = awayLineup?.starting_xi || [];

  const homeSubs = homeLineup?.substitutes || [];
  const awaySubs = awayLineup?.substitutes || [];

  const homeList = viewTab === 'starters' ? homeStarters : homeSubs;
  const awayList = viewTab === 'starters' ? awayStarters : awaySubs;

  if (!hasLineups) {
    return (
      <div className="bg-surface rounded-2xl border border-surface-border p-6 sm:p-8 shadow-subtle text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <Users className="w-6 h-6" />
        </div>

        <div className="space-y-1.5 max-w-md mx-auto">
          <h3 className="text-sm font-bold text-foreground">
            Official Lineups Pending Announcement
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Starting rosters for <strong className="text-foreground">{match.home_team.name}</strong> and{' '}
            <strong className="text-foreground">{match.away_team.name}</strong> are typically confirmed and published 45–60 minutes prior to kickoff.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto pt-2 text-xs font-mono">
          <div className="bg-surface-subtle p-3 rounded-xl border border-surface-border flex items-center gap-2.5">
            <TeamCrest
              name={match.home_team.name}
              shortName={match.home_team.short_name}
              logoUrl={match.home_team.logo}
              size="xs"
            />
            <div className="min-w-0 text-left">
              <span className="font-bold text-foreground block truncate">{match.home_team.name}</span>
              <span className="text-[10px] text-muted-foreground">Roster: Unconfirmed</span>
            </div>
          </div>

          <div className="bg-surface-subtle p-3 rounded-xl border border-surface-border flex items-center gap-2.5">
            <TeamCrest
              name={match.away_team.name}
              shortName={match.away_team.short_name}
              logoUrl={match.away_team.logo}
              size="xs"
            />
            <div className="min-w-0 text-left">
              <span className="font-bold text-foreground block truncate">{match.away_team.name}</span>
              <span className="text-[10px] text-muted-foreground">Roster: Unconfirmed</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-2xl border border-surface-border p-4 sm:p-5 shadow-subtle space-y-4">
      {/* Header with Formations & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border pb-3">
        <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-foreground">
          <Users className="h-4 w-4 shrink-0 text-amber-500" />
          <span>Match Lineups & Rosters</span>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 bg-surface-subtle p-1 rounded-xl border border-surface-border">
          <button
            onClick={() => setViewTab('starters')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              viewTab === 'starters'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Starting XI
          </button>
          <button
            onClick={() => setViewTab('subs')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              viewTab === 'subs'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Substitutes {homeSubs.length > 0 ? `(${homeSubs.length})` : ''}
          </button>
        </div>
      </div>

      {/* Formations and Coaches Bar */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs font-mono">
        <div className="bg-surface-subtle/70 rounded-xl p-2.5 border border-surface-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <TeamCrest
              name={match.home_team.name}
              shortName={match.home_team.short_name}
              logoUrl={match.home_team.logo}
              size="xs"
            />
            <span className="font-bold text-foreground truncate">{match.home_team.name}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-muted-foreground hidden sm:inline">{homeCoach}</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/30 text-[11px]">
              {homeFormation}
            </span>
          </div>
        </div>

        <div className="bg-surface-subtle/70 rounded-xl p-2.5 border border-surface-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <TeamCrest
              name={match.away_team.name}
              shortName={match.away_team.short_name}
              logoUrl={match.away_team.logo}
              size="xs"
            />
            <span className="font-bold text-foreground truncate">{match.away_team.name}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-muted-foreground hidden sm:inline">{awayCoach}</span>
            <span className="text-orange-600 dark:text-orange-400 font-bold bg-orange-50 dark:bg-orange-500/10 px-2 py-0.5 rounded border border-orange-200 dark:border-orange-500/30 text-[11px]">
              {awayFormation}
            </span>
          </div>
        </div>
      </div>

      {/* Grid of Players */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
        {/* Home Lineup Column */}
        <div className="bg-surface-subtle rounded-xl p-3 border border-surface-border space-y-2">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider font-mono border-b border-surface-border pb-1.5">
            {viewTab === 'starters' ? `${match.home_team.name} Starters` : `${match.home_team.name} Bench`}
          </p>

          <ul className="space-y-1.5">
            {homeList.map((p) => (
              <li
                key={p.id || p.number}
                className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-surface/60 hover:bg-surface border border-transparent hover:border-surface-border transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Player Headshot Photo */}
                  <div className="relative w-7 h-7 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0 border border-surface-border">
                    {p.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.photo}
                        alt={p.name}
                        className="w-full h-full object-cover object-top"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <User className="w-4 h-4 text-muted-foreground m-auto my-1.5" />
                    )}
                  </div>

                  <span className="w-4 shrink-0 text-right font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                    {p.number}
                  </span>

                  <span className="text-foreground truncate font-medium flex items-center gap-1.5">
                    {p.name}
                    {p.is_captain && (
                      <span className="text-[9px] font-bold px-1 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">
                        C
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 font-mono">
                  {p.rating && p.rating > 0 ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {p.rating.toFixed(1)}
                    </span>
                  ) : null}
                  <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 bg-surface rounded border border-surface-border">
                    {p.pos || 'SUB'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Away Lineup Column */}
        <div className="bg-surface-subtle rounded-xl p-3 border border-surface-border space-y-2">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider font-mono border-b border-surface-border pb-1.5">
            {viewTab === 'starters' ? `${match.away_team.name} Starters` : `${match.away_team.name} Bench`}
          </p>

          <ul className="space-y-1.5">
            {awayList.map((p) => (
              <li
                key={p.id || p.number}
                className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-surface/60 hover:bg-surface border border-transparent hover:border-surface-border transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Player Headshot Photo */}
                  <div className="relative w-7 h-7 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0 border border-surface-border">
                    {p.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.photo}
                        alt={p.name}
                        className="w-full h-full object-cover object-top"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <User className="w-4 h-4 text-muted-foreground m-auto my-1.5" />
                    )}
                  </div>

                  <span className="w-4 shrink-0 text-right font-mono text-[11px] font-bold text-orange-600 dark:text-orange-400">
                    {p.number}
                  </span>

                  <span className="text-foreground truncate font-medium flex items-center gap-1.5">
                    {p.name}
                    {p.is_captain && (
                      <span className="text-[9px] font-bold px-1 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">
                        C
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 font-mono">
                  {p.rating && p.rating > 0 ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {p.rating.toFixed(1)}
                    </span>
                  ) : null}
                  <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 bg-surface rounded border border-surface-border">
                    {p.pos || 'SUB'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
