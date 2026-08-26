'use client';

import { useEffect, useState } from 'react';
import type { Match } from '@/types';
import { CLOCK_KIND } from '@/lib/sportFormat';

/**
 * Advances match clocks between server updates.
 *
 * The feed is polled every 10 seconds, so without this the clock sat frozen on
 * whatever the last poll returned and jumped in 10-second steps. Broadcast
 * clocks tick every second, and a scoreboard that visibly stalls reads as
 * broken even when the data behind it is fine.
 *
 * This only interpolates; it never invents. Each tick moves the clock forward
 * from the last server value by the time actually elapsed since that value
 * arrived, and the next poll snaps it back to the truth. Untimed sports
 * (tennis, cricket, baseball, golf) are left alone.
 */
export function useLiveClock(matches: Match[]): Match[] {
  // A counter is enough to force a re-render each second; the projection below
  // is computed from timestamps, not from this value.
  const [, setTick] = useState(0);

  const hasTickingMatch = matches.some(
    (m) => m.status === 'LIVE' && CLOCK_KIND[m.sport] !== 'untimed'
  );

  useEffect(() => {
    if (!hasTickingMatch) return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [hasTickingMatch]);

  if (!hasTickingMatch) return matches;
  return matches.map(projectClock);
}

/** Single-match variant for the detail page. */
export function useLiveClockForMatch(match: Match | null): Match | null {
  const [, setTick] = useState(0);
  const isTicking = Boolean(
    match && match.status === 'LIVE' && CLOCK_KIND[match.sport] !== 'untimed'
  );

  useEffect(() => {
    if (!isTicking) return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [isTicking]);

  if (!match || !isTicking) return match;
  return projectClock(match);
}

/**
 * Project one match's clock forward to now.
 *
 * `clock_updated_at` is stamped by the client when a poll or socket delta
 * arrives (see stampClock). Without it there is no way to know how stale the
 * server value is, so the match is returned untouched.
 */
function projectClock(match: Match): Match {
  if (match.status !== 'LIVE') return match;

  const kind = CLOCK_KIND[match.sport];
  if (kind === 'untimed') return match;

  const stampedAt = match.clock_updated_at;
  if (!stampedAt) return match;

  const elapsedSec = Math.floor((Date.now() - stampedAt) / 1000);
  // Ignore nonsense: a negative drift, or a value so stale the feed is likely
  // dead and projecting further would be a lie.
  if (elapsedSec <= 0 || elapsedSec > 180) return match;

  if (kind === 'count-up') {
    const baseMinute = match.minute ?? 0;
    if (baseMinute <= 0) return match;

    const projectedMinute = baseMinute + Math.floor(elapsedSec / 60);
    if (projectedMinute === baseMinute) return match;

    return {
      ...match,
      minute: projectedMinute,
      // The provider's own string is now out of date; drop it so formatClock
      // falls back to deriving the display from the projected minute.
      display_clock: undefined,
    };
  }

  // count-down: burn the elapsed seconds off the remaining clock.
  const baseSeconds = match.clock_seconds ?? 0;
  if (baseSeconds <= 0) return match;

  const remaining = Math.max(0, baseSeconds - elapsedSec);
  if (remaining === baseSeconds) return match;

  return {
    ...match,
    clock_seconds: remaining,
    display_clock: `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`,
  };
}

/**
 * Stamp a match with the moment its clock was received.
 *
 * Call this on everything coming off the wire; the projection above depends on
 * it. The field is client-only and never sent back to the server.
 */
export function stampClock<T extends Match>(match: T): T {
  return { ...match, clock_updated_at: Date.now() };
}

export function stampClocks(matches: Match[]): Match[] {
  const now = Date.now();
  return matches.map((m) => ({ ...m, clock_updated_at: now }));
}
