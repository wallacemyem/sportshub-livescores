export type SportType = 'soccer' | 'basketball' | 'tennis' | 'nfl' | 'cricket' | 'baseball' | 'golf';

export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'HALF_TIME' | 'FINISHED' | 'POSTPONED' | 'CANCELLED';

export type EventType = 'GOAL' | 'YELLOW_CARD' | 'RED_CARD' | 'PENALTY' | 'SUBSTITUTION' | 'VAR' | 'POINT' | 'SET_WON' | 'TOUCHDOWN' | 'WICKET' | 'HOMERUN';

export interface Team {
  id: string;
  name: string;
  short_name: string;
  logo: string;
  country?: string;
}

export interface League {
  id: string;
  name: string;
  sport: SportType;
  country: string;
  logo: string;
  flag?: string;
}

export interface MatchStats {
  possession_home: number;
  possession_away: number;
  shots_home: number;
  shots_away: number;
  shots_on_target_home: number;
  shots_on_target_away: number;
  corners_home: number;
  corners_away: number;
  fouls_home: number;
  fouls_away: number;
  yellow_cards_home: number;
  yellow_cards_away: number;
  red_cards_home: number;
  red_cards_away: number;
  xg_home: number;
  xg_away: number;
  attacking_pressure?: 'HOME' | 'AWAY' | 'NEUTRAL';
  ball_position_x?: number; // 0 to 100 on pitch
  ball_position_y?: number; // 0 to 100 on pitch

  // Comprehensive Soccer Stats
  passes_home?: number;
  passes_away?: number;
  pass_accuracy_home?: number;
  pass_accuracy_away?: number;
  tackles_home?: number;
  tackles_away?: number;
  saves_home?: number;
  saves_away?: number;
  offsides_home?: number;
  offsides_away?: number;
  shots_blocked_home?: number;
  shots_blocked_away?: number;
  big_chances_home?: number;
  big_chances_away?: number;

  // Basketball & Other Sports
  field_goals_home?: string;
  field_goals_away?: string;
  three_pointers_home?: string;
  three_pointers_away?: string;
  free_throws_home?: string;
  free_throws_away?: string;
  rebounds_home?: number;
  rebounds_away?: number;
  assists_home?: number;
  assists_away?: number;
  steals_home?: number;
  steals_away?: number;
  blocks_home?: number;
  blocks_away?: number;
  turnovers_home?: number;
  turnovers_away?: number;
  points_in_paint_home?: number;
  points_in_paint_away?: number;
  fast_break_home?: number;
  fast_break_away?: number;

  // NFL
  total_yards_home?: number;
  total_yards_away?: number;
  passing_yards_home?: string;
  passing_yards_away?: string;
  rushing_yards_home?: string;
  rushing_yards_away?: string;
  first_downs_home?: number;
  first_downs_away?: number;
  time_of_poss_home?: string;
  time_of_poss_away?: string;

  // Baseball
  hits_home?: number;
  hits_away?: number;
  errors_home?: number;
  errors_away?: number;
  home_runs_home?: number;
  home_runs_away?: number;
  strikeouts_home?: number;
  strikeouts_away?: number;
  walks_home?: number;
  walks_away?: number;
}

export interface Player {
  id: string;
  name: string;
  number: number;
  pos: string;
  photo?: string;
  grid?: string;
  rating?: number;
  age?: number;
  nationality?: string;
  is_captain?: boolean;
}

export interface Coach {
  id?: string;
  name: string;
  photo?: string;
}

export interface TeamLineup {
  team_id: string;
  team_name: string;
  formation: string;
  coach: Coach;
  starting_xi: Player[];
  substitutes: Player[];
}

export interface MatchLineups {
  match_id: string;
  home: TeamLineup;
  away: TeamLineup;
}

export interface PlayerMatchStat {
  player: Player;
  minutes: number;
  rating: number;
  goals: number;
  assists: number;
  shots_total: number;
  shots_on_target: number;
  passes_total: number;
  pass_accuracy: number;
  tackles: number;
  duels_won: number;
  fouls_committed: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
}

export interface TeamPlayerStats {
  team_id: string;
  team_name: string;
  players: PlayerMatchStat[];
}

export interface MatchPlayerStats {
  match_id: string;
  home: TeamPlayerStats;
  away: TeamPlayerStats;
}

export interface HeadToHeadItem {
  id: string;
  date: string;
  home_team: Team;
  away_team: Team;
  home_score: number;
  away_score: number;
  status: MatchStatus;
  league: League;
}

export interface HeadToHeadSummary {
  home_team_id: string;
  away_team_id: string;
  total_matches: number;
  home_wins: number;
  away_wins: number;
  draws: number;
  matches: HeadToHeadItem[];
}

export interface MatchEvent {
  id: string;
  match_id: string;
  type: EventType;
  minute: number;
  extra_minute?: number;
  team_side: 'HOME' | 'AWAY';
  player_name: string;
  player_photo?: string;
  assist_name?: string;
  assist_photo?: string;
  detail?: string;
  created_at: string;
}

export interface OddsOutcome {
  name: string;
  price: number;
  previous?: number;
  probability?: number;
}

export interface BookmakerOdds {
  bookmaker_key: string;
  bookmaker_title: string;
  last_update: string;
  home_win: number;
  draw?: number;
  away_win: number;
  over_25?: number;
  under_25?: number;
  spread_home?: number;
  spread_away?: number;
  outcomes?: OddsOutcome[];
}

export interface MatchOdds {
  match_id: string;
  consensus: BookmakerOdds;
  bookmakers: BookmakerOdds[];
  last_updated: string;
}

export interface Match {
  id: string;
  sport: SportType;
  league: League;
  home_team: Team;
  away_team: Team;
  home_score: number;
  away_score: number;
  period_scores?: string[];
  status: MatchStatus;
  period: string;
  /**
   * Elapsed minutes. Only meaningful where the clock counts up (soccer);
   * 0 for every other sport. Use formatClock() from lib/sportFormat rather
   * than rendering this directly.
   */
  minute: number;
  /** Provider clock text, already in the sport's convention ("45+2", "8:32", "12.3"). */
  display_clock?: string;
  /** Ordinal period: half, quarter, set, innings or round. */
  period_number?: number;
  /** Seconds remaining in the period, for sports that count down. */
  clock_seconds?: number;
  /**
   * Client-only: epoch ms when this clock value arrived. Set by stampClock()
   * so useLiveClock can advance the display between polls. Never sent to the
   * server.
   */
  clock_updated_at?: number;
  start_time: string;
  stats: MatchStats;
  events: MatchEvent[];
  odds?: MatchOdds;
  lineups?: MatchLineups;
  player_stats?: MatchPlayerStats;
  h2h?: HeadToHeadSummary;
  venue?: string;
  referee?: string;
  has_live_audio?: boolean;
}

export type BetLegStatus = 'PENDING' | 'RUNNING' | 'WON' | 'LOST';

export interface BetSlipLeg {
  id: string;
  match_id: string;
  match: Match;
  market: string;
  selection: string;
  odds: number;
  status: BetLegStatus;
  current_score: string;
  fulfillment_pct: number;
}

export type BetSlipStatus = 'PENDING' | 'RUNNING' | 'WON' | 'LOST' | 'CASHED_OUT';

export interface BetSlip {
  id: string;
  user_id?: string;
  bookmaker: string;
  booking_code: string;
  stake: number;
  total_odds: number;
  potential_win: number;
  current_cashout: number;
  cashout_probability: number;
  status: BetSlipStatus;
  legs: BetSlipLeg[];
  created_at: string;
  updated_at: string;
}

export interface LiveDelta {
  type: 'SCORE_UPDATE' | 'CLOCK_TICK' | 'EVENT_LOG' | 'ODDS_UPDATE' | 'MATCH_FINISHED' | 'STATS_UPDATE' | 'PITCH_UPDATE';
  match_id: string;
  sport: SportType;
  home_score?: number;
  away_score?: number;
  period?: string;
  minute?: number;
  display_clock?: string;
  period_number?: number;
  clock_seconds?: number;
  status?: MatchStatus;
  event?: MatchEvent;
  stats?: MatchStats;
  odds?: MatchOdds;
  timestamp: number;
}

export interface UserSubscription {
  id: string;
  email: string;
  name: string;
  plan: 'free' | 'pro';
  plan_expiry?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content_html: string;
  cover_image: string;
  category: string;
  tags: string[];
  author_name: string;
  author_role?: string;
  author_avatar: string;
  match_id?: string;
  match?: Match;
  read_time_min: number;
  views: number;
  likes: number;
  status: 'published' | 'draft';
  published_at: string;
  created_at: string;
  updated_at: string;
}

export interface SupportTicketMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  sender_name: string;
  message: string;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  subject: string;
  category: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  messages: SupportTicketMessage[];
  created_at: string;
  updated_at: string;
}

/* ---------------------------------------------------------------------------
 * Admin console
 *
 * These mirror the pre-joined rows returned by /api/v1/admin/*. The joins
 * (slip → user, payment → payer) happen server-side so a paginated table can
 * show a total that agrees with its rows.
 * ------------------------------------------------------------------------- */

export type UserPlan = 'free' | 'pro';
export type UserStatus = 'active' | 'suspended';
export type PaymentGateway = 'flutterwave' | 'cryptomus';
export type TransactionStatus = 'successful' | 'paid' | 'pending' | 'failed' | 'refunded';

export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  plan: UserPlan;
  plan_expiry?: string;
  status: UserStatus;
  country: string;
  signup_source: string;
  slips_scanned: number;
  active_slips: number;
  lifetime_value_usd: number;
  last_seen_at: string;
  created_at: string;
}

export interface AdminSlipRow {
  id: string;
  booking_code: string;
  bookmaker: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_plan: UserPlan;
  legs: number;
  legs_won: number;
  legs_lost: number;
  stake: number;
  total_odds: number;
  potential_win: number;
  current_cashout: number;
  status: BetSlipStatus;
  parse_ms: number;
  scanned_at: string;
}

export interface AdminTransactionRow {
  id: string;
  reference: string;
  user_id: string;
  user_name: string;
  user_email: string;
  gateway: PaymentGateway;
  method: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  plan: UserPlan;
  billing_cycle: string;
  created_at: string;
}

export interface AdminTimePoint {
  label: string;
  revenue_usd: number;
  signups: number;
  slips: number;
}

export interface AdminOverview {
  total_users: number;
  new_users_7d: number;
  pro_users: number;
  suspended_users: number;
  mrr_usd: number;
  revenue_usd: number;
  revenue_7d_usd: number;
  arpu_usd: number;
  slips_scanned_total: number;
  slips_scanned_24h: number;
  active_slips: number;
  parse_success_pct: number;
  failed_payments_7d: number;
  open_tickets: number;
  connected_clients: number;
  live_matches: number;
  ingestion_latency_ms: number;
  trend: AdminTimePoint[];
  slips_by_bookmaker: Record<string, number>;
  plan_split: Record<string, number>;
}

export interface PushSubscriptionItem {
  id: string;
  user_id?: string;
  endpoint: string;
  device_type: 'android' | 'ios' | 'desktop';
  channels: string[];
  user_agent?: string;
  ip_address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_seen_at: string;
}

export interface NotificationChannelInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  subscribers: number;
}

export interface BroadcastLogItem {
  id: string;
  channel: string;
  title: string;
  body: string;
  url?: string;
  sent_count: number;
  failed_count: number;
  sent_at: string;
}

export interface NotificationStats {
  total_subscriptions: number;
  active_android: number;
  active_ios: number;
  active_desktop: number;
  channels: NotificationChannelInfo[];
  recent_broadcasts: BroadcastLogItem[];
}
