import type { Match } from '@/types';

/**
 * Stable Ordering for the Live Feed.
 *
 * Matches maintain a stable, fixed order (Live -> Scheduled -> Finished,
 * sorted deterministically by start time and league/ID).
 * Matches never reorder or jump positions as clocks tick or goals are scored.
 */

export interface ScoreFlash {
  /** Epoch ms of the score change. */
  at: number;
  /** Which side scored, for the highlight. */
  side: 'HOME' | 'AWAY';
}

export type ScoreFlashMap = Record<string, ScoreFlash>;

export const SCORE_HIGHLIGHT_MS = 90_000;

/**
 * Compare two snapshots of the feed and return the matches whose score moved.
 */
export function detectScoreChanges(
  previous: Match[],
  next: Match[]
): { matchId: string; side: 'HOME' | 'AWAY'; match: Match }[] {
  if (previous.length === 0) return [];

  const before = new Map(previous.map((m) => [m.id, m]));
  const changes: { matchId: string; side: 'HOME' | 'AWAY'; match: Match }[] = [];

  for (const match of next) {
    const prev = before.get(match.id);
    if (!prev || match.status !== 'LIVE') continue;

    if ((match.home_score ?? 0) > (prev.home_score ?? 0)) {
      changes.push({ matchId: match.id, side: 'HOME', match });
    } else if ((match.away_score ?? 0) > (prev.away_score ?? 0)) {
      changes.push({ matchId: match.id, side: 'AWAY', match });
    }
  }

  return changes;
}

/** Drop flashes that have aged out. */
export function pruneFlashes(flashes: ScoreFlashMap, now = Date.now()): ScoreFlashMap {
  const kept: ScoreFlashMap = {};
  for (const [id, flash] of Object.entries(flashes)) {
    if (now - flash.at < SCORE_HIGHLIGHT_MS) kept[id] = flash;
  }
  return kept;
}

function statusRank(match: Match): number {
  switch (match.status) {
    case 'LIVE':
    case 'HALF_TIME':
      return 0;
    case 'SCHEDULED':
      return 1;
    case 'FINISHED':
      return 2;
    default:
      return 3;
  }
}

/**
 * Sort a feed for display with guaranteed stability.
 * Does not reshuffle or jump positions during live ticks.
 */
export function orderLiveFeed(
  matches: Match[],
  _flashes?: ScoreFlashMap,
  _now = Date.now()
): Match[] {
  return [...matches].sort((a, b) => {
    // 1. Live before upcoming before finished.
    const rankA = statusRank(a);
    const rankB = statusRank(b);
    if (rankA !== rankB) return rankA - rankB;

    // 2. Deterministic stable sort by League Name
    const leagueA = a.league?.name || '';
    const leagueB = b.league?.name || '';
    const leagueDiff = leagueA.localeCompare(leagueB);
    if (leagueDiff !== 0) return leagueDiff;

    // 3. Stable sort by Start Time
    const timeA = new Date(a.start_time).getTime() || 0;
    const timeB = new Date(b.start_time).getTime() || 0;
    if (timeA !== timeB) return timeA - timeB;

    // 4. Tie-break by deterministic match ID
    return a.id.localeCompare(b.id);
  });
}
