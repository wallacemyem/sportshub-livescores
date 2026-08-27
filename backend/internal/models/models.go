package models

import (
	"time"
)

type SportType string

const (
	SportSoccer     SportType = "soccer"
	SportBasketball SportType = "basketball"
	SportTennis     SportType = "tennis"
	SportNFL        SportType = "nfl"
	SportCricket    SportType = "cricket"
	SportBaseball   SportType = "baseball"
	SportGolf       SportType = "golf"
)

type MatchStatus string

const (
	StatusScheduled MatchStatus = "SCHEDULED"
	StatusLive      MatchStatus = "LIVE"
	StatusHalfTime  MatchStatus = "HALF_TIME"
	StatusFinished  MatchStatus = "FINISHED"
	StatusPostponed MatchStatus = "POSTPONED"
	StatusCancelled MatchStatus = "CANCELLED"
)

type EventType string

const (
	EventGoal         EventType = "GOAL"
	EventYellowCard   EventType = "YELLOW_CARD"
	EventRedCard      EventType = "RED_CARD"
	EventPenalty      EventType = "PENALTY"
	EventSubstitution EventType = "SUBSTITUTION"
	EventVAR          EventType = "VAR"
	EventPoint        EventType = "POINT"
	EventSetWon       EventType = "SET_WON"
	EventTouchdown    EventType = "TOUCHDOWN"
	EventWicket       EventType = "WICKET"
	EventHomeRun      EventType = "HOMERUN"
)

type Team struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	ShortName string `json:"short_name"`
	Logo      string `json:"logo"`
	Country   string `json:"country,omitempty"`
}

type League struct {
	ID      string    `json:"id"`
	Name    string    `json:"name"`
	Sport   SportType `json:"sport"`
	Country string    `json:"country"`
	Logo    string    `json:"logo"`
	Flag    string    `json:"flag,omitempty"`
}

type MatchStats struct {
	PossessionHome    int     `json:"possession_home"`
	PossessionAway    int     `json:"possession_away"`
	ShotsHome         int     `json:"shots_home"`
	ShotsAway         int     `json:"shots_away"`
	ShotsOnTargetHome int     `json:"shots_on_target_home"`
	ShotsOnTargetAway int     `json:"shots_on_target_away"`
	CornersHome       int     `json:"corners_home"`
	CornersAway       int     `json:"corners_away"`
	FoulsHome         int     `json:"fouls_home"`
	FoulsAway         int     `json:"fouls_away"`
	YellowCardsHome   int     `json:"yellow_cards_home"`
	YellowCardsAway   int     `json:"yellow_cards_away"`
	RedCardsHome      int     `json:"red_cards_home"`
	RedCardsAway      int     `json:"red_cards_away"`
	XGHome            float64 `json:"xg_home"`
	XGAway            float64 `json:"xg_away"`
	AttackingPressure string  `json:"attacking_pressure,omitempty"` // "HOME", "AWAY", "NEUTRAL"
	BallPositionX     float64 `json:"ball_position_x,omitempty"`    // 0 to 100 on pitch
	BallPositionY     float64 `json:"ball_position_y,omitempty"`    // 0 to 100 on pitch

	// Comprehensive Soccer Stats from API-Sports
	PassesHome        int     `json:"passes_home,omitempty"`
	PassesAway        int     `json:"passes_away,omitempty"`
	PassAccuracyHome  int     `json:"pass_accuracy_home,omitempty"`
	PassAccuracyAway  int     `json:"pass_accuracy_away,omitempty"`
	TacklesHome       int     `json:"tackles_home,omitempty"`
	TacklesAway       int     `json:"tackles_away,omitempty"`
	SavesHome         int     `json:"saves_home,omitempty"`
	SavesAway         int     `json:"saves_away,omitempty"`
	OffsidesHome      int     `json:"offsides_home,omitempty"`
	OffsidesAway      int     `json:"offsides_away,omitempty"`
	ShotsBlockedHome  int     `json:"shots_blocked_home,omitempty"`
	ShotsBlockedAway  int     `json:"shots_blocked_away,omitempty"`
	BigChancesHome    int     `json:"big_chances_home,omitempty"`
	BigChancesAway    int     `json:"big_chances_away,omitempty"`

	// Comprehensive Basketball / NFL / Baseball / Other Sports Stats
	FieldGoalsHome    string  `json:"field_goals_home,omitempty"`
	FieldGoalsAway    string  `json:"field_goals_away,omitempty"`
	ThreePointersHome string  `json:"three_pointers_home,omitempty"`
	ThreePointersAway string  `json:"three_pointers_away,omitempty"`
	FreeThrowsHome    string  `json:"free_throws_home,omitempty"`
	FreeThrowsAway    string  `json:"free_throws_away,omitempty"`
	ReboundsHome      int     `json:"rebounds_home,omitempty"`
	ReboundsAway      int     `json:"rebounds_away,omitempty"`
	AssistsHome       int     `json:"assists_home,omitempty"`
	AssistsAway       int     `json:"assists_away,omitempty"`
	StealsHome        int     `json:"steals_home,omitempty"`
	StealsAway        int     `json:"steals_away,omitempty"`
	BlocksHome        int     `json:"blocks_home,omitempty"`
	BlocksAway        int     `json:"blocks_away,omitempty"`
	TurnoversHome     int     `json:"turnovers_home,omitempty"`
	TurnoversAway     int     `json:"turnovers_away,omitempty"`
	PointsInPaintHome int     `json:"points_in_paint_home,omitempty"`
	PointsInPaintAway int     `json:"points_in_paint_away,omitempty"`
	FastBreakHome     int     `json:"fast_break_home,omitempty"`
	FastBreakAway     int     `json:"fast_break_away,omitempty"`

	// NFL / Gridiron
	TotalYardsHome    int     `json:"total_yards_home,omitempty"`
	TotalYardsAway    int     `json:"total_yards_away,omitempty"`
	PassingYardsHome  string  `json:"passing_yards_home,omitempty"`
	PassingYardsAway  string  `json:"passing_yards_away,omitempty"`
	RushingYardsHome  string  `json:"rushing_yards_home,omitempty"`
	RushingYardsAway  string  `json:"rushing_yards_away,omitempty"`
	FirstDownsHome    int     `json:"first_downs_home,omitempty"`
	FirstDownsAway    int     `json:"first_downs_away,omitempty"`
	TimeOfPossHome    string  `json:"time_of_poss_home,omitempty"`
	TimeOfPossAway    string  `json:"time_of_poss_away,omitempty"`

	// Baseball
	HitsHome          int     `json:"hits_home,omitempty"`
	HitsAway          int     `json:"hits_away,omitempty"`
	ErrorsHome        int     `json:"errors_home,omitempty"`
	ErrorsAway        int     `json:"errors_away,omitempty"`
	HomeRunsHome      int     `json:"home_runs_home,omitempty"`
	HomeRunsAway      int     `json:"home_runs_away,omitempty"`
	StrikeoutsHome    int     `json:"strikeouts_home,omitempty"`
	StrikeoutsAway    int     `json:"strikeouts_away,omitempty"`
	WalksHome         int     `json:"walks_home,omitempty"`
	WalksAway         int     `json:"walks_away,omitempty"`
}

type Player struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Number      int     `json:"number"`
	Position    string  `json:"pos"` // "GK", "DF", "MF", "FW", "PG", "SG", "SF", "PF", "C", "QB", "RB", "WR", etc.
	Photo       string  `json:"photo,omitempty"`
	Grid        string  `json:"grid,omitempty"` // "1:1", "2:3", etc.
	Rating      float64 `json:"rating,omitempty"`
	Age         int     `json:"age,omitempty"`
	Nationality string  `json:"nationality,omitempty"`
	IsCaptain   bool    `json:"is_captain,omitempty"`
}

type Coach struct {
	ID    string `json:"id,omitempty"`
	Name  string `json:"name"`
	Photo string `json:"photo,omitempty"`
}

type TeamLineup struct {
	TeamID      string   `json:"team_id"`
	TeamName    string   `json:"team_name"`
	Formation   string   `json:"formation"`
	Coach       Coach    `json:"coach"`
	StartingXI  []Player `json:"starting_xi"`
	Substitutes []Player `json:"substitutes"`
}

type MatchLineups struct {
	MatchID string     `json:"match_id"`
	Home    TeamLineup `json:"home"`
	Away    TeamLineup `json:"away"`
}

type PlayerMatchStat struct {
	Player         Player  `json:"player"`
	MinutesPlayed  int     `json:"minutes"`
	Rating         float64 `json:"rating"`
	Goals          int     `json:"goals"`
	Assists        int     `json:"assists"`
	ShotsTotal     int     `json:"shots_total"`
	ShotsOnTarget  int     `json:"shots_on_target"`
	PassesTotal    int     `json:"passes_total"`
	PassAccuracy   int     `json:"pass_accuracy"`
	Tackles        int     `json:"tackles"`
	DuelsWon       int     `json:"duels_won"`
	FoulsCommitted int     `json:"fouls_committed"`
	YellowCards    int     `json:"yellow_cards"`
	RedCards       int     `json:"red_cards"`
	Saves          int     `json:"saves"`
}

type TeamPlayerStats struct {
	TeamID   string            `json:"team_id"`
	TeamName string            `json:"team_name"`
	Players  []PlayerMatchStat `json:"players"`
}

type MatchPlayerStats struct {
	MatchID string          `json:"match_id"`
	Home    TeamPlayerStats `json:"home"`
	Away    TeamPlayerStats `json:"away"`
}

type HeadToHeadItem struct {
	ID        string      `json:"id"`
	Date      time.Time   `json:"date"`
	HomeTeam  Team        `json:"home_team"`
	AwayTeam  Team        `json:"away_team"`
	HomeScore int         `json:"home_score"`
	AwayScore int         `json:"away_score"`
	Status    MatchStatus `json:"status"`
	League    League      `json:"league"`
}

type HeadToHeadSummary struct {
	HomeTeamID   string           `json:"home_team_id"`
	AwayTeamID   string           `json:"away_team_id"`
	TotalMatches int              `json:"total_matches"`
	HomeWins     int              `json:"home_wins"`
	AwayWins     int              `json:"away_wins"`
	Draws        int              `json:"draws"`
	Matches      []HeadToHeadItem `json:"matches"`
}

type MatchEvent struct {
	ID          string    `json:"id"`
	MatchID     string    `json:"match_id"`
	Type        EventType `json:"type"`
	Minute      int       `json:"minute"`
	ExtraMinute int       `json:"extra_minute,omitempty"`
	TeamSide    string    `json:"team_side"` // "HOME" or "AWAY"
	PlayerName  string    `json:"player_name"`
	PlayerPhoto string    `json:"player_photo,omitempty"`
	AssistName  string    `json:"assist_name,omitempty"`
	AssistPhoto string    `json:"assist_photo,omitempty"`
	Detail      string    `json:"detail,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

type OddsOutcome struct {
	Name        string  `json:"name"`        // "Home", "Draw", "Away", "Over 2.5", "Under 2.5", etc.
	Price       float64 `json:"price"`       // 1.85, 3.40, 4.20
	Previous    float64 `json:"previous"`    // For showing movement arrows
	Probability float64 `json:"probability"` // Implied %
}

type BookmakerOdds struct {
	BookmakerKey string        `json:"bookmaker_key"` // "bet365", "pinnacle", "1xbet", "draftkings"
	BookmakerTitle string      `json:"bookmaker_title"`
	LastUpdate   time.Time     `json:"last_update"`
	HomeWin      float64       `json:"home_win"`
	Draw         float64       `json:"draw,omitempty"`
	AwayWin      float64       `json:"away_win"`
	Over25       float64       `json:"over_25,omitempty"`
	Under25      float64       `json:"under_25,omitempty"`
	SpreadHome   float64       `json:"spread_home,omitempty"`
	SpreadAway   float64       `json:"spread_away,omitempty"`
	Outcomes     []OddsOutcome `json:"outcomes,omitempty"`
}

type MatchOdds struct {
	MatchID     string          `json:"match_id"`
	Consensus   BookmakerOdds   `json:"consensus"`
	Bookmakers  []BookmakerOdds `json:"bookmakers"`
	LastUpdated time.Time       `json:"last_updated"`
}

type Match struct {
	ID          string      `json:"id"`
	Sport       SportType   `json:"sport"`
	League      League      `json:"league"`
	HomeTeam    Team        `json:"home_team"`
	AwayTeam    Team        `json:"away_team"`
	HomeScore   int         `json:"home_score"`
	AwayScore   int         `json:"away_score"`
	PeriodScores []string   `json:"period_scores,omitempty"` // e.g. ["25-22", "18-20"] for sets/quarters
	Status      MatchStatus `json:"status"`
	Period      string      `json:"period"` // "1H", "2H", "HT", "Q1", "Q2", "Q3", "Q4", "OT", "SET 1", "FT"

	// Minute is elapsed minutes and is only meaningful for sports whose clock
	// counts UP (soccer). It is left at 0 for everything else — do not render
	// it as "<n>'" for basketball, NFL, tennis, cricket, baseball or golf.
	Minute int `json:"minute"`

	// DisplayClock is the provider's own clock text, already formatted in the
	// convention of that sport: "45+2" for soccer, "8:32" for a basketball or
	// NFL countdown, "12.3" overs for cricket. When present it is authoritative
	// and should be shown verbatim rather than recomputed.
	DisplayClock string `json:"display_clock,omitempty"`

	// PeriodNumber is the ordinal period: half, quarter, set, innings or round.
	PeriodNumber int `json:"period_number,omitempty"`

	// ClockSeconds is the seconds REMAINING in the current period for sports
	// that count down (basketball, NFL). Zero for count-up and untimed sports.
	ClockSeconds int `json:"clock_seconds,omitempty"`
	StartTime   time.Time   `json:"start_time"`
	Stats       MatchStats  `json:"stats"`
	Events      []MatchEvent `json:"events"`
	Odds        *MatchOdds  `json:"odds,omitempty"`
	Lineups     *MatchLineups `json:"lineups,omitempty"`
	PlayerStats *MatchPlayerStats `json:"player_stats,omitempty"`
	H2H         *HeadToHeadSummary `json:"h2h,omitempty"`
	Venue       string      `json:"venue,omitempty"`
	Referee     string      `json:"referee,omitempty"`
	HasLiveAudio bool       `json:"has_live_audio,omitempty"`
	IsDeleted   bool        `json:"is_deleted,omitempty"`
	DeletedAt   *time.Time  `json:"deleted_at,omitempty"`
}

type APISportsQuota struct {
	Plan        string    `json:"plan"`
	RequestsDay int       `json:"requests_day"`
	UsedDay     int       `json:"used_day"`
	Remaining   int       `json:"remaining"`
	ResetAt     time.Time `json:"reset_at"`
	LastUpdated time.Time `json:"last_updated"`
}

type BetLegStatus string

const (
	LegPending BetLegStatus = "PENDING"
	LegRunning BetLegStatus = "RUNNING"
	LegWon     BetLegStatus = "WON"
	LegLost    BetLegStatus = "LOST"
)

type BetSlipLeg struct {
	ID             string       `json:"id"`
	MatchID        string       `json:"match_id"`
	Match          Match        `json:"match"`
	Market         string       `json:"market"` // "1X2", "Over/Under", "GG/NG", "Spread"
	Selection      string       `json:"selection"` // "Home", "Away", "Draw", "Over 2.5", "Yes"
	Odds           float64      `json:"odds"`
	Status         BetLegStatus `json:"status"`
	CurrentScore   string       `json:"current_score"`
	FulfillmentPct float64      `json:"fulfillment_pct"` // 0 to 100%
}

type BetSlipStatus string

const (
	SlipPending   BetSlipStatus = "PENDING"
	SlipRunning   BetSlipStatus = "RUNNING"
	SlipWon       BetSlipStatus = "WON"
	SlipLost      BetSlipStatus = "LOST"
	SlipCashedOut BetSlipStatus = "CASHED_OUT"
)

type BetSlip struct {
	ID                string        `json:"id"`
	UserID            string        `json:"user_id,omitempty"`
	Bookmaker         string        `json:"bookmaker"` // "sportybet", "bet9ja", "1xbet", "betking"
	BookingCode       string        `json:"booking_code"`
	Stake             float64       `json:"stake"`
	TotalOdds         float64       `json:"total_odds"`
	PotentialWin      float64       `json:"potential_win"`
	CurrentCashout    float64       `json:"current_cashout"`
	CashoutProbability float64     `json:"cashout_probability"` // 0.0 - 1.0
	Status            BetSlipStatus `json:"status"`
	Legs              []BetSlipLeg  `json:"legs"`
	CreatedAt         time.Time     `json:"created_at"`
	UpdatedAt         time.Time     `json:"updated_at"`
	IsDeleted         bool          `json:"is_deleted,omitempty"`
	DeletedAt         *time.Time    `json:"deleted_at,omitempty"`
}

type UserPlan string

const (
	PlanFree  UserPlan = "free"
	PlanPro   UserPlan = "pro"
	PlanElite UserPlan = "elite"
)

type User struct {
	ID           string     `json:"id"`
	Email        string     `json:"email"`
	Name         string     `json:"name"`
	PasswordHash string     `json:"-"`
	Role         string     `json:"role"` // "admin", "user"
	IsAdmin      bool       `json:"is_admin"`
	Plan         UserPlan   `json:"plan"`
	PlanExpiry   *time.Time `json:"plan_expiry,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`

	// Operational attributes, surfaced in the admin console. Status gates
	// sign-in; the rest are for segmenting and for support context.
	Status       UserStatus `json:"status"`
	Country      string     `json:"country"`
	SignupSource string     `json:"signup_source"`
	LastSeenAt   time.Time  `json:"last_seen_at"`
	IsDeleted    bool       `json:"is_deleted,omitempty"`
	DeletedAt    *time.Time `json:"deleted_at,omitempty"`
}

type RegisterRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  *User  `json:"user"`
}

type PaymentGateway string

const (
	GatewayFlutterwave PaymentGateway = "flutterwave"
	GatewayCryptomus   PaymentGateway = "cryptomus"
)

type PaymentTransaction struct {
	ID          string         `json:"id"`
	UserID      string         `json:"user_id"`
	Gateway     PaymentGateway `json:"gateway"`
	Reference   string         `json:"reference"`
	Amount      float64        `json:"amount"`
	Currency    string         `json:"currency"`
	Status      string         `json:"status"` // "successful", "pending", "failed"
	Plan        UserPlan       `json:"plan"`
	RawPayload  string         `json:"raw_payload,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	IsDeleted   bool           `json:"is_deleted,omitempty"`
	DeletedAt   *time.Time     `json:"deleted_at,omitempty"`
}

type WebhookLog struct {
	ID         string    `json:"id"`
	Gateway    string    `json:"gateway"`
	Event      string    `json:"event"`
	Signature  string    `json:"signature"`
	Verified   bool      `json:"verified"`
	Payload    string    `json:"payload"`
	CreatedAt  time.Time `json:"created_at"`
}

type BlogPost struct {
	ID           string     `json:"id"`
	Title        string     `json:"title"`
	Slug         string     `json:"slug"`
	Excerpt      string     `json:"excerpt"`
	ContentHTML  string     `json:"content_html"`
	CoverImage   string     `json:"cover_image"`
	Category     string     `json:"category"`
	Tags         []string   `json:"tags"`
	AuthorName   string     `json:"author_name"`
	AuthorRole   string     `json:"author_role,omitempty"`
	AuthorAvatar string     `json:"author_avatar"`
	MatchID      string     `json:"match_id,omitempty"`
	Match        *Match     `json:"match,omitempty"`
	ReadTimeMin  int        `json:"read_time_min"`
	Views        int        `json:"views"`
	Likes        int        `json:"likes"`
	Status       string     `json:"status"`
	PublishedAt  time.Time  `json:"published_at"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	IsDeleted    bool       `json:"is_deleted,omitempty"`
	DeletedAt    *time.Time `json:"deleted_at,omitempty"`
}

// Customer Support & Helpdesk Models
type SupportTicketMessage struct {
	ID         string    `json:"id"`
	Sender     string    `json:"sender"` // "user", "agent", "system"
	SenderName string    `json:"sender_name"`
	Message    string    `json:"message"`
	CreatedAt  time.Time `json:"created_at"`
}

type SupportTicket struct {
	ID        string                 `json:"id"`
	UserID    string                 `json:"user_id"`
	UserName  string                 `json:"user_name"`
	UserEmail string                 `json:"user_email"`
	Subject   string                 `json:"subject"`
	Category  string                 `json:"category"` // "Live Stream & Scores", "VIP & Pro Billing", "Odds & Bet Tracking", "Data Delay / Bug", "General"
	Priority  string                 `json:"priority"` // "urgent", "high", "medium", "low"
	Status    string                 `json:"status"`   // "open", "in_progress", "resolved", "closed"
	Messages  []SupportTicketMessage `json:"messages"`
	CreatedAt time.Time              `json:"created_at"`
	UpdatedAt time.Time              `json:"updated_at"`
	IsDeleted bool                   `json:"is_deleted,omitempty"`
	DeletedAt *time.Time             `json:"deleted_at,omitempty"`
}

// WebSocket Delta Message Types
type DeltaType string

const (
	DeltaScoreUpdate   DeltaType = "SCORE_UPDATE"
	DeltaClockTick     DeltaType = "CLOCK_TICK"
	DeltaEventLog      DeltaType = "EVENT_LOG"
	DeltaOddsUpdate    DeltaType = "ODDS_UPDATE"
	DeltaMatchFinished DeltaType = "MATCH_FINISHED"
	DeltaStatsUpdate   DeltaType = "STATS_UPDATE"
	DeltaPitchUpdate   DeltaType = "PITCH_UPDATE"
)

type LiveDelta struct {
	Type      DeltaType    `json:"type"`
	MatchID   string       `json:"match_id"`
	Sport     SportType    `json:"sport"`
	HomeScore *int         `json:"home_score,omitempty"`
	AwayScore *int         `json:"away_score,omitempty"`
	Period    string       `json:"period,omitempty"`
	Minute    *int         `json:"minute,omitempty"`
	// Mirrors Match.DisplayClock / PeriodNumber / ClockSeconds so a clock tick
	// carries the sport's own convention rather than only an elapsed minute.
	DisplayClock string `json:"display_clock,omitempty"`
	PeriodNumber *int   `json:"period_number,omitempty"`
	ClockSeconds *int   `json:"clock_seconds,omitempty"`
	Status    MatchStatus  `json:"status,omitempty"`
	Event     *MatchEvent  `json:"event,omitempty"`
	Stats     *MatchStats  `json:"stats,omitempty"`
	Odds      *MatchOdds   `json:"odds,omitempty"`
	Timestamp int64        `json:"timestamp"`
}

// Admin Telemetry & Metrics
type IngestionMetrics struct {
	ActivePollers       int       `json:"active_pollers"`
	ESPNPollingRateSec  int       `json:"espn_polling_rate_sec"`
	OddsAPIPollingRateSec int     `json:"odds_api_polling_rate_sec"`
	ESPNQuotaUsed       int       `json:"espn_quota_used"`
	ESPNQuotaLimit      int       `json:"espn_quota_limit"`
	APISportsQuotaUsed  int       `json:"api_sports_quota_used"`
	APISportsQuotaLimit int       `json:"api_sports_quota_limit"`
	OddsAPIQuotaUsed    int       `json:"odds_api_quota_used"`
	OddsAPIQuotaLimit   int       `json:"odds_api_quota_limit"`
	AvgIngestionLatencyMs float64 `json:"avg_ingestion_latency_ms"`
	RedisKeysCount      int64     `json:"redis_keys_count"`
	RedisMemoryUsedMB   float64   `json:"redis_memory_used_mb"`
	ConnectedClients    int       `json:"connected_clients"`
	BroadcastsPerMinute int       `json:"broadcasts_per_minute"`
	LastUpdated         time.Time `json:"last_updated"`

	// Feed health. Without these a provider outage looked identical to a quiet
	// fixture list: no matches, no error, nothing to act on.
	FeedsOK            int       `json:"feeds_ok"`
	FeedsFailed        int       `json:"feeds_failed"`
	LastIngestError    string    `json:"last_ingest_error,omitempty"`
	LastSuccessfulPoll time.Time `json:"last_successful_poll,omitempty"`
}

type FinancialMetrics struct {
	TotalRevenueUSD    float64 `json:"total_revenue_usd"`
	MonthlyRecurringUSD float64 `json:"mrr_usd"`
	FlutterwaveVolume  float64 `json:"flutterwave_volume_usd"`
	CryptomusVolume    float64 `json:"cryptomus_volume_usd"`
	ActiveProUsers     int     `json:"active_pro_users"`
	TotalUsers         int     `json:"total_users"`
	RecentTransactions []PaymentTransaction `json:"recent_transactions"`
}

type ParserMetrics struct {
	TotalParsed          int                `json:"total_parsed"`
	SuccessCount         int                `json:"success_count"`
	FailureCount         int                `json:"failure_count"`
	SuccessRatePct       float64            `json:"success_rate_pct"`
	ByBookmaker          map[string]int     `json:"by_bookmaker"`
	RecentParsedSlips    []BetSlip          `json:"recent_parsed_slips"`
}

// ---------------------------------------------------------------------------
// Admin console read models
//
// The admin dashboard needs rows that join across users, slips and payments.
// Rather than have the client stitch three lists together (and get the counts
// wrong whenever one of them paginates), the API returns pre-joined rows.
// ---------------------------------------------------------------------------

type UserStatus string

const (
	UserActive    UserStatus = "active"
	UserSuspended UserStatus = "suspended"
)

// AdminUserRow is one line in the admin Users table: the account plus the
// aggregates an operator actually decides on (spend, activity, slip volume).
type AdminUserRow struct {
	ID            string     `json:"id"`
	Email         string     `json:"email"`
	Name          string     `json:"name"`
	Plan          UserPlan   `json:"plan"`
	PlanExpiry    *time.Time `json:"plan_expiry,omitempty"`
	Status        UserStatus `json:"status"`
	Country       string     `json:"country"`
	SignupSource  string     `json:"signup_source"`
	SlipsScanned  int        `json:"slips_scanned"`
	ActiveSlips   int        `json:"active_slips"`
	LifetimeValue float64    `json:"lifetime_value_usd"`
	LastSeenAt    time.Time  `json:"last_seen_at"`
	CreatedAt     time.Time  `json:"created_at"`
}

// AdminSlipRow is one scanned booking code, attributed to the account that
// scanned it. This is the join the old dashboard was missing entirely.
type AdminSlipRow struct {
	ID           string        `json:"id"`
	BookingCode  string        `json:"booking_code"`
	Bookmaker    string        `json:"bookmaker"`
	UserID       string        `json:"user_id"`
	UserName     string        `json:"user_name"`
	UserEmail    string        `json:"user_email"`
	UserPlan     UserPlan      `json:"user_plan"`
	Legs         int           `json:"legs"`
	LegsWon      int           `json:"legs_won"`
	LegsLost     int           `json:"legs_lost"`
	Stake        float64       `json:"stake"`
	TotalOdds    float64       `json:"total_odds"`
	PotentialWin float64       `json:"potential_win"`
	Cashout      float64       `json:"current_cashout"`
	Status       BetSlipStatus `json:"status"`
	ParseMs      int           `json:"parse_ms"`
	ScannedAt    time.Time     `json:"scanned_at"`
}

// AdminTransactionRow is a payment with the payer resolved.
type AdminTransactionRow struct {
	ID        string         `json:"id"`
	Reference string         `json:"reference"`
	UserID    string         `json:"user_id"`
	UserName  string         `json:"user_name"`
	UserEmail string         `json:"user_email"`
	Gateway   PaymentGateway `json:"gateway"`
	Method    string         `json:"method"`
	Amount    float64        `json:"amount"`
	Currency  string         `json:"currency"`
	Status    string         `json:"status"`
	Plan      UserPlan       `json:"plan"`
	Cycle     string         `json:"billing_cycle"`
	CreatedAt time.Time      `json:"created_at"`
}

// AdminTimePoint is one bucket on the overview trend chart.
type AdminTimePoint struct {
	Label    string  `json:"label"`
	Revenue  float64 `json:"revenue_usd"`
	Signups  int     `json:"signups"`
	Slips    int     `json:"slips"`
}

// AdminOverview is everything the landing tab of the console shows, in one
// request, so the KPI row cannot disagree with the charts beneath it.
type AdminOverview struct {
	TotalUsers        int              `json:"total_users"`
	NewUsers7d        int              `json:"new_users_7d"`
	ProUsers          int              `json:"pro_users"`
	SuspendedUsers    int              `json:"suspended_users"`
	MRRUSD            float64          `json:"mrr_usd"`
	RevenueUSD        float64          `json:"revenue_usd"`
	Revenue7dUSD      float64          `json:"revenue_7d_usd"`
	ARPUUSD           float64          `json:"arpu_usd"`
	SlipsScannedTotal int              `json:"slips_scanned_total"`
	SlipsScanned24h   int              `json:"slips_scanned_24h"`
	ActiveSlips       int              `json:"active_slips"`
	ParseSuccessPct   float64          `json:"parse_success_pct"`
	FailedPayments7d  int              `json:"failed_payments_7d"`
	OpenTickets       int              `json:"open_tickets"`
	ConnectedClients  int              `json:"connected_clients"`
	LiveMatches       int              `json:"live_matches"`
	IngestionLatency  float64          `json:"ingestion_latency_ms"`
	Trend             []AdminTimePoint `json:"trend"`
	SlipsByBookmaker  map[string]int   `json:"slips_by_bookmaker"`
	PlanSplit         map[string]int   `json:"plan_split"`
}

// PushSubscription represents a browser Web Push subscription with established channel keys
type PushSubscription struct {
	ID         string    `json:"id"`
	UserID     string    `json:"user_id,omitempty"`
	Endpoint   string    `json:"endpoint"`
	P256dh     string    `json:"p256dh"`
	Auth       string    `json:"auth"`
	DeviceType string    `json:"device_type"` // "android", "ios", "desktop"
	Channels   []string  `json:"channels"`    // e.g. ["all", "live_matches", "goal_alerts"]
	UserAgent  string    `json:"user_agent,omitempty"`
	IPAddress  string    `json:"ip_address,omitempty"`
	IsActive   bool      `json:"is_active"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
	LastSeenAt time.Time `json:"last_seen_at"`
}

// PushNotificationPayload is the standardized structure sent to the Service Worker
type PushNotificationPayload struct {
	Title              string                 `json:"title"`
	Body               string                 `json:"body"`
	Icon               string                 `json:"icon,omitempty"`
	Badge              string                 `json:"badge,omitempty"`
	Tag                string                 `json:"tag,omitempty"`
	URL                string                 `json:"url,omitempty"`
	MatchID            string                 `json:"match_id,omitempty"`
	Sport              string                 `json:"sport,omitempty"`
	Type               string                 `json:"type,omitempty"` // "goal", "kickoff", "point", "broadcast", "live_activity"
	Silent             bool                   `json:"silent,omitempty"`
	Renotify           bool                   `json:"renotify,omitempty"`
	RequireInteraction bool                   `json:"requireInteraction,omitempty"`
	Vibrate            []int                  `json:"vibrate,omitempty"`
	Data               map[string]interface{} `json:"data,omitempty"`
}

// BroadcastRequest is sent by admins to push messages to all or specific channels
type BroadcastRequest struct {
	Channel  string `json:"channel"` // "all", "live_matches", "goal_alerts", "breaking_news", "betslip_alerts"
	Title    string `json:"title"`
	Body     string `json:"body"`
	URL      string `json:"url,omitempty"`
	Icon     string `json:"icon,omitempty"`
	MatchID  string `json:"match_id,omitempty"`
	Urgency  string `json:"urgency,omitempty"` // "high", "normal"
	SendTest bool   `json:"send_test,omitempty"`
}

// NotificationChannelInfo provides channel metadata and subscriber counts
type NotificationChannelInfo struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
	Subscribers int    `json:"subscribers"`
}

// NotificationStats aggregates live telemetry for push delivery
type NotificationStats struct {
	TotalSubscriptions int                       `json:"total_subscriptions"`
	ActiveAndroid      int                       `json:"active_android"`
	ActiveIOS          int                       `json:"active_ios"`
	ActiveDesktop      int                       `json:"active_desktop"`
	Channels           []NotificationChannelInfo `json:"channels"`
	RecentBroadcasts   []BroadcastLog            `json:"recent_broadcasts"`
}

// BroadcastLog tracks sent notifications for auditing
type BroadcastLog struct {
	ID          string    `json:"id"`
	Channel     string    `json:"channel"`
	Title       string    `json:"title"`
	Body        string    `json:"body"`
	URL         string    `json:"url,omitempty"`
	SentCount   int       `json:"sent_count"`
	FailedCount int       `json:"failed_count"`
	SentAt      time.Time `json:"sent_at"`
}
