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
}

type MatchEvent struct {
	ID          string    `json:"id"`
	MatchID     string    `json:"match_id"`
	Type        EventType `json:"type"`
	Minute      int       `json:"minute"`
	ExtraMinute int       `json:"extra_minute,omitempty"`
	TeamSide    string    `json:"team_side"` // "HOME" or "AWAY"
	PlayerName  string    `json:"player_name"`
	AssistName  string    `json:"assist_name,omitempty"`
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
	Minute      int         `json:"minute"`
	StartTime   time.Time   `json:"start_time"`
	Stats       MatchStats  `json:"stats"`
	Events      []MatchEvent `json:"events"`
	Odds        *MatchOdds  `json:"odds,omitempty"`
	Venue       string      `json:"venue,omitempty"`
	Referee     string      `json:"referee,omitempty"`
	HasLiveAudio bool       `json:"has_live_audio,omitempty"`
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
}

type UserPlan string

const (
	PlanFree UserPlan = "free"
	PlanPro  UserPlan = "pro"
)

type User struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	Plan      UserPlan  `json:"plan"`
	PlanExpiry *time.Time `json:"plan_expiry,omitempty"`
	CreatedAt time.Time `json:"created_at"`
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
	ID           string    `json:"id"`
	Title        string    `json:"title"`
	Slug         string    `json:"slug"`
	Excerpt      string    `json:"excerpt"`
	ContentHTML  string    `json:"content_html"`
	CoverImage   string    `json:"cover_image"`
	Category     string    `json:"category"`
	Tags         []string  `json:"tags"`
	AuthorName   string    `json:"author_name"`
	AuthorRole   string    `json:"author_role,omitempty"`
	AuthorAvatar string    `json:"author_avatar"`
	MatchID      string    `json:"match_id,omitempty"`
	Match        *Match    `json:"match,omitempty"`
	ReadTimeMin  int       `json:"read_time_min"`
	Views        int       `json:"views"`
	Likes        int       `json:"likes"`
	Status       string    `json:"status"`
	PublishedAt  time.Time `json:"published_at"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
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
	OddsAPIQuotaUsed    int       `json:"odds_api_quota_used"`
	OddsAPIQuotaLimit   int       `json:"odds_api_quota_limit"`
	AvgIngestionLatencyMs float64 `json:"avg_ingestion_latency_ms"`
	RedisKeysCount      int64     `json:"redis_keys_count"`
	RedisMemoryUsedMB   float64   `json:"redis_memory_used_mb"`
	ConnectedClients    int       `json:"connected_clients"`
	BroadcastsPerMinute int       `json:"broadcasts_per_minute"`
	LastUpdated         time.Time `json:"last_updated"`
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
