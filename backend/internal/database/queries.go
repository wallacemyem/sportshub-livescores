package database

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/sports/livescores/internal/models"
)

type Store struct {
	db             *DB
	mu             sync.RWMutex
	matches        map[string]*models.Match
	events         map[string][]models.MatchEvent
	odds           map[string]*models.MatchOdds
	betSlips       map[string]*models.BetSlip
	users          map[string]*models.User
	payments       map[string]*models.PaymentTransaction
	webhookLogs    []*models.WebhookLog
	posts          map[string]*models.BlogPost
	supportTickets map[string]*models.SupportTicket
	pushSubs       map[string]*models.PushSubscription
	broadcastLogs  []*models.BroadcastLog
	supabaseSyncer SupabaseSyncer

	// Side tables for detail the core models do not carry. Keyed by the
	// transaction / slip ID they annotate.
	txMethods   map[string]string
	txCycles    map[string]string
	slipParseMs map[string]int
}

type SupabaseSyncer interface {
	SyncBetSlip(slip *models.BetSlip)
	SyncMatch(match *models.Match)
	SyncUser(user *models.User)
	SyncBlogPost(post *models.BlogPost)
	SyncSupportTicket(ticket *models.SupportTicket)
}

func (s *Store) SetSupabaseSyncer(syncer SupabaseSyncer) {
	s.mu.Lock()
	s.supabaseSyncer = syncer
	s.mu.Unlock()

	if syncer != nil {
		go func() {
			s.mu.RLock()
			defer s.mu.RUnlock()
			for _, m := range s.matches {
				if !m.IsDeleted {
					syncer.SyncMatch(m)
				}
			}
			for _, sl := range s.betSlips {
				if !sl.IsDeleted {
					syncer.SyncBetSlip(sl)
				}
			}
			for _, p := range s.posts {
				if !p.IsDeleted {
					syncer.SyncBlogPost(p)
				}
			}
			for _, u := range s.users {
				if !u.IsDeleted {
					syncer.SyncUser(u)
				}
			}
		}()
	}
}

func NewStore(db *DB) *Store {
	store := &Store{
		db:             db,
		matches:        make(map[string]*models.Match),
		events:         make(map[string][]models.MatchEvent),
		odds:           make(map[string]*models.MatchOdds),
		betSlips:       make(map[string]*models.BetSlip),
		users:          make(map[string]*models.User),
		payments:       make(map[string]*models.PaymentTransaction),
		webhookLogs:    make([]*models.WebhookLog, 0),
		posts:          make(map[string]*models.BlogPost),
		supportTickets: make(map[string]*models.SupportTicket),
		pushSubs:       make(map[string]*models.PushSubscription),
		broadcastLogs:  make([]*models.BroadcastLog, 0),
		txMethods:      make(map[string]string),
		txCycles:       make(map[string]string),
		slipParseMs:    make(map[string]int),
	}

	// Seed root system administrator account
	store.seedAdminPopulation()

	// Load all persistent records from PostgreSQL into memory
	if db != nil && db.Pool != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		store.loadFromPostgres(ctx)
	}

	return store
}

// loadFromPostgres hydrates the in-memory cache with real PostgreSQL rows
func (s *Store) loadFromPostgres(ctx context.Context) {
	if s.db == nil || s.db.Pool == nil {
		return
	}

	// 1. Load Bet Slips
	rows, err := s.db.Pool.Query(ctx, `
		SELECT id, COALESCE(user_id, ''), bookmaker, booking_code, total_odds, status, legs_json, is_deleted, created_at, updated_at
		FROM bet_slips
		WHERE is_deleted = FALSE
	`)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var slip models.BetSlip
			var userID, statusStr string
			var legsJSON []byte
			if err := rows.Scan(&slip.ID, &userID, &slip.Bookmaker, &slip.BookingCode, &slip.TotalOdds, &statusStr, &legsJSON, &slip.IsDeleted, &slip.CreatedAt, &slip.UpdatedAt); err == nil {
				slip.UserID = userID
				slip.Status = models.BetSlipStatus(statusStr)
				if len(legsJSON) > 0 {
					_ = json.Unmarshal(legsJSON, &slip.Legs)
				}
				s.betSlips[slip.ID] = &slip
				s.betSlips[slip.BookingCode] = &slip
			}
		}
	}

	// 2. Load Matches with Team and League info
	mRows, err := s.db.Pool.Query(ctx, `
		SELECT m.id, m.sport_id, m.home_score, m.away_score, m.status, m.period, m.minute, m.start_time, m.venue, m.referee, m.is_deleted,
		       l.id, l.name, l.country,
		       ht.id, ht.name, ht.short_name, ht.country,
		       at.id, at.name, at.short_name, at.country
		FROM matches m
		LEFT JOIN leagues l ON m.league_id = l.id
		LEFT JOIN teams ht ON m.home_team_id = ht.id
		LEFT JOIN teams at ON m.away_team_id = at.id
		WHERE m.is_deleted = FALSE
	`)
	if err == nil {
		defer mRows.Close()
		for mRows.Next() {
			var m models.Match
			var sportStr, statusStr, periodStr string
			var lID, lName, lCountry string
			var htID, htName, htShort, htCountry string
			var atID, atName, atShort, atCountry string

			if err := mRows.Scan(
				&m.ID, &sportStr, &m.HomeScore, &m.AwayScore, &statusStr, &periodStr, &m.Minute, &m.StartTime, &m.Venue, &m.Referee, &m.IsDeleted,
				&lID, &lName, &lCountry,
				&htID, &htName, &htShort, &htCountry,
				&atID, &atName, &atShort, &atCountry,
			); err == nil {
				// Skip legacy fake/mock seed matches
				if strings.HasPrefix(m.ID, "match-") {
					continue
				}
				m.Sport = models.SportType(sportStr)
				m.Status = models.MatchStatus(statusStr)
				m.Period = periodStr
				m.League = models.League{ID: lID, Name: lName, Country: lCountry, Sport: m.Sport}
				m.HomeTeam = models.Team{ID: htID, Name: htName, ShortName: htShort, Country: htCountry}
				m.AwayTeam = models.Team{ID: atID, Name: atName, ShortName: atShort, Country: atCountry}
				s.matches[m.ID] = &m
			}
		}
		// Clean up any legacy mock fixtures from database table
		_, _ = s.db.Pool.Exec(ctx, `DELETE FROM matches WHERE id LIKE 'match-%'`)
	}

	// 3. Load Users
	uRows, err := s.db.Pool.Query(ctx, `
		SELECT id, email, name, password_hash, role, is_admin, plan, plan_expiry, status, country, signup_source, last_seen_at, is_deleted, created_at
		FROM users
		WHERE is_deleted = FALSE
	`)
	if err == nil {
		defer uRows.Close()
		for uRows.Next() {
			var u models.User
			var planStr, statusStr string
			if err := uRows.Scan(&u.ID, &u.Email, &u.Name, &u.PasswordHash, &u.Role, &u.IsAdmin, &planStr, &u.PlanExpiry, &statusStr, &u.Country, &u.SignupSource, &u.LastSeenAt, &u.IsDeleted, &u.CreatedAt); err == nil {
				u.Plan = models.UserPlan(planStr)
				u.Status = models.UserStatus(statusStr)
				s.users[u.ID] = &u
			}
		}
	}

	// 4. Load Blog Posts
	bRows, err := s.db.Pool.Query(ctx, `
		SELECT id, title, slug, excerpt, content_html, cover_image, category, author_name, author_role, author_avatar, match_id, read_time_min, views, likes, status, is_deleted, published_at, created_at, updated_at
		FROM blog_posts
		WHERE is_deleted = FALSE
	`)
	if err == nil {
		defer bRows.Close()
		for bRows.Next() {
			var p models.BlogPost
			if err := bRows.Scan(&p.ID, &p.Title, &p.Slug, &p.Excerpt, &p.ContentHTML, &p.CoverImage, &p.Category, &p.AuthorName, &p.AuthorRole, &p.AuthorAvatar, &p.MatchID, &p.ReadTimeMin, &p.Views, &p.Likes, &p.Status, &p.IsDeleted, &p.PublishedAt, &p.CreatedAt, &p.UpdatedAt); err == nil {
				s.posts[p.ID] = &p
				s.posts[p.Slug] = &p
			}
		}
	}

	// 5. Load Support Tickets
	tRows, err := s.db.Pool.Query(ctx, `
		SELECT id, user_id, user_name, user_email, subject, category, priority, status, messages, is_deleted, created_at, updated_at
		FROM support_tickets
		WHERE is_deleted = FALSE
	`)
	if err == nil {
		defer tRows.Close()
		for tRows.Next() {
			var t models.SupportTicket
			var messagesJSON []byte
			if err := tRows.Scan(&t.ID, &t.UserID, &t.UserName, &t.UserEmail, &t.Subject, &t.Category, &t.Priority, &t.Status, &messagesJSON, &t.IsDeleted, &t.CreatedAt, &t.UpdatedAt); err == nil {
				if len(messagesJSON) > 0 {
					_ = json.Unmarshal(messagesJSON, &t.Messages)
				}
				s.supportTickets[t.ID] = &t
			}
		}
	}

	// 6. Load Push Subscriptions
	pRows, err := s.db.Pool.Query(ctx, `
		SELECT id, COALESCE(user_id, ''), endpoint, p256dh, auth, device_type, channels, COALESCE(user_agent, ''), COALESCE(ip_address, ''), is_active, created_at, updated_at, last_seen_at
		FROM push_subscriptions
		WHERE is_active = TRUE
	`)
	if err == nil {
		defer pRows.Close()
		for pRows.Next() {
			var sub models.PushSubscription
			var channelsJSON []byte
			if err := pRows.Scan(&sub.ID, &sub.UserID, &sub.Endpoint, &sub.P256dh, &sub.Auth, &sub.DeviceType, &channelsJSON, &sub.UserAgent, &sub.IPAddress, &sub.IsActive, &sub.CreatedAt, &sub.UpdatedAt, &sub.LastSeenAt); err == nil {
				if len(channelsJSON) > 0 {
					_ = json.Unmarshal(channelsJSON, &sub.Channels)
				}
				s.pushSubs[sub.Endpoint] = &sub
				s.pushSubs[sub.ID] = &sub
			}
		}
	}

	// 7. Load Broadcast Logs
	bcRows, err := s.db.Pool.Query(ctx, `
		SELECT id, channel, title, body, COALESCE(url, ''), sent_count, failed_count, sent_at
		FROM broadcast_logs
		ORDER BY sent_at DESC
		LIMIT 50
	`)
	if err == nil {
		defer bcRows.Close()
		for bcRows.Next() {
			var log models.BroadcastLog
			if err := bcRows.Scan(&log.ID, &log.Channel, &log.Title, &log.Body, &log.URL, &log.SentCount, &log.FailedCount, &log.SentAt); err == nil {
				s.broadcastLogs = append(s.broadcastLogs, &log)
			}
		}
	}

	log.Printf("[DB] Hydrated in-memory store with %d matches, %d slips, %d users, %d push subscriptions from PostgreSQL", len(s.matches), len(s.betSlips), len(s.users), len(s.pushSubs))
}

// Matches
func (s *Store) GetAllMatches(sport models.SportType, status models.MatchStatus) []models.Match {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]models.Match, 0)
	for _, m := range s.matches {
		if m.IsDeleted || m.DeletedAt != nil || strings.HasPrefix(m.ID, "match-") {
			continue
		}
		if sport != "" && m.Sport != sport {
			continue
		}
		if status != "" && m.Status != status {
			continue
		}
		matchCopy := *m
		if evs, ok := s.events[m.ID]; ok {
			matchCopy.Events = evs
		}
		if o, ok := s.odds[m.ID]; ok {
			matchCopy.Odds = o
		}
		result = append(result, matchCopy)
	}
	return result
}

func (s *Store) GetMatchByID(id string) (*models.Match, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	cleanID := strings.TrimSpace(id)
	if cleanID == "" {
		return nil, false
	}

	// 1. Exact lookup
	if m, ok := s.matches[cleanID]; ok && m != nil && !m.IsDeleted && m.DeletedAt == nil {
		matchCopy := *m
		if evs, exists := s.events[m.ID]; exists {
			matchCopy.Events = evs
		}
		if o, exists := s.odds[m.ID]; exists {
			matchCopy.Odds = o
		}
		return &matchCopy, true
	}

	// 2. Prefix variations
	variations := []string{
		"espn-" + cleanID,
		"apif-" + cleanID,
		"apif-event-" + cleanID,
		"match-" + cleanID,
	}
	cleanNumeric := strings.TrimPrefix(strings.TrimPrefix(strings.TrimPrefix(strings.TrimPrefix(cleanID, "espn-"), "apif-event-"), "apif-"), "match-")
	if cleanNumeric != cleanID {
		variations = append(variations, cleanNumeric, "espn-"+cleanNumeric, "apif-"+cleanNumeric, "apif-event-"+cleanNumeric)
	}

	for _, v := range variations {
		if m, ok := s.matches[v]; ok && m != nil && !m.IsDeleted && m.DeletedAt == nil {
			matchCopy := *m
			if evs, exists := s.events[m.ID]; exists {
				matchCopy.Events = evs
			}
			if o, exists := s.odds[m.ID]; exists {
				matchCopy.Odds = o
			}
			return &matchCopy, true
		}
	}

	// 3. Scan matches for suffix / numeric ID matching
	for mID, m := range s.matches {
		if m == nil || m.IsDeleted || m.DeletedAt != nil {
			continue
		}
		if strings.EqualFold(mID, cleanID) || strings.HasSuffix(mID, cleanNumeric) || (cleanNumeric != "" && strings.Contains(mID, cleanNumeric)) {
			matchCopy := *m
			if evs, exists := s.events[m.ID]; exists {
				matchCopy.Events = evs
			}
			if o, exists := s.odds[m.ID]; exists {
				matchCopy.Odds = o
			}
			return &matchCopy, true
		}
	}

	// 4. Check user bet slips for tracked leg fixtures
	for _, slip := range s.betSlips {
		if slip == nil || slip.IsDeleted || slip.DeletedAt != nil {
			continue
		}
		for _, leg := range slip.Legs {
			if leg.MatchID == cleanID || leg.Match.ID == cleanID ||
				strings.EqualFold(leg.MatchID, cleanID) || strings.EqualFold(leg.Match.ID, cleanID) ||
				(cleanNumeric != "" && (strings.Contains(leg.MatchID, cleanNumeric) || strings.Contains(leg.Match.ID, cleanNumeric))) {
				if leg.Match.ID != "" {
					matchCopy := leg.Match
					return &matchCopy, true
				}
			}
		}
	}

	return nil, false
}

func (s *Store) SaveMatch(m *models.Match) {
	s.mu.Lock()
	defer s.mu.Unlock()

	matchCopy := *m
	s.matches[m.ID] = &matchCopy

	// Persist to PostgreSQL
	if s.db != nil && s.db.Pool != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		// 1. Upsert League
		_, _ = s.db.Pool.Exec(ctx, `
			INSERT INTO leagues (id, name, sport_id, country)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sport_id = EXCLUDED.sport_id, country = EXCLUDED.country;
		`, matchCopy.League.ID, matchCopy.League.Name, string(matchCopy.Sport), matchCopy.League.Country)

		// 2. Upsert Home Team
		_, _ = s.db.Pool.Exec(ctx, `
			INSERT INTO teams (id, name, short_name, country)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, short_name = EXCLUDED.short_name, country = EXCLUDED.country;
		`, matchCopy.HomeTeam.ID, matchCopy.HomeTeam.Name, matchCopy.HomeTeam.ShortName, matchCopy.HomeTeam.Country)

		// 3. Upsert Away Team
		_, _ = s.db.Pool.Exec(ctx, `
			INSERT INTO teams (id, name, short_name, country)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, short_name = EXCLUDED.short_name, country = EXCLUDED.country;
		`, matchCopy.AwayTeam.ID, matchCopy.AwayTeam.Name, matchCopy.AwayTeam.ShortName, matchCopy.AwayTeam.Country)

		// 4. Upsert Match
		if _, err := s.db.Pool.Exec(ctx, `
			INSERT INTO matches (id, sport_id, league_id, home_team_id, away_team_id, home_score, away_score, status, period, minute, start_time, venue, referee, is_deleted, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
			ON CONFLICT (id) DO UPDATE SET
				home_score = EXCLUDED.home_score,
				away_score = EXCLUDED.away_score,
				status = EXCLUDED.status,
				period = EXCLUDED.period,
				minute = EXCLUDED.minute,
				start_time = EXCLUDED.start_time,
				venue = EXCLUDED.venue,
				referee = EXCLUDED.referee,
				is_deleted = EXCLUDED.is_deleted,
				updated_at = EXCLUDED.updated_at;
		`, matchCopy.ID, string(matchCopy.Sport), matchCopy.League.ID, matchCopy.HomeTeam.ID, matchCopy.AwayTeam.ID, matchCopy.HomeScore, matchCopy.AwayScore, string(matchCopy.Status), matchCopy.Period, matchCopy.Minute, matchCopy.StartTime, matchCopy.Venue, matchCopy.Referee, matchCopy.IsDeleted, time.Now(), time.Now()); err != nil {
			log.Printf("[DB ERROR] Failed to save match %s to PostgreSQL: %v", matchCopy.ID, err)
		}
	}

	if s.supabaseSyncer != nil {
		s.supabaseSyncer.SyncMatch(m)
	}
}

func (s *Store) DeleteMatch(id string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	if m, exists := s.matches[id]; exists {
		now := time.Now()
		m.IsDeleted = true
		m.DeletedAt = &now

		if s.db != nil && s.db.Pool != nil {
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			defer cancel()
			_, _ = s.db.Pool.Exec(ctx, `UPDATE matches SET is_deleted = TRUE, deleted_at = NOW() WHERE id = $1`, id)
		}
		return true
	}
	return false
}

func (s *Store) ClearAllMatches() int {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()
	count := 0
	for _, m := range s.matches {
		if !m.IsDeleted {
			m.IsDeleted = true
			m.DeletedAt = &now
			count++
		}
	}

	if s.db != nil && s.db.Pool != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		_, _ = s.db.Pool.Exec(ctx, `UPDATE matches SET is_deleted = TRUE, deleted_at = NOW() WHERE is_deleted = FALSE`)
	}

	return count
}

func (s *Store) AddMatchEvent(event models.MatchEvent) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.events[event.MatchID] = append(s.events[event.MatchID], event)

	if m, ok := s.matches[event.MatchID]; ok {
		m.Events = append(m.Events, event)
	}

	if s.db != nil && s.db.Pool != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		_, _ = s.db.Pool.Exec(ctx, `
			INSERT INTO match_events (id, match_id, type, minute, extra_minute, team_side, player_name, assist_name, detail, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
			ON CONFLICT (id) DO NOTHING;
		`, event.ID, event.MatchID, string(event.Type), event.Minute, event.ExtraMinute, event.TeamSide, event.PlayerName, event.AssistName, event.Detail)
	}
}

func (s *Store) UpdateOdds(matchID string, odds *models.MatchOdds) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.odds[matchID] = odds
	if m, ok := s.matches[matchID]; ok {
		m.Odds = odds
	}
}

// Bet Slips
func (s *Store) SaveBetSlip(slip *models.BetSlip) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.betSlips[slip.ID] = slip
	s.betSlips[slip.BookingCode] = slip

	// Persist to PostgreSQL
	if s.db != nil && s.db.Pool != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		legsBytes, _ := json.Marshal(slip.Legs)
		_, err := s.db.Pool.Exec(ctx, `
			INSERT INTO bet_slips (id, user_id, bookmaker, booking_code, total_odds, status, legs_json, is_deleted, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			ON CONFLICT (id) DO UPDATE SET
				bookmaker = EXCLUDED.bookmaker,
				booking_code = EXCLUDED.booking_code,
				total_odds = EXCLUDED.total_odds,
				status = EXCLUDED.status,
				legs_json = EXCLUDED.legs_json,
				is_deleted = EXCLUDED.is_deleted,
				updated_at = EXCLUDED.updated_at;
		`, slip.ID, slip.UserID, slip.Bookmaker, slip.BookingCode, slip.TotalOdds, string(slip.Status), string(legsBytes), slip.IsDeleted, slip.CreatedAt, slip.UpdatedAt)
		if err != nil {
			log.Printf("[DB ERROR] Failed to save betslip %s to PostgreSQL: %v", slip.BookingCode, err)
		}
	}

	if s.supabaseSyncer != nil {
		s.supabaseSyncer.SyncBetSlip(slip)
	}
}

func normalizeTeamName(name string) string {
	s := strings.ToLower(strings.TrimSpace(name))
	s = strings.ReplaceAll(s, ".", "")
	s = strings.ReplaceAll(s, "-", " ")
	s = strings.ReplaceAll(s, "_", " ")
	words := strings.Fields(s)
	filtered := make([]string, 0, len(words))
	for _, w := range words {
		if w == "fc" || w == "cf" || w == "sc" || w == "ac" || w == "bc" || w == "fk" || w == "club" || w == "city" || w == "united" || w == "utd" || w == "the" {
			continue
		}
		filtered = append(filtered, w)
	}
	if len(filtered) == 0 {
		return s
	}
	return strings.Join(filtered, " ")
}

func teamsMatch(name1, name2 string) bool {
	n1 := normalizeTeamName(name1)
	n2 := normalizeTeamName(name2)
	if n1 == "" || n2 == "" {
		return false
	}
	if n1 == n2 {
		return true
	}
	if strings.Contains(n1, n2) || strings.Contains(n2, n1) {
		return true
	}
	return false
}

func (s *Store) findMatchingMatch(matchID, homeName, awayName string) *models.Match {
	if matchID != "" {
		if m, exists := s.matches[matchID]; exists && m != nil {
			return m
		}
	}
	if homeName == "" || awayName == "" {
		return nil
	}
	for _, m := range s.matches {
		if m == nil {
			continue
		}
		if (teamsMatch(m.HomeTeam.Name, homeName) || teamsMatch(m.HomeTeam.ShortName, homeName)) &&
			(teamsMatch(m.AwayTeam.Name, awayName) || teamsMatch(m.AwayTeam.ShortName, awayName)) {
			return m
		}
	}
	return nil
}

func evaluateLeg(leg *models.BetSlipLeg, m *models.Match) (models.BetLegStatus, string, float64) {
	if m == nil {
		return leg.Status, leg.CurrentScore, leg.FulfillmentPct
	}

	homeScore := m.HomeScore
	awayScore := m.AwayScore
	status := m.Status

	// 1. If match is scheduled / not yet started
	if status == models.StatusScheduled {
		return models.LegPending, "Upcoming", 0.0
	}

	// 2. Format score with clock
	var scoreStr string
	if status == models.StatusFinished {
		scoreStr = fmt.Sprintf("%d-%d (FT)", homeScore, awayScore)
	} else if status == models.StatusHalfTime {
		scoreStr = fmt.Sprintf("%d-%d (HT)", homeScore, awayScore)
	} else {
		clock := m.DisplayClock
		if clock == "" {
			if m.Minute > 0 {
				clock = fmt.Sprintf("%d'", m.Minute)
			} else {
				clock = "Live"
			}
		}
		scoreStr = fmt.Sprintf("%d-%d (%s)", homeScore, awayScore, clock)
	}

	marketLower := strings.ToLower(leg.Market)
	selLower := strings.ToLower(leg.Selection)
	homeLower := strings.ToLower(m.HomeTeam.Name)
	awayLower := strings.ToLower(m.AwayTeam.Name)

	totalGoals := homeScore + awayScore

	// Check if Over / Under
	if strings.Contains(marketLower, "over") || strings.Contains(marketLower, "under") ||
		strings.Contains(selLower, "over") || strings.Contains(selLower, "under") {
		var threshold float64 = 2.5
		for _, part := range strings.Fields(marketLower + " " + selLower) {
			if val, err := strconv.ParseFloat(part, 64); err == nil && val > 0.4 && val < 300 {
				threshold = val
				break
			}
		}

		isOver := strings.Contains(selLower, "over") || strings.Contains(marketLower, "over")
		if isOver {
			if float64(totalGoals) > threshold {
				return models.LegWon, scoreStr, 100.0
			}
			if status == models.StatusFinished {
				return models.LegLost, scoreStr, 0.0
			}
			pct := math.Min(95.0, (float64(totalGoals)/threshold)*85.0)
			return models.LegRunning, scoreStr, pct
		} else { // Under
			if float64(totalGoals) > threshold {
				return models.LegLost, scoreStr, 0.0
			}
			if status == models.StatusFinished {
				return models.LegWon, scoreStr, 100.0
			}
			pct := math.Max(10.0, 100.0-(float64(totalGoals)/threshold)*60.0)
			return models.LegRunning, scoreStr, pct
		}
	}

	// Check Both Teams to Score (BTTS / GG / NG)
	if strings.Contains(marketLower, "both") || strings.Contains(marketLower, "btts") ||
		strings.Contains(marketLower, "gg") || strings.Contains(selLower, "yes") || strings.Contains(selLower, "no") ||
		selLower == "gg" || selLower == "ng" {
		isYes := strings.Contains(selLower, "yes") || strings.Contains(selLower, "gg")
		if isYes {
			if homeScore > 0 && awayScore > 0 {
				return models.LegWon, scoreStr, 100.0
			}
			if status == models.StatusFinished {
				return models.LegLost, scoreStr, 0.0
			}
			if homeScore > 0 || awayScore > 0 {
				return models.LegRunning, scoreStr, 70.0
			}
			return models.LegRunning, scoreStr, 35.0
		} else { // No / NG
			if homeScore > 0 && awayScore > 0 {
				return models.LegLost, scoreStr, 0.0
			}
			if status == models.StatusFinished {
				return models.LegWon, scoreStr, 100.0
			}
			return models.LegRunning, scoreStr, 60.0
		}
	}

	// Check Double Chance
	if strings.Contains(marketLower, "double chance") || selLower == "1x" || selLower == "x2" || selLower == "12" {
		if selLower == "1x" || strings.Contains(selLower, "1x") || strings.Contains(selLower, "home/draw") {
			if status == models.StatusFinished {
				if homeScore >= awayScore {
					return models.LegWon, scoreStr, 100.0
				}
				return models.LegLost, scoreStr, 0.0
			}
			if homeScore >= awayScore {
				return models.LegRunning, scoreStr, 80.0
			}
			return models.LegRunning, scoreStr, 40.0
		} else if selLower == "x2" || strings.Contains(selLower, "x2") || strings.Contains(selLower, "draw/away") {
			if status == models.StatusFinished {
				if awayScore >= homeScore {
					return models.LegWon, scoreStr, 100.0
				}
				return models.LegLost, scoreStr, 0.0
			}
			if awayScore >= homeScore {
				return models.LegRunning, scoreStr, 80.0
			}
			return models.LegRunning, scoreStr, 40.0
		} else if selLower == "12" || strings.Contains(selLower, "12") || strings.Contains(selLower, "home/away") {
			if status == models.StatusFinished {
				if homeScore != awayScore {
					return models.LegWon, scoreStr, 100.0
				}
				return models.LegLost, scoreStr, 0.0
			}
			if homeScore != awayScore {
				return models.LegRunning, scoreStr, 80.0
			}
			return models.LegRunning, scoreStr, 40.0
		}
	}

	// Default: 1X2 / Match Winner / Moneyline / Handicap / Spread
	isHomePick := strings.Contains(selLower, "1") || strings.Contains(selLower, "home") ||
		(homeLower != "" && strings.Contains(selLower, homeLower)) ||
		strings.Contains(selLower, "chiefs") || strings.Contains(selLower, "lakers") || strings.Contains(selLower, "arsenal")
	isAwayPick := strings.Contains(selLower, "2") || strings.Contains(selLower, "away") ||
		(awayLower != "" && strings.Contains(selLower, awayLower)) ||
		strings.Contains(selLower, "celtics") || strings.Contains(selLower, "chelsea") || strings.Contains(selLower, "alcaraz")
	isDrawPick := strings.Contains(selLower, "draw") || selLower == "x"

	if status == models.StatusFinished {
		if isHomePick && homeScore > awayScore {
			return models.LegWon, scoreStr, 100.0
		} else if isAwayPick && awayScore > homeScore {
			return models.LegWon, scoreStr, 100.0
		} else if isDrawPick && homeScore == awayScore {
			return models.LegWon, scoreStr, 100.0
		} else {
			return models.LegLost, scoreStr, 0.0
		}
	}

	// Live in play
	if isHomePick {
		if homeScore > awayScore {
			return models.LegRunning, scoreStr, 85.0
		} else if homeScore == awayScore {
			return models.LegRunning, scoreStr, 50.0
		}
		return models.LegRunning, scoreStr, 25.0
	} else if isAwayPick {
		if awayScore > homeScore {
			return models.LegRunning, scoreStr, 85.0
		} else if awayScore == homeScore {
			return models.LegRunning, scoreStr, 50.0
		}
		return models.LegRunning, scoreStr, 25.0
	} else if isDrawPick {
		if homeScore == awayScore {
			return models.LegRunning, scoreStr, 75.0
		}
		return models.LegRunning, scoreStr, 30.0
	}

	return models.LegRunning, scoreStr, 65.0
}

func (s *Store) hydrateSlipWithMatches(slip *models.BetSlip) *models.BetSlip {
	if slip == nil {
		return nil
	}
	slipCopy := *slip
	slipCopy.Legs = make([]models.BetSlipLeg, len(slip.Legs))

	wonCount := 0
	lostCount := 0
	runningCount := 0
	totalLegs := len(slip.Legs)
	totalMultiplier := 1.0

	for i, leg := range slip.Legs {
		legCopy := leg
		matchedMatch := s.findMatchingMatch(leg.MatchID, leg.Match.HomeTeam.Name, leg.Match.AwayTeam.Name)
		if matchedMatch != nil {
			legCopy.Match = *matchedMatch
			legCopy.MatchID = matchedMatch.ID
		} else if leg.Match.ID != "" {
			if leg.Match.StartTime.IsZero() {
				leg.Match.StartTime = time.Now().Add(-45 * time.Minute)
			}
			matchedMatch = &leg.Match
		}

		legStatus, scoreStr, fulfillment := evaluateLeg(&legCopy, matchedMatch)
		legCopy.Status = legStatus
		legCopy.CurrentScore = scoreStr
		legCopy.FulfillmentPct = fulfillment

		if legStatus == models.LegWon {
			wonCount++
			if leg.Odds > 1.0 {
				totalMultiplier *= leg.Odds
			}
		} else if legStatus == models.LegLost {
			lostCount++
		} else if legStatus == models.LegRunning {
			runningCount++
			if leg.Odds > 1.0 {
				totalMultiplier *= (1.0 + (leg.Odds-1.0)*(fulfillment/100.0))
			}
		}

		slipCopy.Legs[i] = legCopy
	}

	// Determine overall Bet Slip Status
	if lostCount > 0 {
		slipCopy.Status = models.SlipLost
		slipCopy.CurrentCashout = 0.00
		slipCopy.CashoutProbability = 0.00
	} else if wonCount == totalLegs && totalLegs > 0 {
		slipCopy.Status = models.SlipWon
		stake := slip.Stake
		if stake <= 0 {
			stake = 100.0
		}
		slipCopy.CurrentCashout = math.Round(stake*slipCopy.TotalOdds*100) / 100
		slipCopy.CashoutProbability = 1.00
	} else {
		slipCopy.Status = models.SlipRunning
		stake := slip.Stake
		if stake <= 0 {
			stake = 100.0
		}
		cashout := math.Round(stake*totalMultiplier*0.92*100) / 100
		if cashout < stake*0.2 {
			cashout = math.Round(stake*0.25*100) / 100
		}
		slipCopy.CurrentCashout = cashout
		slipCopy.CashoutProbability = math.Round(math.Min(0.95, math.Max(0.15, float64(wonCount+1)/float64(totalLegs+1)))*100) / 100
	}

	return &slipCopy
}

func (s *Store) GetBetSlip(idOrCode string) (*models.BetSlip, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	slip, ok := s.betSlips[idOrCode]
	if !ok || slip.IsDeleted || slip.DeletedAt != nil {
		for _, sl := range s.betSlips {
			if strings.EqualFold(sl.BookingCode, idOrCode) && !sl.IsDeleted && sl.DeletedAt == nil {
				return s.hydrateSlipWithMatches(sl), true
			}
		}
		return nil, false
	}
	return s.hydrateSlipWithMatches(slip), true
}

// GetBetSlipForUser retrieves a bet slip by ID or booking code
func (s *Store) GetBetSlipForUser(idOrCode, userID string, isAdmin bool) (*models.BetSlip, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	slip, ok := s.betSlips[idOrCode]
	if !ok || slip.IsDeleted || slip.DeletedAt != nil {
		for _, sl := range s.betSlips {
			if strings.EqualFold(sl.BookingCode, idOrCode) && !sl.IsDeleted && sl.DeletedAt == nil {
				slip = sl
				ok = true
				break
			}
		}
		if !ok {
			return nil, false
		}
	}
	// Direct booking code lookups and public slips are always accessible
	if !isAdmin && userID != "" && slip.UserID != "" && slip.UserID != userID && !strings.EqualFold(slip.BookingCode, idOrCode) {
		return nil, false
	}
	return s.hydrateSlipWithMatches(slip), true
}

// GetBetSlipsByUser returns only the bet slips belonging to the specified user
func (s *Store) GetBetSlipsByUser(userID string) []*models.BetSlip {
	s.mu.RLock()
	defer s.mu.RUnlock()

	seen := make(map[string]bool)
	result := make([]*models.BetSlip, 0)
	for _, slip := range s.betSlips {
		if slip.IsDeleted || slip.DeletedAt != nil {
			continue
		}
		if userID != "" && slip.UserID != userID {
			continue
		}
		if !seen[slip.ID] {
			seen[slip.ID] = true
			result = append(result, s.hydrateSlipWithMatches(slip))
		}
	}
	return result
}

// CountActiveBetSlipsForUser returns the number of active bet slips owned by a user
func (s *Store) CountActiveBetSlipsForUser(userID string) int {
	s.mu.RLock()
	defer s.mu.RUnlock()

	seen := make(map[string]bool)
	count := 0
	for _, slip := range s.betSlips {
		if slip.IsDeleted || slip.DeletedAt != nil {
			continue
		}
		if userID != "" && slip.UserID != userID {
			continue
		}
		if !seen[slip.ID] {
			seen[slip.ID] = true
			count++
		}
	}
	return count
}

func (s *Store) GetAllBetSlips() []*models.BetSlip {
	s.mu.RLock()
	defer s.mu.RUnlock()

	seen := make(map[string]bool)
	result := make([]*models.BetSlip, 0)
	for _, slip := range s.betSlips {
		if slip.IsDeleted || slip.DeletedAt != nil {
			continue
		}
		if !seen[slip.ID] {
			seen[slip.ID] = true
			result = append(result, s.hydrateSlipWithMatches(slip))
		}
	}
	return result
}

// DeleteBetSlipForUser deletes a bet slip only if the user owns it or is an admin
func (s *Store) DeleteBetSlipForUser(idOrCode, userID string, isAdmin bool) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	slip, ok := s.betSlips[idOrCode]
	if !ok || slip.IsDeleted {
		return false
	}
	if !isAdmin && userID != "" && slip.UserID != "" && slip.UserID != userID {
		return false
	}

	now := time.Now()
	slip.IsDeleted = true
	slip.DeletedAt = &now

	if s.db != nil && s.db.Pool != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		_, _ = s.db.Pool.Exec(ctx, `UPDATE bet_slips SET is_deleted = TRUE, deleted_at = NOW() WHERE id = $1 OR booking_code = $1`, idOrCode)
	}

	return true
}

func (s *Store) DeleteBetSlip(idOrCode string) bool {
	return s.DeleteBetSlipForUser(idOrCode, "", true)
}

// ClearBetSlipsForUser clears all bet slips belonging to a specific user
func (s *Store) ClearBetSlipsForUser(userID string) int {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()
	seen := make(map[string]bool)
	count := 0
	for _, slip := range s.betSlips {
		if !seen[slip.ID] && !slip.IsDeleted {
			if userID != "" && slip.UserID != userID {
				continue
			}
			seen[slip.ID] = true
			slip.IsDeleted = true
			slip.DeletedAt = &now
			count++
		}
	}

	if s.db != nil && s.db.Pool != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		if userID != "" {
			_, _ = s.db.Pool.Exec(ctx, `UPDATE bet_slips SET is_deleted = TRUE, deleted_at = NOW() WHERE user_id = $1 AND is_deleted = FALSE`, userID)
		} else {
			_, _ = s.db.Pool.Exec(ctx, `UPDATE bet_slips SET is_deleted = TRUE, deleted_at = NOW() WHERE is_deleted = FALSE`)
		}
	}

	return count
}

func (s *Store) ClearAllBetSlips() int {
	return s.ClearBetSlipsForUser("")
}

// Users & Subscriptions
func (s *Store) GetUser(id string) (*models.User, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	u, ok := s.users[id]
	if ok && !u.IsDeleted {
		uCopy := *u
		return &uCopy, true
	}

	// Fallback to PostgreSQL
	if s.db != nil && s.db.Pool != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		var dbUser models.User
		var plan, status string
		err := s.db.Pool.QueryRow(ctx, `
			SELECT id, email, name, password_hash, role, is_admin, plan, plan_expiry, status, country, signup_source, last_seen_at, is_deleted, created_at
			FROM users WHERE id = $1 AND is_deleted = FALSE
		`, id).Scan(&dbUser.ID, &dbUser.Email, &dbUser.Name, &dbUser.PasswordHash, &dbUser.Role, &dbUser.IsAdmin, &plan, &dbUser.PlanExpiry, &status, &dbUser.Country, &dbUser.SignupSource, &dbUser.LastSeenAt, &dbUser.IsDeleted, &dbUser.CreatedAt)
		if err == nil {
			dbUser.Plan = models.UserPlan(plan)
			dbUser.Status = models.UserStatus(status)
			return &dbUser, true
		}
	}

	return nil, false
}

func (s *Store) GetUserByEmail(email string) (*models.User, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	cleanEmail := strings.TrimSpace(strings.ToLower(email))
	for _, u := range s.users {
		if !u.IsDeleted && strings.EqualFold(u.Email, cleanEmail) {
			uCopy := *u
			return &uCopy, true
		}
	}

	// Fallback to PostgreSQL
	if s.db != nil && s.db.Pool != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		var dbUser models.User
		var plan, status string
		err := s.db.Pool.QueryRow(ctx, `
			SELECT id, email, name, password_hash, role, is_admin, plan, plan_expiry, status, country, signup_source, last_seen_at, is_deleted, created_at
			FROM users WHERE LOWER(email) = LOWER($1) AND is_deleted = FALSE
		`, cleanEmail).Scan(&dbUser.ID, &dbUser.Email, &dbUser.Name, &dbUser.PasswordHash, &dbUser.Role, &dbUser.IsAdmin, &plan, &dbUser.PlanExpiry, &status, &dbUser.Country, &dbUser.SignupSource, &dbUser.LastSeenAt, &dbUser.IsDeleted, &dbUser.CreatedAt)
		if err == nil {
			dbUser.Plan = models.UserPlan(plan)
			dbUser.Status = models.UserStatus(status)
			return &dbUser, true
		}
	}

	return nil, false
}

func (s *Store) SaveUser(user *models.User) {
	s.mu.Lock()
	defer s.mu.Unlock()

	userCopy := *user
	s.users[user.ID] = &userCopy

	if s.db != nil && s.db.Pool != nil {
		go func(u models.User) {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			_, err := s.db.Pool.Exec(ctx, `
				INSERT INTO users (id, email, name, password_hash, role, is_admin, plan, plan_expiry, status, country, signup_source, last_seen_at, is_deleted, created_at)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
				ON CONFLICT (id) DO UPDATE SET
					email = EXCLUDED.email,
					name = EXCLUDED.name,
					password_hash = CASE WHEN EXCLUDED.password_hash != '' THEN EXCLUDED.password_hash ELSE users.password_hash END,
					role = EXCLUDED.role,
					is_admin = EXCLUDED.is_admin,
					plan = EXCLUDED.plan,
					plan_expiry = EXCLUDED.plan_expiry,
					status = EXCLUDED.status,
					country = EXCLUDED.country,
					last_seen_at = EXCLUDED.last_seen_at,
					is_deleted = EXCLUDED.is_deleted;
			`, u.ID, u.Email, u.Name, u.PasswordHash, u.Role, u.IsAdmin, string(u.Plan), u.PlanExpiry, string(u.Status), u.Country, u.SignupSource, u.LastSeenAt, u.IsDeleted, u.CreatedAt)
			if err != nil {
				log.Printf("[DB ERROR] Failed to save user %s to PostgreSQL: %v", u.Email, err)
			}
		}(*user)
	}

	if s.supabaseSyncer != nil {
		s.supabaseSyncer.SyncUser(user)
	}
}

func (s *Store) UpgradeUserToPro(id string, durationDays int) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	expiry := time.Now().Add(time.Duration(durationDays) * 24 * time.Hour)
	if u, ok := s.users[id]; ok {
		u.Plan = models.PlanPro
		u.PlanExpiry = &expiry
		if s.db != nil && s.db.Pool != nil {
			go func() {
				ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
				defer cancel()
				_, _ = s.db.Pool.Exec(ctx, `UPDATE users SET plan = $1, plan_expiry = $2 WHERE id = $3`, string(models.PlanPro), expiry, id)
			}()
		}
		return nil
	}

	newUser := &models.User{
		ID:         id,
		Email:      fmt.Sprintf("%s@user.livescores.io", id),
		Name:       fmt.Sprintf("Pro Subscriber (%s)", id),
		Role:       "user",
		IsAdmin:    false,
		Plan:       models.PlanPro,
		PlanExpiry: &expiry,
		Status:     models.UserActive,
		CreatedAt:  time.Now(),
	}
	s.users[id] = newUser

	if s.db != nil && s.db.Pool != nil {
		go func(u models.User) {
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			_, _ = s.db.Pool.Exec(ctx, `
				INSERT INTO users (id, email, name, password_hash, role, is_admin, plan, plan_expiry, status, created_at)
				VALUES ($1, $2, $3, '', 'user', false, $4, $5, 'active', NOW())
				ON CONFLICT (id) DO UPDATE SET plan = EXCLUDED.plan, plan_expiry = EXCLUDED.plan_expiry;
			`, u.ID, u.Email, u.Name, string(u.Plan), u.PlanExpiry)
		}(*newUser)
	}
	return nil
}

func (s *Store) RecordTransaction(tx *models.PaymentTransaction) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.payments[tx.ID] = tx
	s.payments[tx.Reference] = tx

	if s.db != nil && s.db.Pool != nil {
		go func(t models.PaymentTransaction) {
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			_, _ = s.db.Pool.Exec(ctx, `
				INSERT INTO payment_transactions (id, user_id, gateway, reference, amount, currency, status, plan, raw_payload, is_deleted, created_at)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
				ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, is_deleted = EXCLUDED.is_deleted;
			`, t.ID, t.UserID, string(t.Gateway), t.Reference, t.Amount, t.Currency, t.Status, string(t.Plan), t.RawPayload, t.IsDeleted, t.CreatedAt)
		}(*tx)
	}
}

func (s *Store) LogWebhook(log *models.WebhookLog) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.webhookLogs = append([]*models.WebhookLog{log}, s.webhookLogs...)
	if len(s.webhookLogs) > 100 {
		s.webhookLogs = s.webhookLogs[:100]
	}

	if s.db != nil && s.db.Pool != nil {
		go func(w models.WebhookLog) {
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			_, _ = s.db.Pool.Exec(ctx, `
				INSERT INTO webhook_logs (id, gateway, event, signature, verified, payload, created_at)
				VALUES ($1, $2, $3, $4, $5, $6, $7)
				ON CONFLICT (id) DO NOTHING;
			`, w.ID, w.Gateway, w.Event, w.Signature, w.Verified, w.Payload, w.CreatedAt)
		}(*log)
	}
}

func (s *Store) GetWebhookLogs() []*models.WebhookLog {
	s.mu.RLock()
	defer s.mu.RUnlock()

	logsCopy := make([]*models.WebhookLog, len(s.webhookLogs))
	copy(logsCopy, s.webhookLogs)
	return logsCopy
}

func (s *Store) GetFinancialMetrics() models.FinancialMetrics {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var total, flwVol, cryptoVol float64
	var proUsers int

	for _, u := range s.users {
		if !u.IsDeleted && u.Plan == models.PlanPro {
			proUsers++
		}
	}

	seen := make(map[string]bool)
	recent := make([]models.PaymentTransaction, 0)
	for _, tx := range s.payments {
		if !seen[tx.ID] && !tx.IsDeleted {
			seen[tx.ID] = true
			if tx.Status == "successful" || tx.Status == "paid" {
				total += tx.Amount
				if tx.Gateway == models.GatewayFlutterwave {
					flwVol += tx.Amount
				} else if tx.Gateway == models.GatewayCryptomus {
					cryptoVol += tx.Amount
				}
			}
			recent = append(recent, *tx)
		}
	}

	return models.FinancialMetrics{
		TotalRevenueUSD:     total,
		MonthlyRecurringUSD: float64(proUsers) * 9.00,
		FlutterwaveVolume:   flwVol,
		CryptomusVolume:     cryptoVol,
		ActiveProUsers:      proUsers,
		TotalUsers:          len(s.users),
		RecentTransactions:  recent,
	}
}

// Blog Posts
func (s *Store) GetAllBlogPosts(category, tag string) []models.BlogPost {
	s.mu.RLock()
	defer s.mu.RUnlock()

	seen := make(map[string]bool)
	result := make([]models.BlogPost, 0)

	for _, p := range s.posts {
		if p.IsDeleted || p.DeletedAt != nil {
			continue
		}
		if seen[p.ID] {
			continue
		}
		seen[p.ID] = true

		if category != "" && p.Category != category {
			continue
		}

		postCopy := *p
		if postCopy.MatchID != "" {
			if m, ok := s.matches[postCopy.MatchID]; ok {
				matchCopy := *m
				postCopy.Match = &matchCopy
			}
		}
		result = append(result, postCopy)
	}
	return result
}

func (s *Store) GetBlogPostBySlug(slugOrID string) (*models.BlogPost, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	p, ok := s.posts[slugOrID]
	if !ok || p.IsDeleted || p.DeletedAt != nil {
		return nil, false
	}

	p.Views++
	postCopy := *p
	if postCopy.MatchID != "" {
		if m, exists := s.matches[postCopy.MatchID]; exists {
			matchCopy := *m
			postCopy.Match = &matchCopy
		}
	}
	return &postCopy, true
}

func (s *Store) SaveBlogPost(post *models.BlogPost) {
	s.mu.Lock()
	defer s.mu.Unlock()

	postCopy := *post
	s.posts[post.ID] = &postCopy
	s.posts[post.Slug] = &postCopy

	if s.db != nil && s.db.Pool != nil {
		go func(bp models.BlogPost) {
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			_, _ = s.db.Pool.Exec(ctx, `
				INSERT INTO blog_posts (id, title, slug, excerpt, content_html, cover_image, category, author_name, author_role, author_avatar, match_id, read_time_min, views, likes, status, is_deleted, published_at, created_at, updated_at)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
				ON CONFLICT (id) DO UPDATE SET
					title = EXCLUDED.title,
					slug = EXCLUDED.slug,
					excerpt = EXCLUDED.excerpt,
					content_html = EXCLUDED.content_html,
					cover_image = EXCLUDED.cover_image,
					category = EXCLUDED.category,
					author_name = EXCLUDED.author_name,
					views = EXCLUDED.views,
					likes = EXCLUDED.likes,
					status = EXCLUDED.status,
					is_deleted = EXCLUDED.is_deleted,
					updated_at = EXCLUDED.updated_at;
			`, bp.ID, bp.Title, bp.Slug, bp.Excerpt, bp.ContentHTML, bp.CoverImage, bp.Category, bp.AuthorName, bp.AuthorRole, bp.AuthorAvatar, bp.MatchID, bp.ReadTimeMin, bp.Views, bp.Likes, bp.Status, bp.IsDeleted, bp.PublishedAt, bp.CreatedAt, bp.UpdatedAt)
		}(*post)
	}

	if s.supabaseSyncer != nil {
		s.supabaseSyncer.SyncBlogPost(post)
	}
}

func (s *Store) LikeBlogPost(slugOrID string) (int, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	p, ok := s.posts[slugOrID]
	if !ok || p.IsDeleted {
		return 0, false
	}
	p.Likes++
	return p.Likes, true
}

func (s *Store) DeleteBlogPost(id string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	p, ok := s.posts[id]
	if !ok || p.IsDeleted {
		return false
	}
	now := time.Now()
	p.IsDeleted = true
	p.DeletedAt = &now

	if s.db != nil && s.db.Pool != nil {
		go func(bpID string) {
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			_, _ = s.db.Pool.Exec(ctx, `UPDATE blog_posts SET is_deleted = TRUE, deleted_at = NOW() WHERE id = $1`, bpID)
		}(id)
	}

	return true
}

// Customer Support & Helpdesk
func (s *Store) GetSupportTickets(status string) []*models.SupportTicket {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]*models.SupportTicket, 0)
	for _, t := range s.supportTickets {
		if t.IsDeleted || t.DeletedAt != nil {
			continue
		}
		if status == "" || t.Status == status {
			tCopy := *t
			result = append(result, &tCopy)
		}
	}
	return result
}

func (s *Store) GetSupportTicketByID(id string) (*models.SupportTicket, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	t, ok := s.supportTickets[id]
	if !ok || t.IsDeleted || t.DeletedAt != nil {
		return nil, false
	}
	tCopy := *t
	return &tCopy, true
}

func (s *Store) DeleteSupportTicket(id string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	t, ok := s.supportTickets[id]
	if !ok || t.IsDeleted {
		return false
	}
	now := time.Now()
	t.IsDeleted = true
	t.DeletedAt = &now

	if s.db != nil && s.db.Pool != nil {
		go func(tID string) {
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			_, _ = s.db.Pool.Exec(ctx, `UPDATE support_tickets SET is_deleted = TRUE, deleted_at = NOW() WHERE id = $1`, tID)
		}(id)
	}

	return true
}

func (s *Store) CreateSupportTicket(ticket *models.SupportTicket) {
	s.mu.Lock()
	defer s.mu.Unlock()

	tCopy := *ticket
	s.supportTickets[ticket.ID] = &tCopy

	if s.db != nil && s.db.Pool != nil {
		go func(st models.SupportTicket) {
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			msgBytes, _ := json.Marshal(st.Messages)
			_, _ = s.db.Pool.Exec(ctx, `
				INSERT INTO support_tickets (id, user_id, user_name, user_email, subject, category, priority, status, messages, is_deleted, created_at, updated_at)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
				ON CONFLICT (id) DO UPDATE SET
					status = EXCLUDED.status,
					priority = EXCLUDED.priority,
					messages = EXCLUDED.messages,
					is_deleted = EXCLUDED.is_deleted,
					updated_at = EXCLUDED.updated_at;
			`, st.ID, st.UserID, st.UserName, st.UserEmail, st.Subject, st.Category, st.Priority, st.Status, msgBytes, st.IsDeleted, st.CreatedAt, st.UpdatedAt)
		}(*ticket)
	}

	if s.supabaseSyncer != nil {
		s.supabaseSyncer.SyncSupportTicket(ticket)
	}
}

func (s *Store) AddSupportMessage(ticketID string, msg *models.SupportTicketMessage) (*models.SupportTicket, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	t, ok := s.supportTickets[ticketID]
	if !ok {
		return nil, false
	}

	t.Messages = append(t.Messages, *msg)
	t.UpdatedAt = time.Now()
	if msg.Sender == "agent" {
		t.Status = "in_progress"
	}
	tCopy := *t

	if s.db != nil && s.db.Pool != nil {
		go func(st models.SupportTicket) {
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			msgBytes, _ := json.Marshal(st.Messages)
			_, _ = s.db.Pool.Exec(ctx, `
				UPDATE support_tickets SET messages = $1, status = $2, updated_at = NOW() WHERE id = $3
			`, msgBytes, st.Status, st.ID)
		}(tCopy)
	}

	if s.supabaseSyncer != nil {
		s.supabaseSyncer.SyncSupportTicket(&tCopy)
	}

	return &tCopy, true
}

// Push Subscriptions & Channel Management
func (s *Store) SavePushSubscription(sub *models.PushSubscription) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.pushSubs[sub.Endpoint] = sub
	s.pushSubs[sub.ID] = sub

	if s.db != nil && s.db.Pool != nil {
		go func(p models.PushSubscription) {
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()

			channelsJSON, _ := json.Marshal(p.Channels)
			_, _ = s.db.Pool.Exec(ctx, `
				INSERT INTO push_subscriptions (
					id, user_id, endpoint, p256dh, auth, device_type, channels, user_agent, ip_address, is_active, created_at, updated_at, last_seen_at
				) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
				ON CONFLICT (endpoint) DO UPDATE SET
					user_id = EXCLUDED.user_id,
					p256dh = EXCLUDED.p256dh,
					auth = EXCLUDED.auth,
					device_type = EXCLUDED.device_type,
					channels = EXCLUDED.channels,
					user_agent = EXCLUDED.user_agent,
					ip_address = EXCLUDED.ip_address,
					is_active = EXCLUDED.is_active,
					updated_at = NOW(),
					last_seen_at = NOW()
			`, p.ID, p.UserID, p.Endpoint, p.P256dh, p.Auth, p.DeviceType, channelsJSON, p.UserAgent, p.IPAddress, p.IsActive, p.CreatedAt, p.UpdatedAt, p.LastSeenAt)
		}(*sub)
	}
}

func (s *Store) GetPushSubscriptionByEndpoint(endpoint string) (*models.PushSubscription, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	sub, ok := s.pushSubs[endpoint]
	if !ok {
		return nil, false
	}
	subCopy := *sub
	return &subCopy, true
}

func (s *Store) GetActivePushSubscriptions(channel string) []*models.PushSubscription {
	s.mu.RLock()
	defer s.mu.RUnlock()

	seen := make(map[string]bool)
	var list []*models.PushSubscription

	for _, sub := range s.pushSubs {
		if !sub.IsActive || seen[sub.Endpoint] {
			continue
		}

		if channel == "" || channel == "all" {
			seen[sub.Endpoint] = true
			copySub := *sub
			list = append(list, &copySub)
			continue
		}

		// Match specific channel
		for _, ch := range sub.Channels {
			if ch == channel || ch == "all" {
				seen[sub.Endpoint] = true
				copySub := *sub
				list = append(list, &copySub)
				break
			}
		}
	}

	return list
}

func (s *Store) DeactivatePushSubscription(endpoint string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if sub, ok := s.pushSubs[endpoint]; ok {
		sub.IsActive = false
		sub.UpdatedAt = time.Now()
	}

	if s.db != nil && s.db.Pool != nil {
		go func(ep string) {
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			_, _ = s.db.Pool.Exec(ctx, `
				UPDATE push_subscriptions SET is_active = FALSE, updated_at = NOW() WHERE endpoint = $1
			`, ep)
		}(endpoint)
	}
}

func (s *Store) GetPushSubscriptionStats() *models.NotificationStats {
	s.mu.RLock()
	defer s.mu.RUnlock()

	seen := make(map[string]bool)
	stats := &models.NotificationStats{
		Channels: []models.NotificationChannelInfo{
			{ID: "all", Name: "All Global Subscribers", Description: "System announcements & critical alerts", Icon: "Megaphone", Subscribers: 0},
			{ID: "live_matches", Name: "Live Match Trackers", Description: "Kickoffs, scores & full-time summaries", Icon: "Radio", Subscribers: 0},
			{ID: "goal_alerts", Name: "Instant Goal Chimes", Description: "Immediate goal and point scoring pushes", Icon: "Zap", Subscribers: 0},
			{ID: "breaking_news", Name: "Editorial & News", Description: "Match previews, lineups and odds shifts", Icon: "Sparkles", Subscribers: 0},
			{ID: "betslip_alerts", Name: "Slip Cashout Alerts", Description: "Real-time accumulator winning updates", Icon: "Ticket", Subscribers: 0},
		},
		RecentBroadcasts: make([]models.BroadcastLog, 0),
	}

	channelCounts := make(map[string]int)

	for _, sub := range s.pushSubs {
		if !sub.IsActive || seen[sub.Endpoint] {
			continue
		}
		seen[sub.Endpoint] = true
		stats.TotalSubscriptions++

		switch strings.ToLower(sub.DeviceType) {
		case "android":
			stats.ActiveAndroid++
		case "ios":
			stats.ActiveIOS++
		default:
			stats.ActiveDesktop++
		}

		for _, ch := range sub.Channels {
			channelCounts[ch]++
		}
	}

	for i := range stats.Channels {
		chID := stats.Channels[i].ID
		if chID == "all" {
			stats.Channels[i].Subscribers = stats.TotalSubscriptions
		} else {
			stats.Channels[i].Subscribers = channelCounts[chID]
		}
	}

	for _, bc := range s.broadcastLogs {
		stats.RecentBroadcasts = append(stats.RecentBroadcasts, *bc)
	}

	return stats
}

func (s *Store) SaveBroadcastLog(logItem *models.BroadcastLog) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.broadcastLogs = append([]*models.BroadcastLog{logItem}, s.broadcastLogs...)
	if len(s.broadcastLogs) > 50 {
		s.broadcastLogs = s.broadcastLogs[:50]
	}

	if s.db != nil && s.db.Pool != nil {
		go func(l models.BroadcastLog) {
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			_, _ = s.db.Pool.Exec(ctx, `
				INSERT INTO broadcast_logs (id, channel, title, body, url, sent_count, failed_count, sent_at)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			`, l.ID, l.Channel, l.Title, l.Body, l.URL, l.SentCount, l.FailedCount, l.SentAt)
		}(*logItem)
	}
}

func (s *Store) GetRecentBroadcastLogs(limit int) []*models.BroadcastLog {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if limit <= 0 || limit > len(s.broadcastLogs) {
		limit = len(s.broadcastLogs)
	}

	res := make([]*models.BroadcastLog, limit)
	for i := 0; i < limit; i++ {
		copyItem := *s.broadcastLogs[i]
		res[i] = &copyItem
	}
	return res
}

// GetActiveSubscriptionsForMatch returns push subscriptions that are specifically tracking matchID
// (via direct match channel e.g. match_<id> or match:<id>, or owning an active betslip containing this match)
func (s *Store) GetActiveSubscriptionsForMatch(matchID string) []*models.PushSubscription {
	s.mu.RLock()
	defer s.mu.RUnlock()

	targetChannels := map[string]bool{
		fmt.Sprintf("match_%s", matchID): true,
		fmt.Sprintf("match:%s", matchID): true,
		"all":                            false, // Never broadcast random match goals to global 'all' channel
	}

	// Find user IDs that have bet slips containing this match
	trackingUsers := make(map[string]bool)
	for _, slip := range s.betSlips {
		if slip.IsDeleted || slip.DeletedAt != nil || slip.UserID == "" {
			continue
		}
		for _, leg := range slip.Legs {
			if leg.MatchID == matchID || leg.Match.ID == matchID {
				trackingUsers[slip.UserID] = true
				break
			}
		}
	}

	seen := make(map[string]bool)
	result := make([]*models.PushSubscription, 0)

	for _, sub := range s.pushSubs {
		if !sub.IsActive || seen[sub.Endpoint] {
			continue
		}

		isSubscribed := false
		// 1. Check if user explicitly added this match channel (e.g. match_<matchId>)
		for _, ch := range sub.Channels {
			if targetChannels[ch] {
				isSubscribed = true
				break
			}
		}

		// 2. Check if user owns an active bet slip containing this match
		if !isSubscribed && sub.UserID != "" && trackingUsers[sub.UserID] {
			isSubscribed = true
		}

		if isSubscribed {
			seen[sub.Endpoint] = true
			copySub := *sub
			result = append(result, &copySub)
		}
	}

	return result
}

