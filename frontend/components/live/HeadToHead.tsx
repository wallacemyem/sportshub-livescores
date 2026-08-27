'use client';

import { Match } from '@/types';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { BarChart2, Shield, Target, History, Trophy } from 'lucide-react';
import { formatProperDate } from '@/lib/date';

interface HeadToHeadProps {
  match: Match;
}

interface StatRow {
  label: string;
  home: string;
  away: string;
  homeVal: number;
  awayVal: number;
  reverse?: boolean;
}

export function HeadToHead({ match }: HeadToHeadProps) {
  const stats = match.stats || {};
  const sport = match.sport || 'soccer';
  const h2h = match.h2h;

  const isScheduled = match.status === 'SCHEDULED';
  const isLive = match.status === 'LIVE';

  // Generate sport-tailored detailed statistics from real live feed
  const getSportStats = (): StatRow[] => {
    if (isScheduled) return [];

    switch (sport) {
      case 'basketball': {
        const rows = [];
        if (stats.field_goals_home || stats.field_goals_away) {
          const hVal = parseFloat(stats.field_goals_home || '0');
          const aVal = parseFloat(stats.field_goals_away || '0');
          rows.push({ label: 'Field Goals (FG%)', home: stats.field_goals_home || '0%', away: stats.field_goals_away || '0%', homeVal: hVal || 50, awayVal: aVal || 50 });
        }
        if (stats.three_pointers_home || stats.three_pointers_away) {
          const hVal = parseFloat(stats.three_pointers_home || '0');
          const aVal = parseFloat(stats.three_pointers_away || '0');
          rows.push({ label: '3-Point Field Goals (3PT%)', home: stats.three_pointers_home || '0%', away: stats.three_pointers_away || '0%', homeVal: hVal || 50, awayVal: aVal || 50 });
        }
        if (stats.free_throws_home || stats.free_throws_away) {
          const hVal = parseFloat(stats.free_throws_home || '0');
          const aVal = parseFloat(stats.free_throws_away || '0');
          rows.push({ label: 'Free Throws (FT%)', home: stats.free_throws_home || '0%', away: stats.free_throws_away || '0%', homeVal: hVal || 50, awayVal: aVal || 50 });
        }
        if (stats.rebounds_home !== undefined || stats.rebounds_away !== undefined) {
          rows.push({ label: 'Total Rebounds', home: `${stats.rebounds_home || 0}`, away: `${stats.rebounds_away || 0}`, homeVal: stats.rebounds_home || 0, awayVal: stats.rebounds_away || 0 });
        }
        if (stats.assists_home !== undefined || stats.assists_away !== undefined) {
          rows.push({ label: 'Assists', home: `${stats.assists_home || 0}`, away: `${stats.assists_away || 0}`, homeVal: stats.assists_home || 0, awayVal: stats.assists_away || 0 });
        }
        if (stats.steals_home !== undefined || stats.steals_away !== undefined) {
          rows.push({ label: 'Steals', home: `${stats.steals_home || 0}`, away: `${stats.steals_away || 0}`, homeVal: stats.steals_home || 0, awayVal: stats.steals_away || 0 });
        }
        if (stats.blocks_home !== undefined || stats.blocks_away !== undefined) {
          rows.push({ label: 'Blocks', home: `${stats.blocks_home || 0}`, away: `${stats.blocks_away || 0}`, homeVal: stats.blocks_home || 0, awayVal: stats.blocks_away || 0 });
        }
        if (stats.turnovers_home !== undefined || stats.turnovers_away !== undefined) {
          rows.push({ label: 'Turnovers', home: `${stats.turnovers_home || 0}`, away: `${stats.turnovers_away || 0}`, homeVal: stats.turnovers_home || 0, awayVal: stats.turnovers_away || 0, reverse: true });
        }
        if (stats.points_in_paint_home !== undefined || stats.points_in_paint_away !== undefined) {
          rows.push({ label: 'Points in the Paint', home: `${stats.points_in_paint_home || 0}`, away: `${stats.points_in_paint_away || 0}`, homeVal: stats.points_in_paint_home || 0, awayVal: stats.points_in_paint_away || 0 });
        }
        return rows;
      }
      case 'nfl': {
        const rows = [];
        if (stats.total_yards_home !== undefined || stats.total_yards_away !== undefined) {
          rows.push({ label: 'Total Yards', home: `${stats.total_yards_home || 0}`, away: `${stats.total_yards_away || 0}`, homeVal: stats.total_yards_home || 0, awayVal: stats.total_yards_away || 0 });
        }
        if (stats.passing_yards_home || stats.passing_yards_away) {
          rows.push({ label: 'Passing Yards', home: stats.passing_yards_home || '0', away: stats.passing_yards_away || '0', homeVal: 50, awayVal: 50 });
        }
        if (stats.rushing_yards_home || stats.rushing_yards_away) {
          rows.push({ label: 'Rushing Yards', home: stats.rushing_yards_home || '0', away: stats.rushing_yards_away || '0', homeVal: 50, awayVal: 50 });
        }
        if (stats.first_downs_home !== undefined || stats.first_downs_away !== undefined) {
          rows.push({ label: '1st Downs', home: `${stats.first_downs_home || 0}`, away: `${stats.first_downs_away || 0}`, homeVal: stats.first_downs_home || 0, awayVal: stats.first_downs_away || 0 });
        }
        if (stats.time_of_poss_home || stats.time_of_poss_away) {
          rows.push({ label: 'Time of Possession', home: stats.time_of_poss_home || '00:00', away: stats.time_of_poss_away || '00:00', homeVal: 50, awayVal: 50 });
        }
        return rows;
      }
      case 'baseball': {
        const rows = [];
        if (stats.hits_home !== undefined || stats.hits_away !== undefined) {
          rows.push({ label: 'Hits', home: `${stats.hits_home || 0}`, away: `${stats.hits_away || 0}`, homeVal: stats.hits_home || 0, awayVal: stats.hits_away || 0 });
        }
        if (stats.errors_home !== undefined || stats.errors_away !== undefined) {
          rows.push({ label: 'Errors', home: `${stats.errors_home || 0}`, away: `${stats.errors_away || 0}`, homeVal: stats.errors_home || 0, awayVal: stats.errors_away || 0, reverse: true });
        }
        if (stats.home_runs_home !== undefined || stats.home_runs_away !== undefined) {
          rows.push({ label: 'Home Runs', home: `${stats.home_runs_home || 0}`, away: `${stats.home_runs_away || 0}`, homeVal: stats.home_runs_home || 0, awayVal: stats.home_runs_away || 0 });
        }
        if (stats.strikeouts_home !== undefined || stats.strikeouts_away !== undefined) {
          rows.push({ label: 'Strikeouts', home: `${stats.strikeouts_home || 0}`, away: `${stats.strikeouts_away || 0}`, homeVal: stats.strikeouts_home || 0, awayVal: stats.strikeouts_away || 0 });
        }
        if (stats.walks_home !== undefined || stats.walks_away !== undefined) {
          rows.push({ label: 'Walks (BB)', home: `${stats.walks_home || 0}`, away: `${stats.walks_away || 0}`, homeVal: stats.walks_home || 0, awayVal: stats.walks_away || 0 });
        }
        return rows;
      }
      case 'tennis': {
        return [];
      }
      default: {
        const possH = stats.possession_home || (isLive ? 50 : 0);
        const possA = stats.possession_away || (isLive ? 50 : 0);
        const passAccH = stats.pass_accuracy_home || 0;
        const passAccA = stats.pass_accuracy_away || 0;
        const passTotH = stats.passes_home || 0;
        const passTotA = stats.passes_away || 0;

        const rows: StatRow[] = [
          { label: 'Ball Possession', home: `${possH}%`, away: `${possA}%`, homeVal: possH, awayVal: possA },
        ];

        if (stats.xg_home !== undefined || stats.xg_away !== undefined || isLive) {
          const xgH = stats.xg_home ? stats.xg_home.toFixed(2) : '0.00';
          const xgA = stats.xg_away ? stats.xg_away.toFixed(2) : '0.00';
          rows.push({ label: 'Expected Goals (xG)', home: xgH, away: xgA, homeVal: stats.xg_home || 0, awayVal: stats.xg_away || 0 });
        }

        rows.push(
          { label: 'Total Shots', home: `${stats.shots_home || 0}`, away: `${stats.shots_away || 0}`, homeVal: stats.shots_home || 0, awayVal: stats.shots_away || 0 },
          { label: 'Shots On Target', home: `${stats.shots_on_target_home || 0}`, away: `${stats.shots_on_target_away || 0}`, homeVal: stats.shots_on_target_home || 0, awayVal: stats.shots_on_target_away || 0 },
          { label: 'Corner Kicks', home: `${stats.corners_home || 0}`, away: `${stats.corners_away || 0}`, homeVal: stats.corners_home || 0, awayVal: stats.corners_away || 0 },
          { label: 'Fouls Committed', home: `${stats.fouls_home || 0}`, away: `${stats.fouls_away || 0}`, homeVal: stats.fouls_home || 0, awayVal: stats.fouls_away || 0, reverse: true },
          { label: 'Yellow Cards', home: `${stats.yellow_cards_home || 0}`, away: `${stats.yellow_cards_away || 0}`, homeVal: stats.yellow_cards_home || 0, awayVal: stats.yellow_cards_away || 0, reverse: true },
          { label: 'Red Cards', home: `${stats.red_cards_home || 0}`, away: `${stats.red_cards_away || 0}`, homeVal: stats.red_cards_home || 0, awayVal: stats.red_cards_away || 0, reverse: true },
        );

        if (passAccH > 0 || passAccA > 0) {
          rows.push({ label: 'Pass Accuracy %', home: `${passAccH}% (${passTotH})`, away: `${passAccA}% (${passTotA})`, homeVal: passAccH, awayVal: passAccA });
        }

        if ((stats.saves_home || 0) > 0 || (stats.saves_away || 0) > 0) {
          rows.push({ label: 'Goalkeeper Saves', home: `${stats.saves_home || 0}`, away: `${stats.saves_away || 0}`, homeVal: stats.saves_home || 0, awayVal: stats.saves_away || 0 });
        }

        return rows;
      }
    }
  };

  const statRows = getSportStats();

  return (
    <div className="space-y-4">
      {/* Top Head-to-Head Statistics Banner */}
      <div className="bg-surface rounded-2xl border border-surface-border p-4 sm:p-5 shadow-subtle">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-surface-border pb-3">
          <div className="flex min-w-0 items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-foreground">
            <BarChart2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">Comprehensive match statistics</span>
          </div>

          <div className="flex min-w-0 items-center gap-2 font-mono text-xs text-muted-foreground">
            <span className="shrink-0 capitalize">{sport}</span>
            <span className="shrink-0">•</span>
            <span className="truncate font-bold uppercase text-blue-600 dark:text-blue-400">
              {match.league.name}
            </span>
          </div>
        </div>

        {/* Team Matchup Headers */}
        <div className="mb-5 flex items-center justify-between gap-3 px-2">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <TeamCrest
              name={match.home_team.name}
              shortName={match.home_team.short_name}
              logoUrl={match.home_team.logo}
              sport={match.sport}
              size="md"
            />
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-foreground" title={match.home_team.name}>
                <span className="inline sm:hidden">{match.home_team.short_name || match.home_team.name.slice(0, 3)}</span>
                <span className="hidden sm:inline">{match.home_team.name}</span>
              </p>
              <span className="font-mono text-[10px] uppercase text-muted-foreground">
                {match.sport === 'golf' ? 'Golfer 1' : 'Home'}
              </span>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-3 text-right">
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-foreground" title={match.away_team.name}>
                <span className="inline sm:hidden">{match.away_team.short_name || match.away_team.name.slice(0, 3)}</span>
                <span className="hidden sm:inline">{match.away_team.name}</span>
              </p>
              <span className="font-mono text-[10px] uppercase text-muted-foreground">
                {match.sport === 'golf' ? 'Golfer 2' : 'Away'}
              </span>
            </div>
            <TeamCrest
              name={match.away_team.name}
              shortName={match.away_team.short_name}
              logoUrl={match.away_team.logo}
              sport={match.sport}
              size="md"
            />
          </div>
        </div>

        {/* Metric Comparison Bars */}
        {statRows.length > 0 ? (
          <div className="space-y-3.5">
            {statRows.map((row) => {
              const total = (Number(row.homeVal) + Number(row.awayVal)) || 1;
              const homePct = Math.round((Number(row.homeVal) / total) * 100);
              const awayPct = 100 - homePct;

              return (
                <div key={row.label} className="group text-xs">
                  <div className="mb-1 flex items-center justify-between gap-2 font-mono text-xs">
                    <span className="shrink-0 whitespace-nowrap text-left font-bold text-indigo-700 dark:text-indigo-300">
                      {row.home}
                    </span>
                    <span
                      className="min-w-0 flex-1 truncate px-1 text-center font-sans text-[11px] font-medium text-muted-foreground"
                      title={row.label}
                    >
                      {row.label}
                    </span>
                    <span className="shrink-0 whitespace-nowrap text-right font-bold text-orange-700 dark:text-orange-300">
                      {row.away}
                    </span>
                  </div>

                  {/* Bi-Color Proportion Bar */}
                  <div className="w-full h-2 bg-surface-subtle rounded-full overflow-hidden flex shadow-inner">
                    <div
                      className="bg-indigo-600 dark:bg-indigo-500 rounded-l-full transition-all duration-500"
                      style={{ width: `${homePct}%` }}
                    />
                    <div
                      className="bg-orange-500 dark:bg-orange-400 rounded-r-full transition-all duration-500"
                      style={{ width: `${awayPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-xs font-mono text-muted-foreground bg-surface-subtle/50 rounded-xl border border-surface-border p-4">
            <p className="font-semibold text-foreground mb-1">Live Statistics Pending Kickoff</p>
            <p className="text-[11px] text-muted-foreground">
              Possession, shots on target, xG, and pitch telemetry will stream live in real time once the match begins.
            </p>
          </div>
        )}
      </div>

      {/* Head-to-Head Encounters History (API-Sports) */}
      {h2h && h2h.matches && h2h.matches.length > 0 && (
        <div className="bg-surface rounded-2xl border border-surface-border p-4 sm:p-5 shadow-subtle space-y-3">
          <div className="flex items-center justify-between border-b border-surface-border pb-3">
            <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-foreground">
              <History className="h-4 w-4 shrink-0 text-indigo-500" />
              <span>Head to Head Encounters</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{h2h.home_wins} W</span>
              <span>-</span>
              <span className="font-bold">{h2h.draws} D</span>
              <span>-</span>
              <span className="text-orange-600 dark:text-orange-400 font-bold">{h2h.away_wins} W</span>
            </div>
          </div>

          <div className="space-y-2">
            {h2h.matches.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-surface-subtle border border-surface-border text-xs"
              >
                <span className="font-mono text-[10px] text-muted-foreground shrink-0 w-20 truncate">
                  {formatProperDate(item.date)}
                </span>

                <div className="flex items-center justify-center gap-2 flex-1 min-w-0">
                  <span className="truncate font-semibold text-right flex-1">{item.home_team.name}</span>
                  <span className="font-mono font-bold px-2 py-0.5 rounded bg-surface border border-surface-border shrink-0">
                    {item.home_score} - {item.away_score}
                  </span>
                  <span className="truncate font-semibold text-left flex-1">{item.away_team.name}</span>
                </div>

                <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 shrink-0 hidden sm:inline truncate max-w-[120px]">
                  {item.league.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
