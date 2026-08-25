'use client';

import { Match } from '@/types';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { Activity, BarChart2, Shield, Target, Flame, Zap, Trophy, CircleDot } from 'lucide-react';

interface HeadToHeadProps {
  match: Match;
}

export function HeadToHead({ match }: HeadToHeadProps) {
  const stats = match.stats;
  const sport = match.sport;

  // Generate sport-tailored detailed statistics
  const getSportStats = () => {
    switch (sport) {
      case 'basketball': {
        const homePts = match.home_score || 89;
        const awayPts = match.away_score || 94;
        return [
          { label: 'Field Goals (FG%)', home: '46.2% (36/78)', away: '48.8% (39/80)', homeVal: 46.2, awayVal: 48.8 },
          { label: '3-Point Field Goals (3PT%)', home: '37.5% (12/32)', away: '41.4% (14/34)', homeVal: 37.5, awayVal: 41.4 },
          { label: 'Free Throws (FT%)', home: '83.3% (15/18)', away: '76.9% (10/13)', homeVal: 83.3, awayVal: 76.9 },
          { label: 'Total Rebounds', home: '42 (8 OFF)', away: '46 (11 OFF)', homeVal: 42, awayVal: 46 },
          { label: 'Assists', home: '24', away: '28', homeVal: 24, awayVal: 28 },
          { label: 'Steals', home: '7', away: '9', homeVal: 7, awayVal: 9 },
          { label: 'Blocks', home: '5', away: '4', homeVal: 5, awayVal: 4 },
          { label: 'Turnovers', home: '12', away: '10', homeVal: 12, awayVal: 10, reverse: true },
          { label: 'Points in the Paint', home: '44', away: '50', homeVal: 44, awayVal: 50 },
          { label: 'Fast Break Points', home: '16', away: '19', homeVal: 16, awayVal: 19 },
        ];
      }
      case 'tennis': {
        return [
          { label: 'Aces', home: '8', away: '11', homeVal: 8, awayVal: 11 },
          { label: 'Double Faults', home: '2', away: '4', homeVal: 2, awayVal: 4, reverse: true },
          { label: '1st Serve In %', home: '68%', away: '64%', homeVal: 68, awayVal: 64 },
          { label: '1st Serve Points Won', home: '78% (39/50)', away: '74% (37/50)', homeVal: 78, awayVal: 74 },
          { label: '2nd Serve Points Won', home: '55% (17/31)', away: '48% (15/31)', homeVal: 55, awayVal: 48 },
          { label: 'Break Points Converted', home: '3/6 (50%)', away: '2/5 (40%)', homeVal: 50, awayVal: 40 },
          { label: 'Winners', home: '28', away: '31', homeVal: 28, awayVal: 31 },
          { label: 'Unforced Errors', home: '18', away: '24', homeVal: 18, awayVal: 24, reverse: true },
          { label: 'Total Points Won', home: '88', away: '82', homeVal: 88, awayVal: 82 },
        ];
      }
      case 'nfl': {
        return [
          { label: 'Total Yards', home: '365', away: '342', homeVal: 365, awayVal: 342 },
          { label: 'Passing Yards', home: '245 (22/33)', away: '230 (20/31)', homeVal: 245, awayVal: 230 },
          { label: 'Rushing Yards', home: '120 (26 att)', away: '112 (24 att)', homeVal: 120, awayVal: 112 },
          { label: '1st Downs', home: '21', away: '19', homeVal: 21, awayVal: 19 },
          { label: '3rd Down Efficiency', home: '6/12 (50%)', away: '5/11 (45%)', homeVal: 50, awayVal: 45 },
          { label: 'Turnovers', home: '1', away: '2', homeVal: 1, awayVal: 2, reverse: true },
          { label: 'Penalties (Yds)', home: '4 (35)', away: '6 (55)', homeVal: 35, awayVal: 55, reverse: true },
          { label: 'Time of Possession', home: '31:40', away: '28:20', homeVal: 31.6, awayVal: 28.3 },
        ];
      }
      case 'cricket': {
        return [
          { label: 'Run Rate (CRR)', home: '8.45', away: '8.10', homeVal: 8.45, awayVal: 8.10 },
          { label: 'Boundaries (4s)', home: '16', away: '14', homeVal: 16, awayVal: 14 },
          { label: 'Sixes (6s)', home: '7', away: '6', homeVal: 7, awayVal: 6 },
          { label: 'Extras Conceded', home: '6', away: '9', homeVal: 6, awayVal: 9, reverse: true },
          { label: 'Dot Ball %', home: '38%', away: '42%', homeVal: 38, awayVal: 42, reverse: true },
          { label: 'Highest Partnership', home: '68 (41)', away: '54 (36)', homeVal: 68, awayVal: 54 },
        ];
      }
      case 'baseball': {
        return [
          { label: 'Hits', home: '9', away: '7', homeVal: 9, awayVal: 7 },
          { label: 'Errors', home: '0', away: '1', homeVal: 0, awayVal: 1, reverse: true },
          { label: 'Left on Base', home: '6', away: '8', homeVal: 6, awayVal: 8, reverse: true },
          { label: 'Home Runs', home: '2', away: '1', homeVal: 2, awayVal: 1 },
          { label: 'Strikeouts', home: '7', away: '10', homeVal: 7, awayVal: 10 },
          { label: 'Walks (BB)', home: '4', away: '2', homeVal: 4, awayVal: 2 },
        ];
      }
      case 'golf': {
        return [
          { label: 'Score to Par', home: '-16', away: '-14', homeVal: 16, awayVal: 14 },
          { label: 'Avg Driving Distance', home: '318.4 yds', away: '305.2 yds', homeVal: 318.4, awayVal: 305.2 },
          { label: 'Fairways in Regulation', home: '71.4% (10/14)', away: '64.3% (9/14)', homeVal: 71.4, awayVal: 64.3 },
          { label: 'Greens in Regulation (GIR)', home: '77.8% (14/18)', away: '72.2% (13/18)', homeVal: 77.8, awayVal: 72.2 },
          { label: 'Putts Per GIR', home: '1.65', away: '1.72', homeVal: 1.72, awayVal: 1.65, reverse: true },
          { label: 'Total Birdies / Eagles', home: '22 / 1', away: '19 / 0', homeVal: 23, awayVal: 19 },
          { label: 'Sand Save %', home: '80.0% (4/5)', away: '66.7% (2/3)', homeVal: 80, awayVal: 66.7 },
          { label: 'Scrambling %', home: '75.0% (6/8)', away: '68.5% (5/7)', homeVal: 75, awayVal: 68.5 },
        ];
      }
      default: {
        // Standard Soccer Match Stats
        return [
          { label: 'Ball Possession', home: `${stats.possession_home || 50}%`, away: `${stats.possession_away || 50}%`, homeVal: stats.possession_home || 50, awayVal: stats.possession_away || 50 },
          { label: 'Expected Goals (xG)', home: stats.xg_home?.toFixed(2) || '1.84', away: stats.xg_away?.toFixed(2) || '1.52', homeVal: stats.xg_home || 1.84, awayVal: stats.xg_away || 1.52 },
          { label: 'Total Shots', home: stats.shots_home || 12, away: stats.shots_away || 14, homeVal: stats.shots_home || 12, awayVal: stats.shots_away || 14 },
          { label: 'Shots On Target', home: stats.shots_on_target_home || 6, away: stats.shots_on_target_away || 5, homeVal: stats.shots_on_target_home || 6, awayVal: stats.shots_on_target_away || 5 },
          { label: 'Shots Off Target', home: (stats.shots_home || 12) - (stats.shots_on_target_home || 6), away: (stats.shots_away || 14) - (stats.shots_on_target_away || 5), homeVal: 6, awayVal: 9 },
          { label: 'Blocked Shots', home: '3', away: '4', homeVal: 3, awayVal: 4 },
          { label: 'Big Chances Created', home: '4', away: '3', homeVal: 4, awayVal: 3 },
          { label: 'Corner Kicks', home: stats.corners_home || 5, away: stats.corners_away || 7, homeVal: stats.corners_home || 5, awayVal: stats.corners_away || 7 },
          { label: 'Fouls Committed', home: stats.fouls_home || 9, away: stats.fouls_away || 11, homeVal: stats.fouls_home || 9, awayVal: stats.fouls_away || 11, reverse: true },
          { label: 'Yellow Cards', home: stats.yellow_cards_home || 1, away: stats.yellow_cards_away || 2, homeVal: stats.yellow_cards_home || 1, awayVal: stats.yellow_cards_away || 2, reverse: true },
          { label: 'Red Cards', home: stats.red_cards_home || 0, away: stats.red_cards_away || 0, homeVal: stats.red_cards_home || 0, awayVal: stats.red_cards_away || 0, reverse: true },
          { label: 'Pass Accuracy %', home: '88% (492/559)', away: '86% (481/558)', homeVal: 88, awayVal: 86 },
          { label: 'Tackles Won %', home: '73% (11/15)', away: '65% (13/20)', homeVal: 73, awayVal: 65 },
          { label: 'Goalkeeper Saves', home: '4', away: '4', homeVal: 4, awayVal: 4 },
        ];
      }
    }
  };

  const statRows = getSportStats();

  return (
    <div className="space-y-4">
      {/* Top Head-to-Head Banner */}
      <div className="bg-surface rounded-2xl border border-surface-border p-4 sm:p-5 shadow-subtle">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-surface-border">
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-foreground">
            <BarChart2 className="w-4 h-4 text-muted-foreground" />
            <span>Full Match Statistical Analysis</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <span className="capitalize">{sport}</span>
            <span>•</span>
            <span className="uppercase text-blue-600 dark:text-blue-400 font-bold">{match.league.name}</span>
          </div>
        </div>

        {/* Team Matchup Headers */}
        <div className="flex items-center justify-between gap-4 mb-5 px-2">
          <div className="flex items-center gap-3">
            <TeamCrest
              name={match.home_team.name}
              shortName={match.home_team.short_name}
              logoUrl={match.home_team.logo}
              sport={match.sport}
              size="md"
            />
            <div>
              <p className="text-xs font-bold text-foreground truncate max-w-[140px] sm:max-w-[200px]">
                <span className="inline sm:hidden">{match.home_team.short_name || match.home_team.name.slice(0, 3)}</span>
                <span className="hidden sm:inline">{match.home_team.name}</span>
              </p>
              <span className="text-[10px] font-mono text-muted-foreground uppercase">{match.sport === 'golf' ? 'Golfer 1' : 'Home Side'}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-right">
            <div>
              <p className="text-xs font-bold text-foreground truncate max-w-[140px] sm:max-w-[200px]">
                <span className="inline sm:hidden">{match.away_team.short_name || match.away_team.name.slice(0, 3)}</span>
                <span className="hidden sm:inline">{match.away_team.name}</span>
              </p>
              <span className="text-[10px] font-mono text-muted-foreground uppercase">{match.sport === 'golf' ? 'Golfer 2' : 'Away Side'}</span>
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
        <div className="space-y-3.5">
          {statRows.map((row) => {
            const total = (Number(row.homeVal) + Number(row.awayVal)) || 1;
            const homePct = Math.round((Number(row.homeVal) / total) * 100);
            const awayPct = 100 - homePct;

            return (
              <div key={row.label} className="text-xs group">
                <div className="flex items-center justify-between font-mono mb-1 text-xs">
                  <span className="font-bold text-indigo-700 dark:text-indigo-300 min-w-[70px] text-left">
                    {row.home}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-sans font-medium text-center px-2">
                    {row.label}
                  </span>
                  <span className="font-bold text-orange-700 dark:text-orange-300 min-w-[70px] text-right">
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
      </div>
    </div>
  );
}
