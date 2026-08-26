import type { Match } from '@/types';

/**
 * Ordering for the live feed.
 *
 * The feed previously rendered in whatever order the API returned, so a match
 * that had just scored could sit below three goalless fixtures. What a viewer
 * wants is the opposite: whatever just happened, first.
 *
 * The rank is:
 *   1. matches that scored in the last SCORE_HIGHLIGHT_MS  (most recent first)
 *   2. everything else live                                (nearest to finishing first)
 *   3. upcoming                                            (soonest kick-off first)
 *   4. finished                                            (most recently finished first)
 */

/** How long a match stays pinned to the top after a score. */
export const SCORE_HIGHLIGHT_MS = 90_000;

export interface ScoreFlash {
  /** Epoch ms of the score change. */
  at: number;
  /** Which side scored, for the highlight. */
  side: 'HOME' | 'AWAY';
}

export type ScoreFlashMap = Record<string, ScoreFlash>;

/**
 * Compare two snapshots of the feed and return the matches whose score moved.
 *
 * Only increases count. A correction downward (an admin fixing a wrong score,
 * or a goal being chalked off by VAR) should not fire a celebration.
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

/** Drop flashes that have aged out, so the map does not grow forever. */
export function pruneFlashes(flashes: ScoreFlashMap, now = Date.now()): ScoreFlashMap {
  const kept: ScoreFlashMap = {};
  for (const [id, flash] of Object.entries(flashes)) {
    if (now - flash.at < SCORE_HIGHLIGHT_MS) kept[id] = flash;
  }
  return kept;
}

/** How far through its match a live fixture is, used to break ties. */
function liveProgress(match: Match): number {
  if (typeof match.minute === 'number' && match.minute > 0) return match.minute;
  if (typeof match.period_number === 'number') return match.period_number * 100;
  return 0;
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
 * Sort a feed for display. Pure: returns a new array.
 */
export function orderLiveFeed(
  matches: Match[],
  flashes: ScoreFlashMap,
  now = Date.now()
): Match[] {
  return [...matches].sort((a, b) => {
    const flashA = flashes[a.id];
    const flashB = flashes[b.id];
    const hotA = flashA && now - flashA.at < SCORE_HIGHLIGHT_MS;
    const hotB = flashB && now - flashB.at < SCORE_HIGHLIGHT_MS;

    // 1. Just scored wins outright, most recent goal first.
    if (hotA && hotB) return flashB!.at - flashA!.at;
    if (hotA) return -1;
    if (hotB) return 1;

    // 2. Live before upcoming before finished.
    const rankA = statusRank(a);
    const rankB = statusRank(b);
    if (rankA !== rankB) return rankA - rankB;

    // 3. Within live, the match closest to finishing is the most urgent.
    if (rankA === 0) return liveProgress(b) - liveProgress(a);

    // 4. Within upcoming, soonest first.
    if (rankA === 1) {
      return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
    }

    // 5. Within finished, most recent first.
    return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
  });
}
