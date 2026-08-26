import type { Match, MatchStatus, SportType } from '@/types';

/**
 * Sport-correct clock and score formatting.
 *
 * Every surface used to render `{period} {minute}'`, which is the SOCCER
 * convention applied to all seven sports. That produced things like "Q3 36'"
 * for basketball (whose clock counts DOWN inside a 12-minute quarter) and
 * "Set 3 112'" for tennis (which has no clock at all).
 *
 * The rules below are the actual broadcast conventions:
 *
 *   soccer      clock counts UP, 45'+n and 90'+n for stoppage      68'
 *   basketball  clock counts DOWN within a 12-minute quarter       Q3 8:32
 *   nfl         clock counts DOWN within a 15-minute quarter       Q4 2:11
 *   tennis      no clock; progress is sets and games               Set 3
 *   cricket     no clock; progress is overs                        12.3 ov
 *   baseball    no clock; progress is innings, top/bottom          Top 7
 *   golf        no clock; progress is rounds                       Round 3
 *
 * `DisplayClock` from the provider is authoritative when present: ESPN already
 * formats it per sport, so it is shown verbatim rather than recomputed.
 */

export type ClockKind = 'count-up' | 'count-down' | 'untimed';

export const CLOCK_KIND: Record<SportType, ClockKind> = {
  soccer: 'count-up',
  basketball: 'count-down',
  nfl: 'count-down',
  tennis: 'untimed',
  cricket: 'untimed',
  baseball: 'untimed',
  golf: 'untimed',
};

/** Regulation length of one period, in minutes. Used to sanity-check a clock. */
const PERIOD_MINUTES: Partial<Record<SportType, number>> = {
  soccer: 45,
  basketball: 12,
  nfl: 15,
};

/** What one unit on the scoreboard is called. */
const SCORE_NOUN: Record<SportType, { one: string; many: string }> = {
  soccer: { one: 'goal', many: 'goals' },
  basketball: { one: 'point', many: 'points' },
  nfl: { one: 'point', many: 'points' },
  tennis: { one: 'set', many: 'sets' },
  cricket: { one: 'run', many: 'runs' },
  baseball: { one: 'run', many: 'runs' },
  golf: { one: 'stroke', many: 'strokes' },
};

export function scoreNoun(sport: SportType, count = 2): string {
  const noun = SCORE_NOUN[sport] ?? SCORE_NOUN.soccer;
  return count === 1 ? noun.one : noun.many;
}

/** Title for the score column, e.g. "Goals" / "Points" / "Sets". */
export function scoreLabel(sport: SportType): string {
  const word = scoreNoun(sport, 2);
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/** Seconds remaining rendered as m:ss, the way a countdown clock reads. */
function toCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Ordinal used for innings and rounds: 1st, 2nd, 3rd, 4th... */
function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/**
 * Normalise whatever the provider put in `period` into a short label.
 * ESPN sends things like "8:32 - 4th Quarter" or "End of 3rd Quarter"; we only
 * want the period part, because the clock is rendered separately.
 */
function shortPeriod(match: Match): string {
  const { sport, period, period_number } = match;
  const raw = (period ?? '').trim();
  const n = period_number ?? inferPeriodNumber(raw);

  switch (sport) {
    case 'soccer': {
      if (/half\s*time|^ht$/i.test(raw)) return 'HT';
      if (/full\s*time|^ft$/i.test(raw)) return 'FT';
      if (/extra/i.test(raw)) return 'ET';
      if (/penalt/i.test(raw)) return 'PENS';
      if (n === 2 || /2nd|second/i.test(raw)) return '2H';
      if (n === 1 || /1st|first/i.test(raw)) return '1H';
      return raw || '1H';
    }

    case 'basketball':
    case 'nfl': {
      if (/half\s*time|^ht$/i.test(raw)) return 'HT';
      if (/overtime|^ot\b/i.test(raw)) return 'OT';
      if (n > 0) return `Q${n}`;
      const q = raw.match(/Q(\d)|(\d)(?:st|nd|rd|th)\s*quarter/i);
      if (q) return `Q${q[1] ?? q[2]}`;
      return raw || 'Q1';
    }

    case 'tennis': {
      if (n > 0) return `Set ${n}`;
      const s = raw.match(/set\s*(\d)/i);
      return s ? `Set ${s[1]}` : raw || 'Set 1';
    }

    case 'cricket': {
      if (n > 0) return `${ordinal(n)} innings`;
      return raw || 'Innings';
    }

    case 'baseball': {
      // "Top 7" / "Bot 7" is the convention; ESPN sends the half in the text.
      const half = /^bot|bottom/i.test(raw) ? 'Bot' : /^top/i.test(raw) ? 'Top' : '';
      if (n > 0) return half ? `${half} ${n}` : `Inn ${n}`;
      return raw || 'Inn 1';
    }

    case 'golf': {
      if (n > 0) return `Round ${n}`;
      const r = raw.match(/round\s*(\d)|^R(\d)/i);
      return r ? `Round ${r[1] ?? r[2]}` : raw || 'Round 1';
    }

    default:
      return raw;
  }
}

/** Best-effort period ordinal when the provider did not send one. */
function inferPeriodNumber(raw: string): number {
  const m = raw.match(/(\d+)(?:st|nd|rd|th)?/);
  return m ? Number(m[1]) : 0;
}

/**
 * The clock as that sport would show it.
 *
 * Returns a short string suitable for a badge. For finished or scheduled
 * matches it returns the status word instead, because a clock is meaningless
 * then.
 */
export function formatClock(match: Match): string {
  const { sport, status } = match;

  if (status === 'FINISHED') return sport === 'soccer' ? 'FT' : 'Final';
  if (status === 'HALF_TIME') return 'HT';
  if (status === 'POSTPONED') return 'Postponed';
  if (status === 'CANCELLED') return 'Cancelled';
  if (status === 'SCHEDULED') return 'Scheduled';

  const period = shortPeriod(match);
  const kind = CLOCK_KIND[sport] ?? 'count-up';
  const provided = (match.display_clock ?? '').trim();

  switch (kind) {
    case 'count-up': {
      // Soccer: the provider's own "45+2" already encodes stoppage time. The
      // tick mark is appended unless it is already there, so a provider clock
      // and a derived one read identically.
      if (provided) {
        return provided.endsWith("'") ? provided : `${provided}'`;
      }
      const minute = match.minute ?? 0;
      if (minute <= 0) return period;
      const regulation = PERIOD_MINUTES.soccer ?? 45;
      const limit = (match.period_number ?? 2) >= 2 ? regulation * 2 : regulation;
      // Past the end of a half, show stoppage as 45+n / 90+n.
      if (minute > limit) return `${limit}+${minute - limit}'`;
      return `${minute}'`;
    }

    case 'count-down': {
      // Basketball and NFL count down inside the period, so the period has to
      // travel with the clock: "8:32" alone does not say which quarter.
      if (provided) return `${period} ${provided}`;
      if (typeof match.clock_seconds === 'number' && match.clock_seconds > 0) {
        return `${period} ${toCountdown(match.clock_seconds)}`;
      }
      return period;
    }

    case 'untimed':
    default: {
      // Cricket sends overs in display_clock ("12.3"); everything else is
      // adequately described by the period alone.
      if (sport === 'cricket' && provided) return `${provided} ov`;
      if (provided && sport !== 'tennis' && sport !== 'golf') {
        return `${period} · ${provided}`;
      }
      return period;
    }
  }
}

/**
 * True when the sport's clock is a live ticking value worth animating or
 * refreshing every second. Untimed sports should not pulse a clock.
 */
export function hasLiveClock(sport: SportType): boolean {
  return CLOCK_KIND[sport] !== 'untimed';
}

/**
 * The scoreline, in the sport's convention.
 *
 * Golf is the notable exception: strokes are shown relative to par, and lower
 * is better, so a raw "16-14" would read backwards.
 */
export function formatScore(match: Match): string {
  const home = match.home_score ?? 0;
  const away = match.away_score ?? 0;

  if (match.sport === 'golf') {
    return `${toPar(home)} · ${toPar(away)}`;
  }
  return `${home} - ${away}`;
}

/** Golf convention: E for level par, otherwise a signed number. */
export function toPar(strokes: number): string {
  if (!strokes) return 'E';
  return strokes > 0 ? `+${strokes}` : `${strokes}`;
}

/** In golf the lower score leads; everywhere else the higher score leads. */
export function leaderSide(match: Match): 'HOME' | 'AWAY' | 'LEVEL' {
  const home = match.home_score ?? 0;
  const away = match.away_score ?? 0;
  if (home === away) return 'LEVEL';
  const homeLeads = match.sport === 'golf' ? home < away : home > away;
  return homeLeads ? 'HOME' : 'AWAY';
}

/**
 * Label for the per-period breakdown, e.g. the "25-22 | 18-20" strip.
 */
export function periodScoresLabel(sport: SportType): string {
  switch (sport) {
    case 'basketball':
    case 'nfl':
      return 'By quarter';
    case 'tennis':
      return 'By set';
    case 'baseball':
      return 'By innings';
    case 'cricket':
      return 'By innings';
    case 'golf':
      return 'By round';
    default:
      return 'By half';
  }
}

/**
 * Short status word for a non-live match, used where a clock badge would go.
 */
export function statusLabel(status: MatchStatus, sport: SportType): string {
  switch (status) {
    case 'FINISHED':
      return sport === 'soccer' ? 'FT' : 'Final';
    case 'HALF_TIME':
      return 'HT';
    case 'POSTPONED':
      return 'Postponed';
    case 'CANCELLED':
      return 'Cancelled';
    case 'SCHEDULED':
      return 'Upcoming';
    default:
      return 'Live';
  }
}

/**
 * Clock label for a single timeline event.
 *
 * MatchEvent only carries an elapsed `minute`, which is the soccer model. For
 * the count-down sports we derive the period from that elapsed figure, since
 * "Q3" is a truthful reading of minute 36 of a 48-minute game whereas "36'"
 * is not something a basketball broadcast would ever show. Untimed sports get
 * no clock at all, because an elapsed minute says nothing about a set, an
 * innings or a round.
 */
export function formatEventClock(
  sport: SportType,
  minute: number,
  extraMinute?: number
): string {
  if (!Number.isFinite(minute) || minute < 0) return '';

  switch (sport) {
    case 'soccer':
      return extraMinute ? `${minute}+${extraMinute}'` : `${minute}'`;

    case 'basketball': {
      const q = Math.min(4, Math.max(1, Math.ceil(minute / 12)));
      return minute > 48 ? 'OT' : `Q${q}`;
    }

    case 'nfl': {
      const q = Math.min(4, Math.max(1, Math.ceil(minute / 15)));
      return minute > 60 ? 'OT' : `Q${q}`;
    }

    default:
      // tennis, cricket, baseball, golf: an elapsed minute is not meaningful.
      return '';
  }
}
